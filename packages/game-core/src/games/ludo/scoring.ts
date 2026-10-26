import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreLudoPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;return (state.ludoTokens[userId]??[]).reduce((sum,pos)=>sum+(pos>=57?100:Math.max(0,pos)),0);}
export function getLudoResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
