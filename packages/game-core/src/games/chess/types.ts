import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type ChessState = Omit<BoardGameState,"gameId"> & { gameId: "chess" };
export type ChessAction = Extract<BoardGameAction,{ type: "move_piece" | "claim_chess_draw" }>;
export type PublicChessState = PublicBoardGameState & { gameId: "chess" };
