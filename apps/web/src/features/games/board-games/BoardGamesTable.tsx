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
  gameEvents = [],
  onAction,
  onChat,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicGridGameState;
  legalActions: unknown[];
  currentUserId: string;
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

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 pb-1">
                  <div
                    className={`connect-four-cabinet relative flex max-h-full min-h-0 max-w-full ${useBoardSprite ? "connect-four-sprite-cabinet" : "flex-col rounded-[1.25rem] border-[3px] border-[#126bb3] p-2.5 sm:rounded-[1.5rem] sm:p-3"}`}
                    onPointerMove={(event) => { if (event.pointerType === "mouse") setKeyboardNavigationActive(false); }}
                    onPointerLeave={() => { setHoverColumn(null); setKeyboardNavigationActive(false); }}
                    style={{
                      width: useBoardSprite
                        ? "min(100%, 1200px, calc((100dvh - 250px) * 1.8347))"
                        : "min(100%, 920px, calc((100dvh - 250px) * 1.1667))",
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
                    {!useBoardSprite ? <div className="connect-four-top-lip relative z-10 mb-1 grid h-7 shrink-0 grid-cols-7 items-center gap-1 rounded-md border border-[#064a86] px-1.5 sm:mb-2 sm:h-8 sm:px-2" aria-label="Drop into column" onPointerLeave={() => setHoverColumn(null)}>
                      {Array.from({ length: state.columns }, (_, column) => {
                        const enabled = isMyTurn && columnsWithMoves.has(column);
                        const hovered = hoverColumn === column || (keyboardNavigationActive && keyboardColumn === column);
                        const discColor = CONNECT_FOUR_COLORS[state.players.findIndex((player) => player.userId === currentUserId)] ?? CONNECT_FOUR_COLORS[0]!;
                        return (
                          <button key={column} type="button" disabled={!enabled} onPointerEnter={() => { setHoverColumn(column); setKeyboardNavigationActive(false); }} onFocus={() => { setHoverColumn(column); setKeyboardNavigationActive(true); }} onBlur={() => { setHoverColumn(null); setKeyboardNavigationActive(false); }} onClick={() => sendDrop(column)} aria-label={`Drop disc in column ${column + 1}`} className="grid h-full min-w-0 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed">
                            <motion.span animate={{ scale: hovered && enabled ? 1.07 : 1, opacity: enabled ? (hovered ? 0.95 : 0.5) : 0.12, y: hovered && enabled ? 1 : 0 }} transition={{ type: "spring", stiffness: 360, damping: 24 }} className="connect-four-drop-indicator relative block aspect-square h-[min(1.25rem,80%)] rounded-full border" style={{ background: `radial-gradient(circle at 30% 20%,${discColor.light},${discColor.css} 52%,${discColor.dark})`, borderColor: discColor.light, boxShadow: hovered && enabled ? `0 0 14px ${discColor.css}88` : "inset 0 2px 4px #0008" }}>
                              {connectFourArt.dropIndicator ? <img src={connectFourArt.dropIndicator} alt="" aria-hidden="true" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} className="pointer-events-none absolute inset-[-20%] h-[140%] w-[140%] object-contain" /> : null}
                            </motion.span>
                          </button>
                        );
                      })}
                    </div> : null}

                    <div
                      className={useBoardSprite ? "connect-four-sprite-grid absolute z-10 grid" : "connect-four-grid relative z-10 grid w-full grid-cols-7 overflow-visible rounded-[0.65rem] border-[2px] border-[#064a86]"}
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
                        const isHovered = hoverColumn === columnIndex || (keyboardNavigationActive && keyboardColumn === columnIndex);
                        const occupied = Boolean(cell);
                        return (
                          <button key={key} type="button" onClick={() => sendDrop(columnIndex)} onPointerEnter={() => { setHoverColumn(columnIndex); setKeyboardNavigationActive(false); }} disabled={!isMyTurn || state.phase !== "playing" || !legal} aria-label={cell ? `${state.players[playerIndex]?.displayName ?? "Player"} ${color.name.toLowerCase()} disc at row ${rowIndex + 1}, column ${columnIndex + 1}` : `Empty slot row ${rowIndex + 1}, column ${columnIndex + 1}${legal ? ", legal column" : ""}`} className={`${useBoardSprite ? "connect-four-sprite-cell" : "connect-four-cell relative grid min-h-0 min-w-0 place-items-center border-b border-r border-[#064c88]/90 p-0"} focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 ${isHovered && isMyTurn && !occupied ? (useBoardSprite ? "connect-four-sprite-slot-hover" : "connect-four-slot-hover") : ""} ${isWinning ? "connect-four-winning-slot" : ""}`} style={{ zIndex: isLast ? 20 : 0 }}>
                            <span className={useBoardSprite ? `connect-four-sprite-cell-content ${isWinning ? "connect-four-winning-hole" : ""}` : `connect-four-hole relative grid aspect-square w-[80%] place-items-center rounded-full ${isWinning ? "connect-four-winning-hole" : ""}`}>
                              {cell ? (
                                <motion.span key={`${key}-${cell}`} initial={{ y: -((rowIndex + 1) * (useBoardSprite ? 68 : 100)), scale: 0.84, rotate: rowIndex % 2 ? 4 : -4 }} animate={{ y: 0, scale: isWinning ? [1, 1.055, 1] : 1, rotate: 0 }} transition={{ type: "spring", stiffness: 290, damping: 17, mass: 0.72, scale: { duration: 0.34, repeat: isWinning ? Infinity : 0, repeatType: "reverse" } }} className={`${useBoardSprite ? "connect-four-sprite-disc" : "connect-four-disc relative z-10 block h-[91%] w-[91%] rounded-full"} ${isLast ? "connect-four-last-disc" : ""} ${isWinning ? "connect-four-winning-disc" : ""}`} style={{ width: useBoardSprite ? "75%" : undefined, height: useBoardSprite ? "auto" : undefined, aspectRatio: useBoardSprite ? "1 / 1" : undefined, background: `radial-gradient(circle at 29% 21%,${color.light} 0%,${color.css} 32%,${color.dark} 100%)`, border: `2px solid ${color.light}bb`, boxShadow: `inset 0 3px 5px rgba(255,255,255,.46),inset 0 -7px 10px rgba(0,0,0,.25),0 3px 5px rgba(0,0,0,.32)` }}>
                                  {!useBoardSprite ? <span className="pointer-events-none absolute left-[21%] top-[15%] h-[17%] w-[29%] rounded-full bg-white/55 blur-[0.5px]" /> : null}
                                  {state.gameId === "connect-four" && (playerIndex === 0 ? connectFourArt.redDisc : connectFourArt.yellowDisc) ? <img src={(playerIndex === 0 ? connectFourArt.redDisc : connectFourArt.yellowDisc) ?? undefined} alt="" aria-hidden="true" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} className={`connect-four-custom-disc pointer-events-none absolute z-10 select-none ${useBoardSprite ? "object-contain" : "inset-0 h-full w-full object-fill"}`} style={useBoardSprite ? { inset: "-6%", width: "100%", height: "100%" } : undefined} /> : null}
                                </motion.span>
                              ) : useBoardSprite && isHovered && isMyTurn && legal ? <span className="connect-four-sprite-empty-preview" /> : !useBoardSprite && isHovered && isMyTurn && legal ? <span className="connect-four-empty-preview block h-[86%] w-[86%] rounded-full border-2 border-dashed border-white/45" /> : null}
                            </span>
                          </button>
                        );
                        }))}
                    </div>
                    {useBoardSprite ? <img src={connectFourArt.boardOverlay ?? undefined} alt="" aria-hidden="true" draggable={false} onError={() => setConnectFourArt((currentArt) => ({ ...currentArt, boardOverlay: null }))} className="connect-four-board-overlay connect-four-board-sprite pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-fill" /> : null}
                    {!useBoardSprite ? <div className="pointer-events-none absolute -bottom-[18px] left-4 right-4 z-0 flex justify-between px-[4%]" aria-hidden="true"><span className="connect-four-leg" /><span className="connect-four-leg" /></div> : null}
                  </div>
                  <div className={`flex w-full ${useBoardSprite ? "max-w-[1200px]" : "max-w-[920px]"} shrink-0 items-center justify-between gap-3 px-1 pt-2 text-xs`}>
                    <span className="truncate font-semibold text-white/50">{isFinished ? "Round complete" : isMyTurn ? "✨ Your move — pick a column" : isBotTurn ? "🤖 Opponent is thinking" : "👀 Watch for a winning line"}</span>
                    <span className="shrink-0 font-black tracking-wider text-white/30">🔴 RED <span className="mx-1">VS</span> 🟡 YELLOW</span>
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
