import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getChessPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Legal moves, check/checkmate, castling, en passant, promotion, repetition and draw rules are enforced server-side.");return {...base,board:state.board.map(row=>row.slice())};}
