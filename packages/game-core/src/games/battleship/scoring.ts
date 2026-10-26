import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";
export function scoreBattleshipPlayer(state:BoardGameState,player:GamePlayer):number{const userId=player.userId;const hits=state.shots.filter(s=>s.shooterId===userId&&s.hit).length;const received=state.shots.filter(s=>s.targetId===userId&&s.hit).length;return hits*100-received*25;}
export function getBattleshipResults(state:BoardGameState):GameResults{return makeStandardResults(state);}
