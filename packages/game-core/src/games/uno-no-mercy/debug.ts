import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent } from "../../engine/GameTypes";
import type { NoMercyCard, NoMercyCardValue, NoMercyState } from "./types";

export type NoMercyDebugScenario =
  | "give_me_playable"
  | "give_me_no_playable"
  | "force_draw_until_playable"
  | "no_mercy_plus10_stack"
  | "no_mercy_plus20_stack"
  | "roulette_against_me"
  | "zero_pass"
  | "seven_swap"
  | "reverse"
  | "skip_everyone"
  | "low_draw_pile_refill"
  | "mercy_elimination"
  | "reset_match";

function cloneState(state: NoMercyState): NoMercyState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    mercyPile: [...state.mercyPile],
    pendingPenalty: state.pendingPenalty ? { ...state.pendingPenalty } : null,
    pendingRoulette: state.pendingRoulette ? { ...state.pendingRoulette, revealedCards: [...state.pendingRoulette.revealedCards] } : null
  };
}

function assetKey(color: NoMercyCard["color"], value: NoMercyCardValue): string {
  const normalizedValue = value.replaceAll("_", "-");
  return color === "wild" ? (normalizedValue === "wild" ? "wild" : `wild-${normalizedValue.replace(/^wild-/, "")}`) : `${color}-${normalizedValue}`;
}

function card(state: NoMercyState, color: NoMercyCard["color"], value: NoMercyCardValue, index: number): NoMercyCard {
  const drawAmount = value === "draw_two" ? 2 : value === "draw_four" || value === "wild_draw_four_reverse" || value === "wild_draw_four" ? 4 : value === "wild_draw_six" ? 6 : value === "wild_draw_ten" ? 10 : undefined;
  const points = drawAmount ? Math.max(20, drawAmount * 10) : value === "wild" || value === "roulette" ? 50 : value === "skip" || value === "reverse" ? 20 : value === "comeback" || value === "discard_all" ? 30 : Number(value);
  return {
    id: `debug:${state.actionNumber}:${index}:${color}:${value}`,
    assetKey: assetKey(color, value),
    color,
    value,
    points,
    ...(drawAmount ? { drawAmount, stackPower: drawAmount } : {})
  };
}

function targetPlayerId(state: NoMercyState, preferredPlayerId?: string): string | null {
  if (preferredPlayerId && state.players.some((player) => player.userId === preferredPlayerId && !player.eliminated)) {
    return preferredPlayerId;
  }
  return state.currentPlayerId ?? state.players.find((player) => !player.eliminated)?.userId ?? null;
}

function nextOtherPlayerId(state: NoMercyState, playerId: string): string | null {
  return state.players.find((player) => player.userId !== playerId && !player.eliminated)?.userId ?? playerId;
}

function setHand(state: NoMercyState, playerId: string, hand: NoMercyCard[]): NoMercyState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.userId === playerId ? { ...player, hand, eliminated: false, unoCalled: false } : player
    )
  };
}

function setTableForTarget(state: NoMercyState, playerId: string, now: string): NoMercyState {
  return {
    ...state,
    phase: "playing",
    currentPlayerId: playerId,
    currentColor: "red",
    discardPile: [card(state, "red", "5", 90)],
    pendingPenalty: null,
    pendingRoulette: null,
    lastDrawnCardId: null,
    winnerUserId: null,
    results: null,
    turnStartedAt: now,
    updatedAt: now
  };
}

export function applyNoMercyDebugScenario(params: {
  state: NoMercyState;
  scenario: string;
  requesterId: string;
  targetPlayerId?: string | undefined;
  now: string;
}): { state: NoMercyState; events: GameEvent[] } {
  const target = targetPlayerId(params.state, params.targetPlayerId ?? params.requesterId);
  if (!target) {
    return { state: params.state, events: [] };
  }

  let state = cloneState(params.state);
  const scenario = params.scenario as NoMercyDebugScenario;

  if (scenario === "reset_match") {
    state = {
      ...state,
      pendingPenalty: null,
      pendingRoulette: null,
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
  } else if (scenario === "no_mercy_plus10_stack") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "wild", "wild_draw_ten", 1)]);
    state = {
      ...state,
      pendingPenalty: { amount: 10, source: "wild_draw_ten", requiredResponseMinPower: 10, targetPlayerId: target }
    };
  } else if (scenario === "no_mercy_plus20_stack") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "wild", "wild_draw_ten", 1)]);
    state = {
      ...state,
      pendingPenalty: { amount: 20, source: "wild_draw_ten", requiredResponseMinPower: 10, targetPlayerId: target },
      drawPile: [
        ...Array.from({ length: 24 }, (_, index) => card(state, index % 2 === 0 ? "blue" : "green", "1", 200 + index)),
        ...state.drawPile
      ]
    };
  } else if (scenario === "roulette_against_me") {
    state = setTableForTarget(state, target, params.now);
    state = {
      ...state,
      pendingRoulette: { targetPlayerId: target, playedByPlayerId: nextOtherPlayerId(state, target) ?? target, revealedCards: [], chosenColor: undefined },
      currentPlayerId: target,
      drawPile: [card(state, "blue", "1", 1), card(state, "green", "2", 2), card(state, "red", "3", 3), ...state.drawPile]
    };
  } else if (scenario === "zero_pass") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "0", 1), card(state, "blue", "2", 2)]);
  } else if (scenario === "seven_swap") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "7", 1)]);
    const other = nextOtherPlayerId(state, target);
    if (other && other !== target) {
      state = setHand(state, other, [card(state, "blue", "4", 2), card(state, "green", "8", 3)]);
    }
  } else if (scenario === "reverse") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "reverse", 1), card(state, "blue", "1", 2)]);
  } else if (scenario === "skip_everyone") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, [card(state, "red", "comeback", 1), card(state, "blue", "1", 2)]);
  } else if (scenario === "low_draw_pile_refill") {
    state = setTableForTarget(state, target, params.now);
    state = {
      ...state,
      drawPile: [card(state, "blue", "1", 1)],
      discardPile: [card(state, "green", "4", 2), card(state, "yellow", "6", 3), card(state, "red", "5", 4)],
      mercyPile: [card(state, "blue", "3", 5), card(state, "green", "9", 6)]
    };
  } else if (scenario === "mercy_elimination") {
    state = setTableForTarget(state, target, params.now);
    state = setHand(state, target, Array.from({ length: Math.max(0, state.settings.eliminationHandSize - 1) }, (_, index) => card(state, "blue", "1", 10 + index)));
    state = {
      ...state,
      drawPile: [card(state, "red", "2", 1), ...state.drawPile]
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