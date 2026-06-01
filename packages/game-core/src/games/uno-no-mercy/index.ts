import type { GameModule } from "../../engine/GameModule";
import type { GameTurnInfo, TimeoutAction } from "../../engine/GameTypes";
import { NO_MERCY_MAX_PLAYERS, NO_MERCY_MIN_PLAYERS, DEFAULT_NO_MERCY_SETTINGS, NO_MERCY_VERSION } from "./constants";
import { noMercyActionSchema, noMercySettingsSchema } from "./actions";
import { createInitialNoMercyState } from "./deck";
import { getPublicNoMercyState } from "./public-state";
import { getLegalNoMercyActions } from "./selectors";
import { validateNoMercyAction } from "./validation";
import { applyNoMercyAction, applyNoMercyTimeout } from "./reducer";
import { getNoMercyResults } from "./scoring";
import type { NoMercyAction, NoMercySettings, NoMercyState } from "./types";

function getTurnInfo(state: NoMercyState): GameTurnInfo {
  return {
    currentPlayerId: state.currentPlayerId,
    turnStartedAt: state.phase === "playing" ? state.turnStartedAt : null,
    turnSeconds: state.settings.turnSeconds
  };
}

function getTimeoutAction(params: {
  state: NoMercyState;
  playerId: string;
}): TimeoutAction<NoMercyAction> | null {
  if (params.state.phase !== "playing" || params.state.currentPlayerId !== params.playerId) {
    return null;
  }

  if (params.state.pendingRoulette?.targetPlayerId === params.playerId) {
    return {
      playerId: params.playerId,
      action: { type: "resolve_roulette", chosenColor: params.state.currentColor }
    };
  }

  return {
    playerId: params.playerId,
    action: params.state.lastDrawnCardId === null ? { type: "draw_card" } : { type: "pass_turn" }
  };
}

export const noMercyModule: GameModule<NoMercyState, NoMercyAction, NoMercySettings> = {
  id: "uno-no-mercy",
  displayName: "UNO No Mercy",
  version: NO_MERCY_VERSION,
  minPlayers: NO_MERCY_MIN_PLAYERS,
  maxPlayers: NO_MERCY_MAX_PLAYERS,
  defaultSettings: DEFAULT_NO_MERCY_SETTINGS,
  settingsSchema: noMercySettingsSchema,
  actionSchema: noMercyActionSchema,
  createInitialState: createInitialNoMercyState,
  getPublicState: getPublicNoMercyState,
  getLegalActions: getLegalNoMercyActions,
  validateAction: ({ state, playerId, action }) =>
    validateNoMercyAction({ state, settings: state.settings, playerId, action }),
  applyAction: ({ state, playerId, action, now }) =>
    applyNoMercyAction({ state, settings: state.settings, playerId, action, now }),
  getTurnInfo,
  getTimeoutAction,
  applyTimeout: applyNoMercyTimeout,
  isGameOver: (state) => state.phase === "finished",
  getResults: getNoMercyResults
};

export * from "./actions";
export * from "./constants";
export * from "./debug";
export * from "./deck";
export * from "./public-state";
export * from "./reducer";
export * from "./scoring";
export * from "./selectors";
export * from "./types";
export * from "./validation";


