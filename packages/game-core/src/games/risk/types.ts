import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type RiskState = Omit<BoardGameState,"gameId"> & { gameId: "risk" };
export type RiskAction = Extract<BoardGameAction,{ type: "claim_territory" | "reinforce_territory" | "attack_territory" | "end_turn" }>;
export type PublicRiskState = PublicBoardGameState & { gameId: "risk" };
