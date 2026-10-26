import type { BoardGameState } from "../shared/types";
import { nextPlayerId } from "../shared/utils";
export function nextPlayerOnTeam(state: BoardGameState, team: "red" | "blue"): string | null {
  return state.players.find((player) => state.codenamesTeamByPlayer[player.userId] === team)?.userId ?? null;
}

export function normalizeCodenamesSnapshot(state: BoardGameState): void {
  if (state.gameId !== "codenames") return;
  const snapshotFields = state as unknown as Record<string, unknown>;
  const needsTeamPhaseMigration = !snapshotFields.codenamesSpymasterByTeam || !snapshotFields.codenamesRoundTeam || !("codenamesClue" in snapshotFields) || !("codenamesClueNumber" in snapshotFields) || !("codenamesGuessesRemaining" in snapshotFields);
  state.codenamesTeamByPlayer ??= Object.fromEntries(state.players.map((player) => [player.userId, player.seat % 2 === 0 ? "red" : "blue"])) as Record<string, "red" | "blue">;
  state.codenamesSpymasterByTeam ??= {
    red: state.players.slice().sort((a, b) => a.seat - b.seat).find((player) => state.codenamesTeamByPlayer[player.userId] === "red")?.userId ?? "",
    blue: state.players.slice().sort((a, b) => a.seat - b.seat).find((player) => state.codenamesTeamByPlayer[player.userId] === "blue")?.userId ?? ""
  };
  state.codenamesRoundTeam ??= state.codenamesTeamByPlayer[state.currentPlayerId ?? ""] ?? "red";
  state.codenamesClue ??= null;
  state.codenamesClueNumber ??= null;
  state.codenamesGuessesRemaining ??= 0;
  // An old snapshot has no explicit clue/operative phase. Resume it at the
  // current team's spymaster rather than leaving a former operative stranded.
  if (needsTeamPhaseMigration && state.codenamesClue === null) {
    const currentTeam = state.codenamesTeamByPlayer[state.currentPlayerId ?? ""];
    if (currentTeam) state.codenamesRoundTeam = currentTeam;
    const spymasterId = state.codenamesSpymasterByTeam[state.codenamesRoundTeam] || nextPlayerOnTeam(state, state.codenamesRoundTeam);
    if (spymasterId) state.currentPlayerId = spymasterId;
  }
}

export function nextCodenamesOperative(state: BoardGameState, team: "red" | "blue", fromId: string | null = null): string | null {
  const spymasterId = state.codenamesSpymasterByTeam[team];
  const operatives = state.players.filter((player) => state.codenamesTeamByPlayer[player.userId] === team && player.userId !== spymasterId).slice().sort((a, b) => a.seat - b.seat);
  if (!operatives.length) return null;
  const index = operatives.findIndex((player) => player.userId === fromId);
  return operatives[(index + 1 + operatives.length) % operatives.length]?.userId ?? operatives[0]?.userId ?? null;
}

export function endCodenamesTeamTurn(state: BoardGameState): void {
  const nextTeam: "red" | "blue" = state.codenamesRoundTeam === "red" ? "blue" : "red";
  state.codenamesRoundTeam = nextTeam;
  state.codenamesClue = null;
  state.codenamesClueNumber = null;
  state.codenamesGuessesRemaining = 0;
  state.currentPlayerId = state.codenamesSpymasterByTeam[nextTeam] || nextPlayerOnTeam(state, nextTeam);
}
