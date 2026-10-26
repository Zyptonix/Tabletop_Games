import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

export function setupLudo(state:BoardGameState,players:GamePlayer[],rngState:number):number { for(const player of players) state.ludoTokens[player.userId]=[-1,-1,-1,-1]; return rngState; }
