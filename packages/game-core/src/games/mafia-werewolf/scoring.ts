import type { GameResults } from "../../engine/GameTypes";
import { buildWerewolfResults, getWinningTeam, soloHasWon } from "./rules";
import type { WerewolfState } from "./types";

export function getWerewolfResults(state: WerewolfState): GameResults {
  if (state.results) return state.results;
  const soloWinnerId = soloHasWon(state);
  const winningTeam = getWinningTeam(state) ?? "village";
  return buildWerewolfResults(state, winningTeam, "Game finished.", soloWinnerId);
}
