import type { GameModule } from "../../engine/GameModule";
import type { GameTurnInfo, TimeoutAction } from "../../engine/GameTypes";
import { DEFAULT_CLASSIC_UNO_SETTINGS, UNO_MAX_PLAYERS, UNO_MIN_PLAYERS } from "./constants";
import { classicUnoSettingsSchema, unoActionSchema } from "./actions";
import { createInitialClassicUnoState } from "./setup";
import { getPublicClassicUnoState } from "./public-state";
import { getLegalClassicUnoActions } from "./selectors";
import { validateClassicUnoAction } from "./validation";
import { applyClassicUnoAction } from "./reducer";
import { getClassicUnoResults } from "./scoring";
import type { ClassicUnoSettings, ClassicUnoState, UnoAction } from "./types";

function getTurnInfo(state: ClassicUnoState): GameTurnInfo {
  return {
    currentPlayerId: state.currentPlayerId,
    turnStartedAt: state.phase === "playing" ? state.turnStartedAt : null,
    turnSeconds: state.settings.turnSeconds
  };
}

function getTimeoutAction(params: {
  state: ClassicUnoState;
  playerId: string;
}): TimeoutAction<UnoAction> | null {
  if (params.state.phase !== "playing" || params.state.currentPlayerId !== params.playerId) {
    return null;
  }

  return {
    playerId: params.playerId,
    action: params.state.lastDrawnCardId === null ? { type: "draw_card" } : { type: "pass_turn" }
  };
}

export const classicUnoModule: GameModule<ClassicUnoState, UnoAction, ClassicUnoSettings> = {
  id: "classic-uno",
  displayName: "Classic UNO",
  version: "0.1.0",
  minPlayers: UNO_MIN_PLAYERS,
  maxPlayers: UNO_MAX_PLAYERS,
  defaultSettings: DEFAULT_CLASSIC_UNO_SETTINGS,
  settingsSchema: classicUnoSettingsSchema,
  actionSchema: unoActionSchema,
  createInitialState: createInitialClassicUnoState,
  getPublicState: getPublicClassicUnoState,
  getLegalActions: getLegalClassicUnoActions,
  validateAction: ({ state, playerId, action }) =>
    validateClassicUnoAction({ state, settings: state.settings, playerId, action }),
  applyAction: ({ state, playerId, action, now }) =>
    applyClassicUnoAction({ state, settings: state.settings, playerId, action, now }),
  getTurnInfo,
  getTimeoutAction,
  isGameOver: (state) => state.phase === "finished",
  getResults: getClassicUnoResults
};

export * from "./actions";
export * from "./constants";
export * from "./debug";
export * from "./public-state";
export * from "./reducer";
export * from "./rules";
export * from "./scoring";
export * from "./selectors";
export * from "./setup";
export * from "./types";
export * from "./validation";

