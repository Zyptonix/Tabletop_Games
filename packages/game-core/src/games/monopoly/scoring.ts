import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreMonopolyPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;const value=state.properties.filter(p=>p.ownerId===userId).reduce((sum,p)=>sum+p.cost,0);return (state.money[userId]??0)+value;}
export function getMonopolyResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
