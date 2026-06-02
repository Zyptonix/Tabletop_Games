import type { GameResults } from "../../engine/GameTypes";
import type { RngState } from "../../engine/rng";

export const WEREWOLF_PHASES = [
  "role_reveal",
  "night",
  "night_result",
  "day_discussion",
  "voting",
  "vote_result",
  "finished"
] as const;

export type WerewolfPhase = (typeof WEREWOLF_PHASES)[number];

export const WEREWOLF_ROLE_IDS = [
  "villager",
  "werewolf",
  "seer",
  "doctor",
  "jester",
  "vigilante",
  "serial_killer",
  "bodyguard",
  "mayor",
  "witch"
] as const;

export type WerewolfRoleId = (typeof WEREWOLF_ROLE_IDS)[number];
export type WerewolfTeam = "village" | "werewolf" | "solo";

export const PASS_VOTE_TARGET = "__pass__";

export interface WerewolfRoleDefinition {
  id: WerewolfRoleId;
  name: string;
  team: WerewolfTeam;
  shortDescription: string;
  detailedDescription: string;
  nightAction: "none" | "kill" | "inspect" | "protect" | "shoot" | "poison";
  recommendedMinPlayers?: number | undefined;
  enabledInMvp: boolean;
}

export interface WerewolfSettings {
  revealRoleOnDeath: boolean;
  roleRevealSeconds: number;
  nightSeconds: number;
  nightResultSeconds: number;
  dayDiscussionSeconds: number;
  votingSeconds: number;
  voteResultSeconds: number;
  enabledOptionalRoles: WerewolfRoleId[];
}

export interface WerewolfPlayerState {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  role: WerewolfRoleId;
  team: WerewolfTeam;
  alive: boolean;
  revealedRole: WerewolfRoleId | null;
  eliminatedAtRound: number | null;
  usedVigilanteShot: boolean;
  usedWitchHeal: boolean;
  usedWitchPoison: boolean;
}

export interface WerewolfNightActions {
  werewolfTargets: Record<string, string>;
  doctorTarget: string | null;
  seerTarget: string | null;
  bodyguardTarget: string | null;
  vigilanteTarget: string | null;
  serialKillerTarget: string | null;
  witchHealTarget: string | null;
  witchPoisonTarget: string | null;
}

export interface WerewolfSeerResult {
  seerId: string;
  targetPlayerId: string;
  result: "werewolf" | "not_werewolf";
  targetRole: WerewolfRoleId;
  targetTeam: WerewolfTeam;
  round: number;
}

export interface WerewolfState {
  gameId: "mafia-werewolf";
  version: string;
  settings: WerewolfSettings;
  phase: WerewolfPhase;
  round: number;
  players: WerewolfPlayerState[];
  moderatorPlayerId: string | null;
  nightActions: WerewolfNightActions;
  votesByVoterId: Record<string, string>;
  lastNightKilledPlayerId: string | null;
  lastNightDeathPlayerIds: string[];
  lastSavedPlayerId: string | null;
  lastVotedOutPlayerId: string | null;
  lastVoteTied: boolean;
  lastVotePassed: boolean;
  seerResults: WerewolfSeerResult[];
  phaseStartedAt: string;
  phaseDurationMs: number;
  phaseEndsAt: string;
  actionNumber: number;
  rngState: RngState;
  startedAt: string;
  updatedAt: string;
  results: GameResults | null;
}

export type WerewolfAction =
  | { type: "night_werewolf_target"; targetPlayerId: string }
  | { type: "night_doctor_save"; targetPlayerId: string }
  | { type: "night_seer_check"; targetPlayerId: string }
  | { type: "night_bodyguard_protect"; targetPlayerId: string }
  | { type: "night_vigilante_shoot"; targetPlayerId: string }
  | { type: "night_vigilante_skip" }
  | { type: "night_serial_killer_target"; targetPlayerId: string }
  | { type: "night_witch_heal"; targetPlayerId: string }
  | { type: "night_witch_poison"; targetPlayerId: string }
  | { type: "night_witch_skip" }
  | { type: "cast_vote"; targetPlayerId: string }
  | { type: "pass_vote" }
  | { type: "clear_vote" }
  | { type: "advance_phase" };

export interface PublicWerewolfPlayer {
  userId: string;
  displayName: string;
  seat: number;
  alive: boolean;
  revealedRole: WerewolfRoleId | null;
  role?: WerewolfRoleId | undefined;
  team?: WerewolfTeam | undefined;
  knownToViewer?: boolean | undefined;
  voteCount?: number | undefined;
  passedVote?: boolean | undefined;
  isViewer?: boolean | undefined;
  isWerewolfTeammate?: boolean | undefined;
}

export interface PublicWerewolfTargetVote {
  targetPlayerId: string;
  count: number;
  clearTarget: boolean;
}

export interface PublicWerewolfState {
  gameId: "mafia-werewolf";
  phase: WerewolfPhase;
  round: number;
  players: PublicWerewolfPlayer[];
  myRole?: WerewolfRoleId | undefined;
  myTeam?: WerewolfTeam | undefined;
  myRoleInfo?: WerewolfRoleDefinition | undefined;
  werewolfTeamIds: string[];
  werewolfTargetVotes: PublicWerewolfTargetVote[];
  votesByVoterId: Record<string, string>;
  myNightTargetId?: string | null | undefined;
  myVoteTargetId?: string | null | undefined;
  roleCountsInPlay: Partial<Record<WerewolfRoleId, number>>;
  passVoteCount: number;
  lastNightKilledPlayerId: string | null;
  lastNightDeathPlayerIds: string[];
  lastSavedPlayerId: string | null;
  lastVotedOutPlayerId: string | null;
  lastVoteTied: boolean;
  lastVotePassed: boolean;
  seerResults: WerewolfSeerResult[];
  phaseStartedAt: string;
  phaseDurationMs: number;
  phaseEndsAt: string;
  actionNumber: number;
  settings: WerewolfSettings;
  results: GameResults | null;
}
