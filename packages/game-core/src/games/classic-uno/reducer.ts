import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent } from "../../engine/GameTypes";
import type { ClassicUnoSettings, ClassicUnoState, UnoAction, UnoCard } from "./types";
import {
  advanceTurn,
  cardLabel,
  drawCards,
  findUnoPlayer,
  getDrawPenaltyAmount,
  getStackPower,
  getTopDiscard,
  isCardPlayable,
  isDrawPenaltyCard,
  nextPlayerId,
  resolveDeclaredColor
} from "./rules";
import { getClassicUnoResults } from "./scoring";

function clonePlayers(state: ClassicUnoState): ClassicUnoState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand]
    })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    pendingPenalty: state.pendingPenalty ? { ...state.pendingPenalty } : null
  };
}

function finishGame(state: ClassicUnoState, winnerUserId: string, now: string): ClassicUnoState {
  const finished: ClassicUnoState = {
    ...state,
    phase: "finished",
    currentPlayerId: null,
    pendingPenalty: null,
    winnerUserId,
    updatedAt: now
  };

  return {
    ...finished,
    results: getClassicUnoResults(finished)
  };
}

function finishIfWinner(state: ClassicUnoState, playerId: string, now: string): ClassicUnoState {
  if (state.pendingPenalty) {
    return state;
  }

  const player = findUnoPlayer(state, playerId);
  if (!player || player.hand.length > 0) {
    return state;
  }

  return finishGame(state, playerId, now);
}

function finishIfAnyWinner(state: ClassicUnoState, now: string): ClassicUnoState {
  if (state.pendingPenalty) {
    return state;
  }

  const winner = state.players.find((player) => player.hand.length === 0);
  return winner ? finishGame(state, winner.userId, now) : state;
}

function pushGameOverEvent(state: ClassicUnoState, events: GameEvent[]): void {
  if (state.phase !== "finished") {
    return;
  }

  const winner = state.winnerUserId ? state.players.find((player) => player.userId === state.winnerUserId) : null;
  events.push(
    createGameEvent("uno:game_over", {
      message: winner ? `${winner.displayName} won the game.` : "Classic UNO ended.",
      payload: { winnerUserId: state.winnerUserId, results: state.results }
    })
  );
}

function applyDrawPenaltyCard(params: {
  state: ClassicUnoState;
  playedCard: UnoCard;
  playerId: string;
  now: string;
  events: GameEvent[];
}): ClassicUnoState {
  const { state, playedCard, playerId, now, events } = params;
  const targetPlayerId = nextPlayerId(state, 1);
  const addedAmount = getDrawPenaltyAmount(playedCard);
  const amount = (state.pendingPenalty?.amount ?? 0) + addedAmount;
  const requiredResponseMinPower = getStackPower(playedCard);

  events.push(
    createGameEvent("uno:penalty_stack", {
      message: `${cardLabel(playedCard)} added ${addedAmount} to the draw stack.`,
      payload: {
        playerId,
        targetPlayerId,
        amount,
        pendingAmount: amount,
        addedAmount,
        source: playedCard.value
      }
    })
  );

  return {
    ...state,
    pendingPenalty: targetPlayerId
      ? {
          amount,
          source: playedCard.value === "wild_draw_four" ? "wild_draw_four" : "draw_two",
          requiredResponseMinPower,
          targetPlayerId
        }
      : null,
    currentPlayerId: targetPlayerId,
    lastDrawnCardId: null,
    turnStartedAt: now
  };
}

function resolvePendingPenalty(params: {
  state: ClassicUnoState;
  playerId: string;
  now: string;
  events: GameEvent[];
}): ClassicUnoState {
  const { state: inputState, playerId, now, events } = params;
  const pending = inputState.pendingPenalty;
  if (!pending) {
    return inputState;
  }

  const drawn = drawCards(inputState, playerId, pending.amount);
  let state: ClassicUnoState = {
    ...drawn.state,
    pendingPenalty: null,
    lastDrawnCardId: null,
    updatedAt: now
  };

  events.push(
    createGameEvent("uno:penalty_resolved", {
      message: `A player drew ${drawn.cards.length} stacked penalty card${drawn.cards.length === 1 ? "" : "s"}.`,
      payload: {
        playerId,
        count: drawn.cards.length,
        amount: pending.amount,
        pendingAmount: pending.amount,
        actuallyDrawn: drawn.cards.length,
        source: "stack"
      }
    })
  );

  events.push(
    createGameEvent("uno:cards_drawn", {
      message: `A player drew ${drawn.cards.length} stacked penalty card${drawn.cards.length === 1 ? "" : "s"}.`,
      payload: {
        playerId,
        count: drawn.cards.length,
        amount: pending.amount,
        pendingAmount: pending.amount,
        actuallyDrawn: drawn.cards.length,
        source: "stack_penalty"
      }
    })
  );

  state = finishIfAnyWinner(state, now);
  if (state.phase === "finished") {
    return state;
  }

  return advanceTurn(state, { steps: 1, now });
}

