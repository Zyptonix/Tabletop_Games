"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";


export function RiskTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
const [selectedTerritory,setSelectedTerritory]=useState<string|null>(null);

function renderConquest() {
    const selected = state.territories.find((territory) => territory.id === selectedTerritory);
    return <div className="mx-auto w-full max-w-[1000px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{state.gameId === "risk" ? "🌍 Risk" : "🗺️ World Conquest"}</h2><p className="text-sm text-white/50">Claim land, reinforce borders and attack neighboring territories.</p></div><div className="rounded-xl border border-rose-200/15 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100">{state.territories.filter((territory) => state.territoryOwners[territory.id] !== null).length}/{state.territories.length} territories owned</div></div>
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-[#081922] p-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11">{state.territories.map((territory) => { const ownerId = state.territoryOwners[territory.id] ?? null; const owner = state.players.find((player) => player.userId === ownerId); const isSelected = selectedTerritory === territory.id; const canClaim = hasAction(legalActions,"claim_territory",(action) => action.territoryId === territory.id); const canReinforce = hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === territory.id); const canAttack = selected ? hasAction(legalActions,"attack_territory",(action) => action.fromId === selected.id && action.toId === territory.id) : false; return <button key={territory.id} type="button" disabled={!isMyTurn || (!canClaim && !canReinforce && !canAttack && !ownerId)} onClick={() => { if (canClaim) { onAction("claim_territory", { territoryId: territory.id }); setSelectedTerritory(null); } else if (canAttack && selected) { onAction("attack_territory", { fromId: selected.id, toId: territory.id }); setSelectedTerritory(null); } else if (canReinforce) { setSelectedTerritory(territory.id); } else if (ownerId === currentUserId) { setSelectedTerritory(territory.id); } }} className={`min-h-[72px] rounded-xl border p-2 text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-50 ${isSelected ? "border-amber-300 ring-2 ring-amber-300/30" : owner ? "border-white/15" : "border-white/[.06]"}`} style={{ background: owner ? `${PLAYER_COLORS[owner.seat % PLAYER_COLORS.length]}25` : "rgba(255,255,255,.025)" }}><span className="block line-clamp-2 text-[10px] font-black leading-tight">{territory.label}</span><span className="mt-2 block text-[10px] font-black" style={{ color: owner ? PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] : "rgba(255,255,255,.25)" }}>{owner ? `● ${owner.displayName}` : "Unclaimed"}</span><span className="mt-1 block text-[10px] text-white/55">🪖 {state.territoryTroops[territory.id] ?? 0}</span></button>; })}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mr-auto text-xs text-white/50">{selected ? `Selected: ${selected.label}` : "Select an owned territory to reinforce or attack an adjacent enemy."}</div>{selected && hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === selected.id) ? <button onClick={() => { onAction("reinforce_territory",{territoryId:selected.id}); setSelectedTerritory(null); }} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950">🪖 Reinforce +2</button> : null}<button onClick={() => { onAction("end_turn"); setSelectedTerritory(null); }} disabled={!isMyTurn || !hasAction(legalActions,"end_turn")} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold">End turn</button></div>
    </div>;
  }
return renderConquest();
}
