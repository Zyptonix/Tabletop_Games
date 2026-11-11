import type { GameModule } from "../../engine/GameModule";
import type { GameTurnInfo, TimeoutAction } from "../../engine/GameTypes";
import {
  SNAKES_AND_LADDERS_MAX_PLAYERS,
  SNAKES_AND_LADDERS_MIN_PLAYERS,
  SNAKES_AND_LADDERS_VERSION,
  type SnakesAndLaddersAction,
  type SnakesAndLaddersSettings,
  type SnakesAndLaddersState
} from "./types";
import { snakesAndLaddersActionSchema, snakesAndLaddersSettingsSchema, getSnakesAndLaddersLegalActions } from "./actions";
import { createInitialSnakesAndLaddersState, applySnakesAndLaddersAction } from "./reducer";
import { getSnakesAndLaddersPublicState } from "./public-state";
import { getSnakesAndLaddersResults } from "./scoring";

function getTurnInfo(state: SnakesAndLaddersState): GameTurnInfo {
  return {
    currentPlayerId: state.currentPlayerId,
    turnStartedAt: state.phase === "playing" ? state.turnStartedAt : null,
    turnSeconds: state.settings.turnSeconds
  };
}

function getTimeoutAction(params: {
  state: SnakesAndLaddersState;
  playerId: string;
}): TimeoutAction<SnakesAndLaddersAction> | null {
  if (params.state.phase !== "playing" || params.state.currentPlayerId !== params.playerId) {
    return null;
  }
  return {
    playerId: params.playerId,
    action: { type: "roll_dice" }
  };
}

export const snakesAndLaddersModule: GameModule<
  SnakesAndLaddersState,
  SnakesAndLaddersAction,
  SnakesAndLaddersSettings
> = {
  id: "snakes-and-ladders",
  displayName: "Snakes and Ladders",
  version: SNAKES_AND_LADDERS_VERSION,
  minPlayers: SNAKES_AND_LADDERS_MIN_PLAYERS,
  maxPlayers: SNAKES_AND_LADDERS_MAX_PLAYERS,
  defaultSettings: {
    boardPreset: "classic",
    turnSeconds: 20,
    exactRollToWin: true,
    rollOneToEnter: true
  },
  settingsSchema: snakesAndLaddersSettingsSchema,
  actionSchema: snakesAndLaddersActionSchema,
  createInitialState: createInitialSnakesAndLaddersState,
  getPublicState: getSnakesAndLaddersPublicState,
  getLegalActions: getSnakesAndLaddersLegalActions,
  validateAction: ({ state, playerId, action }) => {
    if (state.phase !== "playing") {
      return { ok: false, code: "GAME_NOT_PLAYING", message: "Game is not active." };
    }
    if (state.currentPlayerId !== playerId && action.type !== "select_piece") {
      return { ok: false, code: "NOT_YOUR_TURN", message: "Not your turn." };
    }
    return { ok: true };
  },
  applyAction: ({ state, playerId, action, now }) => {
    const result = applySnakesAndLaddersAction({ state, playerId, action, now });
    return {
      state: result.state,
      events: []
    };
  },
  getTurnInfo,
  getTimeoutAction,
  applyTimeout: ({ state, playerId, now }) => {
    const result = applySnakesAndLaddersAction({
      state,
      playerId,
      action: { type: "roll_dice" },
      now
    });
    return {
      state: result.state,
      events: []
    };
  },
  isGameOver: (state) => state.phase === "finished",
  getResults: getSnakesAndLaddersResults
};

export * from "./actions";
export * from "./boards";
export * from "./public-state";
export * from "./reducer";
export * from "./scoring";
export * from "./types";
