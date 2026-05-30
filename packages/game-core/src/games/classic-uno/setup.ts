import type { GamePlayer } from "../../engine/GameTypes";
import { hashSeed, shuffleWithState } from "../../engine/rng";
import { CLASSIC_UNO_VERSION } from "./constants";
import { UNO_COLORS, type ClassicUnoSettings, type ClassicUnoState, type UnoCard, type UnoColor } from "./types";

function numberCardPoints(value: string): number {
  return Number.parseInt(value, 10);
}

export function createClassicUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of UNO_COLORS) {
    deck.push({ id: `${color}-0-0`, color, value: "0", points: 0 });

    for (let value = 1; value <= 9; value += 1) {
      for (let copy = 0; copy < 2; copy += 1) {
        deck.push({
          id: `${color}-${value}-${copy}`,
          color,
          value: `${value}` as UnoCard["value"],
          points: numberCardPoints(`${value}`)
        });
      }
    }

    for (const value of ["skip", "reverse", "draw_two"] as const) {
      for (let copy = 0; copy < 2; copy += 1) {
        deck.push({ id: `${color}-${value}-${copy}`, color, value, points: 20 });
      }
    }
  }

  for (const value of ["wild", "wild_draw_four"] as const) {
    for (let copy = 0; copy < 4; copy += 1) {
      deck.push({ id: `wild-${value}-${copy}`, color: "wild", value, points: 50 });
    }
  }

  return deck;
}

function findStartingDiscard(drawPile: UnoCard[]): { card: UnoCard; remaining: UnoCard[] } {
  const startIndex = drawPile.findIndex((card) => card.color !== "wild" && /^[0-9]$/.test(card.value));
  const index = startIndex >= 0 ? startIndex : 0;
  const card = drawPile[index];

  if (!card) {
    throw new Error("Classic UNO deck could not provide a starting discard.");
  }

  return {
    card,
    remaining: drawPile.filter((_, cardIndex) => cardIndex !== index)
  };
}

export function createInitialClassicUnoState(params: {
  players: GamePlayer[];
  settings: ClassicUnoSettings;
  seed: string;
  now: string;
}): ClassicUnoState {
  const rngSeed = hashSeed(params.seed);
  const shuffled = shuffleWithState(createClassicUnoDeck(), rngSeed);
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
        unoCalled: false
      };
    });

  const startingDiscard = findStartingDiscard(drawPile);
  const currentColor = startingDiscard.card.color as UnoColor;

  return {
    gameId: "classic-uno",
    version: CLASSIC_UNO_VERSION,
    settings: params.settings,
    phase: "playing",
    players,
    turnOrder: players.map((player) => player.userId),
    currentPlayerId: players[0]?.userId ?? null,
    direction: 1,
    currentColor,
    drawPile: startingDiscard.remaining,
    discardPile: [startingDiscard.card],
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
