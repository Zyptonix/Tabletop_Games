import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getBarricadesPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Pawn movement, wall placement and route checks are handled server-side.");return {...base,pawns:{...state.pawns},walls:state.walls.map(w=>({...w})),wallsRemaining:{...state.wallsRemaining}};}
