import { createGameEvent } from "../../engine/GameEvents";
import type { GameEvent } from "../../engine/GameTypes";
import type { ClassicUnoSettings, ClassicUnoState, UnoAction, UnoCard } from "./types";
import {
  advanceTurn,
  cardLabel,
  drawCards,
  findUnoPlayer,
  getTopDiscard,
  isCardPlayable,
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
    discardPile: [...state.discardPile]
  };
}

function finishIfWinner(state: ClassicUnoState, playerId: string, now: string): ClassicUnoState {
  const player = findUnoPlayer(state, playerId);
  if (!player || player.hand.length > 0) {
    return state;
  }

  const finished: ClassicUnoState = {
    ...state,
    phase: "finished",
    currentPlayerId: null,
    winnerUserId: playerId,
    updatedAt: now
  };

  return {
    ...finished,
    results: getClassicUnoResults(finished)
  };
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

  if (playedCard.value === "draw_two") {
    const targetPlayerId = advanceTurn(state, { steps: 1, now }).currentPlayerId;
    if (targetPlayerId) {
      const drawn = drawCards(state, targetPlayerId, 2);
      state = drawn.state;
      events.push(
        createGameEvent("uno:draw_two", {
          message: "Draw two applied.",
          payload: { targetPlayerId, count: drawn.cards.length }
        })
      );
    }
    return advanceTurn(state, { steps: 2, now });
  }

  if (playedCard.value === "wild_draw_four") {
    const targetPlayerId = advanceTurn(state, { steps: 1, now }).currentPlayerId;
    if (targetPlayerId) {
      const drawn = drawCards(state, targetPlayerId, 4);
      state = drawn.state;
      events.push(
        createGameEvent("uno:wild_draw_four", {
          message: "Wild draw four applied.",
          payload: { targetPlayerId, count: drawn.cards.length }
        })
      );
    }
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
        payload: { playerId, count: drawn.cards.length }
      })
    );

    if (!canPlayDrawn) {
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

  state = finishIfWinner(state, playerId, now);
  if (state.phase === "finished") {
    events.push(
      createGameEvent("uno:game_over", {
        message: `${player.displayName} won the game.`,
        payload: { winnerUserId: playerId, results: state.results }
      })
    );
    return { state, events };
  }

  state = applyCardEffect({ state, settings, playedCard, playerId, now, events });
  state = {
    ...state,
    updatedAt: now
  };

  return { state, events };
}
