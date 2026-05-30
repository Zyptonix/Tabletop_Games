import type { z } from "zod";
import type { GameId } from "@tabletop/shared";
import type {
  GameEvent,
  GamePlayer,
  GameResults,
  GameTurnInfo,
  TimeoutAction,
  ValidationResult
} from "./GameTypes";

/**
 * Game modules are pure, server-side rule engines.
 * They do not know about Socket.IO, Prisma, React, or transport details.
 * This keeps future games replaceable while the room/auth/reconnect systems stay stable.
 */
export interface GameModule<State, Action, Settings> {
  id: GameId;
  displayName: string;
  version: string;
  minPlayers: number;
  maxPlayers: number;
  defaultSettings: Settings;
  settingsSchema: z.ZodType<Settings, z.ZodTypeDef, unknown>;
  actionSchema: z.ZodType<Action, z.ZodTypeDef, unknown>;

  createInitialState(params: {
    players: GamePlayer[];
    settings: Settings;
    seed: string;
    now: string;
  }): State;

  getPublicState(params: { state: State; viewerId: string }): unknown;

  getLegalActions(params: { state: State; playerId: string }): Action[];

  validateAction(params: {
    state: State;
    playerId: string;
    action: Action;
  }): ValidationResult;

  applyAction(params: {
    state: State;
    playerId: string;
    action: Action;
    now: string;
  }): {
    state: State;
    events: GameEvent[];
  };

  getTurnInfo(state: State): GameTurnInfo;

  getTimeoutAction(params: {
    state: State;
    playerId: string;
  }): TimeoutAction<Action> | null;

  isGameOver(state: State): boolean;

  getResults(state: State): GameResults;
}
