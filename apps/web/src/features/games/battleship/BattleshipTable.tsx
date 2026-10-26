"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";


export function BattleshipTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
const activeTarget=state.players.find(player=>player.userId!==currentUserId);

function renderBattleships() {
    const incoming = state.shots.filter((shot) => shot.targetId === currentUserId);
    const outgoing = state.shots.filter((shot) => shot.shooterId === currentUserId);
    const shotAt = (x: number, y: number, outgoingSide = true) => (outgoingSide ? outgoing : incoming).find((shot) => shot.x === x && shot.y === y);
    const fired = new Set(outgoing.map((shot) => `${shot.x},${shot.y}`));
    return <div className="mx-auto w-full max-w-[690px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">🎯 Target grid</h2><p className="text-sm text-white/50">Fire at {activeTarget?.displayName ?? "your opponent"}</p></div><div className="rounded-xl border border-cyan-200/15 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100">🚢 Fleet: {state.ownShipCells.length} cells</div></div>
      <div className="grid grid-cols-10 gap-1 rounded-2xl border border-cyan-300/15 bg-[#071a2d] p-2 sm:gap-1.5 sm:p-3">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const shot = shotAt(x, y, true); return <button key={index} type="button" onClick={() => onAction("fire", { x, y })} disabled={!isMyTurn || fired.has(`${x},${y}`) || !hasAction(legalActions, "fire", (action) => action.x === x && action.y === y)} className={`relative grid aspect-square place-items-center rounded-md border text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${shot ? shot.hit ? "border-rose-300/45 bg-rose-500/30 text-rose-100" : "border-sky-200/15 bg-sky-300/[.07] text-sky-100/45" : "border-sky-200/15 bg-[#0c2d48] text-cyan-100 hover:border-cyan-200/70 hover:bg-cyan-300/15"}`}>{shot ? shot.sunk ? "🚢" : shot.hit ? "💥" : "·" : ""}</button>; })}</div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-white/50"><span>💥 Hit</span><span>· Miss</span><span>🚢 {incoming.filter((shot) => shot.hit).length} hits received</span><span>🎯 {outgoing.filter((shot) => shot.hit).length} hits landed</span></div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs font-black uppercase tracking-widest text-white/45">Your hidden fleet</p><div className="mt-2 grid grid-cols-10 gap-1">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const ship = state.ownShipCells.includes(`${x},${y}`); const shot = shotAt(x, y, false); return <div key={index} className={`aspect-square rounded-sm ${ship ? shot?.hit ? "bg-rose-400" : "bg-slate-300/65" : shot ? shot.hit ? "bg-rose-400/70" : "bg-cyan-300/20" : "bg-white/[.035]"}`} />; })}</div></div>
    </div>;
  }
return renderBattleships();
}
