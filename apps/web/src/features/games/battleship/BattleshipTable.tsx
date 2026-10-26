"use client";
import { Fragment } from "react";
import type { BoardGameTableProps } from "../board-games/shared/types";
import { hasAction, owns } from "../board-games/shared/ui-utils";

export function BattleshipTable(props: BoardGameTableProps) {
  const { state, legalActions, currentUserId, onAction } = props;
  const isMyTurn = owns(state, currentUserId);
  const opponent = state.players.find((player) => player.userId !== currentUserId);
  const incoming = state.shots.filter((shot) => shot.targetId === currentUserId);
  const outgoing = state.shots.filter((shot) => shot.shooterId === currentUserId);
  const ownFleet = new Set(state.ownShipCells);
  const incomingAt = (x: number, y: number) => incoming.find((shot) => shot.x === x && shot.y === y);
  const outgoingAt = (x: number, y: number) => outgoing.find((shot) => shot.x === x && shot.y === y);
  const letters = "ABCDEFGHIJ";

  function grid(targetBoard: boolean) {
    return (
      <div
        className="mx-auto grid aspect-square w-full max-w-[min(41vw,45vh)] grid-cols-11 gap-[2px] rounded-lg border border-cyan-200/15 bg-[#061424] p-1.5 sm:p-2"
        style={{ gridTemplateColumns: "0.8rem repeat(10,minmax(0,1fr))", gridTemplateRows: "0.8rem repeat(10,minmax(0,1fr))" }}
        aria-label={targetBoard ? "Enemy target board" : "Your fleet and incoming shots"}
      >
        <span />
        {letters.split("").map((letter) => <span key={letter} className="grid min-w-0 place-items-center text-[clamp(6px,0.65vw,10px)] font-black text-cyan-100/55">{letter}</span>)}
        {Array.from({ length: 100 }, (_, index) => {
          const x = index % 10;
          const y = Math.floor(index / 10);
          const key = `${x},${y}`;
          const shot = targetBoard ? outgoingAt(x, y) : incomingAt(x, y);
          const isShip = !targetBoard && ownFleet.has(key);
          const isLegal = targetBoard && hasAction(legalActions, "fire", (action) => action.x === x && action.y === y);
          const label = `${letters[x]}${y + 1}`;
          const tileClass = shot
            ? shot.hit
              ? "border-rose-200/45 bg-rose-500/35 text-rose-100"
              : "border-sky-100/10 bg-sky-200/[.035] text-sky-100/45"
            : isShip
              ? "border-slate-200/30 bg-slate-300/65 text-slate-950"
              : targetBoard
                ? "border-cyan-200/15 bg-[#0d2b45] text-cyan-100 hover:border-cyan-100/70 hover:bg-cyan-300/15"
                : "border-cyan-100/[.07] bg-[#092039] text-cyan-100/35";
          return (
            <Fragment key={index}>
              {x === 0 ? <div className="grid min-w-0 min-h-0 place-items-center text-[clamp(6px,0.65vw,10px)] font-bold text-cyan-100/55" style={{ gridColumn: 1, gridRow: y + 2 }}>{y + 1}</div> : null}
              <button
                type="button"
                title={`${label}${shot ? shot.hit ? " — hit" : " — miss" : isShip ? " — your ship" : ""}`}
                aria-label={`${targetBoard ? "Target" : "Your fleet"} ${label}${shot ? shot.hit ? " hit" : " missed" : ""}`}
                disabled={!targetBoard || !isMyTurn || !isLegal || Boolean(shot)}
                onClick={() => onAction("fire", { x, y })}
                className={`relative grid min-h-0 min-w-0 aspect-square place-items-center rounded-[2px] border text-[clamp(7px,0.85vw,12px)] font-black transition ${tileClass} ${targetBoard && isLegal && !shot && isMyTurn ? "cursor-crosshair" : "cursor-default"}`}
                style={{ gridColumn: x + 2, gridRow: y + 2 }}
              >
                {shot ? shot.sunk ? "✹" : shot.hit ? "✕" : "·" : isShip ? "●" : ""}
              </button>
            </Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-none flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-lg font-black sm:text-xl">🚢 Battleships</h2><p className="text-xs text-white/50">Both maps stay visible: defend your fleet and target the enemy.</p></div>
        <span className={`rounded-lg border px-3 py-2 text-xs font-black ${isMyTurn ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.04] text-white/55"}`}>{isMyTurn ? "🎯 Your shot" : `⏳ ${state.players.find((player) => player.userId === state.currentPlayerId)?.displayName ?? "Opponent"}'s shot`}</span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2 xl:gap-4">
        <section className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-2 sm:p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2"><div><h3 className="text-xs font-black uppercase tracking-wide text-slate-100 sm:text-sm">🛡️ Your waters</h3><p className="text-[10px] text-white/40">Ships and enemy hits</p></div><span className="text-[10px] font-bold text-white/50">{incoming.filter((shot) => shot.hit).length} hits received</span></div>
          {grid(false)}
        </section>
        <section className="min-w-0 rounded-xl border border-cyan-200/15 bg-cyan-300/[.025] p-2 sm:p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2"><div><h3 className="text-xs font-black uppercase tracking-wide text-cyan-100 sm:text-sm">🎯 Target board</h3><p className="text-[10px] text-white/40">Fire at {opponent?.displayName ?? "your opponent"}</p></div><span className="text-[10px] font-bold text-white/50">{outgoing.filter((shot) => shot.hit).length} hits landed</span></div>
          {grid(true)}
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-white/50"><span>● Ship</span><span>✕ Hit</span><span>· Miss</span><span>✹ Sunk ship</span><span className="ml-auto text-cyan-100/65">Fleet remaining: {Math.max(0, state.ownShipCells.length - incoming.filter((shot) => shot.hit).length)} cells</span></div>
    </div>
  );
}
