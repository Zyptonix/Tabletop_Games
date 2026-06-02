import { createGameEvent } from "../../engine/GameEvents";
import { nextRandom } from "../../engine/rng";
import type { GameEvent } from "../../engine/GameTypes";
import {
  buildWerewolfResults,
  findPlayer,
  getWinningTeam,
  hasVotingMajority,
  isBotPlayerId,
  majorityTarget,
  resolveVoteTarget,
  soloHasWon
} from "./rules";
import { emptyNightActions } from "./setup";
import { PASS_VOTE_TARGET, type WerewolfAction, type WerewolfPhase, type WerewolfPlayerState, type WerewolfState, type WerewolfTeam } from "./types";

function event(type: string, _now: string, message?: string, payload?: unknown, targetUserIds?: string[]): GameEvent {
  const options: { message?: string; payload?: unknown; targetUserIds?: string[] } = {};
  if (message !== undefined) options.message = message;
  if (payload !== undefined) options.payload = payload;
  if (targetUserIds !== undefined) options.targetUserIds = targetUserIds;
  return createGameEvent(type, options);
}

function durationForPhase(state: WerewolfState, phase: WerewolfPhase): number {
  switch (phase) {
    case "role_reveal":
      return state.settings.roleRevealSeconds * 1000;
    case "night":
      return state.settings.nightSeconds * 1000;
    case "night_result":
      return state.settings.nightResultSeconds * 1000;
    case "day_discussion":
      return state.settings.dayDiscussionSeconds * 1000;
    case "voting":
      return state.settings.votingSeconds * 1000;
    case "vote_result":
      return state.settings.voteResultSeconds * 1000;
    case "finished":
      return 0;
  }
}

function withPhase(state: WerewolfState, phase: WerewolfPhase, now: string, extra: Partial<WerewolfState> = {}): WerewolfState {
  const duration = durationForPhase(state, phase);
  return {
    ...state,
    ...extra,
    phase,
    phaseStartedAt: now,
    phaseDurationMs: duration,
    phaseEndsAt: new Date(new Date(now).getTime() + duration).toISOString(),
    updatedAt: now,
    actionNumber: state.actionNumber + 1
  };
}

function revealIfNeeded(state: WerewolfState, player: WerewolfPlayerState): WerewolfPlayerState {
  return state.settings.revealRoleOnDeath ? { ...player, revealedRole: player.role } : player;
}

function revealAll(state: WerewolfState): WerewolfState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, revealedRole: player.role }))
  };
}

function killPlayers(state: WerewolfState, playerIds: string[]): WerewolfState {
  const ids = new Set(playerIds);
  if (ids.size === 0) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      ids.has(player.userId) && player.alive
        ? revealIfNeeded(state, { ...player, alive: false, eliminatedAtRound: state.round })
        : player
    )
  };
}

function markUsed(state: WerewolfState, playerId: string, field: "usedVigilanteShot" | "usedWitchHeal" | "usedWitchPoison"): WerewolfState {
  return {
    ...state,
    players: state.players.map((player) => (player.userId === playerId ? { ...player, [field]: true } : player))
  };
}

function realNightTarget(value: string | null | undefined): string | null {
  return value && value !== PASS_VOTE_TARGET ? value : null;
}

function hasSubmittedNightAction(state: WerewolfState, player: WerewolfPlayerState): boolean {
  if (!player.alive) return true;

  if (player.role === "werewolf") return state.nightActions.werewolfTargets[player.userId] !== undefined;
  if (player.role === "doctor") return realNightTarget(state.nightActions.doctorTarget) !== null;
  if (player.role === "seer") return realNightTarget(state.nightActions.seerTarget) !== null;
  if (player.role === "bodyguard") return realNightTarget(state.nightActions.bodyguardTarget) !== null;
  if (player.role === "serial_killer") return realNightTarget(state.nightActions.serialKillerTarget) !== null;
  if (player.role === "vigilante") return player.usedVigilanteShot || state.nightActions.vigilanteTarget !== null;
  if (player.role === "witch") {
    if (player.usedWitchHeal && player.usedWitchPoison) return true;
    return state.nightActions.witchHealTarget !== null || state.nightActions.witchPoisonTarget !== null;
  }

  return true;
}

function allNightActionsSubmitted(state: WerewolfState): boolean {
  return state.players.every((player) => hasSubmittedNightAction(state, player));
}

