import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreBarricadesPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;const pos=state.pawns[userId];if(!pos)return 0;const i=state.players.findIndex(p=>p.userId===userId);const d=state.players.length<=2||i<2?(i%2===0?8-pos.y:pos.y):(i===2?8-pos.x:pos.x);return 100-d;}
export function getBarricadesResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
