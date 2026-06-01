import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent, TimeoutReason } from "../../engine/GameTypes";
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
    mercyPile: [...(state.mercyPile ?? [])],
    pendingPenalty: state.pendingPenalty ? { ...state.pendingPenalty } : null,
    pendingRoulette: state.pendingRoulette ? { ...state.pendingRoulette, revealedCards: [...state.pendingRoulette.revealedCards] } : null
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
    pendingRoulette: null,
    winnerUserId,
    updatedAt: now
  };

  return {
    ...finished,
    results: getNoMercyResults(finished)
  };
}

function finishIfResolved(state: NoMercyState, preferredWinnerId: string | null, now: string): NoMercyState {
  if (state.phase === "finished" || state.pendingPenalty || state.pendingRoulette) {
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
  let changed = false;
  const mercyPile: NoMercyCard[] = [...(params.state.mercyPile ?? [])];

  const players = params.state.players.map((player) => {
    if (!player.eliminated && player.hand.length >= settings.eliminationHandSize) {
      changed = true;
      const eliminatedHand = [...player.hand];
      mercyPile.push(...eliminatedHand);

      events.push(
        createGameEvent("uno-no-mercy:eliminated", {
          message: `${player.displayName} was eliminated at ${eliminatedHand.length} cards.`,
          payload: { playerId: player.userId, handCount: eliminatedHand.length, mercyPileCount: mercyPile.length }
        })
      );

      return { ...player, hand: [], eliminated: true, unoCalled: false };
    }

    return player;
  });

  if (!changed) {
    return params.state;
  }

  return { ...params.state, players, mercyPile };
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
  const playerCount = player.hand.length;
  const targetCount = target.hand.length;
  player.hand = target.hand;
  target.hand = playerHand;

  events.push(
    createGameEvent("uno-no-mercy:seven_swap", {
      message: `${player.displayName} swapped hands with ${target.displayName}.`,
      payload: { fromPlayerId: playerId, toPlayerId: targetPlayerId, fromCount: playerCount, toCount: targetCount, source: "seven_swap" }
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
  const transfers: Array<{ fromPlayerId: string; toPlayerId: string; count: number; cardCount: number }> = [];
  const players = state.players.map((player) => {
    if (player.eliminated) {
      return player;
    }

    const sourceId = nextActivePlayerId({ ...state, direction: state.direction === 1 ? -1 : 1 }, 1, player.userId);
    const newHand = sourceId ? handByUserId.get(sourceId) ?? [] : [...player.hand];
    if (sourceId) {
      transfers.push({
        fromPlayerId: sourceId,
        toPlayerId: player.userId,
        count: newHand.length,
        cardCount: newHand.length
      });
    }
    return {
      ...player,
      hand: newHand,
      unoCalled: false
    };
  });

  events.push(
    createGameEvent("uno-no-mercy:zero_pass", {
      message: "All hands passed in the current direction.",
      payload: { direction: state.direction, directionLabel: state.direction === 1 ? "clockwise" : "counterclockwise", transfers }
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

  const playedDiscardAll = getTopDiscard(params.state);
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

  // Rule sheet: place the extra cards under the Discard All card, so the Discard All
  // card remains the visible top discard after the effect resolves.
  return {
    ...params.state,
    players,
    discardPile: [...params.state.discardPile.slice(0, -1), ...discarded, playedDiscardAll]
  };
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

  const activeCount = getActivePlayers(state).length;

  if (playedCard.value === "wild_draw_four_reverse") {
    state = { ...state, direction: state.direction === 1 ? -1 : 1 };
    events.push(createGameEvent("uno-no-mercy:reverse", { message: "Wild Draw 4 Reverse changed direction." }));
  }

  // In a two-player game, Wild Reverse Draw 4 skips the other player and targets
  // the player who played it, exactly as the No Mercy rule sheet says.
  const targetPlayerId = playedCard.value === "wild_draw_four_reverse" && activeCount === 2
    ? playerId
    : nextActivePlayerId(state, 1, playerId);
  const amount = (state.pendingPenalty?.amount ?? 0) + getDrawPenaltyAmount(playedCard);

  events.push(
    createGameEvent("uno-no-mercy:penalty_stack", {
      message: `${cardLabel(playedCard)} added ${getDrawPenaltyAmount(playedCard)} to the draw stack.`,
      payload: { playerId, targetPlayerId, amount, pendingAmount: amount, addedAmount: getDrawPenaltyAmount(playedCard), source: playedCard.value }
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
    if (!targetPlayerId) {
      return state;
    }

    events.push(
      createGameEvent("uno-no-mercy:roulette_pending", {
        message: "Color Roulette is waiting for the target player to choose a color.",
        payload: { playerId, targetPlayerId, source: "roulette_pending" }
      })
    );

    return {
      ...state,
      pendingRoulette: { targetPlayerId, playedByPlayerId: playerId, revealedCards: [] },
      currentPlayerId: targetPlayerId,
      lastDrawnCardId: null,
      turnStartedAt: now
    };
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
      payload: { playerId, count: drawn.cards.length, amount: pending.amount, pendingAmount: pending.amount, actuallyDrawn: drawn.cards.length, source: "stack" }
    })
  );

  events.push(
    createGameEvent("uno-no-mercy:cards_drawn", {
      message: `A player drew ${drawn.cards.length} stacked penalty card${drawn.cards.length === 1 ? "" : "s"}.`,
      payload: { playerId, count: drawn.cards.length, amount: pending.amount, pendingAmount: pending.amount, actuallyDrawn: drawn.cards.length, source: "stack_penalty" }
    })
  );

  state = eliminateOverLimit({ state, settings, events });
  state = finishIfResolved(state, null, now);
  if (state.phase === "finished") {
    return state;
  }
  return advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
}


function resolveOfflineRoulette(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  playerId: string;
  now: string;
  events: GameEvent[];
}): NoMercyState {
  const { playerId, events, settings, now } = params;
  const pendingRoulette = params.state.pendingRoulette;
  if (!pendingRoulette || pendingRoulette.targetPlayerId !== playerId) {
    return params.state;
  }

  const player = findNoMercyPlayer(params.state, playerId);
  const chosenColor = pendingRoulette.chosenColor ?? params.state.currentColor;
  let state: NoMercyState = {
    ...params.state,
    currentColor: chosenColor,
    pendingRoulette: null,
    lastDrawnCardId: null
  };
  const revealedCards: NoMercyCard[] = [];
  let matchedCardId: string | undefined;

  while (!matchedCardId) {
    const drawn = drawCards(state, playerId, 1);
    state = drawn.state;
    const card = drawn.cards[0];
    if (!card) {
      break;
    }
    revealedCards.push(card);
    if (card.color === chosenColor) {
      matchedCardId = card.id;
    }
  }

  events.push(
    createGameEvent("uno-no-mercy:roulette", {
      message: `Offline roulette made ${player?.displayName ?? "a player"} draw ${revealedCards.length} card${revealedCards.length === 1 ? "" : "s"}.`,
      payload: {
        playerId: pendingRoulette.playedByPlayerId,
        targetPlayerId: playerId,
        chosenColor,
        count: revealedCards.length,
        revealedCards,
        matchedCardId,
        source: "offline_roulette",
        actuallyDrawn: revealedCards.length
      }
    })
  );

  if (revealedCards.length > 0) {
    events.push(
      createGameEvent("uno-no-mercy:cards_drawn", {
        message: `${player?.displayName ?? "A player"} drew ${revealedCards.length} roulette card${revealedCards.length === 1 ? "" : "s"}.`,
        payload: {
          playerId,
          count: revealedCards.length,
          actuallyDrawn: revealedCards.length,
          source: "roulette",
          revealedCards,
          chosenColor,
          matchedCardId
        }
      })
    );
  }

  state = eliminateOverLimit({ state, settings, events });
  state = finishIfResolved(state, null, now);
  if (state.phase !== "finished") {
    state = advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
  }

  return state;
}

export function applyNoMercyTimeout(params: {
  state: NoMercyState;
  playerId: string;
  reason: TimeoutReason;
  now: string;
}): { state: NoMercyState; events: GameEvent[] } | null {
  const { playerId, reason, now } = params;

  if (params.state.phase !== "playing" || params.state.currentPlayerId !== playerId) {
    return null;
  }

  if (reason === "turn_timer") {
    const action: NoMercyAction = params.state.pendingRoulette?.targetPlayerId === playerId
      ? { type: "resolve_roulette", chosenColor: params.state.currentColor }
      : params.state.lastDrawnCardId === null
        ? { type: "draw_card" }
        : { type: "pass_turn" };
    return applyNoMercyAction({ state: params.state, settings: params.state.settings, playerId, action, now });
  }

  const player = findNoMercyPlayer(params.state, playerId);
  if (!player) {
    return null;
  }

  let state = cloneState(params.state);
  const events: GameEvent[] = [
    createGameEvent("uno-no-mercy:offline_skip", {
      message: `${player.displayName} was skipped while offline.`,
      payload: {
        playerId,
        skippedPlayerId: playerId,
        playerName: player.displayName,
        source: "offline_grace"
      }
    })
  ];

  if (state.pendingRoulette?.targetPlayerId === playerId) {
    state = resolveOfflineRoulette({ state, settings: state.settings, playerId, now, events });
  } else if (state.pendingPenalty?.targetPlayerId === playerId) {
    state = resolvePendingPenalty({ state, settings: state.settings, playerId, now, events });
  } else {
    state = advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
  }

  state = finishIfResolved(state, null, now);
  state = withActionMeta(state, params.state, now);
  pushGameOverEvent(state, events);
  return { state, events };
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

  if (action.type === "resolve_roulette") {
    const pendingRoulette = state.pendingRoulette;
    if (!pendingRoulette || pendingRoulette.targetPlayerId !== playerId) {
      return { state: params.state, events };
    }

    state = {
      ...state,
      currentColor: action.chosenColor,
      pendingRoulette: {
        ...pendingRoulette,
        chosenColor: action.chosenColor,
        revealedCards: [...pendingRoulette.revealedCards]
      },
      lastDrawnCardId: null
    };

    events.push(
      createGameEvent("uno-no-mercy:roulette_color_chosen", {
        message: `${player.displayName} chose ${action.chosenColor} for Color Roulette.`,
        payload: {
          playerId: pendingRoulette.playedByPlayerId,
          targetPlayerId: playerId,
          chosenColor: action.chosenColor,
          source: "roulette_color_chosen"
        }
      })
    );

    state = withActionMeta(state, params.state, now);
    return { state, events };
  }

  if (action.type === "draw_card") {
    if (state.pendingRoulette) {
      const pendingRoulette = state.pendingRoulette;
      const chosenColor = pendingRoulette.chosenColor;
      if (pendingRoulette.targetPlayerId !== playerId || !chosenColor) {
        return { state: params.state, events };
      }

      const drawn = drawCards(state, playerId, 1);
      const revealedCard = drawn.cards[0] ?? null;
      const revealedCards = revealedCard ? [...pendingRoulette.revealedCards, revealedCard] : [...pendingRoulette.revealedCards];
      const matched = Boolean(revealedCard && revealedCard.color === chosenColor);

      state = {
        ...drawn.state,
        currentColor: chosenColor,
        pendingRoulette: matched || !revealedCard
          ? null
          : { ...pendingRoulette, revealedCards },
        lastDrawnCardId: null
      };

      events.push(
        createGameEvent("uno-no-mercy:roulette_reveal", {
          message: revealedCard
            ? `${player.displayName} revealed a roulette card.`
            : `${player.displayName} could not reveal another roulette card.`,
          payload: {
            playerId: pendingRoulette.playedByPlayerId,
            targetPlayerId: playerId,
            chosenColor: chosenColor,
            card: revealedCard,
            revealedCard,
            revealedCards,
            count: revealedCards.length,
            matched,
            source: "roulette"
          }
        })
      );

      events.push(
        createGameEvent("uno-no-mercy:cards_drawn", {
          message: revealedCard ? `${player.displayName} drew 1 roulette card.` : `${player.displayName} drew 0 roulette cards.`,
          payload: {
            playerId,
            count: revealedCard ? 1 : 0,
            source: "roulette",
            revealedCards: revealedCard ? [revealedCard] : [],
            chosenColor: chosenColor,
            matchedCardId: matched && revealedCard ? revealedCard.id : undefined,
            actuallyDrawn: revealedCard ? 1 : 0
          }
        })
      );

      if (matched || !revealedCard) {
        const matchedCard = revealedCards.find((card) => card.color === chosenColor);
        events.push(
          createGameEvent("uno-no-mercy:roulette", {
            message: `Roulette made ${player.displayName} draw ${revealedCards.length} card${revealedCards.length === 1 ? "" : "s"}.`,
            payload: {
              playerId: pendingRoulette.playedByPlayerId,
              targetPlayerId: playerId,
              chosenColor: chosenColor,
              count: revealedCards.length,
              revealedCards,
              matchedCardId: matchedCard?.id,
              source: "roulette",
              actuallyDrawn: revealedCards.length
            }
          })
        );

        state = eliminateOverLimit({ state, settings, events });
        state = finishIfResolved(state, null, now);
        if (state.phase !== "finished") {
          state = advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
        }
      }

      state = withActionMeta(state, params.state, now);
      pushGameOverEvent(state, events);
      return { state, events };
    }

    if (state.pendingPenalty) {
      state = resolvePendingPenalty({ state, settings, playerId, now, events });
      state = withActionMeta(state, params.state, now);
      pushGameOverEvent(state, events);
      return { state, events };
    }

    const drawn = drawCards(state, playerId, 1);
    state = drawn.state;
    const card = drawn.cards[0] ?? null;
    const canPlayDrawn = card ? isCardPlayable(state, card) : false;
    const playableCardId = canPlayDrawn && card ? card.id : null;

    events.push(
      createGameEvent("uno-no-mercy:draw", {
        message: `${player.displayName} drew ${drawn.cards.length} card${drawn.cards.length === 1 ? "" : "s"}.`,
        payload: { playerId, count: drawn.cards.length, actuallyDrawn: drawn.cards.length, source: "normal_draw", playableCardId }
      })
    );

    events.push(
      createGameEvent("uno-no-mercy:cards_drawn", {
        message: `${player.displayName} drew ${drawn.cards.length} card${drawn.cards.length === 1 ? "" : "s"}.`,
        payload: { playerId, count: drawn.cards.length, actuallyDrawn: drawn.cards.length, source: "normal_draw", playableCardId }
      })
    );

    state = eliminateOverLimit({ state, settings, events });
    state = finishIfResolved(state, null, now);
    if (state.phase !== "finished") {
      const stillActivePlayer = findNoMercyPlayer(state, playerId);
      if (canPlayDrawn && card && stillActivePlayer && !stillActivePlayer.eliminated) {
        state = { ...state, lastDrawnCardId: card.id, updatedAt: now };
      } else if (drawn.cards.length === 0 || !stillActivePlayer || stillActivePlayer.eliminated) {
        state = advanceTurn(state, { steps: 1, now, fromPlayerId: playerId });
      } else {
        // Keep the turn after an unplayable normal draw so the player can draw
        // again one card at a time, just like manual Color Roulette reveals.
        state = { ...state, lastDrawnCardId: null, updatedAt: now };
      }
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

  const previousColor = state.currentColor;
  const currentColor = playedCard.value === "roulette" ? previousColor : resolveDeclaredColor(playedCard, action.declaredColor);
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

  if (state.phase !== "finished") {
    state = applyCardEffect({ state, settings, playedCard, playerId, action, now, events });
    state = finishIfResolved(state, playerId, now);
  }

  state = withActionMeta(state, params.state, now);
  pushGameOverEvent(state, events);
  return { state, events };
}
