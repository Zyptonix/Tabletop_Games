import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent } from "../../engine/GameTypes";
import type { NoMercyAction, NoMercyCard, NoMercySettings, NoMercyState } from "./types";
import {
  advanceTurn,
  cardLabel,
  drawCards,
  findNoMercyPlayer,
  getActivePlayers,
  getDrawPenaltyAmount,
  getStackPower,
  getTopDiscard,
  isCardPlayable,
  isDrawPenaltyCard,
  nextActivePlayerId,
  resolveDeclaredColor
} from "./rules";
import { getNoMercyResults } from "./scoring";

function cloneState(state: NoMercyState): NoMercyState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    pendingPenalty: state.pendingPenalty ? { ...state.pendingPenalty } : null
  };
}

function withActionMeta(state: NoMercyState, previousState: NoMercyState, now: string): NoMercyState {
  return {
    ...state,
    updatedAt: now,
    actionNumber: previousState.actionNumber + 1
  };
}

function finishGame(state: NoMercyState, winnerUserId: string | null, now: string): NoMercyState {
  const finished: NoMercyState = {
    ...state,
    phase: "finished",
    currentPlayerId: null,
    pendingPenalty: null,
    winnerUserId,
    updatedAt: now
  };

  return {
    ...finished,
    results: getNoMercyResults(finished)
  };
}

function finishIfResolved(state: NoMercyState, preferredWinnerId: string | null, now: string): NoMercyState {
  if (state.phase === "finished") {
    return state;
  }

  const preferredWinner = preferredWinnerId ? findNoMercyPlayer(state, preferredWinnerId) : null;
  if (preferredWinner && !preferredWinner.eliminated && preferredWinner.hand.length === 0) {
    return finishGame(state, preferredWinner.userId, now);
  }

  const activePlayers = getActivePlayers(state);
  const emptyHandWinner = activePlayers.find((player) => player.hand.length === 0);
  if (emptyHandWinner) {
    return finishGame(state, emptyHandWinner.userId, now);
  }

  if (activePlayers.length <= 1) {
    return finishGame(state, activePlayers[0]?.userId ?? preferredWinnerId, now);
  }

  return state;
}

function pushGameOverEvent(state: NoMercyState, events: GameEvent[]): void {
  if (state.phase !== "finished") {
    return;
  }
  const winner = state.winnerUserId ? state.players.find((player) => player.userId === state.winnerUserId) : null;
  events.push(
    createGameEvent("uno-no-mercy:game_over", {
      message: winner ? `${winner.displayName} won No Mercy.` : "No Mercy ended.",
      payload: { winnerUserId: state.winnerUserId, results: state.results }
    })
  );
}

function eliminateOverLimit(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  events: GameEvent[];
}): NoMercyState {
  const { settings, events } = params;
  let state = params.state;
  let changed = false;
  const players = state.players.map((player) => {
    if (!player.eliminated && player.hand.length >= settings.eliminationHandSize) {
      changed = true;
      events.push(
        createGameEvent("uno-no-mercy:eliminated", {
          message: `${player.displayName} was eliminated at ${player.hand.length} cards.`,
          payload: { playerId: player.userId, handCount: player.hand.length }
        })
      );
      return { ...player, eliminated: true, unoCalled: false };
    }
    return player;
  });

  if (changed) {
    state = { ...state, players };
  }
  return state;
}

function swapHands(params: {
  state: NoMercyState;
  playerId: string;
  targetPlayerId: string;
  events: GameEvent[];
}): NoMercyState {
  const { playerId, targetPlayerId, events } = params;
  const players = params.state.players.map((player) => ({ ...player, hand: [...player.hand], unoCalled: false }));
  const player = players.find((item) => item.userId === playerId);
  const target = players.find((item) => item.userId === targetPlayerId);
  if (!player || !target || player.eliminated || target.eliminated) {
    return params.state;
  }

  const playerHand = player.hand;
  player.hand = target.hand;
  target.hand = playerHand;

  events.push(
    createGameEvent("uno-no-mercy:seven_swap", {
      message: `${player.displayName} swapped hands with ${target.displayName}.`,
      payload: { playerId, targetPlayerId }
    })
  );

  return { ...params.state, players };
}

function passHands(state: NoMercyState, events: GameEvent[]): NoMercyState {
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length <= 1) {
    return state;
  }

  const handByUserId = new Map(activePlayers.map((player) => [player.userId, [...player.hand]]));
  const players = state.players.map((player) => {
    if (player.eliminated) {
      return player;
    }

    const sourceId = nextActivePlayerId({ ...state, direction: state.direction === 1 ? -1 : 1 }, 1, player.userId);
    return {
      ...player,
      hand: sourceId ? handByUserId.get(sourceId) ?? [] : [...player.hand],
      unoCalled: false
    };
  });

  events.push(
    createGameEvent("uno-no-mercy:zero_pass", {
      message: "All hands passed in the current direction.",
      payload: { direction: state.direction }
    })
  );

  return { ...state, players };
}

