import type { GameModule } from "../../engine/GameModule";
import type { GameTurnInfo, TimeoutAction } from "../../engine/GameTypes";
import { werewolfActionSchema, werewolfSettingsSchema } from "./actions";
import { DEFAULT_WEREWOLF_SETTINGS, WEREWOLF_MAX_PLAYERS, WEREWOLF_MIN_PLAYERS } from "./constants";
import { getPublicWerewolfState } from "./public-state";
import { applyWerewolfAction, applyWerewolfTimeout } from "./reducer";
import { getWerewolfResults } from "./scoring";
import { getLegalWerewolfActions } from "./selectors";
import { createInitialWerewolfState } from "./setup";
import type { WerewolfAction, WerewolfSettings, WerewolfState } from "./types";
import { validateWerewolfAction } from "./validation";

function getTurnInfo(state: WerewolfState): GameTurnInfo {
  if (state.phase === "finished") {
    return { currentPlayerId: null, turnStartedAt: null, turnSeconds: null };
  }

  return {
    currentPlayerId: state.moderatorPlayerId,
    turnStartedAt: state.phaseStartedAt,
    turnSeconds: Math.ceil(state.phaseDurationMs / 1000)
  };
}

function getTimeoutAction(params: { state: WerewolfState; playerId: string }): TimeoutAction<WerewolfAction> | null {
  if (params.state.phase === "finished" || params.playerId !== params.state.moderatorPlayerId) {
    return null;
  }
  return { playerId: params.playerId, action: { type: "advance_phase" } };
}

export const werewolfModule: GameModule<WerewolfState, WerewolfAction, WerewolfSettings> = {
  id: "mafia-werewolf",
  displayName: "Mafia/Werewolf",
  version: "0.1.0",
  minPlayers: WEREWOLF_MIN_PLAYERS,
  maxPlayers: WEREWOLF_MAX_PLAYERS,
  defaultSettings: DEFAULT_WEREWOLF_SETTINGS,
  settingsSchema: werewolfSettingsSchema,
  actionSchema: werewolfActionSchema,
  createInitialState: createInitialWerewolfState,
  getPublicState: getPublicWerewolfState,
  getLegalActions: getLegalWerewolfActions,
  validateAction: validateWerewolfAction,
  applyAction: applyWerewolfAction,
  getTurnInfo,
  getTimeoutAction,
  applyTimeout: ({ state, playerId, now }) => applyWerewolfTimeout({ state, playerId, now }),
  isGameOver: (state) => state.phase === "finished",
  getResults: getWerewolfResults
};

export * from "./actions";
export * from "./constants";
export * from "./public-state";
export * from "./reducer";
export * from "./roles";
export * from "./rules";
export * from "./scoring";
export * from "./selectors";
export * from "./setup";
export * from "./types";
export * from "./validation";
