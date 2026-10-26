import { finish, nextPlayerId, random } from "../shared/utils";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceMonopolyAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "roll_dice" && state.gameId === "monopoly"){const roll = random(state, 6) + 1 + random(state, 6) + 1;
    const old = state.positions[playerId] ?? 0; const next = (old + roll) % 40;
    state.positions[playerId] = next;
    if (next < old) state.money[playerId] = (state.money[playerId] ?? 0) + 200;
    const property = state.properties[next];
    if (property?.ownerId && property.ownerId !== playerId) {
      const rent = Math.min(state.money[playerId] ?? 0, property.rent);
      state.money[playerId] = (state.money[playerId] ?? 0) - rent;
      state.money[property.ownerId] = (state.money[property.ownerId] ?? 0) + rent;
      message = `🎲 ${player.displayName} rolled ${roll}, landed on ${property.label}, and paid $${rent} rent.`;
    } else message = `🎲 ${player.displayName} rolled ${roll} and landed on ${property?.label ?? "a space"}.`;
    state.hasRolled = true;} else if(action.type === "buy_property" && state.gameId === "monopoly"){const property = state.properties[state.positions[playerId] ?? 0];
    if (property && property.cost > 0 && !property.ownerId && (state.money[playerId] ?? 0) >= property.cost) {
      property.ownerId = playerId; state.money[playerId] = (state.money[playerId] ?? 0) - property.cost;
      message = `🏠 ${player.displayName} bought ${property.label} for $${property.cost}.`;
    } else return {accepted:false,message:""};} else return {accepted:false,message:""};return {accepted:true,message};}
