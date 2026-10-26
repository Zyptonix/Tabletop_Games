"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, hasAction, owns } from "../board-games/shared/ui-utils";

function formatSeconds(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function BarricadesTable(props: BoardGameTableProps) {
  const { state, legalActions, currentUserId, timer, onAction } = props;
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
  const [hoveredWall, setHoveredWall] = useState<{ x: number; y: number; orientation: "h" | "v" } | null>(null);
  const [wallMode, setWallMode] = useState<"h" | "v" | null>(null);
  const boardSize = state.board.length || (state.players.length > 2 ? 13 : 9);
  const center = Math.floor(boardSize / 2);
  const trackCount = boardSize * 2 - 1;
  const tracks = `repeat(${boardSize - 1}, minmax(0, 1fr) 0.14fr) minmax(0, 1fr)`;
  const hoveredKey = hoveredWall ? `${hoveredWall.orientation}:${hoveredWall.x}:${hoveredWall.y}` : "";
  const remaining = state.wallsRemaining[currentUserId] ?? 0;
  const isFourPlayer = state.players.length > 2;

  return (
    <div className="board-game-barricades-wrap mx-auto flex h-full min-h-0 w-full max-w-[min(76vh,760px)] flex-col justify-center gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><h2 className="text-xl font-black">🟠 Barricades</h2><p className="text-[11px] text-white/50">{isFourPlayer ? "Race to the glowing center tile. Block rivals with two-edge walls." : "Reach the opposite edge. Block rivals with two-edge walls."}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {timer?.remainingMs != null ? <span className={`rounded-lg border px-2.5 py-2 text-xs font-black tabular-nums ${timer.remainingMs <= 10000 ? "border-rose-300/35 bg-rose-400/15 text-rose-100" : "border-cyan-200/20 bg-cyan-300/10 text-cyan-100"}`} title={`Current turn: ${currentPlayer?.displayName ?? "player"}`}>⏱ {formatSeconds(timer.remainingMs)}</span> : null}
          <span className="rounded-lg border border-orange-200/20 bg-orange-300/10 px-2.5 py-2 text-xs font-black text-orange-100">{remaining} walls</span>
          <button type="button" onClick={() => setWallMode(wallMode === "h" ? null : "h")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-2.5 py-2 text-xs font-black ${wallMode === "h" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>— H</button>
          <button type="button" onClick={() => setWallMode(wallMode === "v" ? null : "v")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-2.5 py-2 text-xs font-black ${wallMode === "v" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>| V</button>
          <button type="button" onClick={() => setWallMode(null)} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white/60">Auto</button>
        </div>
      </div>
      <div className="barricades-hover-board relative mx-auto grid aspect-square w-full min-h-0 max-h-[min(62vh,760px)] overflow-visible rounded-xl border border-orange-100/20 bg-[#10242b] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.28)]" style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}>
        {Array.from({ length: trackCount * trackCount }, (_, index) => {
          const row = Math.floor(index / trackCount), col = index % trackCount;
          const style: React.CSSProperties = { gridRow: row + 1, gridColumn: col + 1 };
          if (row % 2 === 0 && col % 2 === 0) {
            const x = col / 2, y = row / 2;
            const pawn = Object.entries(state.pawns).find(([, pos]) => pos.x === x && pos.y === y);
            const pawnPlayer = pawn ? state.players.find((player) => player.userId === pawn[0]) : null;
            const allowedMove = hasAction(legalActions, "move_pawn", (action) => action.x === x && action.y === y);
            const isCenter = isFourPlayer && x === center && y === center;
            return <button key={index} type="button" style={style} aria-label={`Barricades tile ${x + 1}, ${y + 1}${isCenter ? ", center goal" : ""}${pawnPlayer ? ` occupied by ${pawnPlayer.displayName}` : ""}`} title={isCenter ? "Center goal — land here to win" : undefined} disabled={!isMyTurn || !allowedMove} onClick={() => { if (allowedMove) { onAction("move_pawn", { x, y }); setHoveredWall(null); setWallMode(null); } }} className={`relative z-10 grid aspect-square min-h-0 min-w-0 place-items-center rounded-[3px] border transition ${isCenter ? "border-amber-200/70 bg-amber-300/15 shadow-[inset_0_0_9px_rgba(251,191,36,.2)]" : "border-cyan-50/[.07]"} ${allowedMove ? "bg-emerald-300/15 ring-1 ring-inset ring-emerald-200/65 hover:bg-emerald-200/25" : "bg-[#203942]"}`}>
              {pawnPlayer ? <span title={pawnPlayer.displayName} className="block h-[66%] w-[66%] rounded-full border-2 border-white/90 shadow-[0_0_12px_rgba(255,255,255,.3),inset_0_2px_2px_rgba(255,255,255,.38)]" style={{ background: PLAYER_COLORS[pawnPlayer.seat % PLAYER_COLORS.length] }} /> : isCenter ? <span className="text-[clamp(7px,1.2vw,16px)] font-black text-amber-100">✦</span> : null}
            </button>;
          }
          const horizontalGap = row % 2 === 1 && col % 2 === 0;
          const verticalGap = row % 2 === 0 && col % 2 === 1;
          if (!horizontalGap && !verticalGap) return <div key={index} style={style} className="pointer-events-none" />;
          const orientation: "h" | "v" = horizontalGap ? "h" : "v";
          const x = horizontalGap ? col / 2 : (col - 1) / 2;
          const y = horizontalGap ? (row - 1) / 2 : row / 2;
          const eligible = x >= 0 && x <= boardSize - 2 && y >= 0 && y <= boardSize - 2;
          const existing = eligible ? state.walls.find((wall) => wall.orientation === orientation && (orientation === "h" ? wall.y === y && (wall.x === x || wall.x + 1 === x) : wall.x === x && (wall.y === y || wall.y + 1 === y))) : undefined;
          const isExistingSegment = existing && (orientation === "h" ? existing.x !== x : existing.y !== y);
          if (isExistingSegment) return <div key={index} style={style} className="pointer-events-none" />;
          const wallOwner = existing ? state.players.find((player) => player.userId === existing.playerId) : null;
          if (existing) {
            const start = orientation === "h" ? existing.x === x : existing.y === y;
            const wallStyle: React.CSSProperties = orientation === "h" ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` } : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` };
            return start ? <div key={index} style={wallStyle} title={`Wall placed by ${wallOwner?.displayName ?? "player"}`} className={`barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} relative z-30 self-center rounded-full border border-orange-100/80 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,.28)]`} /> : <div key={index} style={style} className="pointer-events-none" />;
          }
          const legalWall = eligible && (!wallMode || wallMode === orientation) && hasAction(legalActions, "place_wall", (action) => action.x === x && action.y === y && action.orientation === orientation);
          const currentKey = `${orientation}:${x}:${y}`;
          const hovered = hoveredKey === currentKey;
          if (!eligible) return <div key={index} style={style} className="pointer-events-none" />;
          const previewStyle: React.CSSProperties = hovered && legalWall ? orientation === "h" ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` } : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` } : style;
          return <button key={index} type="button" style={previewStyle} title={legalWall ? `Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}` : "Wall would overlap or block a path"} aria-label={`Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}`} disabled={!isMyTurn || remaining < 1 || !legalWall} onMouseEnter={() => legalWall && setHoveredWall({ x, y, orientation })} onMouseLeave={() => setHoveredWall(null)} onFocus={() => legalWall && setHoveredWall({ x, y, orientation })} onBlur={() => setHoveredWall(null)} onClick={() => { if (!legalWall) return; onAction("place_wall", { x, y, orientation }); setHoveredWall(null); setWallMode(null); }} className={`relative ${hovered && legalWall ? `barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} z-40 self-center rounded-full border border-orange-100 bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,.48)]` : "z-20 rounded-sm bg-transparent"} ${legalWall ? "cursor-crosshair hover:bg-orange-300/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100" : "cursor-not-allowed"}`} />;
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/45"><span>{hoveredWall ? `Preview: ${hoveredWall.orientation === "h" ? "horizontal" : "vertical"} wall` : wallMode ? `Showing ${wallMode === "h" ? "horizontal" : "vertical"} wall gaps` : "Hover a wall gap to preview a legal placement."}</span><span className="shrink-0 text-emerald-100/60">{isFourPlayer ? "✦ Reach the center to win" : "Green tile rings = legal pawn moves"}</span></div>
    </div>
  );
}
