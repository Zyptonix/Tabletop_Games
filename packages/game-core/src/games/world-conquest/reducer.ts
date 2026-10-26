import { finish, nextPlayerId, random } from "../shared/utils";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceWorldConquestAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "claim_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")){state.territoryOwners[action.territoryId] = playerId; state.territoryTroops[action.territoryId] = 1;
    message = `🗺️ ${player.displayName} claimed ${state.territories.find((territory) => territory.id === action.territoryId)?.label ?? action.territoryId}.`;
    state.currentPlayerId = nextPlayerId(state, playerId); state.reinforcedThisTurn = false;} else if(action.type === "reinforce_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")){state.territoryTroops[action.territoryId] = (state.territoryTroops[action.territoryId] ?? 0) + 2;
    state.reinforcedThisTurn = true;
    message = `🪖 ${player.displayName} reinforced ${state.territories.find((territory) => territory.id === action.territoryId)?.label ?? action.territoryId}.`;} else if(action.type === "attack_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")){const from = state.territories.find((territory) => territory.id === action.fromId);
    const to = state.territories.find((territory) => territory.id === action.toId);
    const sourceTroops = from ? (state.territoryTroops[from.id] ?? 0) : 0;
    const targetTroops = to ? (state.territoryTroops[to.id] ?? 0) : 0;
    if (!from || !to || state.territoryOwners[from.id] !== playerId || !from.neighbors.includes(to.id) || !state.territoryOwners[to.id] || state.territoryOwners[to.id] === playerId || sourceTroops < 2 || targetTroops < 1) return {accepted:false,message:""};

    const attackDice = Array.from({ length: Math.min(3, sourceTroops - 1) }, () => random(state, 6) + 1).sort((a, b) => b - a);
    const defenseDice = Array.from({ length: Math.min(2, targetTroops) }, () => random(state, 6) + 1).sort((a, b) => b - a);
    let attackerLosses = 0;
    let defenderLosses = 0;
    for (let index = 0; index < Math.min(attackDice.length, defenseDice.length); index += 1) {
      // In Risk, a tied dice comparison is won by the defender.
      if (attackDice[index]! > defenseDice[index]!) defenderLosses += 1;
      else attackerLosses += 1;
    }
    state.territoryTroops[from.id] = sourceTroops - attackerLosses;
    state.territoryTroops[to.id] = targetTroops - defenderLosses;
    const oldOwner = state.territoryOwners[to.id];
    if ((state.territoryTroops[to.id] ?? 0) <= 0) {
      state.territoryOwners[to.id] = playerId;
      // Move the number of dice used in this final attack into the captured
      // territory, while leaving at least one troop behind in the source.
      const availableToMove = Math.max(1, (state.territoryTroops[from.id] ?? 1) - 1);
      const movedTroops = Math.min(attackDice.length, availableToMove);
      state.territoryTroops[from.id] = Math.max(1, (state.territoryTroops[from.id] ?? 1) - movedTroops);
      state.territoryTroops[to.id] = movedTroops;
      message = `⚔️ ${player.displayName} captured ${to.label} with ${movedTroops} troop${movedTroops === 1 ? "" : "s"}. Attack dice ${attackDice.join(",")} vs defence ${defenseDice.join(",")}.`;
      if (oldOwner && !state.territories.some((territory) => state.territoryOwners[territory.id] === oldOwner)) message += " Opponent eliminated.";
    } else {
      message = `⚔️ Battle for ${to.label}: attack dice ${attackDice.join(",")} vs defence ${defenseDice.join(",")}; losses ${attackerLosses} attacker / ${defenderLosses} defender.`;
    }
    const allClaimed = state.territories.every((territory) => state.territoryOwners[territory.id] !== null);
    const remainingOwners = new Set(state.territories.map((territory) => state.territoryOwners[territory.id]).filter((owner): owner is string => owner !== null));
    if (allClaimed && remainingOwners.size === 1 && remainingOwners.has(playerId)) {
      finish(state, playerId, now);
      message += " 🏆 All territories conquered!";
    }} else return {accepted:false,message:""};return {accepted:true,message};}
