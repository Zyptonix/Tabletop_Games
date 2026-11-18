"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Dices,
  Crown,
  Users,
  Palette,
  RotateCcw,
  Sparkles,
  X,
  History,
  Compass,
  ScrollText
} from "lucide-react";
import type {
  GameEvent,
  PublicSnakesAndLaddersState,
  SnakesAndLaddersPieceId
} from "@tabletop/game-core";
import { SNAKES_AND_LADDERS_PIECES } from "@tabletop/game-core";
import type { RoomStateView, TimerView } from "@tabletop/shared";
import { PLAYER_COLORS } from "../board-games/shared/ui-utils";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { TumblingDice3D } from "./TumblingDice3D";
import { SnakesAndLaddersBoardView, getPlayerBadge } from "./SnakesAndLaddersBoardView";
import { PiecePicker } from "./PiecePicker";
import { GameFeedbackButton } from "@/components/feedback/GameFeedbackButton";
import { GamePauseButton } from "@/components/game/GamePauseButton";

export interface SnakesAndLaddersTableProps {
  room: RoomStateView;
  state: PublicSnakesAndLaddersState;
  legalActions: unknown[];
  gameEvents?: GameEvent[] | undefined;
  currentUserId: string;
  timer?: TimerView | null | undefined;
  preferredPiece?: SnakesAndLaddersPieceId | undefined;
  onAction: (type: string, payload?: Record<string, unknown> | undefined) => void;
  onChat: (roomId: string, body: string) => void;
  onEndMatch?: ((roomId: string) => void) | undefined;
  onPause?: ((roomId: string) => void) | undefined;
  onResume?: ((roomId: string) => void) | undefined;
}