function afterNightAction(state: WerewolfState, events: GameEvent[], now: string): { state: WerewolfState; events: GameEvent[] } {
  const withBots = withBotNightActions(state);
  if (!allNightActionsSubmitted(withBots)) {
    return { state: withBots, events };
  }

  const resolved = resolveNight(withBots, now);
  return { state: resolved.state, events: [...events, ...resolved.events] };
}

function finishIfWon(state: WerewolfState, now: string): { state: WerewolfState; event: GameEvent | null } {
  const soloWinnerId = soloHasWon(state);
  const winningTeam = getWinningTeam(state);
  if (!winningTeam) return { state, event: null };

  const reason = soloWinnerId
    ? `${findPlayer(state, soloWinnerId)?.displayName ?? "A solo role"} survived alone.`
    : winningTeam === "village"
      ? "All Werewolves have been eliminated."
      : "Werewolves equal or outnumber the Village.";
  const results = buildWerewolfResults(state, winningTeam, reason, soloWinnerId);
  const finishedState = revealAll(withPhase(state, "finished", now, { results }));
  return {
    state: finishedState,
    event: event("mafia-werewolf:game_finished", now, soloWinnerId ? "A solo role wins." : `${winningTeam === "village" ? "The Village" : "The Werewolves"} win.`, {
      winningTeam,
      soloWinnerId,
      reason
    })
  };
}

function chooseRandomTarget(state: WerewolfState, candidates: WerewolfPlayerState[]): { targetId: string | null; state: WerewolfState } {
  if (candidates.length === 0) return { targetId: null, state };
  const random = nextRandom(state.rngState);
  const targetId = candidates[Math.floor(random.value * candidates.length)]?.userId ?? null;
  return { targetId, state: { ...state, rngState: random.state } };
}

function withBotNightActions(input: WerewolfState): WerewolfState {
  let state = input;
  for (const player of state.players) {
    if (!player.alive || !isBotPlayerId(player.userId)) continue;

    if (player.role === "werewolf" && !state.nightActions.werewolfTargets[player.userId]) {
      const existingPackTarget = Object.values(state.nightActions.werewolfTargets).find((targetId) => {
        const target = findPlayer(state, targetId);
        return Boolean(target?.alive && target.team !== "werewolf");
      });
      const choice = existingPackTarget
        ? { targetId: existingPackTarget, state }
        : chooseRandomTarget(state, state.players.filter((target) => target.alive && target.team !== "werewolf"));
      state = choice.state;
      if (choice.targetId) {
        state = { ...state, nightActions: { ...state.nightActions, werewolfTargets: { ...state.nightActions.werewolfTargets, [player.userId]: choice.targetId } } };
      }
    }

    if (player.role === "doctor" && !state.nightActions.doctorTarget) {
      const choice = chooseRandomTarget(state, state.players.filter((target) => target.alive));
      state = choice.state;
      if (choice.targetId) state = { ...state, nightActions: { ...state.nightActions, doctorTarget: choice.targetId } };
    }

    if (player.role === "seer" && !state.nightActions.seerTarget) {
      const choice = chooseRandomTarget(state, state.players.filter((target) => target.alive && target.userId !== player.userId));
      state = choice.state;
      if (choice.targetId) state = { ...state, nightActions: { ...state.nightActions, seerTarget: choice.targetId } };
    }

    if (player.role === "bodyguard" && !state.nightActions.bodyguardTarget) {
      const choice = chooseRandomTarget(state, state.players.filter((target) => target.alive));
      state = choice.state;
      if (choice.targetId) state = { ...state, nightActions: { ...state.nightActions, bodyguardTarget: choice.targetId } };
    }

    if (player.role === "serial_killer" && !state.nightActions.serialKillerTarget) {
      const choice = chooseRandomTarget(state, state.players.filter((target) => target.alive && target.userId !== player.userId));
      state = choice.state;
      if (choice.targetId) state = { ...state, nightActions: { ...state.nightActions, serialKillerTarget: choice.targetId } };
    }
  }
  return state;
}

function withBotVotes(input: WerewolfState): WerewolfState {
  let state = input;
  for (const player of state.players) {
    if (!player.alive || !isBotPlayerId(player.userId) || state.votesByVoterId[player.userId]) continue;
    const candidates = state.players.filter((target) => target.alive && target.userId !== player.userId);
    const choice = chooseRandomTarget(state, candidates);
    state = choice.state;
    state = {
      ...state,
      votesByVoterId: { ...state.votesByVoterId, [player.userId]: choice.targetId ?? PASS_VOTE_TARGET }
    };
  }
  return state;
}

