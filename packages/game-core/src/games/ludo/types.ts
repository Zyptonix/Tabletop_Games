import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type LudoState = Omit<BoardGameState,"gameId"> & { gameId: "ludo" };
export type LudoAction = Extract<BoardGameAction,{ type: "roll_dice" | "move_token" | "end_turn" }>;
export type PublicLudoState = PublicBoardGameState & { gameId: "ludo" };
