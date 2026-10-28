import type { GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

export function getBlackjackResults(state: BoardGameState): GameResults {
  const chips = state.blackjackChips ?? {};
  const sorted = state.players
    .slice()
    .sort((a, b) => (chips[b.userId] ?? 0) - (chips[a.userId] ?? 0) || a.seat - b.seat);

  const highestChips = chips[sorted[0]?.userId ?? ""] ?? 0;
  const winnerUserId = highestChips > 0 ? (sorted[0]?.userId ?? null) : null;

  return {
    winnerUserId,
    placements: sorted.map((player, index) => {
      const pChips = chips[player.userId] ?? 0;
      const isWinner = player.userId === winnerUserId;
      return {
        userId: player.userId,
        placement: index + 1,
        score: pChips,
        result: isWinner ? "WIN" : "LOSS"
      };
    }),
    scoreByUserId: Object.fromEntries(sorted.map((p) => [p.userId, chips[p.userId] ?? 0]))
  };
}
