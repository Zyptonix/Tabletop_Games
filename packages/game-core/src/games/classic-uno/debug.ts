import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent } from "../../engine/GameTypes";
import type { ClassicUnoState, UnoCard, UnoCardValue } from "./types";

export type ClassicUnoDebugScenario =
  | "give_me_playable"
  | "give_me_no_playable"
  | "force_draw_until_playable"
  | "classic_plus2_stack"
  | "classic_plus4_stack"
  | "reverse"
  | "low_draw_pile_refill"
  | "reset_match";

function cloneState(state: ClassicUnoState): ClassicUnoState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    pendingPenalty: state.pendingPenalty ? { ...state.pendingPenalty } : null
  };
}

function card(state: ClassicUnoState, color: UnoCard["color"], value: UnoCardValue, index: number): UnoCard {
  const points = value === "wild" || value === "wild_draw_four" ? 50 : value === "skip" || value === "reverse" || value === "draw_two" ? 20 : Number(value);
  return {
    id: `debug:${state.actionNumber}:${index}:${color}:${value}`,
    color,
    value,
    points
  };
}

function targetPlayerId(state: ClassicUnoState, preferredPlayerId?: string): string | null {
  if (preferredPlayerId && state.players.some((player) => player.userId === preferredPlayerId)) {
    return preferredPlayerId;
  }
  return state.currentPlayerId ?? state.players[0]?.userId ?? null;
}

function setHand(state: ClassicUnoState, playerId: string, hand: UnoCard[]): ClassicUnoState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.userId === playerId ? { ...player, hand, unoCalled: false } : player
    )
  };
}

function setTableForTarget(state: ClassicUnoState, playerId: string, now: string): ClassicUnoState {
  return {
    ...state,
    phase: "playing",
    currentPlayerId: playerId,
    currentColor: "red",
    discardPile: [card(state, "red", "5", 90)],
    pendingPenalty: null,
    lastDrawnCardId: null,
    winnerUserId: null,
    results: null,
    turnStartedAt: now,
    updatedAt: now
  };
}

export function applyClassicUnoDebugScenario(params: {
  state: ClassicUnoState;
  scenario: string;
  requesterId: string;
  targetPlayerId?: string | undefined;
  now: string;
}): { state: ClassicUnoState; events: GameEvent[] } {
  const target = targetPlayerId(params.state, params.targetPlayerId ?? params.requesterId);
  if (!target) {
    return { state: params.state, events: [] };
  }

  let state = cloneState(params.state);
  const scenario = params.scenario as ClassicUnoDebugScenario;

  if (scenario === "reset_match") {
    state = {
      ...state,
      pendingPenalty: null,
      lastDrawnCardId: null,
      winnerUserId: null,
      results: null,
      phase: "playing",
      currentPlayerId: target,
      turnStartedAt: params.now,
      updatedAt: params.now
    };
  } else if (scenario === "give_me_playable") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "7", 1), card(state, "blue", "2", 2)]);
  } else if (scenario === "give_me_no_playable" || scenario === "force_draw_until_playable") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "blue", "9", 1), card(state, "green", "2", 2), card(state, "yellow", "3", 3)]);
    state = {
      ...state,
      drawPile: [card(state, "blue", "1", 4), card(state, "green", "8", 5), card(state, "red", "2", 6), ...state.drawPile]
    };
  } else if (scenario === "classic_plus2_stack") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "draw_two", 1), card(state, "wild", "wild_draw_four", 2)]);
    state = {
      ...state,
      pendingPenalty: { amount: 2, source: "draw_two", requiredResponseMinPower: 2, targetPlayerId: target }
    };
  } else if (scenario === "classic_plus4_stack") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "wild", "wild_draw_four", 1), card(state, "red", "draw_two", 2)]);
    state = {
      ...state,
      pendingPenalty: { amount: 4, source: "wild_draw_four", requiredResponseMinPower: 4, targetPlayerId: target }
    };
  } else if (scenario === "reverse") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "reverse", 1), card(state, "blue", "1", 2)]);
  } else if (scenario === "low_draw_pile_refill") {
    state = setTableForTarget(state, target, params.now);
    state = {
      ...state,
      drawPile: [card(state, "blue", "1", 1)],
      discardPile: [card(state, "green", "4", 2), card(state, "yellow", "6", 3), card(state, "red", "5", 4)]
    };
  }

  state = {
    ...state,
    actionNumber: state.actionNumber + 1,
    updatedAt: params.now
  };

  return {
    state,
    events: [
      createGameEvent("debug:uno_scenario", {
        message: `Debug scenario applied: ${params.scenario}`,
        payload: { scenario: params.scenario, targetPlayerId: target }
      })
    ]
  };
}