export function SnakesAndLaddersTable({
  room,
  state,
  legalActions,
  gameEvents = [],
  currentUserId,
  timer,
  preferredPiece,
  onAction,
  onChat,
  onEndMatch,
  onPause,
  onResume
}: SnakesAndLaddersTableProps) {
  const router = useRouter();
  const [showPieceModal, setShowPieceModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chronicle" | "chat">("chronicle");
  const [isMoveAnimating, setIsMoveAnimating] = useState(false);

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = state.currentPlayerId === currentUserId;
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const isHost = room.effectiveHostUserId === currentUserId;
  const isFinished = state.phase === "finished";

  // Lock out roll actions while a dice roll or piece move animation is actively in flight
  useEffect(() => {
    if (!state.lastMove) {
      setIsMoveAnimating(false);
      return;
    }
    const move = state.lastMove;
    const rolled = move.rolled ?? 1;
    const rollTime = 850;
    const stepTime = (rolled + 1) * 300;
    const pauseBeforeEvent = (move.ladder || move.snake) ? 500 : 0;
    const specialTime = move.ladder ? 1600 : move.snake ? 3000 : move.entered ? 600 : 0;
    const totalDuration = rollTime + stepTime + pauseBeforeEvent + specialTime;

    setIsMoveAnimating(true);
    const t = setTimeout(() => {
      setIsMoveAnimating(false);
    }, totalDuration);
    return () => clearTimeout(t);
  }, [state.actionNumber, state.lastMove]);

  // Automatically sync preferred piece if selected in lobby or changed
  useEffect(() => {
    if (
      preferredPiece &&
      me &&
      me.piece !== preferredPiece &&
      state.phase === "playing" &&
      !state.players.some((p) => p.userId !== currentUserId && p.piece === preferredPiece)
    ) {
      onAction("select_piece", { piece: preferredPiece });
    }
  }, [preferredPiece, me?.piece, state.phase, state.players, currentUserId, onAction]);

  const canRoll = Boolean(
    isMyTurn &&
      !isMoveAnimating &&
      legalActions.some((a: unknown) => typeof a === "object" && a !== null && (a as { type: string }).type === "roll_dice")
  );

  const canSelectPiece = Boolean(
    legalActions.some((a: unknown) => typeof a === "object" && a !== null && (a as { type: string }).type === "select_piece")
  );

  // Standings ranked by closest to 100 (100 is 1st)
  const sortedStandings = useMemo(() => {
    return [...state.players].sort((a, b) => {
      if (a.position === 100) return -1;
      if (b.position === 100) return 1;
      return b.position - a.position;
    });
  }, [state.players]);

  // Players waiting at Starting Camp (position === 0)
  const homeBasePlayers = useMemo(() => {
    return state.players.filter((p) => p.position === 0);
  }, [state.players]);

  // Map of taken pieces by other players to enforce uniqueness
  const takenByMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of state.players) {
      if (p.userId !== currentUserId) {
        map[p.piece] = p.displayName;
      }
    }
    return map;
  }, [state.players, currentUserId]);

  const myPieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === me?.piece);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#070d14] text-slate-100">
      {/* COMPACT SLIM HEADER (Maximizes vertical screen space for the board) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1622]/90 px-3 sm:px-5 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-base shadow">
            🐍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight sm:text-base">
                Snakes & Ladders
              </h1>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.2 text-[9px] font-black uppercase text-amber-300">
                {state.board.name}
              </span>
            </div>
          </div>
        </div>

        {/* Current Turn Badge & Controls */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1 transition-all ${
              isMyTurn
                ? "border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/40 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                : "border-white/10 bg-black/40 text-white/70"
            }`}
          >
            <span className="text-sm">{isMyTurn ? "👉" : "⏳"}</span>
            <div className="text-left">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/50 leading-none">
                {isMyTurn ? "Your Turn" : "Turn"}
              </p>
              <p className="text-xs font-black truncate max-w-[110px] leading-tight">
                {currentPlayer?.displayName ?? "Waiting..."}
              </p>
            </div>
          </div>

          {/* Change Piece Button */}
          {canSelectPiece && me ? (
            <button
              type="button"
              onClick={() => setShowPieceModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white hover:border-amber-400/50 hover:bg-amber-400/10 transition"
              title="Change your game piece"
            >
              <Palette className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-base">{myPieceInfo?.emoji}</span>
              <span className="hidden sm:inline text-xs">Piece</span>
            </button>
          ) : null}

          {/* Pause / Resume Button */}
          <GamePauseButton
            room={room}
            currentUserId={currentUserId}
            onPause={onPause}
            onResume={onResume}
            variant="snakes"
          />

          {/* Feedback Button */}
          <GameFeedbackButton
            gameId="snakes-and-ladders"
            gameName="Snakes & Ladders"
            variant="snakes"
          />

          {/* End Room Button for Host */}
          {isHost && onEndMatch ? (
            <button
              type="button"
              onClick={() => onEndMatch(room.id)}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              End Room
            </button>
          ) : null}
        </div>
      </header>

      {/* 3-COLUMN MAIN LAYOUT:
          LEFT: Sleek Unified Race Leaderboard (Rankings, Avatars, Progress Bars, Recent Rolls)
          CENTER: Giant Board (100% full vertical height)
          RIGHT: Dice Arena, Starting Pavilion & Live Chronicle/Chat
      */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: THE RACE LEADERBOARD */}
        <aside className="w-72 lg:w-80 xl:w-[350px] shrink-0 border-r border-white/10 bg-[#09111b] flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-3 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/30 shadow-sm">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  Race Standings
                </h2>
                <p className="text-[9.5px] text-white/50">First to Square 100 wins</p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80">
              {state.players.length} Players
            </span>
          </div>

          {/* Unified Leaderboard List - Single column, sorted by position descending */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
            {sortedStandings.map((player, rank) => {
              const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
              const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";
              const isTurn = player.userId === state.currentPlayerId;
              const isMe = player.userId === currentUserId;
              const isWinner = player.position === 100;
              const badge = getPlayerBadge(player, currentUserId);
              const progressPercent = Math.min(100, Math.max(player.position === 0 ? 0 : 2, player.position));

              return (
                <div
                  key={player.userId}
                  className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all ${
                    isWinner
                      ? "border-amber-400 bg-gradient-to-r from-amber-500/25 via-amber-600/10 to-transparent ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                      : isTurn
                      ? "border-amber-400/80 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent ring-2 ring-amber-400/40 shadow-[0_0_14px_rgba(251,191,36,0.25)]"
                      : isMe
                      ? "border-amber-400/40 bg-white/[0.04] hover:bg-white/[0.07]"
                      : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Top Row: Rank Badge, Token, Name + Tag, and Square Position */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Badge */}
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-black/50 text-xs font-black text-amber-300 shrink-0 border border-white/5">
                        {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
                      </span>

                      {/* Piece Token */}
                      <span
                        className="relative grid h-8 w-8 place-items-center rounded-xl border-2 text-base shrink-0 shadow-sm"
                        style={{ borderColor: isMe ? "#FBBF24" : color, backgroundColor: `${color}25` }}
                      >
                        {pieceInfo?.emoji ?? "🎲"}
                        <span
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-slate-900 px-1 py-0.2 text-[7px] font-black border"
                          style={{ borderColor: isMe ? "#FBBF24" : color, color: isMe ? "#FBBF24" : color }}
                        >
                          {badge}
                        </span>
                      </span>

                      {/* Player Name and Badges */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-white truncate max-w-[110px] leading-tight">
                            {player.displayName}
                          </p>
                          {isMe ? (
                            <span className="rounded bg-amber-400/25 border border-amber-400/30 px-1 text-[7.5px] font-black text-amber-300">
                              YOU
                            </span>
                          ) : null}
                          {player.isBot ? (
                            <span className="rounded bg-purple-400/20 border border-purple-400/30 px-1 text-[7.5px] font-black text-purple-300">
                              BOT
                            </span>
                          ) : null}
                        </div>
                        {isTurn ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 animate-pulse mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Current Turn
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Position on the Board */}
                    <div className="text-right shrink-0">
                      {player.position === 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-white/50">
                            In Camp
                          </span>
                          <span className="text-[8px] text-amber-300/80 mt-0.5 font-bold">Needs 1</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-amber-300">
                            Tile {player.position}
                          </span>
                          <span className="text-[9px] font-semibold text-white/40">
                            {100 - player.position === 0 ? "Winner! 🏆" : `${100 - player.position} to win`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar towards Tile 100 */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}80`
                      }}
                    />
                  </div>

                  {/* Bottom Row: Recent Roll & Action Note */}
                  <div className="mt-1.5 flex items-center justify-between text-[9.5px]">
                    {player.lastRoll ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.2 font-black text-amber-300 shrink-0">
                          <span>🎲</span> {player.lastRoll}
                        </span>
                        <span className="text-white/70 truncate text-[9px]">
                          {player.lastRollResult ?? `Rolled ${player.lastRoll}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/30 italic text-[9px]">No roll yet</span>
                    )}

                    {isWinner ? (
                      <span className="font-black text-amber-300 text-[9px] flex items-center gap-0.5">
                        🏆 Champion
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: GIANT BOARD (Occupies 100% of vertical height) */}
        <main className="flex-1 flex items-center justify-center min-h-0 overflow-hidden p-2">
          <SnakesAndLaddersBoardView
            state={state}
            currentUserId={currentUserId}
          />
        </main>

        {/* RIGHT COLUMN: DICE ARENA, STARTING PAVILION & CHRONICLE / CHAT */}
        <aside className="w-80 lg:w-[350px] xl:w-[380px] shrink-0 border-l border-white/10 bg-[#09111b] flex flex-col min-h-0 overflow-hidden">
          {/* 1. THE DICE ARENA (Felted gaming tray) */}
          <div className="p-3.5 border-b border-white/10 bg-gradient-to-b from-emerald-950/20 via-black/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                <Dices className="h-4 w-4" /> Dice Arena
              </span>
              {state.diceRoll ? (
                <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                  Last Roll: {state.diceRoll}
                </span>
              ) : null}
            </div>

            {/* Felted 3D Dice Box */}
            <div className="rounded-2xl border border-white/10 bg-[#07141f] p-3 shadow-[inset_0_4px_16px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
              <TumblingDice3D
                value={state.diceRoll}
                actionNumber={state.actionNumber}
                canRoll={canRoll}
                onRoll={() => onAction("roll_dice")}
                disabled={!canRoll || isMoveAnimating}
                label={
                  isMyTurn
                    ? isMoveAnimating
                      ? "Moving Piece... ⏳"
                      : "Roll Dice 🎲"
                    : `Waiting for ${currentPlayer?.displayName ?? "Player"}`
                }
              />

              {/* Status / Bangladesh Rule Guidance Banner */}
              <div className="mt-2 text-center w-full">
                {isMyTurn ? (
                  me?.position === 0 ? (
                    <p className="text-xs font-black text-amber-300 animate-pulse">
                      ⚠️ Roll a 1 to enter the board!
                    </p>
                  ) : isMoveAnimating ? (
                    <p className="text-xs font-bold text-amber-300/80 animate-pulse">
                      Piece is advancing...
                    </p>
                  ) : (
                    <p className="text-xs font-black text-emerald-300">
                      It's your turn! Roll to advance.
                    </p>
                  )
                ) : (
                  <p className="text-xs text-white/50 truncate">
                    Waiting for <strong className="text-white font-bold">{currentPlayer?.displayName}</strong>...
                  </p>
                )}

                <p className="text-[10px] text-amber-300/70 mt-1">
                  🇧🇩 Bangladesh Rule: Roll a 1 grants a bonus reroll!
                </p>
              </div>
            </div>
          </div>

          {/* 2. STARTING CAMP PAVILION (Compact shelf for off-board pieces) */}
          {homeBasePlayers.length === 0 ? (
            <div className="px-3.5 py-2 border-b border-white/10 bg-emerald-950/20 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-300">
              <span>🏁</span>
              <span>All players on board! Race to 100!</span>
            </div>
          ) : (
            <div className="p-2.5 border-b border-white/10 bg-gradient-to-b from-amber-950/15 to-transparent">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <span>🏕️</span> Starting Camp
                </span>
                <span className="rounded-full bg-amber-400/15 border border-amber-400/25 px-2 py-0.2 text-[9px] font-bold text-amber-200">
                  {homeBasePlayers.length} waiting for 1
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-start items-center rounded-xl border border-white/10 bg-black/40 p-2">
                {homeBasePlayers.map((player) => {
                  const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
                  const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";
                  const isTurn = player.userId === state.currentPlayerId;
                  const isMe = player.userId === currentUserId;

                  return (
                    <div
                      key={player.userId}
                      title={`${player.displayName} (Camp: Roll a 1 to enter)`}
                      className={`relative group flex items-center gap-1 rounded-lg border px-2 py-1 transition-all ${
                        isTurn
                          ? "border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/50 scale-105 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                          : isMe
                          ? "border-amber-400/40 bg-white/5"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      }`}
                    >
                      <span
                        className="grid h-6 w-6 place-items-center rounded-md border text-sm"
                        style={{ borderColor: isMe ? "#FBBF24" : color, backgroundColor: `${color}25` }}
                      >
                        {pieceInfo?.emoji ?? "🎲"}
                      </span>
                      <span className="text-[10px] font-bold text-white truncate max-w-[70px]">
                        {player.displayName}
                      </span>
                      {isTurn ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. TABS HEADER: LIVE CHRONICLE / CHAT */}
          <div className="flex border-b border-white/10 bg-black/20 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSidebarTab("chronicle")}
              className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
                sidebarTab === "chronicle"
                  ? "border-b-2 border-amber-400 text-amber-300 bg-amber-400/5 font-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Chronicle ({state.activityLog?.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
                sidebarTab === "chat"
                  ? "border-b-2 border-amber-400 text-amber-300 bg-amber-400/5 font-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
          </div>

          {/* TAB CONTENT: LIVE CHRONICLE FEED */}
          {sidebarTab === "chronicle" ? (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
              {state.activityLog && state.activityLog.length > 0 ? (
                [...state.activityLog].reverse().map((item, index) => {
                  const isLadder = item.type === "ladder_climb";
                  const isSnake = item.type === "snake_bite";
                  const isBonus = item.type === "bonus_roll";
                  const isWin = item.type === "game_won";
                  const isPenalty = item.type === "three_ones";

                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className={`rounded-xl border p-2 transition-all ${
                        isWin
                          ? "border-amber-400 bg-amber-500/20 text-amber-200 shadow-md"
                          : isLadder
                          ? "border-amber-500/30 bg-amber-950/20 text-amber-200"
                          : isSnake
                          ? "border-rose-500/30 bg-rose-950/20 text-rose-200"
                          : isBonus
                          ? "border-yellow-500/30 bg-yellow-950/20 text-yellow-200"
                          : isPenalty
                          ? "border-purple-500/30 bg-purple-950/20 text-purple-200"
                          : "border-white/5 bg-black/30 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {isWin ? (
                          <span className="flex items-center gap-1 text-amber-300 font-black">
                            <Crown className="h-3.5 w-3.5" /> Match Concluded!
                          </span>
                        ) : isLadder ? (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Sparkles className="h-3 w-3" /> Ladder Climb!
                          </span>
                        ) : isSnake ? (
                          <span className="flex items-center gap-1 text-rose-400">
                            <span>🐍</span> Snake Bite!
                          </span>
                        ) : isBonus ? (
                          <span className="flex items-center gap-1 text-amber-300">
                            <span>⭐</span> Bonus Roll!
                          </span>
                        ) : isPenalty ? (
                          <span className="flex items-center gap-1 text-purple-300">
                            <span>⚠️</span> Turn Forfeit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-white/50">
                            <Dices className="h-3 w-3" /> Dice Roll
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/90 mt-0.5 leading-snug">
                        {item.message}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-white/40">
                  <History className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs font-bold">No activity recorded yet</p>
                  <p className="text-[10px] text-white/25 mt-0.5">Rolls and board events will appear here in real time</p>
                </div>
              )}
            </div>
          ) : null}

          {/* TAB CONTENT: TABLE CHAT */}
          {sidebarTab === "chat" ? (
            <div className="flex-1 min-h-0 flex flex-col p-2">
              <RoomChat
                roomId={room.id}
                messages={room.chat}
                onSend={onChat}
                onlineCount={room.players.filter((p) => p.connected).length}
              />
            </div>
          ) : null}
        </aside>
      </div>

      {/* PIECE SELECTOR MODAL (Enforces unique piece selection) */}
      <AnimatePresence>
        {showPieceModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl border border-white/20 bg-[#0e1824] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">
                    Select Your Unique Piece Avatar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPieceModal(false)}
                  className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4">
                <PiecePicker
                  selectedPiece={me?.piece ?? "horse"}
                  takenByMap={takenByMap}
                  onSelect={(piece: SnakesAndLaddersPieceId) => {
                    onAction("select_piece", { piece });
                    setShowPieceModal(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* VICTORY / OLYMPIC PODIUM MODAL */}
      <AnimatePresence>
        {isFinished ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#142334] to-[#0a121c] p-6 shadow-[0_0_80px_rgba(251,191,36,0.35)]"
            >
              <div className="text-center">
                <span className="text-5xl">🏆</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Game Concluded!
                </h2>
                <p className="text-sm font-semibold text-amber-300 mt-1">
                  {state.winnerUserId
                    ? `${state.players.find((p) => p.userId === state.winnerUserId)?.displayName} reached Tile 100 first!`
                    : "The race has ended!"}
                </p>
              </div>

              {/* OLYMPIC PODIUM (Top 3 Players) */}
              <div className="mt-6 flex items-end justify-center gap-3 sm:gap-4 px-2">
                {/* 2nd Place */}
                {sortedStandings[1] ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">
                      {SNAKES_AND_LADDERS_PIECES.find((p) => p.id === sortedStandings[1]?.piece)?.emoji}
                    </span>
                    <span className="text-xs font-black text-white max-w-[80px] truncate text-center">
                      {sortedStandings[1]?.displayName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Tile {sortedStandings[1]?.position}
                    </span>
                    <div className="mt-2 flex h-24 w-20 sm:w-24 flex-col items-center justify-center rounded-t-2xl border-t-4 border-slate-300 bg-gradient-to-t from-slate-800 to-slate-700 shadow-lg">
                      <span className="text-2xl">🥈</span>
                      <span className="text-xs font-black text-slate-200">2nd</span>
                    </div>
                  </div>
                ) : null}

                {/* 1st Place (Winner) */}
                {sortedStandings[0] ? (
                  <div className="flex flex-col items-center">
                    <Crown className="h-6 w-6 text-amber-400 animate-bounce mb-1" />
                    <span className="text-3xl mb-1">
                      {SNAKES_AND_LADDERS_PIECES.find((p) => p.id === sortedStandings[0]?.piece)?.emoji}
                    </span>
                    <span className="text-sm font-black text-amber-300 max-w-[100px] truncate text-center">
                      {sortedStandings[0]?.displayName}
                    </span>
                    <span className="text-[11px] font-bold text-amber-200/80">
                      Tile 100 🏆
                    </span>
                    <div className="mt-2 flex h-32 w-24 sm:w-28 flex-col items-center justify-center rounded-t-2xl border-t-4 border-amber-400 bg-gradient-to-t from-amber-700/60 to-amber-600/80 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                      <span className="text-3xl">🥇</span>
                      <span className="text-sm font-black text-amber-100">1st Place</span>
                    </div>
                  </div>
                ) : null}

                {/* 3rd Place */}
                {sortedStandings[2] ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">
                      {SNAKES_AND_LADDERS_PIECES.find((p) => p.id === sortedStandings[2]?.piece)?.emoji}
                    </span>
                    <span className="text-xs font-black text-white max-w-[80px] truncate text-center">
                      {sortedStandings[2]?.displayName}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600/80">
                      Tile {sortedStandings[2]?.position}
                    </span>
                    <div className="mt-2 flex h-20 w-20 sm:w-24 flex-col items-center justify-center rounded-t-2xl border-t-4 border-amber-700 bg-gradient-to-t from-amber-950 to-amber-900 shadow-lg">
                      <span className="text-2xl">🥉</span>
                      <span className="text-xs font-black text-amber-200">3rd</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* REMAINING STANDINGS (4th to 15th) */}
              {sortedStandings.length > 3 ? (
                <div className="mt-5 max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2 space-y-1">
                  {sortedStandings.slice(3).map((player, idx) => (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between px-3 py-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white/50">#{idx + 4}</span>
                        <span className="font-semibold text-white">
                          {player.displayName}
                        </span>
                      </div>
                      <span className="font-bold text-amber-300">
                        {player.position === 0 ? "Home" : `Tile ${player.position}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center gap-3">
                {isHost && onEndMatch ? (
                  <button
                    type="button"
                    onClick={() => onEndMatch(room.id)}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 font-black text-slate-950 shadow-lg hover:bg-amber-300 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Return to Lobby</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 font-black text-white hover:bg-white/20 transition"
                  >
                    <span>Leave to Dashboard</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
