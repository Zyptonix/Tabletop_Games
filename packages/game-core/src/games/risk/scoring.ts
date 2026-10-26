import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreRiskPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;const owned=state.territories.filter(t=>state.territoryOwners[t.id]===userId);return owned.length*100+owned.reduce((sum,t)=>sum+(state.territoryTroops[t.id]??0),0);}
export function getRiskResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
