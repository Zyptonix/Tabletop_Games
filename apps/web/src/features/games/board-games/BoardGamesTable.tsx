/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { GameEvent, PublicGridGameState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";

type Action = { type: string; [key: string]: unknown };
type Cell = string | null;
type PlayerPalette = { name: string; css: string; light: string; dark: string; ring: string; text: string };
type ConnectFourArt = {
  boardOverlay: string | null;
  redDisc: string | null;
  yellowDisc: string | null;
  dropIndicator: string | null;
  redPlayerBadge: string | null;
  yellowPlayerBadge: string | null;
  screenBackground: string | null;
};

const CONNECT_FOUR_ART_DEFAULTS: ConnectFourArt = {
  boardOverlay: null,
  redDisc: null,
  yellowDisc: null,
  dropIndicator: null,
  redPlayerBadge: null,
  yellowPlayerBadge: null,
  screenBackground: null
};
const CONNECT_FOUR_ART_THEME_URL = "/game-assets/connect-four/theme.json";

function localConnectFourAsset(value: unknown): string | null {
  // Only same-origin public assets under this game's folder are allowed.
  return typeof value === "string" && value.startsWith("/game-assets/connect-four/") && !value.includes("..") ? value : null;
}

function parseConnectFourArt(value: unknown): ConnectFourArt {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return CONNECT_FOUR_ART_DEFAULTS;
  const sprites = (value as { sprites?: unknown }).sprites;
  if (typeof sprites !== "object" || sprites === null || Array.isArray(sprites)) return CONNECT_FOUR_ART_DEFAULTS;
  const source = sprites as Record<string, unknown>;
  return {
    boardOverlay: localConnectFourAsset(source.boardOverlay),
    redDisc: localConnectFourAsset(source.redDisc),
    yellowDisc: localConnectFourAsset(source.yellowDisc),
    dropIndicator: localConnectFourAsset(source.dropIndicator),
    redPlayerBadge: localConnectFourAsset(source.redPlayerBadge),
    yellowPlayerBadge: localConnectFourAsset(source.yellowPlayerBadge),
    screenBackground: localConnectFourAsset(source.screenBackground)
  };
}

const CONNECT_FOUR_COLORS: PlayerPalette[] = [
  { name: "RED", css: "#ed1c24", light: "#ff9699", dark: "#9f0710", ring: "ring-red-100/70", text: "text-red-100" },
  { name: "YELLOW", css: "#ffd500", light: "#fff5a5", dark: "#c58d00", ring: "ring-yellow-100/70", text: "text-yellow-100" }
];
const REVERSI_COLORS: PlayerPalette[] = [
  { name: "BLACK", css: "#151922", light: "#667080", dark: "#030508", ring: "ring-slate-200/60", text: "text-slate-100" },
  { name: "WHITE", css: "#f8fafc", light: "#ffffff", dark: "#aab5c2", ring: "ring-white/70", text: "text-white" }
];

function getPalette(gameId: string, playerIndex: number): PlayerPalette {
  const palette = gameId === "connect-four" ? CONNECT_FOUR_COLORS : REVERSI_COLORS;
  return palette[playerIndex] ?? palette[0]!;
}

function getWinningCells(board: Cell[][], move: { row: number; column: number; playerId: string } | null): Set<string> {
  if (!move) return new Set();
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const line: Array<[number, number]> = [[move.row, move.column]];
    for (const sign of [-1, 1]) {
      let row = move.row + dr * sign;
      let column = move.column + dc * sign;
      while (board[row]?.[column] === move.playerId) {
        line.push([row, column]);
        row += dr * sign;
        column += dc * sign;
      }
    }
    if (line.length >= 4) return new Set(line.map(([row, column]) => `${row},${column}`));
  }
  return new Set();
}

function countPieces(board: Cell[][], playerId: string): number {
  return board.reduce((total, row) => total + row.filter((cell) => cell === playerId).length, 0);
}

function eventEmoji(event: GameEvent, gameId: string): string {
  const text = `${event.type} ${event.message ?? ""}`.toLowerCase();
  if (/win|winner|victory|finished|complete|stalemate/.test(text)) return "🏆";
  if (/flip|capture|bracket/.test(text)) return "🔄";
  if (/pass|skip/.test(text)) return "⏭️";
  if (/turn|start|ready/.test(text)) return "🎯";
  if (/drop|place|move|disc|piece/.test(text)) return gameId === "connect-four" ? "🔴" : "⚫";
  if (/draw|tie/.test(text)) return "🤝";
  return "✨";
}

function eventTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function prettyEventType(type: string): string {
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function BoardGamesTable({
  room,
  state,
  legalActions,
  currentUserId,
  timer,
  gameEvents = [],
  onAction,
  onChat,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicGridGameState;
  legalActions: unknown[];
  currentUserId: string;
  timer?: { currentPlayerId: string | null; remainingMs: number | null } | null;
  gameEvents?: GameEvent[];
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat: (roomId: string, body: string) => void;
  onEndMatch?: (roomId: string) => void;
}) {
  const router = useRouter();
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [keyboardColumn, setKeyboardColumn] = useState(3);
  const [keyboardNavigationActive, setKeyboardNavigationActive] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [connectFourArt, setConnectFourArt] = useState<ConnectFourArt>(CONNECT_FOUR_ART_DEFAULTS);
  const useBoardSprite = state.gameId === "connect-four" && Boolean(connectFourArt.boardOverlay);

  useEffect(() => {
    if (state.gameId !== "connect-four") {
      setConnectFourArt(CONNECT_FOUR_ART_DEFAULTS);
      return;
    }
    let cancelled = false;
    fetch(CONNECT_FOUR_ART_THEME_URL, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<unknown> : null)
      .then((value) => {
        if (!cancelled && value) setConnectFourArt(parseConnectFourArt(value));
      })
      .catch(() => {
        // The CSS-rendered board is the default, so a missing/broken manifest is harmless.
        if (!cancelled) setConnectFourArt(CONNECT_FOUR_ART_DEFAULTS);
      });
    return () => { cancelled = true; };
  }, [state.gameId]);
  const current = state.players.find((player) => player.userId === state.currentPlayerId);
  const currentRoomPlayer = room.players.find((player) => player.userId === state.currentPlayerId);
  const isHost = room.effectiveHostUserId === currentUserId;
  const isMyTurn = state.currentPlayerId === currentUserId && state.phase === "playing" && room.status === "in_game";
  const isBotTurn = Boolean(currentRoomPlayer?.isBot);
  const allowed = legalActions.filter((value): value is Action => typeof value === "object" && value !== null && "type" in value);
  const columnsWithMoves = useMemo(() => new Set(allowed.filter((action) => action.type === "drop").map((action) => Number(action.column))), [legalActions]);
  const legalSquares = useMemo(() => new Set(allowed.filter((action) => action.type === "place").map((action) => `${action.row},${action.column}`)), [legalActions]);
  const discsByPlayerId = state.discsByPlayerId ?? Object.fromEntries(state.players.map((player) => [player.userId, countPieces(state.board, player.userId)]));
  const title = state.gameId === "connect-four" ? "Connect Four" : "Reversi";
  const myPlayerIndex = state.players.findIndex((player) => player.userId === currentUserId);
  const activeHoverColumn = hoverColumn !== null ? hoverColumn : (keyboardNavigationActive ? keyboardColumn : null);
  const ghostRowForHover = useMemo(() => {
    if (activeHoverColumn === null || !isMyTurn || state.gameId !== "connect-four" || state.phase !== "playing") return null;
    for (let r = state.rows - 1; r >= 0; r--) {
      if (!state.board[r]?.[activeHoverColumn]) {
        return r;
      }
    }
    return null;
  }, [activeHoverColumn, isMyTurn, state.gameId, state.phase, state.rows, state.board]);

  const p1 = state.players[0];
  const p2 = state.players[1];
  const clockSeconds = Number(room.settings?.clockSeconds ?? 0);
  const clockFor = (userId: string) => {
    if (timer != null && timer.currentPlayerId === userId && timer.remainingMs !== null) {
      return timer.remainingMs;
    }
    const rem = (state as Record<string, unknown>).clockRemainingMsByPlayer as Record<string, number> | undefined;
    if (rem?.[userId] !== undefined) return rem[userId]!;
    return clockSeconds > 0 ? clockSeconds * 1000 : 300000;
  };
  const formatClock = (milliseconds: number) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const winningCells = state.gameId === "connect-four" && state.phase === "finished" && state.winnerUserId
    ? getWinningCells(state.board, state.lastMove)
    : new Set<string>();
  const winnerName = state.players.find((player) => player.userId === state.winnerUserId)?.displayName;
  const status = room.status === "paused"
    ? "⏸ Match paused"
    : state.phase === "finished"
      ? (state.winnerUserId ? `🏆 ${winnerName ?? "A player"} wins!` : "🤝 Draw — game tied")
      : isMyTurn ? "🟢 Your turn"
        : isBotTurn ? `🤖 ${current?.displayName ?? "Bot"} is thinking…`
          : `🎯 ${current?.displayName ?? "Waiting for player"} to move`;

  useEffect(() => {
    if (!isMyTurn || state.gameId !== "connect-four") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setKeyboardNavigationActive(true);
        setKeyboardColumn((column) => Math.max(0, column - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setKeyboardNavigationActive(true);
        setKeyboardColumn((column) => Math.min(state.columns - 1, column + 1));
      } else if (event.key === "Enter" || event.code === "Space") {
        if (target instanceof HTMLElement && target.closest("button")) return;
        event.preventDefault();
        sendDrop(keyboardColumn);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMyTurn, state.gameId, state.columns, keyboardColumn, columnsWithMoves]);

  function sendDrop(column: number) {
    if (!isMyTurn || !columnsWithMoves.has(column)) return;
    onAction("drop", { column });
    setKeyboardColumn(column);
    setKeyboardNavigationActive(false);
  }

  function sendPlace(row: number, column: number) {
    if (!isMyTurn || !legalSquares.has(`${row},${column}`)) return;
    onAction("place", { row, column });
  }

  function leaveToMenu() {
    router.replace("/dashboard");
  }

  const isFinished = state.phase === "finished" || room.status === "finished";
  const recentEvents = gameEvents.slice(-12).reverse();

  return (
    <main
      className="tt-game-viewport board-game-screen flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#070b11] px-3 py-3 text-white lg:px-4 lg:py-3"
      style={connectFourArt.screenBackground ? { backgroundImage: `linear-gradient(rgba(7,11,17,.76), rgba(7,11,17,.88)), url("${connectFourArt.screenBackground}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col gap-3">
        <header className="flex min-h-[60px] shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-[linear-gradient(120deg,#101a28,#0b111c_72%)] px-4 py-2.5 shadow-[0_12px_38px_rgba(0,0,0,.3)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${state.gameId === "connect-four" ? "border-sky-200/35 bg-sky-400/15 text-sky-100" : "border-emerald-200/25 bg-emerald-400/10 text-emerald-100"}`}>
              <span className="text-lg">{state.gameId === "connect-four" ? "🔴" : "⚫"}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.22em] text-white/40">Tabletop Arena · Room {room.code}</p>
              <h1 className="truncate text-xl font-black tracking-tight">{title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <span className={`hidden rounded-full border px-3 py-2 text-xs font-black sm:inline-flex ${isMyTurn ? "border-emerald-200/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/75"}`} aria-live="polite">{status}</span>
            <button type="button" onClick={() => setChatOpen((open) => !open)} className="min-h-10 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-white/75 hover:bg-white/10" title={chatOpen ? "Hide chat" : "Show chat"}>{chatOpen ? "💬 Chat on" : "💬 Chat"}</button>
            <button type="button" onClick={leaveToMenu} className="min-h-10 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-white/75 hover:bg-white/10">🏠 Dashboard</button>
            {isHost && !isFinished && room.status !== "abandoned" && onEndMatch ? <button type="button" onClick={() => { if (window.confirm("End this match for everyone?")) onEndMatch(room.id); }} className="min-h-10 rounded-lg border border-rose-300/20 bg-rose-400/[0.07] px-3 text-xs font-bold text-rose-100 hover:bg-rose-400/15">🛑 End</button> : null}
          </div>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_354px]">
          <section className="board-game-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(ellipse_at_top,rgba(26,74,100,.22),transparent_64%),linear-gradient(145deg,#0c1420,#080d15_72%)] p-3 shadow-[0_22px_64px_rgba(0,0,0,.3)] lg:p-4">
            {state.gameId === "connect-four" ? (
              <>
                <div className="mb-2 flex shrink-0 items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-sky-200/55">Classic arcade · 2 players</p>
                    <h2 className="text-lg font-black tracking-tight">Drop a disc. <span className="text-white/45">Connect four.</span></h2>
                  </div>
                  <div className="hidden items-center gap-2 text-[0.7rem] font-semibold text-white/40 md:flex"><span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">CLICK</span> column or slot <span className="text-white/20">·</span><span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">← →</span> choose</div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col xl:flex-row items-center justify-center gap-4 lg:gap-8 py-2 px-1">
                  {/* LEFT SIDE PANEL: CHESS CLOCK TIMERS & STATUS (Unblocks the board completely) */}
                  <div className="flex w-full xl:w-[220px] 2xl:w-[240px] shrink-0 flex-row xl:flex-col items-stretch justify-center gap-2.5 sm:gap-3">
                    {/* Opponent Card (Yellow - Player 2) */}
                    {p2 ? (
                      <div className={`flex flex-1 xl:flex-none flex-col gap-1.5 rounded-2xl border p-2.5 sm:p-3 transition-all ${
                        state.currentPlayerId === p2.userId && state.phase === "playing"
                          ? "border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
                          : "border-white/10 bg-slate-900/60"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 shadow text-[10px] font-black text-black">
                              🟡
                            </span>
                            <span className="truncate text-xs font-bold text-white tracking-wide">
                              {p2.displayName}
                            </span>
                          </div>
                          {room.players.find((p) => p.userId === p2.userId)?.isBot ? (
                            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-sky-300">BOT</span>
                          ) : null}
                        </div>
                        <div className={`flex items-center justify-center gap-2 rounded-xl py-1 sm:py-1.5 font-mono text-lg sm:text-xl font-black tabular-nums transition-all ${
                          state.currentPlayerId === p2.userId && state.phase === "playing"
                            ? "bg-amber-400 text-slate-950 shadow-md animate-pulse"
                            : "bg-black/40 text-white/70"
                        }`}>
                          <span>{formatClock(clockFor(p2.userId))}</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Match Status Card (Placed in the left dock, out of the board's way) */}
                    <div className="hidden xl:flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-3 text-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Match Status</span>
                      <p className="text-xs font-extrabold text-white">
                        {isFinished
                          ? (state.winnerUserId ? `🏆 ${winnerName ?? "Player"} wins!` : "🤝 Draw game")
                          : isMyTurn ? "✨ Your move"
                          : isBotTurn ? "🤖 Thinking…"
                          : "👀 Waiting…"}
                      </p>
                      <p className="text-[11px] font-medium text-white/50">
                        {isFinished ? "Round complete" : isMyTurn ? "Pick a column or slot" : "Watch for winning lines"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-black tracking-wider text-white/30">
                        <span>🔴 RED</span>
                        <span>VS</span>
                        <span>🟡 YELLOW</span>
                      </div>
                    </div>

                    {/* Your Card (Red - Player 1) */}
                    {p1 ? (
                      <div className={`flex flex-1 xl:flex-none flex-col gap-1.5 rounded-2xl border p-2.5 sm:p-3 transition-all ${
                        state.currentPlayerId === p1.userId && state.phase === "playing"
                          ? "border-rose-500 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/50"
                          : "border-white/10 bg-slate-900/60"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-700 shadow text-[10px] font-black text-white">
                              🔴
                            </span>
                            <span className="truncate text-xs font-bold text-white tracking-wide">
                              {p1.displayName} {p1.userId === currentUserId ? "(You)" : ""}
                            </span>
                          </div>
                          {p1.userId === currentUserId ? (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-300">YOU</span>
                          ) : null}
                        </div>
                        <div className={`flex items-center justify-center gap-2 rounded-xl py-1 sm:py-1.5 font-mono text-lg sm:text-xl font-black tabular-nums transition-all ${
                          state.currentPlayerId === p1.userId && state.phase === "playing"
                            ? "bg-rose-500 text-white shadow-md animate-pulse"
                            : "bg-black/40 text-white/70"
                        }`}>
                          <span>{formatClock(clockFor(p1.userId))}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* CENTER: 3D CONNECT FOUR CABINET */}
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-2">
                    <div
                      className={`connect-four-cabinet relative flex max-h-full min-h-0 max-w-full ${useBoardSprite ? "connect-four-sprite-cabinet" : "flex-col rounded-[1.75rem] border-x-[6px] border-t-[5px] border-b-[8px] border-sky-400/40 p-2 sm:p-3 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)]"}`}
                      onPointerMove={(event) => { if (event.pointerType === "mouse") setKeyboardNavigationActive(false); }}
                      onPointerLeave={() => { setHoverColumn(null); setKeyboardNavigationActive(false); }}
                      style={{
                        width: useBoardSprite
                          ? "min(100%, 1200px, calc((100dvh - 250px) * 1.8347))"
                          : "min(100%, 880px, calc((100dvh - 250px) * 1.1667))",
                        aspectRatio: useBoardSprite ? "677 / 369" : undefined
                      }}
                    >
                    {useBoardSprite ? (
                      <div className="connect-four-sprite-controls absolute z-30 grid" style={{ left: "17.2%", top: "2.2%", width: "65.6%", height: "4.3%", gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))` }} aria-label="Drop into column" onPointerLeave={() => setHoverColumn(null)}>
                        {Array.from({ length: state.columns }, (_, column) => {
                          const enabled = isMyTurn && columnsWithMoves.has(column);
                          const hovered = hoverColumn === column || (keyboardNavigationActive && keyboardColumn === column);
                          const discColor = CONNECT_FOUR_COLORS[state.players.findIndex((player) => player.userId === currentUserId)] ?? CONNECT_FOUR_COLORS[0]!;
                          return (
                            <button key={column} type="button" disabled={!enabled} onPointerEnter={() => { setHoverColumn(column); setKeyboardNavigationActive(false); }} onFocus={() => { setHoverColumn(column); setKeyboardNavigationActive(true); }} onBlur={() => { setHoverColumn(null); setKeyboardNavigationActive(false); }} onClick={() => sendDrop(column)} aria-label={`Drop disc in column ${column + 1}`} className="grid h-full min-w-0 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed">
                              <motion.span animate={{ scale: hovered && enabled ? 1.08 : 1, opacity: enabled ? (hovered ? 0.96 : 0.52) : 0.08, y: hovered && enabled ? 1 : 0 }} transition={{ type: "spring", stiffness: 360, damping: 24 }} className="connect-four-drop-indicator relative block aspect-square h-[min(0.9rem,90%)] rounded-full border" style={{ background: `radial-gradient(circle at 30% 20%,${discColor.light},${discColor.css} 52%,${discColor.dark})`, borderColor: discColor.light, boxShadow: hovered && enabled ? `0 0 14px ${discColor.css}88` : "inset 0 2px 4px #0008" }}>
                                {connectFourArt.dropIndicator ? <img src={connectFourArt.dropIndicator} alt="" aria-hidden="true" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} className="pointer-events-none absolute inset-[-20%] h-[140%] w-[140%] object-contain" /> : null}
                              </motion.span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* TOP DROP FUNNEL CHUTES */}
                    {!useBoardSprite ? (
                      <div className="connect-four-top-lip relative z-10 mb-1.5 grid h-9 shrink-0 grid-cols-7 items-center gap-1.5 rounded-xl border border-sky-400/30 px-2 sm:h-10 sm:px-3" aria-label="Drop into column" onPointerLeave={() => setHoverColumn(null)}>
                        {Array.from({ length: state.columns }, (_, column) => {
                          const enabled = isMyTurn && columnsWithMoves.has(column);
                          const hovered = hoverColumn === column || (keyboardNavigationActive && keyboardColumn === column);
                          const discColor = CONNECT_FOUR_COLORS[myPlayerIndex >= 0 ? myPlayerIndex : 0] ?? CONNECT_FOUR_COLORS[0]!;
                          return (
                            <button
                              key={column}
                              type="button"
                              disabled={!enabled}
                              onPointerEnter={() => { setHoverColumn(column); setKeyboardNavigationActive(false); }}
                              onFocus={() => { setHoverColumn(column); setKeyboardNavigationActive(true); }}
                              onBlur={() => { setHoverColumn(null); setKeyboardNavigationActive(false); }}
                              onClick={() => sendDrop(column)}
                              aria-label={`Drop disc in column ${column + 1}`}
                              className="group relative flex h-full min-w-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed"
                            >
                              {/* 3D Drop Notch Bevel */}
                              <div className={`absolute inset-x-1.5 top-0 bottom-1 rounded-b-md transition-colors ${hovered && enabled ? "bg-sky-400/25 border-b-2 border-sky-300" : "bg-black/30 border-b border-white/10"}`} />
                              <motion.span
                                animate={{
                                  scale: hovered && enabled ? 1.15 : 1,
                                  opacity: enabled ? (hovered ? 1 : 0.45) : 0.08,
                                  y: hovered && enabled ? [0, 2, 0] : 0
                                }}
                                transition={{
                                  type: hovered && enabled ? "spring" : "tween",
                                  stiffness: 400,
                                  damping: 20,
                                  y: { repeat: hovered && enabled ? Infinity : 0, duration: 0.8 }
                                }}
                                className="connect-four-drop-indicator relative z-10 block aspect-square h-[min(1.4rem,85%)] rounded-full border-[1.5px]"
                                style={{
                                  background: `radial-gradient(circle at 32% 28%, ${discColor.light} 0%, ${discColor.css} 50%, ${discColor.dark} 100%)`,
                                  borderColor: discColor.light,
                                  boxShadow: hovered && enabled ? `0 0 16px ${discColor.css}, inset 0 2px 4px rgba(255,255,255,0.6)` : "inset 0 1px 3px rgba(0,0,0,0.5)"
                                }}
                              >
                                {hovered && enabled ? (
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                                    ↓
                                  </span>
                                ) : null}
                              </motion.span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* MOLDED 3D BOARD GRID */}
                    <div
                      className={useBoardSprite ? "connect-four-sprite-grid absolute z-10 grid" : "connect-four-grid relative z-10 grid w-full grid-cols-7 gap-1.5 sm:gap-2 p-2 sm:p-3 overflow-visible rounded-2xl border-2 border-[#093c76]"}
                      style={useBoardSprite
                        ? { left: "17.2%", top: "6.2%", width: "65.6%", height: "84.8%", gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))` }
                        : { gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))`, aspectRatio: "7 / 6" }}
                      role="group"
                      aria-label="Connect Four board"
                      onPointerLeave={() => setHoverColumn(null)}
                    >
                      {state.board.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
                        const key = `${rowIndex},${columnIndex}`;
                        const legal = columnsWithMoves.has(columnIndex);
                        const playerIndex = state.players.findIndex((player) => player.userId === cell);
                        const color = CONNECT_FOUR_COLORS[playerIndex] ?? CONNECT_FOUR_COLORS[0]!;
                        const isLast = state.lastMove?.row === rowIndex && state.lastMove?.column === columnIndex;
                        const isWinning = winningCells.has(key);
                        const isHovered = activeHoverColumn === columnIndex;
                        const occupied = Boolean(cell);
                        const isGhost = isMyTurn && !occupied && columnIndex === activeHoverColumn && rowIndex === ghostRowForHover;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => sendDrop(columnIndex)}
                            onPointerEnter={() => { setHoverColumn(columnIndex); setKeyboardNavigationActive(false); }}
                            disabled={!isMyTurn || state.phase !== "playing" || !legal}
                            aria-label={cell ? `${state.players[playerIndex]?.displayName ?? "Player"} ${color.name.toLowerCase()} disc at row ${rowIndex + 1}, column ${columnIndex + 1}` : `Empty slot row ${rowIndex + 1}, column ${columnIndex + 1}${legal ? ", legal column" : ""}`}
                            className={`${useBoardSprite ? "connect-four-sprite-cell" : "connect-four-cell relative flex items-center justify-center p-0.5 bg-transparent border-none"} focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${isHovered && isMyTurn ? "connect-four-slot-hover" : ""} ${isWinning ? "connect-four-winning-slot" : ""}`}
                            style={{ zIndex: isLast ? 20 : isGhost ? 15 : 0 }}
                          >
                            <span className={useBoardSprite ? `connect-four-sprite-cell-content ${isWinning ? "connect-four-winning-hole" : ""}` : `connect-four-hole relative grid aspect-square w-full place-items-center rounded-full ${isWinning ? "connect-four-winning-hole" : ""}`}>
                              {/* OCCUPIED 3D DISC */}
                              {cell ? (
                                <motion.div
                                  key={`${key}-${cell}`}
                                  initial={{ y: -((rowIndex + 1.8) * 85), scale: 0.9 }}
                                  animate={{ y: 0, scale: isWinning ? [1, 1.05, 1] : 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 350,
                                    damping: 20,
                                    mass: 0.72,
                                    scale: { duration: 0.45, repeat: isWinning ? Infinity : 0, repeatType: "reverse" }
                                  }}
                                  className={`${useBoardSprite ? "connect-four-sprite-disc" : "connect-four-disc relative z-10 flex h-[92%] w-[92%] items-center justify-center rounded-full"} ${isLast ? "connect-four-last-disc" : ""} ${isWinning ? "connect-four-winning-disc" : ""}`}
                                  style={{
                                    background: playerIndex === 0
                                      ? "radial-gradient(circle at 32% 28%, #ff4b6e 0%, #e11d48 35%, #be123c 72%, #881337 100%)"
                                      : "radial-gradient(circle at 32% 28%, #fff066 0%, #facc15 35%, #eab308 72%, #854d0e 100%)",
                                    boxShadow: playerIndex === 0
                                      ? "inset 0 3px 5px rgba(255,255,255,0.55), inset 0 -6px 8px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.4)"
                                      : "inset 0 3px 5px rgba(255,255,255,0.65), inset 0 -6px 8px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.35)"
                                  }}
                                >
                                  {!useBoardSprite ? (
                                    <>
                                      {/* Concentric Embossed Coin Ring */}
                                      <span className="pointer-events-none absolute inset-[14%] rounded-full border-[2.5px] border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.35),0_1px_2px_rgba(255,255,255,0.25)]" />
                                      {/* Inner Coin Boss & Specular Flare */}
                                      <span className="pointer-events-none absolute inset-[34%] rounded-full bg-gradient-to-br from-white/35 to-black/25 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_0_0_1.5px_rgba(0,0,0,0.2)]" />
                                      <span className="pointer-events-none absolute left-[22%] top-[14%] h-[20%] w-[32%] rounded-full bg-white/60 blur-[0.6px]" />

                                      {/* Sunken Socket Shadow Overlay (Authentic 3D socket depth) */}
                                      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_10px_14px_rgba(0,0,0,0.65),inset_0_-3px_5px_rgba(255,255,255,0.2)]" />
                                    </>
                                  ) : null}

                                  {/* Custom disc sprite if configured */}
                                  {state.gameId === "connect-four" && (playerIndex === 0 ? connectFourArt.redDisc : connectFourArt.yellowDisc) ? (
                                    <img
                                      src={(playerIndex === 0 ? connectFourArt.redDisc : connectFourArt.yellowDisc) ?? undefined}
                                      alt=""
                                      aria-hidden="true"
                                      draggable={false}
                                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                                      className={`connect-four-custom-disc pointer-events-none absolute z-10 select-none ${useBoardSprite ? "object-contain" : "inset-0 h-full w-full object-fill"}`}
                                      style={useBoardSprite ? { inset: "-6%", width: "100%", height: "100%" } : undefined}
                                    />
                                  ) : null}
                                </motion.div>
                              ) : isGhost ? (
                                /* GHOST DISC ON HOVER AT TARGET CELL */
                                <motion.div
                                  initial={{ opacity: 0.25, scale: 0.88 }}
                                  animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 0.96, 0.92] }}
                                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                                  className="pointer-events-none relative z-10 flex h-[92%] w-[92%] items-center justify-center rounded-full"
                                  style={{
                                    background: myPlayerIndex === 1
                                      ? "radial-gradient(circle at 35% 30%, rgba(250, 204, 21, 0.55), rgba(161, 98, 7, 0.45))"
                                      : "radial-gradient(circle at 35% 30%, rgba(244, 63, 94, 0.55), rgba(159, 18, 57, 0.45))",
                                    border: myPlayerIndex === 1 ? "2.5px dashed #facc15" : "2.5px dashed #f43f5e",
                                    boxShadow: myPlayerIndex === 1 ? "0 0 16px rgba(250, 204, 21, 0.5)" : "0 0 16px rgba(244, 63, 94, 0.5)"
                                  }}
                                >
                                  <span className="text-xs font-black text-white/90 drop-shadow">↓</span>
                                </motion.div>
                              ) : null}
                            </span>
                          </button>
                        );
                      }))}
                    </div>

                    {useBoardSprite ? <img src={connectFourArt.boardOverlay ?? undefined} alt="" aria-hidden="true" draggable={false} onError={() => setConnectFourArt((currentArt) => ({ ...currentArt, boardOverlay: null }))} className="connect-four-board-overlay connect-four-board-sprite pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-fill" /> : null}

                    {/* MOLDED 3D SUPPORT LEGS */}
                    {!useBoardSprite ? (
                      <div className="pointer-events-none absolute -bottom-8 left-2 right-2 z-0 flex justify-between px-3 sm:px-6" aria-hidden="true">
                        {/* Left 3D Support Leg */}
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-11 sm:w-14 rounded-t-lg bg-gradient-to-b from-[#1366bd] to-[#04335c] border-2 border-b-0 border-[#38a3f8] shadow-lg" />
                          <div className="h-4 w-22 sm:w-28 rounded-full bg-gradient-to-r from-[#031d36] via-[#094d84] to-[#031d36] border border-white/25 shadow-2xl" />
                          <div className="h-2 w-20 sm:w-26 rounded-full bg-black/75 blur-[2.5px] mt-0.5" />
                        </div>
                        {/* Right 3D Support Leg */}
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-11 sm:w-14 rounded-t-lg bg-gradient-to-b from-[#1366bd] to-[#04335c] border-2 border-b-0 border-[#38a3f8] shadow-lg" />
                          <div className="h-4 w-22 sm:w-28 rounded-full bg-gradient-to-r from-[#031d36] via-[#094d84] to-[#031d36] border border-white/25 shadow-2xl" />
                          <div className="h-2 w-20 sm:w-26 rounded-full bg-black/75 blur-[2.5px] mt-0.5" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
            ) : (
              <>
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
                  <div><p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-200/55">Classic strategy · 2 players</p><h2 className="text-lg font-black tracking-tight">Reversi <span className="text-white/45">/ Othello</span></h2></div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/55">⚫ Capture by trapping</span>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                  <div className="reversi-board-shell w-full max-h-full max-w-full rounded-2xl border border-emerald-200/25 bg-[linear-gradient(145deg,#236d50,#124a37_55%,#0b3428)] p-2 shadow-[0_24px_65px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.18)] sm:p-3" style={{ width: "min(100%, calc(100dvh - 230px))" }}>
                    <div className="grid aspect-square w-full gap-px overflow-hidden rounded-lg border border-white/10 bg-[#7db89b]/40 p-px" style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))` }} role="group" aria-label="Reversi board">
                      {state.board.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
                        const key = `${rowIndex},${columnIndex}`;
                        const legal = legalSquares.has(key);
                        const playerIndex = state.players.findIndex((player) => player.userId === cell);
                        const isLast = state.lastMove?.row === rowIndex && state.lastMove?.column === columnIndex;
                        const color = getPalette(state.gameId, playerIndex < 0 ? 0 : playerIndex);
                        return (
                          <button key={key} type="button" onClick={() => sendPlace(rowIndex, columnIndex)} disabled={!isMyTurn || state.phase !== "playing" || !legal} aria-label={cell ? `${state.players[playerIndex]?.displayName ?? "Player"} disc at row ${rowIndex + 1}, column ${columnIndex + 1}` : `Square row ${rowIndex + 1}, column ${columnIndex + 1}${legal ? ", legal move" : ""}`} className={`relative grid min-h-0 min-w-0 place-items-center p-0 transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${legal && isMyTurn ? "cursor-pointer bg-emerald-200/20 hover:bg-emerald-100/30" : (rowIndex + columnIndex) % 2 === 0 ? "bg-[#1d6549]" : "bg-[#15523b]"}`}>
                            {cell ? <motion.span initial={{ scale: 0.45, rotate: -35 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={`aspect-square w-[78%] rounded-full border ${playerIndex === 0 ? "border-white/25 bg-[radial-gradient(circle_at_30%_22%,#4b5563,#111827_60%,#020617)] shadow-[inset_0_2px_5px_rgba(255,255,255,.2),inset_0_-5px_8px_rgba(0,0,0,.45),0_3px_6px_rgba(0,0,0,.3)]" : "border-white/70 bg-[radial-gradient(circle_at_30%_22%,#fff,#e2e8f0_62%,#94a3b8)] shadow-[inset_0_2px_5px_rgba(255,255,255,.9),inset_0_-5px_8px_rgba(15,23,42,.25),0_3px_6px_rgba(0,0,0,.3)]"} ${isLast ? "ring-2 ring-amber-200 ring-offset-1 ring-offset-[#15523b]" : ""}`} /> : legal && isMyTurn ? <span className="h-[22%] w-[22%] rounded-full bg-amber-100/75 shadow-[0_0_12px_rgba(253,230,138,.6)]" /> : null}
                          </button>
                        );
                      }))}
                    </div>
                  </div>
                </div>
                {allowed.some((action) => action.type === "pass") && !isFinished ? <div className="mt-2 shrink-0 text-center"><button type="button" disabled={!isMyTurn} onClick={() => onAction("pass")} className="min-h-10 rounded-xl bg-amber-300 px-4 text-sm font-black text-amber-950 hover:bg-amber-200 disabled:opacity-40">⏭️ No legal move · Pass turn</button></div> : null}
              </>
            )}

            {isFinished ? (
              <div className="absolute inset-0 z-40 grid place-items-center bg-[#02060c]/70 p-4 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-2xl border border-amber-200/25 bg-[linear-gradient(145deg,#172334,#0a111d)] p-6 text-center shadow-[0_26px_90px_rgba(0,0,0,.65)]">
                  <div className="text-4xl">{state.winnerUserId ? "🏆" : "🤝"}</div>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-amber-100/55">Match complete</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{state.winnerUserId ? `${winnerName ?? "A player"} wins!` : "It's a draw!"}</h2>
                  <p className="mt-2 text-sm text-white/55">Game complete. The result will stay here until you choose to leave.</p>
                  <button type="button" onClick={leaveToMenu} className="mt-5 min-h-12 w-full rounded-xl bg-amber-300 px-4 text-sm font-black text-amber-950 shadow-lg shadow-amber-950/25 transition hover:bg-amber-200">🏠 Return to dashboard</button>
                </motion.div>
              </div>
            ) : null}
          </section>

          <aside className="hidden min-h-0 min-w-0 flex-col gap-3 overflow-hidden lg:flex">
            <section className="shrink-0 rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,#111b29,#0a111b)] p-3 shadow-[0_14px_38px_rgba(0,0,0,.24)]">
              <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/45">👥 Players</h2><span className="text-[0.65rem] font-bold text-white/30">{state.players.length} seats</span></div>
              <div className="space-y-2">
                {state.players.map((player, index) => {
                  const color = getPalette(state.gameId, index);
                  const currentTurn = state.currentPlayerId === player.userId;
                  const isBot = Boolean(room.players.find((roomPlayer) => roomPlayer.userId === player.userId)?.isBot);
                  const score = state.gameId === "reversi" ? (discsByPlayerId[player.userId] ?? 0) : countPieces(state.board, player.userId);
                  return (
                    <div key={player.userId} className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2 ${currentTurn ? "border-emerald-200/35 bg-emerald-300/[0.075]" : "border-white/[0.07] bg-black/15"}`}>
                      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border-2" style={{ background: `radial-gradient(circle at 30% 20%,${color.light},${color.css} 45%,${color.dark})`, borderColor: `${color.light}aa`, boxShadow: `inset 0 2px 4px #ffffff45,inset 0 -4px 5px #0005` }}>
                        {state.gameId === "connect-four" && (index === 0 ? connectFourArt.redPlayerBadge ?? connectFourArt.redDisc : connectFourArt.yellowPlayerBadge ?? connectFourArt.yellowDisc) ? <img src={(index === 0 ? connectFourArt.redPlayerBadge ?? connectFourArt.redDisc : connectFourArt.yellowPlayerBadge ?? connectFourArt.yellowDisc) ?? undefined} alt="" aria-hidden="true" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} className="pointer-events-none absolute inset-[-10%] h-[120%] w-[120%] select-none object-contain" /> : null}
                      </span>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><p className="mt-0.5 truncate text-[0.62rem] font-semibold text-white/40">{currentTurn ? (isBot ? "🤖 Bot thinking" : "🎯 Playing now") : isBot ? "🤖 AI opponent" : "🧑 Player"}</p></div>
                      <div className="shrink-0 text-right"><p className="text-xl font-black tabular-nums" style={{ color: color.css }}>{score}</p><p className="text-[0.55rem] font-bold uppercase tracking-wider text-white/30">{state.gameId === "reversi" ? "discs" : "pieces"}</p></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs font-bold text-white/65" aria-live="polite">{status}</div>
            </section>

            <section className="flex min-h-[130px] min-w-0 flex-[0.85] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,#101b29,#080e17)] shadow-[0_14px_38px_rgba(0,0,0,.22)]">
              <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2.5"><h2 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/50">📜 Game log</h2><span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.58rem] font-bold text-white/30">LIVE</span></header>
              <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-2.5 [scrollbar-color:#334155_#080e17] [scrollbar-width:thin]">
                {recentEvents.length ? recentEvents.map((event) => (
                  <article key={event.id} className="flex items-start gap-2 rounded-lg border border-white/[0.045] bg-white/[0.025] px-2 py-1.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-black/20 text-base">{eventEmoji(event, state.gameId)}</span>
                    <div className="min-w-0 flex-1"><p className="break-words text-[0.7rem] font-semibold leading-snug text-white/78">{event.message || prettyEventType(event.type)}</p><p className="mt-0.5 text-[0.55rem] font-bold text-white/25">{eventTime(event.createdAt)}</p></div>
                  </article>
                )) : <div className="grid h-full min-h-20 place-items-center px-4 text-center"><p className="text-xs font-semibold text-white/35">🎲 The first move will appear here.</p></div>}
                {isFinished ? <div className="flex items-center gap-2 rounded-lg border border-amber-200/15 bg-amber-300/[0.05] px-2.5 py-2 text-xs font-bold text-amber-100/80"><span>🏆</span> {winnerName ? `${winnerName} won the match.` : "The match ended in a draw."}</div> : null}
              </div>
            </section>

            <section className={`${chatOpen ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
              <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={room.players.filter((player) => player.connected).length} />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
