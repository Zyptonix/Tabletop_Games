import type { GamePlayer } from "../../engine/GameTypes";
import { hashSeed, shuffleWithState } from "../../engine/rng";
import { NO_MERCY_VERSION } from "./constants";
import {
  NO_MERCY_COLORS,
  type NoMercyActionValue,
  type NoMercyCard,
  type NoMercyCardValue,
  type NoMercyColor,
  type NoMercySettings,
  type NoMercyState,
  type NoMercyWildValue
} from "./types";

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

export function createNoMercyDeck(): NoMercyCard[] {
  const deck: NoMercyCard[] = [];

  for (const color of NO_MERCY_COLORS) {
    deck.push(makeCard({ color, value: "0", copy: 0, points: 0 }));

    for (let value = 1; value <= 9; value += 1) {
      for (let copy = 0; copy < 2; copy += 1) {
        deck.push(makeCard({ color, value: `${value}` as NoMercyCardValue, copy, points: numberCardPoints(`${value}`) }));
      }
    }

    const actionCards: Array<{ value: NoMercyActionValue; points: number; drawAmount?: number | undefined; stackPower?: number | undefined; copies: number }> = [
      { value: "skip", points: 20, copies: 2 },
      { value: "reverse", points: 20, copies: 2 },
      { value: "draw_two", points: 20, drawAmount: 2, stackPower: 2, copies: 2 },
      { value: "draw_four", points: 40, drawAmount: 4, stackPower: 4, copies: 2 },
      { value: "comeback", points: 30, copies: 1 },
      { value: "discard_all", points: 30, copies: 1 }
    ];

    for (const definition of actionCards) {
      for (let copy = 0; copy < definition.copies; copy += 1) {
        deck.push(
          makeCard({
            color,
            value: definition.value,
            copy,
            points: definition.points,
            drawAmount: definition.drawAmount,
            stackPower: definition.stackPower
          })
        );
      }
    }
  }

  const wildCards: Array<{ value: NoMercyWildValue; points: number; drawAmount?: number | undefined; stackPower?: number | undefined; copies: number }> = [
    { value: "wild", points: 50, copies: 4 },
    { value: "wild_draw_four", points: 50, drawAmount: 4, stackPower: 4, copies: 4 },
    { value: "wild_draw_four_reverse", points: 60, drawAmount: 4, stackPower: 4, copies: 4 },
    { value: "wild_draw_six", points: 60, drawAmount: 6, stackPower: 6, copies: 4 },
    { value: "wild_draw_ten", points: 80, drawAmount: 10, stackPower: 10, copies: 2 },
    { value: "roulette", points: 50, copies: 4 }
  ];

  for (const definition of wildCards) {
    for (let copy = 0; copy < definition.copies; copy += 1) {
      deck.push(
        makeCard({
          color: "wild",
          value: definition.value,
          copy,
          points: definition.points,
          drawAmount: definition.drawAmount,
          stackPower: definition.stackPower
        })
      );
    }
  }

  return deck;
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
