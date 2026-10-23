import { TWENTY_NINE_RANKS, TWENTY_NINE_SUITS, type TwentyNineCard, type TwentyNineRank } from "./types";

const CARD_POINTS: Record<TwentyNineRank, number> = {
  J: 3,
  "9": 2,
  A: 1,
  "10": 1,
  K: 0,
  Q: 0,
  "8": 0,
  "7": 0
};

export function createTwentyNineDeck(): TwentyNineCard[] {
  const deck: TwentyNineCard[] = [];
  for (const suit of TWENTY_NINE_SUITS) {
    for (const rank of TWENTY_NINE_RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, points: CARD_POINTS[rank] });
    }
  }
  return deck;
}

export function cardStrength(rank: TwentyNineRank): number {
  const strengths: Record<TwentyNineRank, number> = {
    "7": 0,
    "8": 1,
    Q: 2,
    K: 3,
    "10": 4,
    A: 5,
    "9": 6,
    J: 7
  };
  return strengths[rank];
}

export function teamCardPoints(cards: TwentyNineCard[]): number {
  return cards.reduce((sum, card) => sum + card.points, 0);
}
