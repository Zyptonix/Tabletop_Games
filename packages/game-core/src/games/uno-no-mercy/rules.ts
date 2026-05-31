import { shuffleWithState } from "../../engine/rng";
import type { NoMercyCard, NoMercyDeclaredColor, NoMercyPlayerState, NoMercyState } from "./types";

export function getTopDiscard(state: NoMercyState): NoMercyCard {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) {
    throw new Error("No Mercy state is invalid: discard pile is empty.");
  }
  return top;
}

export function findNoMercyPlayer(state: NoMercyState, playerId: string): NoMercyPlayerState | null {
  return state.players.find((player) => player.userId === playerId) ?? null;
}

export function getActivePlayers(state: NoMercyState): NoMercyPlayerState[] {
  return state.turnOrder
    .map((userId) => state.players.find((player) => player.userId === userId))
    .filter((player): player is NoMercyPlayerState => Boolean(player && !player.eliminated));
}

export function isWild(card: NoMercyCard): boolean {
  return card.color === "wild";
}

export function cardRequiresDeclaredColor(card: NoMercyCard): boolean {
  // Roulette is special in No Mercy: the targeted next player chooses the color.
  // The player who lays the Roulette card should not declare a color on play.
  return card.color === "wild" && card.value !== "roulette";
}

export function isDrawPenaltyCard(card: NoMercyCard): boolean {
  return typeof card.drawAmount === "number" && card.drawAmount > 0;
}

export function getDrawPenaltyAmount(card: NoMercyCard): number {
  return card.drawAmount ?? 0;
}

export function getDrawValue(card: NoMercyCard): number {
  return getDrawPenaltyAmount(card);
}

export function getStackPower(card: NoMercyCard): number {
  return card.stackPower ?? getDrawValue(card);
}

export function getPendingPenaltyTotal(state: NoMercyState): number {
  return state.pendingPenalty?.amount ?? 0;
}

export function isColoredDrawFour(card: NoMercyCard): boolean {
  return card.color !== "wild" && card.value === "draw_four";
}

export function canStackDrawCard(params: { card: NoMercyCard; state: NoMercyState }): boolean {
  const { card, state } = params;
  if (!state.pendingPenalty || !isDrawPenaltyCard(card)) {
    return false;
  }

  // No Mercy stacking cares about draw-card power, not color matching.
  // A player may answer a +4 with +4/+6/+10, a +6 with +6/+10, etc.
  return getStackPower(card) >= state.pendingPenalty.requiredResponseMinPower;
}

export function isCardPlayable(state: NoMercyState, card: NoMercyCard): boolean {
  if (state.pendingPenalty) {
    return canStackDrawCard({ card, state });
  }

  const topDiscard = getTopDiscard(state);
  if (isColoredDrawFour(card)) {
    return card.color === state.currentColor;
  }

  return isWild(card) || card.color === state.currentColor || card.value === topDiscard.value;
}

export function hasPlayableCard(state: NoMercyState, player: NoMercyPlayerState): boolean {
  return player.hand.some((card) => isCardPlayable(state, card));
}

export function nextActivePlayerId(state: NoMercyState, steps = 1, fromPlayerId = state.currentPlayerId): string | null {
  const activeIds = getActivePlayers(state).map((player) => player.userId);
  if (activeIds.length === 0 || !fromPlayerId) {
    return activeIds[0] ?? null;
  }

  let currentIndex = state.turnOrder.indexOf(fromPlayerId);
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  let remaining = steps;
  let index = currentIndex;
  while (remaining > 0) {
    index = (((index + state.direction) % state.turnOrder.length) + state.turnOrder.length) % state.turnOrder.length;
    const userId = state.turnOrder[index];
    if (userId && activeIds.includes(userId)) {
      remaining -= 1;
    }
  }

  return state.turnOrder[index] ?? null;
}

export function advanceTurn(state: NoMercyState, params: { steps: number; now: string; fromPlayerId?: string }): NoMercyState {
  return {
    ...state,
    currentPlayerId: nextActivePlayerId(state, params.steps, params.fromPlayerId ?? state.currentPlayerId),
    lastDrawnCardId: null,
    turnStartedAt: params.now
  };
}

export function refillDrawPileIfNeeded(state: NoMercyState): NoMercyState {
  if (state.drawPile.length > 0) {
    return state;
  }

  const topDiscard = getTopDiscard(state);
  const discardRest = state.discardPile.slice(0, -1);
  const mercyPile = state.mercyPile ?? [];
  const refillCards = [...discardRest, ...mercyPile];

  if (refillCards.length === 0) {
    return state;
  }

  const shuffled = shuffleWithState(refillCards, state.rngState);

  return {
    ...state,
    drawPile: shuffled.values,
    discardPile: [topDiscard],
    mercyPile: [],
    rngState: shuffled.rngState
  };
}

export function drawCards(state: NoMercyState, playerId: string, count: number): { state: NoMercyState; cards: NoMercyCard[] } {
  let workingState = state;
  const cards: NoMercyCard[] = [];
  const players = workingState.players.map((player) => ({ ...player, hand: [...player.hand] }));
  const player = players.find((item) => item.userId === playerId);
  if (!player || player.eliminated) {
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
    workingState = { ...workingState, drawPile: workingState.drawPile.slice(1), players };
  }

  player.unoCalled = false;
  return { state: workingState, cards };
}

export function resolveDeclaredColor(card: NoMercyCard, declaredColor: NoMercyDeclaredColor | undefined): NoMercyDeclaredColor {
  if (card.value === "roulette") {
    // Roulette keeps the previous current color until the targeted player chooses one.
    // The reducer handles that previous-color preservation before calling this helper.
    if (!declaredColor) {
      throw new Error("Roulette color is resolved by the target player, not by resolveDeclaredColor.");
    }
    return declaredColor;
  }

  if (card.color === "wild") {
    if (!declaredColor) {
      throw new Error("Wild cards require a declared color.");
    }
    return declaredColor;
  }
  return card.color;
}

export function cardLabel(card: NoMercyCard): string {
  const value = card.value.replaceAll("_", " ");
  return card.color === "wild" ? value : `${card.color} ${value}`;
}

