import { finish, nextPlayerId } from "../shared/utils";
import { barricadesPawnDestinations, barricadesGoalReached, barricadesWallAllowed } from "./rules";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceBarricadesAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "move_pawn" && state.gameId === "barricades"){const destination = { x: action.x, y: action.y };
    if (!state.pawns[playerId] || !barricadesPawnDestinations(state, playerId).some((position) => position.x === destination.x && position.y === destination.y)) return {accepted:false,message:""};
    state.pawns[playerId] = destination;
    message = `🧱 ${player.displayName} moved to ${action.x + 1}, ${action.y + 1}.`;
    if (barricadesGoalReached(state, playerId, destination)) {
      finish(state, playerId, now);
      message += " 🏆 Reached the goal!";
    } else state.currentPlayerId = nextPlayerId(state, playerId);} else if(action.type === "place_wall" && state.gameId === "barricades"){if (!barricadesWallAllowed(state, action.x, action.y, action.orientation, playerId)) return {accepted:false,message:""};
    state.walls.push({ x: action.x, y: action.y, orientation: action.orientation, playerId });
    state.wallsRemaining[playerId] = Math.max(0, (state.wallsRemaining[playerId] ?? 1) - 1);
    state.currentPlayerId = nextPlayerId(state, playerId);
    message = `🧱 ${player.displayName} placed a ${action.orientation === "h" ? "horizontal" : "vertical"} barricade.`;} else return {accepted:false,message:""};return {accepted:true,message};}
