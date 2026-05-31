import type { GamePlayer } from "../../engine/GameTypes";
import { hashSeed, shuffleWithState } from "../../engine/rng";
import { NO_MERCY_VERSION } from "./constants";
import {
  NO_MERCY_COLORS,
  type NoMercyActionValue,
  type NoMercyCard,
  type NoMercyCardValue,
  type NoMercyColor,
  type NoMercyNumberValue,
  type NoMercySettings,
  type NoMercyState,
  type NoMercyWildValue
} from "./types";

export const NO_MERCY_COUNTS = {
  perColor: {
    numbersEach: 2,
    skip: 3,
    skipEveryone: 2,
    reverse: 3,
    drawTwo: 3,
    drawFour: 2,
    discardAll: 3
  },
  wild: {
    reverseDrawFour: 8,
    drawSix: 4,
    drawTen: 4,
    colorRoulette: 8
  }
} as const;

// The supplied card-count reference sums to 164 cards. The rule sheet may say 168,
// but we intentionally keep the exact provided counts instead of inventing extras.
export const NO_MERCY_DECK_TOTAL =
  NO_MERCY_COLORS.length *
    (10 * NO_MERCY_COUNTS.perColor.numbersEach +
      NO_MERCY_COUNTS.perColor.skip +
      NO_MERCY_COUNTS.perColor.skipEveryone +
      NO_MERCY_COUNTS.perColor.reverse +
      NO_MERCY_COUNTS.perColor.drawTwo +
      NO_MERCY_COUNTS.perColor.drawFour +
      NO_MERCY_COUNTS.perColor.discardAll) +
  NO_MERCY_COUNTS.wild.reverseDrawFour +
  NO_MERCY_COUNTS.wild.drawSix +
  NO_MERCY_COUNTS.wild.drawTen +
  NO_MERCY_COUNTS.wild.colorRoulette;

function numberCardPoints(value: string): number {
  return Number.parseInt(value, 10);
}

function makeCard(params: {
  color: NoMercyCard["color"];
  value: NoMercyCardValue;
  copy: number;
  points: number;
  drawAmount?: number | undefined;
  stackPower?: number | undefined;
}): NoMercyCard {
  const colorPrefix = params.color === "wild" ? "wild" : params.color;
  const normalizedValue = params.value.replaceAll("_", "-");
  const assetKey = params.color === "wild" ? (normalizedValue === "wild" ? "wild" : `wild-${normalizedValue.replace(/^wild-/, "")}`) : `${params.color}-${normalizedValue}`;
  return {
    id: `${colorPrefix}-${params.value}-${params.copy}`,
    assetKey,
    color: params.color,
    value: params.value,
    points: params.points,
    ...(params.drawAmount ? { drawAmount: params.drawAmount } : {}),
    ...(params.stackPower ? { stackPower: params.stackPower } : {})
  };
}

function pushCopies(deck: NoMercyCard[], params: Omit<Parameters<typeof makeCard>[0], "copy"> & { copies: number }): void {
  for (let copy = 0; copy < params.copies; copy += 1) {
    deck.push(makeCard({ ...params, copy }));
  }
}

