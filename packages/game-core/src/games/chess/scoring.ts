import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreChessPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;return userId===state.winnerUserId?1:0;}
export function getChessResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
