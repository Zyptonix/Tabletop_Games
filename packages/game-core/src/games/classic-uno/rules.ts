import { shuffleWithState } from "../../engine/rng";
import type { ClassicUnoState, UnoCard, UnoDeclaredColor, UnoPlayerState } from "./types";

export function getTopDiscard(state: ClassicUnoState): UnoCard {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) {
    throw new Error("UNO state is invalid: discard pile is empty.");
  }
  return top;
}

export function findUnoPlayer(state: ClassicUnoState, playerId: string): UnoPlayerState | null {
  return state.players.find((player) => player.userId === playerId) ?? null;
}

export function isWild(card: UnoCard): boolean {
  return card.color === "wild";
}

export function isCardPlayable(state: ClassicUnoState, card: UnoCard): boolean {
  const topDiscard = getTopDiscard(state);
  return isWild(card) || card.color === state.currentColor || card.value === topDiscard.value;
}

export function hasPlayableCard(state: ClassicUnoState, player: UnoPlayerState): boolean {
  return player.hand.some((card) => isCardPlayable(state, card));
}

export function nextPlayerId(state: ClassicUnoState, steps = 1): string | null {
  if (state.turnOrder.length === 0 || state.currentPlayerId === null) {
    return null;
  }

  const currentIndex = state.turnOrder.indexOf(state.currentPlayerId);
  if (currentIndex < 0) {
    return state.turnOrder[0] ?? null;
  }

  const length = state.turnOrder.length;
  const offset = steps * state.direction;
  const nextIndex = (((currentIndex + offset) % length) + length) % length;
  return state.turnOrder[nextIndex] ?? null;
}

export function advanceTurn(state: ClassicUnoState, params: { steps: number; now: string }): ClassicUnoState {
  return {
    ...state,
    currentPlayerId: nextPlayerId(state, params.steps),
    lastDrawnCardId: null,
    turnStartedAt: params.now
  };
}

export function refillDrawPileIfNeeded(state: ClassicUnoState): ClassicUnoState {
  if (state.drawPile.length > 0 || state.discardPile.length <= 1) {
    return state;
  }

  const topDiscard = getTopDiscard(state);
  const rest = state.discardPile.slice(0, -1);
  const shuffled = shuffleWithState(rest, state.rngState);

  return {
    ...state,
    drawPile: shuffled.values,
    discardPile: [topDiscard],
    rngState: shuffled.rngState
  };
}

export function drawCards(
  state: ClassicUnoState,
  playerId: string,
  count: number
): { state: ClassicUnoState; cards: UnoCard[] } {
  let workingState = state;
  const cards: UnoCard[] = [];
  const players = workingState.players.map((player) => ({
    ...player,
    hand: [...player.hand]
  }));
  const player = players.find((item) => item.userId === playerId);

  if (!player) {
    return { state, cards };
  }

  for (let index = 0; index < count; index += 1) {
    workingState = refillDrawPileIfNeeded({ ...workingState, players });
    const card = workingState.drawPile[0];
    if (!card) {
      break;
    }

    cards.push(card);
    player.hand.push(card);
    workingState = {
      ...workingState,
      drawPile: workingState.drawPile.slice(1),
      players
    };
  }

  player.unoCalled = false;
  return { state: workingState, cards };
}

export function cardRequiresDeclaredColor(card: UnoCard): boolean {
  return card.color === "wild";
}

export function resolveDeclaredColor(card: UnoCard, declaredColor: UnoDeclaredColor | undefined): UnoDeclaredColor {
  if (card.color === "wild") {
    if (!declaredColor) {
      throw new Error("Wild cards require a declared color.");
    }
    return declaredColor;
  }

  return card.color;
}

export function cardLabel(card: UnoCard): string {
  const value = card.value.replaceAll("_", " ");
  return card.color === "wild" ? value : `${card.color} ${value}`;
}
