import type { WerewolfSettings } from "./types";

export const WEREWOLF_MIN_PLAYERS = 5;
export const WEREWOLF_MAX_PLAYERS = 20;

export const DEFAULT_WEREWOLF_SETTINGS: WerewolfSettings = {
  revealRoleOnDeath: true,
  roleRevealSeconds: 12,
  nightSeconds: 45,
  nightResultSeconds: 8,
  dayDiscussionSeconds: 120,
  votingSeconds: 45,
  voteResultSeconds: 8,
  enabledOptionalRoles: []
};
