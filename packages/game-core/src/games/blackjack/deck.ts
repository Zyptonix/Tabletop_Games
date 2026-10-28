const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export function createBlackjackShoe(deckCount = 4): string[] {
  const shoe: string[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push(`${rank}${suit}`);
      }
    }
  }
  return shoe;
}

export function cardRank(card: string): string {
  return card.slice(0, -1);
}

export function cardSuit(card: string): string {
  return card.slice(-1);
}

export interface HandEvaluation {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
  displayValue: string;
}

export function evaluateBlackjackHand(cards: string[]): HandEvaluation {
  if (!cards || cards.length === 0) {
    return { total: 0, isSoft: false, isBlackjack: false, isBust: false, displayValue: "0" };
  }

  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (!card || card === "hidden") continue;
    const rank = cardRank(card);
    if (rank === "A") {
      aceCount += 1;
      total += 11;
    } else if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") {
      total += 10;
    } else {
      total += parseInt(rank, 10) || 0;
    }
  }

  let isSoft = false;
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount -= 1;
  }

  if (aceCount > 0 && total <= 21) {
    isSoft = true;
  }

  const isBlackjack = cards.length === 2 && total === 21;
  const isBust = total > 21;

  let displayValue = String(total);
  if (isBlackjack) {
    displayValue = "Blackjack!";
  } else if (isBust) {
    displayValue = "Bust";
  } else if (isSoft && total < 21) {
    displayValue = `Soft ${total}`;
  }

  return { total, isSoft, isBlackjack, isBust, displayValue };
}
