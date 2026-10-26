import { chessActionSchema, getChessLegalActions } from "./actions";
import { setupChess } from "./setup";
import { reduceChessAction } from "./reducer";
import { getChessPublicState } from "./public-state";
import { getChessResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const chessModule = createBoardGameModule({ id: "chess", displayName: "Chess", minPlayers: 2, maxPlayers: 2, notice: "Legal moves, check/checkmate, castling, en passant, promotion, repetition and draw rules are enforced server-side.", actionSchema: chessActionSchema, setup: setupChess, legalActions: getChessLegalActions, reduceAction: reduceChessAction, publicState: getChessPublicState, results: getChessResults });
export * from "./types";
