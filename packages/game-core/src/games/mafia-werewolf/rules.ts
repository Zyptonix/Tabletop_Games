import type { GameResults } from "../../engine/GameTypes";
import type { WerewolfPlayerState, WerewolfState, WerewolfTeam } from "./types";
import { PASS_VOTE_TARGET } from "./types";

export function alivePlayers(state: WerewolfState): WerewolfPlayerState[] {
  return state.players.filter((player) => player.alive);
}

export function findPlayer(state: WerewolfState, playerId: string): WerewolfPlayerState | undefined {
  return state.players.find((player) => player.userId === playerId);
}

export function isAlive(state: WerewolfState, playerId: string): boolean {
  return Boolean(findPlayer(state, playerId)?.alive);
}

export function isBotPlayerId(userId: string): boolean {
  return userId.startsWith("bot:");
}

export function canWerewolvesWin(state: WerewolfState): boolean {
  const alive = alivePlayers(state);
  const werewolves = alive.filter((player) => player.team === "werewolf").length;
  const nonWerewolves = alive.length - werewolves;
  return werewolves > 0 && werewolves >= nonWerewolves;
}

export function villageHasWon(state: WerewolfState): boolean {
  const alive = alivePlayers(state);
  const werewolvesAlive = alive.some((player) => player.team === "werewolf");
  const serialKillerAlive = alive.some((player) => player.role === "serial_killer");
  return !werewolvesAlive && !serialKillerAlive;
}

export function soloHasWon(state: WerewolfState): string | null {
  const alive = alivePlayers(state);
  if (alive.length === 1 && alive[0]?.role === "serial_killer") {
    return alive[0].userId;
  }
  return null;
}

export function getWinningTeam(state: WerewolfState): WerewolfTeam | null {
  if (soloHasWon(state)) return "solo";
  if (villageHasWon(state)) return "village";
  if (canWerewolvesWin(state)) return "werewolf";
  return null;
}

export function buildWerewolfResults(state: WerewolfState, winningTeam: WerewolfTeam, reason: string, soloWinnerId?: string | null): GameResults {
  const placements = state.players.map((player) => {
    const won = soloWinnerId ? player.userId === soloWinnerId : player.team === winningTeam;
    return {
      userId: player.userId,
      placement: won ? 1 : 2,
      score: won ? 100 : 0,
      result: won ? "WIN" as const : "LOSS" as const
    };
  });

  const scoreByUserId = Object.fromEntries(placements.map((placement) => [placement.userId, placement.score]));
  const winner = placements.find((placement) => placement.result === "WIN") ?? null;

  return {
    winnerUserId: winner?.userId ?? null,
    placements,
    scoreByUserId
  };
}

export function majorityTarget(targets: Record<string, string>): string | null {
  const counts = new Map<string, number>();
  for (const targetId of Object.values(targets)) {
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }

  let bestTarget: string | null = null;
  let bestCount = 0;
  let tiedForBest = false;

  for (const [targetId, count] of counts) {
    if (count > bestCount) {
      bestTarget = targetId;
      bestCount = count;
      tiedForBest = false;
    } else if (count === bestCount && count > 0) {
      tiedForBest = true;
    }
  }

  return tiedForBest ? null : bestTarget;
}

export function voteWeight(player: WerewolfPlayerState): number {
  return player.role === "mayor" ? 2 : 1;
}

export function totalAliveVoteWeight(state: WerewolfState): number {
  return alivePlayers(state).reduce((total, player) => total + voteWeight(player), 0);
}

export function currentVoteWeight(state: WerewolfState): number {
  return Object.keys(state.votesByVoterId).reduce((total, voterId) => {
    const voter = findPlayer(state, voterId);
    return voter?.alive ? total + voteWeight(voter) : total;
  }, 0);
}

export function hasVotingMajority(state: WerewolfState): boolean {
  const total = totalAliveVoteWeight(state);
  return total > 0 && currentVoteWeight(state) >= Math.floor(total / 2) + 1;
}

export function resolveVoteTarget(state: WerewolfState): { targetId: string | null; tied: boolean; passed: boolean } {
  const weights = new Map<string, number>();
  let passWeight = 0;

  for (const [voterId, targetId] of Object.entries(state.votesByVoterId)) {
    const voter = findPlayer(state, voterId);
    if (!voter?.alive) continue;
    const weight = voteWeight(voter);
    if (targetId === PASS_VOTE_TARGET) {
      passWeight += weight;
      continue;
    }

    const target = findPlayer(state, targetId);
    if (!target?.alive) continue;
    weights.set(targetId, (weights.get(targetId) ?? 0) + weight);
  }

  let bestTarget: string | null = null;
  let bestCount = 0;
  let tied = false;

  for (const [targetId, count] of weights) {
    if (count > bestCount) {
      bestTarget = targetId;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }

  if (passWeight > bestCount) {
    return { targetId: null, tied: false, passed: true };
  }

  if (!bestTarget) {
    return { targetId: null, tied: false, passed: passWeight > 0 };
  }

  if (tied || passWeight === bestCount) {
    return { targetId: null, tied: true, passed: false };
  }

  return { targetId: bestTarget, tied: false, passed: false };
}
