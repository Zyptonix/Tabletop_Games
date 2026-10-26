import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type WorldConquestState = Omit<BoardGameState,"gameId"> & { gameId: "world-conquest" };
export type WorldConquestAction = Extract<BoardGameAction,{ type: "claim_territory" | "reinforce_territory" | "attack_territory" | "end_turn" }>;
export type PublicWorldConquestState = PublicBoardGameState & { gameId: "world-conquest" };