function applyCardEffect(params: {
  state: ClassicUnoState;
  settings: ClassicUnoSettings;
  playedCard: UnoCard;
  playerId: string;
  now: string;
  events: GameEvent[];
}): ClassicUnoState {
  const { playedCard, playerId, now, events } = params;
  let state = params.state;
  const playerCount = state.turnOrder.length;

  if (isDrawPenaltyCard(playedCard)) {
    return applyDrawPenaltyCard({ state, playedCard, playerId, now, events });
  }

  if (playedCard.value === "reverse") {
    state = { ...state, direction: state.direction === 1 ? -1 : 1 };
    events.push(createGameEvent("uno:reverse", { message: "Turn direction reversed." }));
    const steps = playerCount === 2 ? 2 : 1;
    return advanceTurn(state, { steps, now });
  }

  if (playedCard.value === "skip") {
    const skippedPlayerId = advanceTurn(state, { steps: 1, now }).currentPlayerId;
    events.push(
      createGameEvent("uno:skip", {
        message: "A player was skipped.",
        payload: { skippedPlayerId }
      })
    );
    return advanceTurn(state, { steps: 2, now });
  }

  return advanceTurn(state, { steps: 1, now });
}

export function applyClassicUnoAction(params: {
  state: ClassicUnoState;
  settings: ClassicUnoSettings;
  playerId: string;
  action: UnoAction;
  now: string;
}): { state: ClassicUnoState; events: GameEvent[] } {
  const { playerId, action, now, settings } = params;
  let state = clonePlayers(params.state);
  const events: GameEvent[] = [];
  const player = findUnoPlayer(state, playerId);

  if (!player) {
    return { state: params.state, events };
  }

  if (action.type === "call_uno") {
    player.unoCalled = true;
    state = {
      ...state,
      players: state.players,
      updatedAt: now,
      actionNumber: state.actionNumber + 1
    };
    events.push(createGameEvent("uno:called", { message: `${player.displayName} called UNO.`, payload: { playerId } }));
    return { state, events };
  }

  if (action.type === "draw_card") {
    if (state.pendingPenalty) {
      state = resolvePendingPenalty({ state, playerId, now, events });
      state = {
        ...state,
        updatedAt: now,
        actionNumber: params.state.actionNumber + 1
      };
      pushGameOverEvent(state, events);
      return { state, events };
    }

    const drawn = drawCards(state, playerId, 1);
    state = drawn.state;
    const card = drawn.cards[0] ?? null;
    const canPlayDrawn = card ? isCardPlayable(state, card) : false;
    state = {
      ...state,
      lastDrawnCardId: canPlayDrawn && card ? card.id : null,
      updatedAt: now,
      actionNumber: state.actionNumber + 1
    };
    events.push(
      createGameEvent("uno:draw", {
        message: `${player.displayName} drew a card.`,
        payload: { playerId, count: drawn.cards.length, actuallyDrawn: drawn.cards.length, source: "normal_draw" }
      })
    );

    // Normal draws are intentionally one card at a time. If the drawn card is not playable,
    // the player keeps the turn and may draw again, matching the one-by-one roulette flow.
    if (!canPlayDrawn && drawn.cards.length === 0) {
      state = advanceTurn(state, { steps: 1, now });
    }

    return { state, events };
  }

  if (action.type === "pass_turn") {
    state = {
      ...advanceTurn(state, { steps: 1, now }),
      updatedAt: now,
      actionNumber: state.actionNumber + 1
    };
    events.push(createGameEvent("uno:pass", { message: `${player.displayName} passed.` }));
    return { state, events };
  }

  const cardIndex = player.hand.findIndex((card) => card.id === action.cardId);
  const playedCard = player.hand[cardIndex];
  if (!playedCard) {
    return { state: params.state, events };
  }

  player.hand.splice(cardIndex, 1);
  player.unoCalled = settings.mustCallUno && player.hand.length === 1 ? player.unoCalled : false;
  const currentColor = resolveDeclaredColor(playedCard, action.declaredColor);

  state = {
    ...state,
    players: state.players,
    discardPile: [...state.discardPile, playedCard],
    currentColor,
    lastDrawnCardId: null,
    updatedAt: now,
    actionNumber: state.actionNumber + 1
  };

  events.push(
    createGameEvent("uno:play_card", {
      message: `${player.displayName} played ${cardLabel(playedCard)}.`,
      payload: { playerId, card: playedCard, currentColor, topDiscard: getTopDiscard(state) }
    })
  );

  if (settings.mustCallUno && player.hand.length === 1 && !player.unoCalled) {
    events.push(
      createGameEvent("uno:needs_call", {
        message: `${player.displayName} has one card left.`,
        payload: { playerId },
        targetUserIds: [playerId]
      })
    );
  }

  state = applyCardEffect({ state, settings, playedCard, playerId, now, events });
  state = finishIfWinner(state, playerId, now);
  state = {
    ...state,
    updatedAt: now
  };

  pushGameOverEvent(state, events);
  return { state, events };
}