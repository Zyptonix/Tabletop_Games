import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type CodenamesState = Omit<BoardGameState,"gameId"> & { gameId: "codenames" };
export type CodenamesAction = Extract<BoardGameAction,{ type: "give_clue" | "reveal_word" | "end_codenames_turn" }>;
export type PublicCodenamesState = PublicBoardGameState & { gameId: "codenames" };
