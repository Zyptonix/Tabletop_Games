import type { GameResults } from "../../engine/GameTypes";
import type { NoMercyCard, NoMercyState } from "./types";

function scoreCard(card: NoMercyCard): number {
  if (!card) return 0;
  if (typeof card.points === "number" && !Number.isNaN(card.points) && card.points >= 0) {
    return card.points;
  }
  if (card.value === "wild_draw_ten") return 80;
  if (card.value === "wild_draw_four_reverse" || card.value === "wild_draw_six") return 60;
  if (card.value === "wild" || card.value === "roulette") return 50;
  if (card.value === "draw_four") return 40;
  if (card.value === "comeback" || card.value === "discard_all") return 30;
  if (card.value === "skip" || card.value === "reverse" || card.value === "draw_two") return 20;
  const num = Number.parseInt(String(card.value), 10);
  return Number.isNaN(num) ? 0 : num;
}

function scoreCards(cards: NoMercyCard[]): number {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((total, card) => total + scoreCard(card), 0);
}

export function getNoMercyResults(state: NoMercyState): GameResults {
  const winnerUserId = state.winnerUserId;
  const mercyPileScore = scoreCards(state.mercyPile ?? []);
  const remainingHandsScore = state.players
    .filter((player) => player.userId !== winnerUserId)
    .reduce((total, player) => total + scoreCards(player.hand), 0);

  const rawWinnerScore = remainingHandsScore + mercyPileScore;
  const winnerScore = winnerUserId ? Math.max(rawWinnerScore, 50) : 0;

  const placements = state.players
    .slice()
    .sort((left, right) => {
      if (left.userId === winnerUserId) return -1;
      if (right.userId === winnerUserId) return 1;
      if (left.eliminated !== right.eliminated) return left.eliminated ? 1 : -1;
      return scoreCards(left.hand) - scoreCards(right.hand);
    })
    .map((player, index) => ({
      userId: player.userId,
      placement: index + 1,
      score: player.userId === winnerUserId ? winnerScore : scoreCards(player.hand),
      result: player.userId === winnerUserId ? ("WIN" as const) : ("LOSS" as const)
    }));

  return {
    winnerUserId,
    placements,
    scoreByUserId: Object.fromEntries(placements.map((placement) => [placement.userId, placement.score]))
  };
}