function discardAllMatchingColor(params: {
  state: NoMercyState;
  playerId: string;
  color: NoMercyCard["color"];
  events: GameEvent[];
}): NoMercyState {
  const { playerId, color, events } = params;
  if (color === "wild") {
    return params.state;
  }

  const players = params.state.players.map((player) => ({ ...player, hand: [...player.hand] }));
  const player = players.find((item) => item.userId === playerId);
  if (!player) {
    return params.state;
  }

  const discarded = player.hand.filter((card) => card.color === color);
  player.hand = player.hand.filter((card) => card.color !== color);
  player.unoCalled = false;

  if (discarded.length > 0) {
    events.push(
      createGameEvent("uno-no-mercy:discard_all", {
        message: `${player.displayName} discarded ${discarded.length} ${color} card${discarded.length === 1 ? "" : "s"}.`,
        payload: { playerId, color, count: discarded.length }
      })
    );
  }

  return {
    ...params.state,
    players,
    discardPile: [...params.state.discardPile, ...discarded]
  };
}

function drawUntilColor(params: {
  state: NoMercyState;
  playerId: string;
  color: NoMercyCard["color"];
}): { state: NoMercyState; count: number } {
  let state = params.state;
  let count = 0;

  while (state.drawPile.length > 0 || state.discardPile.length > 1) {
    const drawn = drawCards(state, params.playerId, 1);
    const card = drawn.cards[0];
    if (!card) {
      break;
    }
    state = drawn.state;
    count += 1;
    if (card.color === params.color) {
      break;
    }
  }

  return { state, count };
}

function applyDrawPenaltyCard(params: {
  state: NoMercyState;
  playedCard: NoMercyCard;
  playerId: string;
  now: string;
  events: GameEvent[];
}): NoMercyState {
  const { playedCard, playerId, now, events } = params;
  let state = params.state;

  if (playedCard.value === "wild_draw_four_reverse") {
    state = { ...state, direction: state.direction === 1 ? -1 : 1 };
    events.push(createGameEvent("uno-no-mercy:reverse", { message: "Wild Draw 4 Reverse changed direction." }));
  }

  const targetPlayerId = nextActivePlayerId(state, 1, playerId);
  const amount = (state.pendingPenalty?.amount ?? 0) + getDrawPenaltyAmount(playedCard);

  events.push(
    createGameEvent("uno-no-mercy:penalty_stack", {
      message: `${cardLabel(playedCard)} added ${getDrawPenaltyAmount(playedCard)} to the draw stack.`,
      payload: { playerId, targetPlayerId, amount, source: playedCard.value }
    })
  );

  return {
    ...state,
    pendingPenalty: targetPlayerId
      ? {
          amount,
          source: playedCard.value,
          requiredResponseMinPower: getStackPower(playedCard),
          targetPlayerId
        }
      : null,
    currentPlayerId: targetPlayerId,
    lastDrawnCardId: null,
    turnStartedAt: now
  };
}

function applyCardEffect(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  playedCard: NoMercyCard;
  playerId: string;
  action: NoMercyAction;
  now: string;
  events: GameEvent[];
}): NoMercyState {
  const { playedCard, playerId, action, now, events, settings } = params;
  let state = params.state;
  const activeCount = getActivePlayers(state).length;

  if (isDrawPenaltyCard(playedCard)) {
    return applyDrawPenaltyCard({ state, playedCard, playerId, now, events });
  }

  if (playedCard.value === "roulette") {
    const targetPlayerId = nextActivePlayerId(state, 1, playerId);
    if (targetPlayerId) {
      const drawn = drawUntilColor({ state, playerId: targetPlayerId, color: state.currentColor });
      state = drawn.state;
      events.push(
        createGameEvent("uno-no-mercy:roulette", {
          message: `Roulette made a player draw ${drawn.count} card${drawn.count === 1 ? "" : "s"}.`,
          payload: { playerId, targetPlayerId, color: action.type === "play_card" ? action.declaredColor : undefined, count: drawn.count }
        })
      );
      state = eliminateOverLimit({ state, settings, events });
      state = finishIfResolved(state, null, now);
      if (state.phase === "finished") {
        return state;
      }
      return advanceTurn(state, { steps: 1, now, fromPlayerId: targetPlayerId });
    }
    return state;
  }

  if (playedCard.value === "reverse") {
    state = { ...state, direction: state.direction === 1 ? -1 : 1 };
    events.push(createGameEvent("uno-no-mercy:reverse", { message: "Turn direction reversed." }));
    return advanceTurn(state, { steps: activeCount === 2 ? 2 : 1, now });
  }

  if (playedCard.value === "skip") {
    const skippedPlayerId = nextActivePlayerId(state, 1, playerId);
    events.push(
      createGameEvent("uno-no-mercy:skip", {
        message: "A player was skipped.",
        payload: { skippedPlayerId }
      })
    );
    return advanceTurn(state, { steps: 2, now });
  }

  if (playedCard.value === "comeback") {
    events.push(
      createGameEvent("uno-no-mercy:comeback", {
        message: "Skip All returns play to the same player.",
        payload: { playerId }
      })
    );
    return { ...state, currentPlayerId: playerId, lastDrawnCardId: null, turnStartedAt: now };
  }

  return advanceTurn(state, { steps: 1, now });
}

