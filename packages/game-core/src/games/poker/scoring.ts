import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scorePokerPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;return (state.pokerStacks[userId]??0)-1000;}
export function getPokerResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
