import type { GameResults } from "../../engine/GameTypes";
import type { SnakesAndLaddersState } from "./types";

export function getSnakesAndLaddersResults(state: SnakesAndLaddersState): GameResults {
  const winnerUserId = state.winnerUserId;

  const sortedPlayers = state.players.slice().sort((a, b) => {
    // Winner always gets 1st
    if (a.userId === winnerUserId) return -1;
    if (b.userId === winnerUserId) return 1;

    // Highest square position ranks ahead
    if (a.position !== b.position) {
      return b.position - a.position;
    }

    // Players who entered board rank ahead of those still at base (0)
    if (a.enteredBoard !== b.enteredBoard) {
      return a.enteredBoard ? -1 : 1;
    }

    return a.seat - b.seat;
  });

  const scoreByUserId: Record<string, number> = {};
  for (let i = 0; i < sortedPlayers.length; i++) {
    const p = sortedPlayers[i]!;
    scoreByUserId[p.userId] = Math.max(0, sortedPlayers.length - i);
  }

  const placements = sortedPlayers.map((player, index) => ({
    userId: player.userId,
    placement: index + 1,
    score: scoreByUserId[player.userId] ?? (index === 0 ? 1 : 0),
    result: player.userId === winnerUserId ? ("WIN" as const) : ("LOSS" as const)
  }));

  return {
    winnerUserId,
    placements,
    scoreByUserId
  };
}
