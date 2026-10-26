import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type PokerState = Omit<BoardGameState,"gameId"> & { gameId: "poker" };
export type PokerAction = Extract<BoardGameAction,{ type: "poker_action" }>;
export type PublicPokerState = PublicBoardGameState & { gameId: "poker" };