function resolvePendingPenalty(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  playerId: string;
  now: string;
  events: GameEvent[];
}): NoMercyState {
  const { state: inputState, settings, playerId, now, events } = params;
  const pending = inputState.pendingPenalty;
  if (!pending) {
    return inputState;
  }

  const drawn = drawCards(inputState, playerId, pending.amount);
  let state: NoMercyState = {
    ...drawn.state,
    pendingPenalty: null,
    lastDrawnCardId: null
  };

  events.push(
    createGameEvent("uno-no-mercy:penalty_resolved", {
      message: `A player drew ${drawn.cards.length} stacked penalty card${drawn.cards.length === 1 ? "" : "s"}.`,
      payload: { playerId, count: drawn.cards.length, amount: pending.amount }
    })
  );

  state = eliminateOverLimit({ state, settings, events });
  state = finishIfResolved(state, null, now);
  if (state.phase === "finished") {
    return state;
  }
  return advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
}

export function applyNoMercyAction(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  playerId: string;
  action: NoMercyAction;
  now: string;
}): { state: NoMercyState; events: GameEvent[] } {
  const { playerId, action, now, settings } = params;
  let state = cloneState(params.state);
  const events: GameEvent[] = [];
  const player = findNoMercyPlayer(state, playerId);

  if (!player) {
    return { state: params.state, events };
  }

  if (action.type === "call_uno") {
    player.unoCalled = true;
    state = withActionMeta({ ...state, players: state.players }, params.state, now);
    events.push(createGameEvent("uno-no-mercy:called", { message: `${player.displayName} called UNO.`, payload: { playerId } }));
    return { state, events };
  }

  if (action.type === "draw_card") {
    if (state.pendingPenalty) {
      state = resolvePendingPenalty({ state, settings, playerId, now, events });
      state = withActionMeta(state, params.state, now);
      pushGameOverEvent(state, events);
      return { state, events };
    }

    const drawn = drawCards(state, playerId, 1);
    state = drawn.state;
    const card = drawn.cards[0] ?? null;
    const refreshedPlayer = findNoMercyPlayer(state, playerId);
    const canPlayDrawn = Boolean(card && refreshedPlayer && !refreshedPlayer.eliminated && isCardPlayable(state, card));

    events.push(
      createGameEvent("uno-no-mercy:draw", {
        message: `${player.displayName} drew a card.`,
        payload: { playerId, count: drawn.cards.length },
        targetUserIds: [playerId]
      })
    );

    state = eliminateOverLimit({ state, settings, events });
    state = finishIfResolved(state, null, now);
    if (state.phase !== "finished") {
      const stillActivePlayer = findNoMercyPlayer(state, playerId);
      state = canPlayDrawn && stillActivePlayer && !stillActivePlayer.eliminated
        ? { ...state, lastDrawnCardId: card?.id ?? null, updatedAt: now }
        : advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
    }

    state = withActionMeta(state, params.state, now);
    pushGameOverEvent(state, events);
    return { state, events };
  }

  if (action.type === "pass_turn") {
    state = advanceTurn(state, { steps: 1, now });
    state = withActionMeta(state, params.state, now);
    events.push(createGameEvent("uno-no-mercy:pass", { message: `${player.displayName} passed.` }));
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
    updatedAt: now
  };

  events.push(
    createGameEvent("uno-no-mercy:play_card", {
      message: `${player.displayName} played ${cardLabel(playedCard)}.`,
      payload: { playerId, card: playedCard, currentColor, topDiscard: getTopDiscard(state) }
    })
  );

  if (playedCard.value === "7" && action.targetPlayerId) {
    state = swapHands({ state, playerId, targetPlayerId: action.targetPlayerId, events });
  }

  if (playedCard.value === "0") {
    state = passHands(state, events);
  }

  if (playedCard.value === "discard_all") {
    state = discardAllMatchingColor({ state, playerId, color: playedCard.color, events });
  }

  const postEffectPlayer = findNoMercyPlayer(state, playerId);
  if (settings.mustCallUno && postEffectPlayer && postEffectPlayer.hand.length === 1 && !postEffectPlayer.unoCalled) {
    events.push(
      createGameEvent("uno-no-mercy:needs_call", {
        message: `${postEffectPlayer.displayName} has one card left.`,
        payload: { playerId },
        targetUserIds: [playerId]
      })
    );
  }

  state = finishIfResolved(state, playerId, now);
  if (state.phase !== "finished") {
    state = applyCardEffect({ state, settings, playedCard, playerId, action, now, events });
    state = finishIfResolved(state, playerId, now);
  }

  state = withActionMeta(state, params.state, now);
  pushGameOverEvent(state, events);
  return { state, events };
}