function resolveNight(input: WerewolfState, now: string): { state: WerewolfState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let next = withBotNightActions(input);

  const werewolfTarget = realNightTarget(majorityTarget(next.nightActions.werewolfTargets));
  const doctorTarget = realNightTarget(next.nightActions.doctorTarget);
  const bodyguardTarget = realNightTarget(next.nightActions.bodyguardTarget);
  const witchHealTarget = realNightTarget(next.nightActions.witchHealTarget);
  const seer = next.players.find((player) => player.role === "seer" && player.alive);
  const seerTarget = realNightTarget(next.nightActions.seerTarget);

  if (seer && seerTarget) {
    const target = findPlayer(next, seerTarget);
    if (target) {
      const result = target.team === "werewolf" ? "werewolf" : "not_werewolf";
      next = {
        ...next,
        seerResults: [...next.seerResults, { seerId: seer.userId, targetPlayerId: target.userId, result, targetRole: target.role, targetTeam: target.team, round: next.round }]
      };
      events.push(event("mafia-werewolf:seer_result", now, "The Seer learned the truth.", { seerId: seer.userId, targetPlayerId: target.userId, result, targetRole: target.role, targetTeam: target.team, round: next.round }, [seer.userId]));
    }
  }

  const attacked = new Set<string>();
  if (werewolfTarget) attacked.add(werewolfTarget);
  const serialKillerTarget = realNightTarget(next.nightActions.serialKillerTarget);
  const vigilanteTarget = realNightTarget(next.nightActions.vigilanteTarget);
  const witchPoisonTarget = realNightTarget(next.nightActions.witchPoisonTarget);
  if (serialKillerTarget) attacked.add(serialKillerTarget);
  if (vigilanteTarget) attacked.add(vigilanteTarget);
  if (witchPoisonTarget) attacked.add(witchPoisonTarget);

  const protectedTargets = new Set<string>();
  if (doctorTarget) protectedTargets.add(doctorTarget);
  if (witchHealTarget) protectedTargets.add(witchHealTarget);

  const deaths = new Set<string>();
  let savedPlayerId: string | null = null;

  if (bodyguardTarget && attacked.has(bodyguardTarget)) {
    const bodyguard = next.players.find((player) => player.alive && player.role === "bodyguard");
    if (bodyguard && bodyguard.userId !== bodyguardTarget) {
      deaths.add(bodyguard.userId);
      attacked.delete(bodyguardTarget);
      savedPlayerId = bodyguardTarget;
    }
  }

  for (const targetId of attacked) {
    if (protectedTargets.has(targetId)) {
      savedPlayerId = targetId;
    } else {
      deaths.add(targetId);
    }
  }

  const vigilante = next.players.find((player) => player.role === "vigilante");
  if (vigilante && realNightTarget(next.nightActions.vigilanteTarget)) next = markUsed(next, vigilante.userId, "usedVigilanteShot");
  const witch = next.players.find((player) => player.role === "witch");
  if (witch && next.nightActions.witchHealTarget) next = markUsed(next, witch.userId, "usedWitchHeal");
  if (witch && next.nightActions.witchPoisonTarget) next = markUsed(next, witch.userId, "usedWitchPoison");

  const deathIds = [...deaths].filter((id) => findPlayer(next, id)?.alive);
  next = killPlayers(next, deathIds);
  next = {
    ...next,
    nightActions: emptyNightActions(),
    lastNightKilledPlayerId: deathIds[0] ?? null,
    lastNightDeathPlayerIds: deathIds,
    lastSavedPlayerId: savedPlayerId,
    lastVotedOutPlayerId: null,
    lastVoteTied: false,
    lastVotePassed: false
  };

  const finished = finishIfWon(next, now);
  if (finished.event) return { state: finished.state, events: [...events, finished.event] };

  const message = deathIds.length > 0
    ? `${deathIds.length === 1 ? findPlayer(next, deathIds[0]!)?.displayName ?? "A player" : `${deathIds.length} players`} did not survive the night.`
    : "Nobody died last night.";
  events.push(event("mafia-werewolf:night_resolved", now, message, { killedPlayerIds: deathIds, savedPlayerId, round: next.round }));

  return { state: withPhase(next, "night_result", now), events };
}

