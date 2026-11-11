"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Dices,
  Crown,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Palette,
  RotateCcw,
  Volume2,
  ChevronRight,
  CheckCircle2,
  X
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
import { SnakesAndLaddersBoardView } from "./SnakesAndLaddersBoardView";
import { PiecePicker } from "./PiecePicker";

export interface SnakesAndLaddersTableProps {
  room: RoomStateView;
  state: PublicSnakesAndLaddersState;
  legalActions: unknown[];
  gameEvents?: GameEvent[] | undefined;
  currentUserId: string;
  timer?: TimerView | null | undefined;
  onAction: (type: string, payload?: Record<string, unknown> | undefined) => void;
  onChat: (roomId: string, body: string) => void;
  onEndMatch?: ((roomId: string) => void) | undefined;
}

export function SnakesAndLaddersTable({
  room,
  state,
  legalActions,
  gameEvents = [],
  currentUserId,
  timer,
  onAction,
  onChat,
  onEndMatch
}: SnakesAndLaddersTableProps) {
  const router = useRouter();
  const [showPieceModal, setShowPieceModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"standings" | "chat" | "feed">("standings");

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = state.currentPlayerId === currentUserId;
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const isHost = room.effectiveHostUserId === currentUserId;
  const isFinished = state.phase === "finished";

  const canRoll = Boolean(
    isMyTurn &&
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

  const myPieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === me?.piece);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#070d14] text-slate-100">
      {/* HEADER */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1622]/90 px-4 sm:px-6 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-xl shadow-md">
            🐍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight sm:text-lg">
                Snakes & Ladders
              </h1>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                {state.board.name}
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              {state.players.length} Players • Target: Tile 100 🏆
            </p>
          </div>
        </div>

        {/* Current Turn Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 transition-all ${
              isMyTurn
                ? "border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/40 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                : "border-white/10 bg-black/40 text-white/70"
            }`}
          >
            <span className="text-base">
              {isMyTurn ? "👉" : "⏳"}
            </span>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                {isMyTurn ? "Your Turn" : "Current Turn"}
              </p>
              <p className="text-xs font-black truncate max-w-[120px]">
                {currentPlayer?.displayName ?? "Waiting..."}
              </p>
            </div>
          </div>

          {/* Change Piece Button */}
          {canSelectPiece && me ? (
            <button
              type="button"
              onClick={() => setShowPieceModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:border-amber-400/50 hover:bg-amber-400/10 transition"
              title="Change your game piece"
            >
              <Palette className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-base">{myPieceInfo?.emoji}</span>
              <span className="hidden sm:inline">Avatar</span>
            </button>
          ) : null}

          {/* End Room Button for Host */}
          {isHost && onEndMatch ? (
            <button
              type="button"
              onClick={() => onEndMatch(room.id)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              End Room
            </button>
          ) : null}
        </div>
      </header>

      {/* MAIN LAYOUT: BOARD ON LEFT, CONTROLS & STANDINGS ON RIGHT */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* CENTER / LEFT: BOARD VIEW */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center justify-center">
          <SnakesAndLaddersBoardView
            state={state}
            currentUserId={currentUserId}
          />
        </main>

        {/* RIGHT PANEL: DICE CONTROL + 15-PLAYER STANDINGS / CHAT */}
        <aside className="w-80 lg:w-96 shrink-0 border-l border-white/10 bg-[#0a121c] flex flex-col min-h-0">
          {/* DICE ROLLING SECTION */}
          <div className="p-4 border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Dices className="h-3.5 w-3.5" /> Dice Action
              </span>
              {state.diceRoll ? (
                <span className="text-xs font-bold text-white/50">
                  Last roll: <strong className="text-amber-300 text-sm">{state.diceRoll}</strong>
                </span>
              ) : null}
            </div>

            {/* 3D Tumbling Dice Display & Roll Action */}
            <div className="flex flex-col items-center justify-center py-2">
              <TumblingDice3D
                value={state.diceRoll}
                canRoll={canRoll}
                onRoll={() => onAction("roll_dice")}
                disabled={!canRoll}
                label={isMyTurn ? "Roll Dice 🎲" : `Waiting for ${currentPlayer?.displayName ?? "Player"}`}
              />

              {/* Status / Bangladesh Rule Hint */}
              <div className="mt-3 text-center">
                {me?.position === 0 ? (
                  <p className="text-xs font-black text-amber-300 animate-pulse">
                    ⚠️ Roll a 1 to enter the board!
                  </p>
                ) : isMyTurn ? (
                  <p className="text-xs font-black text-emerald-300">
                    It's your turn! Roll to advance.
                  </p>
                ) : (
                  <p className="text-xs text-white/40">
                    Waiting for {currentPlayer?.displayName} to take their turn...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* TABS HEADER: STANDINGS / CHAT / LOG */}
          <div className="flex border-b border-white/10 bg-black/20 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSidebarTab("standings")}
              className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
                sidebarTab === "standings"
                  ? "border-b-2 border-amber-400 text-amber-300 bg-amber-400/5 font-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Standings ({state.players.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("feed")}
              className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 ${
                sidebarTab === "feed"
                  ? "border-b-2 border-amber-400 text-amber-300 bg-amber-400/5 font-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Activity</span>
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

          {/* TAB CONTENT: STANDINGS LIST */}
          {sidebarTab === "standings" ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sortedStandings.map((player, rank) => {
                const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
                const isTurn = player.userId === state.currentPlayerId;
                const isMe = player.userId === currentUserId;
                const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";
                const isWinner = player.position === 100;

                return (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                      isWinner
                        ? "border-amber-400 bg-gradient-to-r from-amber-500/20 to-amber-600/10 ring-2 ring-amber-400/40"
                        : isTurn
                        ? "border-amber-400/50 bg-amber-500/10"
                        : isMe
                        ? "border-white/20 bg-white/5"
                        : "border-white/5 bg-black/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Medal */}
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-black/40 text-xs font-black text-amber-300 shrink-0">
                        {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
                      </span>

                      {/* Piece Icon */}
                      <span
                        className="grid h-8 w-8 place-items-center rounded-lg border text-lg shrink-0 shadow"
                        style={{ borderColor: color, backgroundColor: `${color}20` }}
                      >
                        {pieceInfo?.emoji ?? "🎲"}
                      </span>

                      {/* Player Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-white truncate max-w-[110px]">
                            {player.displayName}
                          </p>
                          {isMe ? (
                            <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-black text-amber-300">
                              YOU
                            </span>
                          ) : null}
                          {player.isBot ? (
                            <span className="rounded bg-purple-400/20 px-1 py-0.2 text-[9px] font-black text-purple-300">
                              BOT
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-white/50 truncate">
                          {pieceInfo?.name}
                        </p>
                      </div>
                    </div>

                    {/* Tile Position */}
                    <div className="text-right shrink-0">
                      {player.position === 0 ? (
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/60">
                          Home (0)
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-amber-300">
                            Square {player.position}
                          </span>
                          <span className="text-[9px] font-semibold text-white/40">
                            {100 - player.position} away
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* TAB CONTENT: ACTIVITY FEED */}
          {sidebarTab === "feed" ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs font-medium">
              {state.activityLog.length === 0 ? (
                <p className="p-4 text-center text-white/40">No activity yet</p>
              ) : (
                state.activityLog
                  .slice(-25)
                  .reverse()
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/5 bg-black/30 p-2 text-white/80"
                    >
                      <p>{item.message}</p>
                      <p className="mt-0.5 text-[9px] text-white/30">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
              )}
            </div>
          ) : null}

          {/* TAB CONTENT: CHAT */}
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

      {/* PIECE SELECTOR MODAL */}
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
                    Select Your Piece Avatar
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