export function createNoMercyDeck(): NoMercyCard[] {
  const deck: NoMercyCard[] = [];

  for (const color of NO_MERCY_COLORS) {
    for (let value = 0; value <= 9; value += 1) {
      pushCopies(deck, {
        color,
        value: `${value}` as NoMercyNumberValue,
        points: numberCardPoints(`${value}`),
        copies: NO_MERCY_COUNTS.perColor.numbersEach
      });
    }

    const actionCards: Array<{ value: NoMercyActionValue; points: number; drawAmount?: number | undefined; stackPower?: number | undefined; copies: number }> = [
      { value: "skip", points: 20, copies: NO_MERCY_COUNTS.perColor.skip },
      { value: "comeback", points: 30, copies: NO_MERCY_COUNTS.perColor.skipEveryone },
      { value: "reverse", points: 20, copies: NO_MERCY_COUNTS.perColor.reverse },
      { value: "draw_two", points: 20, drawAmount: 2, stackPower: 2, copies: NO_MERCY_COUNTS.perColor.drawTwo },
      { value: "draw_four", points: 40, drawAmount: 4, stackPower: 4, copies: NO_MERCY_COUNTS.perColor.drawFour },
      { value: "discard_all", points: 30, copies: NO_MERCY_COUNTS.perColor.discardAll }
    ];

    for (const definition of actionCards) {
      pushCopies(deck, { color, ...definition });
    }
  }

  const wildCards: Array<{ value: NoMercyWildValue; points: number; drawAmount?: number | undefined; stackPower?: number | undefined; copies: number }> = [
    { value: "wild_draw_four_reverse", points: 60, drawAmount: 4, stackPower: 4, copies: NO_MERCY_COUNTS.wild.reverseDrawFour },
    { value: "wild_draw_six", points: 60, drawAmount: 6, stackPower: 6, copies: NO_MERCY_COUNTS.wild.drawSix },
    { value: "wild_draw_ten", points: 80, drawAmount: 10, stackPower: 10, copies: NO_MERCY_COUNTS.wild.drawTen },
    { value: "roulette", points: 50, copies: NO_MERCY_COUNTS.wild.colorRoulette }
  ];

  for (const definition of wildCards) {
    pushCopies(deck, { color: "wild", ...definition });
  }

  return deck;
}

export function getNoMercyDeckCountSummary(deck: NoMercyCard[] = createNoMercyDeck()): Record<string, number> {
  return deck.reduce<Record<string, number>>((summary, card) => {
    const key = `${card.color}:${card.value}`;
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

function findStartingDiscard(drawPile: NoMercyCard[]): { card: NoMercyCard; remaining: NoMercyCard[] } {
  const startIndex = drawPile.findIndex((card) => card.color !== "wild" && /^[0-9]$/.test(card.value));
  const index = startIndex >= 0 ? startIndex : 0;
  const card = drawPile[index];
  if (!card) {
    throw new Error("No Mercy deck could not provide a starting discard.");
  }

  return {
    card,
    remaining: drawPile.filter((_, cardIndex) => cardIndex !== index)
  };
}

export function createInitialNoMercyState(params: {
  players: GamePlayer[];
  settings: NoMercySettings;
  seed: string;
  now: string;
}): NoMercyState {
  const rngSeed = hashSeed(params.seed);
  const shuffled = shuffleWithState(createNoMercyDeck(), rngSeed);
  let drawPile = shuffled.values;
  const players = params.players
    .slice()
    .sort((left, right) => left.seat - right.seat)
    .map((player) => {
      const hand = drawPile.slice(0, params.settings.cardsPerPlayer);
      drawPile = drawPile.slice(params.settings.cardsPerPlayer);
      return {
        userId: player.userId,
        username: player.username,
        displayName: player.displayName,
        seat: player.seat,
        hand,
        unoCalled: false,
        eliminated: false
      };
    });

  const startingDiscard = findStartingDiscard(drawPile);
  const currentColor = startingDiscard.card.color as NoMercyColor;

  return {
    gameId: "uno-no-mercy",
    version: NO_MERCY_VERSION,
    settings: params.settings,
    phase: "playing",
    players,
    turnOrder: players.map((player) => player.userId),
    currentPlayerId: players[0]?.userId ?? null,
    direction: 1,
    currentColor,
    drawPile: startingDiscard.remaining,
    discardPile: [startingDiscard.card],
    pendingPenalty: null,
    lastDrawnCardId: null,
    actionNumber: 0,
    rngState: shuffled.rngState,
    startedAt: params.now,
    updatedAt: params.now,
    turnStartedAt: params.now,
    winnerUserId: null,
    results: null
  };
}
