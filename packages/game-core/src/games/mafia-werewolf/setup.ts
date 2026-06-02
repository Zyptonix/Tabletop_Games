import type { GamePlayer } from "../../engine/GameTypes";
import { hashSeed, shuffleWithState } from "../../engine/rng";
import { DEFAULT_WEREWOLF_SETTINGS } from "./constants";
import { getWerewolfRoleInfo, getWerewolfTeam } from "./roles";
import type { WerewolfNightActions, WerewolfPlayerState, WerewolfRoleId, WerewolfSettings, WerewolfState } from "./types";

export function emptyNightActions(): WerewolfNightActions {
  return {
    werewolfTargets: {},
    doctorTarget: null,
    seerTarget: null,
    bodyguardTarget: null,
    vigilanteTarget: null,
    serialKillerTarget: null,
    witchHealTarget: null,
    witchPoisonTarget: null
  };
}

function baseRolePreset(playerCount: number): WerewolfRoleId[] {
  const werewolfCount = playerCount >= 11 ? 3 : playerCount >= 7 ? 2 : 1;
  const fixed: WerewolfRoleId[] = [
    ...Array.from({ length: werewolfCount }, () => "werewolf" as const),
    "seer",
    "doctor"
  ];
  return fixed;
}

function rolePreset(playerCount: number, settings: WerewolfSettings): WerewolfRoleId[] {
  const roles = baseRolePreset(playerCount);
  const optionalRoles = settings.enabledOptionalRoles
    .filter((role) => !roles.includes(role))
    .filter((role) => role !== "villager" && role !== "werewolf" && role !== "seer" && role !== "doctor")
    .filter((role) => {
      const info = getWerewolfRoleInfo(role);
      return !info.recommendedMinPlayers || playerCount >= info.recommendedMinPlayers;
    });

  for (const role of optionalRoles) {
    if (roles.length < playerCount) roles.push(role);
  }

  while (roles.length < playerCount) {
    roles.push("villager");
  }

  return roles.slice(0, playerCount);
}

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

export function createInitialWerewolfState(params: {
  players: GamePlayer[];
  settings: WerewolfSettings;
  seed: string;
  now: string;
}): WerewolfState {
  const settings = { ...DEFAULT_WEREWOLF_SETTINGS, ...params.settings };
  const shuffledRoles = shuffleWithState(rolePreset(params.players.length, settings), hashSeed(params.seed));

  const players: WerewolfPlayerState[] = params.players
    .slice()
    .sort((left, right) => left.seat - right.seat)
    .map((player, index) => {
      const role = shuffledRoles.values[index] ?? "villager";
      return {
        userId: player.userId,
        username: player.username,
        displayName: player.displayName,
        seat: player.seat,
        role,
        team: getWerewolfTeam(role),
        alive: true,
        revealedRole: null,
        eliminatedAtRound: null,
        usedVigilanteShot: false,
        usedWitchHeal: false,
        usedWitchPoison: false
      };
    });

  const durationMs = settings.roleRevealSeconds * 1000;

  return {
    gameId: "mafia-werewolf",
    version: "0.2.0",
    settings,
    phase: "role_reveal",
    round: 1,
    players,
    moderatorPlayerId: players[0]?.userId ?? null,
    nightActions: emptyNightActions(),
    votesByVoterId: {},
    lastNightKilledPlayerId: null,
    lastNightDeathPlayerIds: [],
    lastSavedPlayerId: null,
    lastVotedOutPlayerId: null,
    lastVoteTied: false,
    lastVotePassed: false,
    seerResults: [],
    phaseStartedAt: params.now,
    phaseDurationMs: durationMs,
    phaseEndsAt: addMs(params.now, durationMs),
    actionNumber: 0,
    rngState: shuffledRoles.rngState,
    startedAt: params.now,
    updatedAt: params.now,
    results: null
  };
}
