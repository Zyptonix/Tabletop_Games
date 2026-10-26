import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type MonopolyState = Omit<BoardGameState,"gameId"> & { gameId: "monopoly" };
export type MonopolyAction = Extract<BoardGameAction,{ type: "roll_dice" | "buy_property" | "end_turn" }>;
export type PublicMonopolyState = PublicBoardGameState & { gameId: "monopoly" };
