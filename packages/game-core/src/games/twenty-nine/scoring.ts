import type { GameResults } from "../../engine/GameTypes";
import type { TwentyNineState, TwentyNineTeam } from "./types";

export function getTwentyNineResults(state: TwentyNineState): GameResults {
  const winnerTeam: TwentyNineTeam = state.winnerTeam ?? (
    state.teamGamePoints["0"] >= 6 || state.teamGamePoints["1"] <= -6 ? 0 : 1
  );
  const winner = state.players.find((player) => player.team === winnerTeam);
  const scoreByUserId: Record<string, number> = {};
  for (const player of state.players) scoreByUserId[player.userId] = state.teamGamePoints[String(player.team) as "0" | "1"];
  const placements = state.players
    .slice()
    .sort((a, b) => {
      if (a.team === winnerTeam && b.team !== winnerTeam) return -1;
      if (b.team === winnerTeam && a.team !== winnerTeam) return 1;
      return a.seat - b.seat;
    })
    .map((player) => ({
      userId: player.userId,
      placement: player.team === winnerTeam ? 1 : 3,
      score: scoreByUserId[player.userId] ?? 0,
      result: player.team === winnerTeam ? ("WIN" as const) : ("LOSS" as const)
    }));
  return { winnerUserId: winner?.userId ?? null, placements, scoreByUserId };
}
