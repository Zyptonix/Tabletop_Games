import type { GameResults } from "../../engine/GameTypes";
import type { NoMercyCard, NoMercyState } from "./types";

function scoreCards(cards: NoMercyCard[]): number {
  return cards.reduce((total, card) => total + card.points, 0);
}

export function getNoMercyResults(state: NoMercyState): GameResults {
  const winnerUserId = state.winnerUserId;
  const winnerScore = winnerUserId
    ? state.players
        .filter((player) => player.userId !== winnerUserId)
        .reduce((total, player) => total + scoreCards(player.hand), 0)
    : 0;

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
