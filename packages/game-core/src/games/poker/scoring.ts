import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

export function scorePokerPlayer(state: BoardGameState, player: GamePlayer): number {
  const userId = player.userId;
  return Math.max(0, state.pokerStacks[userId] ?? 0);
}

export function getPokerResults(state: BoardGameState): GameResults {
  const winnerId = state.winnerUserId;
  const ordered = state.players.slice().sort((a, b) => {
    if (a.userId === winnerId) return -1;
    if (b.userId === winnerId) return 1;
    const stackA = state.pokerStacks[a.userId] ?? 0;
    const stackB = state.pokerStacks[b.userId] ?? 0;
    if (stackB !== stackA) return stackB - stackA;
    return a.seat - b.seat;
  });

  const effectiveWinnerId = winnerId ?? (ordered[0] && (state.pokerStacks[ordered[0].userId] ?? 0) > 0 ? ordered[0].userId : null);

  const placements = ordered.map((player, index) => {
    const isWinner = player.userId === effectiveWinnerId;
    const stack = state.pokerStacks[player.userId] ?? 0;
    return {
      userId: player.userId,
      placement: isWinner ? 1 : index + 1,
      score: stack,
      result: isWinner ? ("WIN" as const) : ("LOSS" as const)
    };
  });

  return {
    winnerUserId: effectiveWinnerId,
    placements,
    scoreByUserId: Object.fromEntries(placements.map((p) => [p.userId, p.score]))
  };
}
