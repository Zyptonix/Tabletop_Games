import { getWerewolfRoleInfo } from "./roles";
import { PASS_VOTE_TARGET, type PublicWerewolfPlayer, type PublicWerewolfState, type WerewolfState } from "./types";
import { voteWeight } from "./rules";

function voteCounts(state: WerewolfState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [voterId, targetId] of Object.entries(state.votesByVoterId)) {
    if (targetId === PASS_VOTE_TARGET) continue;
    const voter = state.players.find((player) => player.userId === voterId);
    if (!voter?.alive) continue;
    counts.set(targetId, (counts.get(targetId) ?? 0) + voteWeight(voter));
  }
  return counts;
}

function passVoteCount(state: WerewolfState): number {
  return Object.entries(state.votesByVoterId).reduce((total, [voterId, targetId]) => {
    if (targetId !== PASS_VOTE_TARGET) return total;
    const voter = state.players.find((player) => player.userId === voterId);
    return voter?.alive ? total + voteWeight(voter) : total;
  }, 0);
}

function werewolfTargetVotesForViewer(state: WerewolfState, viewerIsWerewolf: boolean) {
  if (!viewerIsWerewolf || state.phase !== "night") return [];

  const counts = new Map<string, number>();
  for (const [voterId, targetPlayerId] of Object.entries(state.nightActions.werewolfTargets)) {
    const voter = state.players.find((player) => player.userId === voterId);
    const target = state.players.find((player) => player.userId === targetPlayerId);
    if (!voter?.alive || voter.team !== "werewolf" || !target?.alive) continue;
    counts.set(targetPlayerId, (counts.get(targetPlayerId) ?? 0) + 1);
  }

  const highest = Math.max(0, ...counts.values());
  const leaders = [...counts.values()].filter((count) => count === highest).length;

  return [...counts.entries()]
    .map(([targetPlayerId, count]) => ({
      targetPlayerId,
      count,
      clearTarget: count > 0 && count === highest && leaders === 1
    }))
    .sort((left, right) => right.count - left.count || left.targetPlayerId.localeCompare(right.targetPlayerId));
}

function roleCountsInPlay(state: WerewolfState) {
  return state.players.reduce<Partial<Record<WerewolfState["players"][number]["role"], number>>>((counts, player) => {
    counts[player.role] = (counts[player.role] ?? 0) + 1;
    return counts;
  }, {});
}

function cleanNightTarget(value: string | null | undefined): string | null {
  return value && value !== PASS_VOTE_TARGET ? value : null;
}

function selectedNightTargetForViewer(state: WerewolfState, viewerId: string): string | null {
  const viewer = state.players.find((player) => player.userId === viewerId);
  if (!viewer) return null;

  if (viewer.role === "werewolf") return cleanNightTarget(state.nightActions.werewolfTargets[viewerId]);
  if (viewer.role === "doctor") return cleanNightTarget(state.nightActions.doctorTarget);
  if (viewer.role === "seer") return cleanNightTarget(state.nightActions.seerTarget);
  if (viewer.role === "bodyguard") return cleanNightTarget(state.nightActions.bodyguardTarget);
  if (viewer.role === "vigilante") return cleanNightTarget(state.nightActions.vigilanteTarget);
  if (viewer.role === "serial_killer") return cleanNightTarget(state.nightActions.serialKillerTarget);
  if (viewer.role === "witch") return cleanNightTarget(state.nightActions.witchHealTarget) ?? cleanNightTarget(state.nightActions.witchPoisonTarget);
  return null;
}

export function getPublicWerewolfState(params: { state: WerewolfState; viewerId: string }): PublicWerewolfState {
  const { state, viewerId } = params;
  const viewer = state.players.find((player) => player.userId === viewerId);
  const viewerIsWerewolf = viewer?.team === "werewolf";
  const counts = voteCounts(state);
  const werewolfTeamIds = viewerIsWerewolf
    ? state.players.filter((player) => player.team === "werewolf").map((player) => player.userId)
    : [];
  const seerKnownByTargetId = new Map(
    viewer?.role === "seer"
      ? state.seerResults.filter((result) => result.seerId === viewerId).map((result) => [result.targetPlayerId, result])
      : []
  );

  const players: PublicWerewolfPlayer[] = state.players
    .slice()
    .sort((left, right) => left.seat - right.seat)
    .map((player) => {
      const isViewer = player.userId === viewerId;
      const isWerewolfTeammate = Boolean(viewerIsWerewolf && player.team === "werewolf");
      const seerKnown = seerKnownByTargetId.get(player.userId);
      const roleVisible = state.phase === "finished" || isViewer || isWerewolfTeammate || Boolean(player.revealedRole) || Boolean(seerKnown);
      const visibleRole = seerKnown?.targetRole ?? player.role;
      const visibleTeam = seerKnown?.targetTeam ?? player.team;

      return {
        userId: player.userId,
        displayName: player.displayName,
        seat: player.seat,
        alive: player.alive,
        revealedRole: state.phase === "finished" ? player.role : player.revealedRole,
        role: roleVisible ? visibleRole : undefined,
        team: roleVisible ? visibleTeam : undefined,
        knownToViewer: roleVisible,
        isViewer,
        isWerewolfTeammate,
        voteCount: counts.get(player.userId) ?? 0,
        passedVote: state.votesByVoterId[player.userId] === PASS_VOTE_TARGET
      };
    });

  return {
    gameId: "mafia-werewolf",
    phase: state.phase,
    round: state.round,
    players,
    myRole: viewer?.role,
    myTeam: viewer?.team,
    myRoleInfo: viewer ? getWerewolfRoleInfo(viewer.role) : undefined,
    werewolfTeamIds,
    werewolfTargetVotes: werewolfTargetVotesForViewer(state, viewerIsWerewolf),
    votesByVoterId: state.phase === "voting" || state.phase === "vote_result" || state.phase === "finished" ? state.votesByVoterId : {},
    myNightTargetId: state.phase === "night" ? selectedNightTargetForViewer(state, viewerId) : null,
    myVoteTargetId: state.phase === "voting" || state.phase === "vote_result" ? state.votesByVoterId[viewerId] ?? null : null,
    roleCountsInPlay: roleCountsInPlay(state),
    passVoteCount: passVoteCount(state),
    lastNightKilledPlayerId: state.lastNightKilledPlayerId,
    lastNightDeathPlayerIds: state.lastNightDeathPlayerIds,
    lastSavedPlayerId: state.lastSavedPlayerId,
    lastVotedOutPlayerId: state.lastVotedOutPlayerId,
    lastVoteTied: state.lastVoteTied,
    lastVotePassed: state.lastVotePassed,
    seerResults: viewer?.role === "seer" ? state.seerResults.filter((result) => result.seerId === viewerId) : [],
    phaseStartedAt: state.phaseStartedAt,
    phaseDurationMs: state.phaseDurationMs,
    phaseEndsAt: state.phaseEndsAt,
    actionNumber: state.actionNumber,
    settings: state.settings,
    results: state.results
  };
}
