import type { GameResults } from "../../engine/GameTypes";
import type { ClassicUnoState, UnoCard } from "./types";

export function scoreHand(hand: UnoCard[]): number {
  return hand.reduce((sum, card) => sum + card.points, 0);
}

export function getClassicUnoResults(state: ClassicUnoState): GameResults {
  const winnerUserId = state.winnerUserId;
  const scoreByUserId: Record<string, number> = {};

  for (const player of state.players) {
    scoreByUserId[player.userId] = scoreHand(player.hand);
  }

  if (winnerUserId) {
    scoreByUserId[winnerUserId] = state.players
      .filter((player) => player.userId !== winnerUserId)
      .reduce((sum, player) => sum + scoreHand(player.hand), 0);
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
      score: scoreByUserId[player.userId] ?? 0,
      result: player.userId === winnerUserId ? ("WIN" as const) : ("LOSS" as const)
    }));

  return {
    winnerUserId,
    placements,
    scoreByUserId
  };
}