function finishJesterIfNeeded(state: WerewolfState, targetId: string | null, now: string): { state: WerewolfState; event: GameEvent | null } {
  if (!targetId) return { state, event: null };
  const target = findPlayer(state, targetId);
  if (target?.role !== "jester") return { state, event: null };
  const results = buildWerewolfResults(state, "solo", "The Jester tricked the Village into voting them out.", target.userId);
  return {
    state: revealAll(withPhase(state, "finished", now, { results })),
    event: event("mafia-werewolf:game_finished", now, `${target.displayName} wins as the Jester.`, { winningTeam: "solo", soloWinnerId: target.userId, reason: "Jester was voted out." })
  };
}

function resolveVote(state: WerewolfState, now: string): { state: WerewolfState; events: GameEvent[] } {
  const resolved = resolveVoteTarget(state);
  let next = state;

  const jester = finishJesterIfNeeded(next, resolved.targetId, now);
  if (jester.event) return { state: jester.state, events: [jester.event] };

  if (resolved.targetId) next = killPlayers(next, [resolved.targetId]);

  next = {
    ...next,
    votesByVoterId: {},
    lastVotedOutPlayerId: resolved.targetId,
    lastVoteTied: resolved.tied,
    lastVotePassed: resolved.passed,
    lastNightKilledPlayerId: null,
    lastNightDeathPlayerIds: [],
    lastSavedPlayerId: null
  };

  const finished = finishIfWon(next, now);
  if (finished.event) return { state: finished.state, events: [finished.event] };

  const eliminatedName = resolved.targetId ? findPlayer(next, resolved.targetId)?.displayName ?? "A player" : null;
  return {
    state: withPhase(next, "vote_result", now),
    events: [event("mafia-werewolf:vote_resolved", now, eliminatedName ? `${eliminatedName} was voted out.` : resolved.passed ? "The village chose not to eliminate anyone." : "The vote was tied. Nobody was eliminated.", {
      eliminatedPlayerId: resolved.targetId,
      tied: resolved.tied,
      passed: resolved.passed,
      round: next.round
    })]
  };
}

export function advanceWerewolfPhase(params: { state: WerewolfState; now: string }): { state: WerewolfState; events: GameEvent[] } {
  const { state, now } = params;
  if (state.phase === "finished") return { state, events: [] };

  if (state.phase === "role_reveal") {
    const next = withPhase(state, "night", now, { lastNightKilledPlayerId: null, lastNightDeathPlayerIds: [], lastSavedPlayerId: null, lastVotedOutPlayerId: null, votesByVoterId: {} });
    return { state: next, events: [event("mafia-werewolf:phase_changed", now, "Night falls.", { phase: "night", round: next.round })] };
  }

  if (state.phase === "night") return resolveNight(state, now);

  if (state.phase === "night_result") {
    const next = withPhase(state, "day_discussion", now);
    return { state: next, events: [event("mafia-werewolf:phase_changed", now, "The village wakes and begins discussion.", { phase: "day_discussion", round: next.round })] };
  }

  if (state.phase === "day_discussion") {
    const next = withBotVotes(withPhase(state, "voting", now, { votesByVoterId: {} }));
    return { state: next, events: [event("mafia-werewolf:phase_changed", now, "Voting has begun.", { phase: "voting", round: next.round })] };
  }

  if (state.phase === "voting") return resolveVote(state, now);

  if (state.phase === "vote_result") {
    const next = withPhase(state, "night", now, { round: state.round + 1, nightActions: emptyNightActions(), votesByVoterId: {}, lastNightKilledPlayerId: null, lastNightDeathPlayerIds: [], lastSavedPlayerId: null, lastVotedOutPlayerId: null, lastVoteTied: false, lastVotePassed: false });
    return { state: next, events: [event("mafia-werewolf:phase_changed", now, "Night falls again.", { phase: "night", round: next.round })] };
  }

  return { state, events: [] };
}

function afterVoteAction(state: WerewolfState, events: GameEvent[], now: string): { state: WerewolfState; events: GameEvent[] } {
  if (!hasVotingMajority(state)) return { state, events };
  const resolved = resolveVote(state, now);
  return { state: resolved.state, events: [...events, ...resolved.events] };
}

