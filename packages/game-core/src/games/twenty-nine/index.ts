import type { GameModule } from "../../engine/GameModule";
import type { GameTurnInfo, TimeoutAction } from "../../engine/GameTypes";
import { TWENTY_NINE_DEFAULT_SETTINGS, TWENTY_NINE_MAX_PLAYERS, TWENTY_NINE_MIN_PLAYERS, TWENTY_NINE_VERSION } from "./constants";
import { twentyNineActionSchema, twentyNineSettingsSchema } from "./actions";
import { createTwentyNineDeal } from "./setup";
import { getPublicTwentyNineState } from "./public-state";
import { applyTwentyNineAction, applyTwentyNineTimeout } from "./reducer";
import { getTwentyNineResults } from "./scoring";
import { getLegalTwentyNineActions } from "./selectors";
import { validateTwentyNineAction } from "./validation";
import type { TwentyNineAction, TwentyNineSettings, TwentyNineState } from "./types";

function getTurnInfo(state: TwentyNineState): GameTurnInfo {
  if (state.phase === "finished") return { currentPlayerId: null, turnStartedAt: null, turnSeconds: null };
  return {
    currentPlayerId: state.currentPlayerId,
    turnStartedAt: state.turnStartedAt,
    turnSeconds: state.settings.turnSeconds
  };
}

function getTimeoutAction(params: { state: TwentyNineState; playerId: string }): TimeoutAction<TwentyNineAction> | null {
  if (params.state.phase === "finished" || params.state.currentPlayerId !== params.playerId) return null;
  if (params.state.phase === "bidding") return { playerId: params.playerId, action: { type: "pass_bid" } };
  if (params.state.phase === "trump") return { playerId: params.playerId, action: { type: "choose_trump_suit", suit: "spades" } };
  if (params.state.phase === "doubling") {
    return { playerId: params.playerId, action: params.state.doubleByPlayerId ? { type: "continue_contract" } : { type: "pass_double" } };
  }
  const legal = getLegalTwentyNineActions({ state: params.state, playerId: params.playerId });
  const action = legal.find((item) => item.type === "reveal_trump") ?? legal.find((item) => item.type === "play_card");
  return action ? { playerId: params.playerId, action } : null;
}

export const twentyNineModule: GameModule<TwentyNineState, TwentyNineAction, TwentyNineSettings> = {
  id: "twenty-nine",
  displayName: "29 (Bangladesh)",
  version: TWENTY_NINE_VERSION,
  minPlayers: TWENTY_NINE_MIN_PLAYERS,
  maxPlayers: TWENTY_NINE_MAX_PLAYERS,
  defaultSettings: { ...TWENTY_NINE_DEFAULT_SETTINGS },
  settingsSchema: twentyNineSettingsSchema,
  actionSchema: twentyNineActionSchema,
  createInitialState: createTwentyNineDeal,
  getPublicState: getPublicTwentyNineState,
  getLegalActions: getLegalTwentyNineActions,
  validateAction: ({ state, playerId, action }) => validateTwentyNineAction({ state, settings: state.settings, playerId, action }),
  applyAction: ({ state, playerId, action, now }) => applyTwentyNineAction({ state, settings: state.settings, playerId, action, now }),
  getTurnInfo,
  getTimeoutAction,
  applyTimeout: ({ state, playerId, reason, now }) => applyTwentyNineTimeout({ state, settings: state.settings, playerId, reason: reason ?? "turn_timer", now }),
  isGameOver: (state) => state.phase === "finished",
  getResults: getTwentyNineResults
};

export * from "./actions";
export * from "./constants";
export * from "./deck";
export * from "./public-state";
export * from "./reducer";
export * from "./scoring";
export * from "./selectors";
export * from "./setup";
export * from "./types";
export * from "./validation";
