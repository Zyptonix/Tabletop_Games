"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";


export function MonopolyTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);

function renderMonopoly() {
    const propertyAt = state.properties[state.positions[currentUserId] ?? 0];
    return <div className="mx-auto w-full max-w-[900px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🏠 Property Tycoon</h2><p className="text-sm text-white/50">Roll, move, buy properties and collect rent.</p></div><div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[.08] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Your cash</p><p className="text-2xl font-black text-emerald-100">{money(me?.money)}</p></div></div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">{state.properties.map((property, index) => { const positionPlayers = state.players.filter((player) => player.position === index); const owner = state.players.find((player) => player.userId === property.ownerId); const occupied = positionPlayers.some((player) => player.userId === currentUserId); return <div key={property.id} className={`relative flex min-h-[78px] flex-col rounded-xl border p-2 text-left ${occupied ? "border-emerald-300 ring-2 ring-emerald-300/30" : "border-white/10"} ${owner ? "bg-emerald-300/10" : "bg-[#101d1b]"}`}><span className="text-[9px] font-bold text-white/35">{String(index).padStart(2,"0")}</span><span className="mt-1 line-clamp-2 text-[10px] font-black leading-tight">{property.label}</span><span className="mt-auto text-[10px] font-bold text-emerald-100/65">{property.cost ? money(property.cost) : "—"}</span>{owner ? <span className="mt-1 truncate text-[9px] font-black" style={{ color: PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] }}>● {owner.displayName}</span> : null}{positionPlayers.length ? <span className="absolute right-1 top-1 text-sm">{positionPlayers.map(() => "🎲").join("")}</span> : null}</div>; })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mr-auto"><p className="text-xs font-black uppercase tracking-widest text-white/40">Current space</p><p className="font-black">{propertyAt?.label ?? "Start"}</p></div>{hasAction(legalActions,"roll_dice") ? <button onClick={() => onAction("roll_dice")} className="min-h-12 rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🎲 Roll</button> : null}{hasAction(legalActions,"buy_property") ? <button onClick={() => onAction("buy_property")} className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-slate-950 hover:bg-amber-200">🏡 Buy for {money(propertyAt?.cost)}</button> : null}{hasAction(legalActions,"end_turn") ? <button onClick={() => onAction("end_turn")} className="min-h-12 rounded-xl border border-white/10 px-4 font-bold">End turn</button> : null}</div>
    </div>;
  }
return renderMonopoly();
}