export function applyWerewolfAction(params: { state: WerewolfState; playerId: string; action: WerewolfAction; now: string }): { state: WerewolfState; events: GameEvent[] } {
  const { state, playerId, action, now } = params;

  if (action.type === "advance_phase") return advanceWerewolfPhase({ state, now });

  if (action.type === "night_werewolf_target") {
    const next = { ...state, nightActions: { ...state.nightActions, werewolfTargets: { ...state.nightActions.werewolfTargets, [playerId]: action.targetPlayerId } }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "A Werewolf has chosen a victim.", { playerId, actionKind: "werewolf" })], now);
  }
  if (action.type === "night_doctor_save") {
    const next = { ...state, nightActions: { ...state.nightActions, doctorTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Doctor has chosen someone to protect.", { playerId, actionKind: "doctor" }, [playerId])], now);
  }
  if (action.type === "night_seer_check") {
    const next = { ...state, nightActions: { ...state.nightActions, seerTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Seer has chosen someone to inspect.", { playerId, actionKind: "seer" }, [playerId])], now);
  }
  if (action.type === "night_bodyguard_protect") {
    const next = { ...state, nightActions: { ...state.nightActions, bodyguardTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Bodyguard is standing watch.", { playerId, actionKind: "bodyguard" }, [playerId])], now);
  }
  if (action.type === "night_vigilante_shoot") {
    const next = { ...state, nightActions: { ...state.nightActions, vigilanteTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Vigilante has loaded a shot.", { playerId, actionKind: "vigilante" }, [playerId])], now);
  }
  if (action.type === "night_vigilante_skip") {
    const next = { ...state, nightActions: { ...state.nightActions, vigilanteTarget: PASS_VOTE_TARGET }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Vigilante holds fire.", { playerId, actionKind: "vigilante_skip" }, [playerId])], now);
  }
  if (action.type === "night_serial_killer_target") {
    const next = { ...state, nightActions: { ...state.nightActions, serialKillerTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "A lone killer has chosen a victim.", { playerId, actionKind: "serial_killer" }, [playerId])], now);
  }
  if (action.type === "night_witch_heal") {
    const next = { ...state, nightActions: { ...state.nightActions, witchHealTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Witch prepared a healing potion.", { playerId, actionKind: "witch_heal" }, [playerId])], now);
  }
  if (action.type === "night_witch_poison") {
    const next = { ...state, nightActions: { ...state.nightActions, witchPoisonTarget: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Witch prepared a poison potion.", { playerId, actionKind: "witch_poison" }, [playerId])], now);
  }
  if (action.type === "night_witch_skip") {
    const next = { ...state, nightActions: { ...state.nightActions, witchHealTarget: PASS_VOTE_TARGET, witchPoisonTarget: PASS_VOTE_TARGET }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterNightAction(next, [event("mafia-werewolf:night_action_submitted", now, "The Witch saves the potions.", { playerId, actionKind: "witch_skip" }, [playerId])], now);
  }

  if (action.type === "cast_vote") {
    const target = findPlayer(state, action.targetPlayerId);
    const next = { ...state, votesByVoterId: { ...state.votesByVoterId, [playerId]: action.targetPlayerId }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterVoteAction(next, [event("mafia-werewolf:vote_cast", now, `${findPlayer(state, playerId)?.displayName ?? "A player"} voted for ${target?.displayName ?? "someone"}.`, { voterId: playerId, targetPlayerId: action.targetPlayerId })], now);
  }

  if (action.type === "pass_vote") {
    const next = { ...state, votesByVoterId: { ...state.votesByVoterId, [playerId]: PASS_VOTE_TARGET }, updatedAt: now, actionNumber: state.actionNumber + 1 };
    return afterVoteAction(next, [event("mafia-werewolf:vote_passed", now, `${findPlayer(state, playerId)?.displayName ?? "A player"} passed their vote.`, { voterId: playerId })], now);
  }

  if (action.type === "clear_vote") {
    const nextVotes = { ...state.votesByVoterId };
    delete nextVotes[playerId];
    return { state: { ...state, votesByVoterId: nextVotes, updatedAt: now, actionNumber: state.actionNumber + 1 }, events: [event("mafia-werewolf:vote_cleared", now, "A vote was cleared.", { voterId: playerId })] };
  }

  return { state, events: [] };
}

export function applyWerewolfTimeout(params: { state: WerewolfState; playerId: string; now: string }): { state: WerewolfState; events: GameEvent[] } | null {
  if (params.playerId !== params.state.moderatorPlayerId) return null;
  return advanceWerewolfPhase({ state: params.state, now: params.now });
}
