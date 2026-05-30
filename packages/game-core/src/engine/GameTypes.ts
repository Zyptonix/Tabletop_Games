import type { GameId } from "@tabletop/shared";

export interface GamePlayer {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string; details?: unknown };

export interface GameEvent {
  id: string;
  type: string;
  message?: string;
  payload?: unknown;
  targetUserIds?: string[];
  createdAt: string;
}

export interface GamePlacement {
  userId: string;
  placement: number;
  score: number;
  result: "WIN" | "LOSS" | "DRAW";
}

export interface GameResults {
  winnerUserId: string | null;
  placements: GamePlacement[];
  scoreByUserId: Record<string, number>;
}

export interface GameTurnInfo {
  currentPlayerId: string | null;
  turnStartedAt: string | null;
  turnSeconds: number | null;
}

export interface TimeoutAction<Action> {
  playerId: string;
  action: Action;
}

export type GameSettingsRecord = Record<string, unknown>;
export type GameStateRecord = Record<string, unknown>;

export interface RegisteredGameSummary {
  id: GameId;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}
