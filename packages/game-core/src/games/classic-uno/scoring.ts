import type { GameResults } from "../../engine/GameTypes";
import type { ClassicUnoState, UnoCard } from "./types";

function scoreCard(card: UnoCard): number {
  if (!card) return 0;
  if (typeof card.points === "number" && !Number.isNaN(card.points) && card.points >= 0) {
    return card.points;
  }
  if (card.value === "wild" || card.value === "wild_draw_four") return 50;
  if (card.value === "skip" || card.value === "reverse" || card.value === "draw_two") return 20;
  const num = Number.parseInt(String(card.value), 10);
  return Number.isNaN(num) ? 0 : num;
}

export function scoreHand(hand: UnoCard[]): number {
  if (!Array.isArray(hand)) return 0;
  return hand.reduce((sum, card) => sum + scoreCard(card), 0);
}

export function getClassicUnoResults(state: ClassicUnoState): GameResults {
  const winnerUserId = state.winnerUserId;
  const scoreByUserId: Record<string, number> = {};

  for (const player of state.players) {
    scoreByUserId[player.userId] = scoreHand(player.hand);
  }

  const otherPlayersPoints = state.players
    .filter((player) => player.userId !== winnerUserId)
    .reduce((sum, player) => sum + scoreHand(player.hand), 0);

  if (winnerUserId) {
    scoreByUserId[winnerUserId] = Math.max(otherPlayersPoints, 25);
  }

  const placements = state.players
    .slice()
    .sort((left, right) => {
      if (left.userId === winnerUserId) {
        return -1;
      }
      if (right.userId === winnerUserId) {
        return 1;
      }
      return scoreHand(left.hand) - scoreHand(right.hand);
    })
    .map((player, index) => ({
      userId: player.userId,
      placement: index + 1,
      score: scoreByUserId[player.userId] ?? (player.userId === winnerUserId ? 25 : 0),
      result: player.userId === winnerUserId ? ("WIN" as const) : ("LOSS" as const)
    }));

  return {
    winnerUserId,
    placements,
    scoreByUserId
  };
}
