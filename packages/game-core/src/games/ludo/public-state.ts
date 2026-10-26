import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getLudoPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Dice, token movement, captures and finish checks are handled server-side.");return {...base,ludoTokens:Object.fromEntries(Object.entries(state.ludoTokens).map(([k,v])=>[k,v.slice()])),diceRoll:state.diceRoll,hasRolled:state.hasRolled};}
