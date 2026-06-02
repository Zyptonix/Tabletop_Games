import type { WerewolfRoleId, WerewolfPhase } from "@tabletop/game-core";

export const WEREWOLF_ROLE_THEME: Record<WerewolfRoleId, { accent: string; glow: string; label: string }> = {
  villager: { accent: "rgb(234 179 8)", glow: "rgba(234,179,8,0.24)", label: "Village" },
  werewolf: { accent: "rgb(248 113 113)", glow: "rgba(239,68,68,0.34)", label: "Werewolf" },
  seer: { accent: "rgb(96 165 250)", glow: "rgba(96,165,250,0.30)", label: "Seer" },
  doctor: { accent: "rgb(74 222 128)", glow: "rgba(34,197,94,0.26)", label: "Doctor" },
  jester: { accent: "rgb(244 114 182)", glow: "rgba(236,72,153,0.28)", label: "Jester" },
  vigilante: { accent: "rgb(251 146 60)", glow: "rgba(249,115,22,0.28)", label: "Vigilante" },
  serial_killer: { accent: "rgb(220 38 38)", glow: "rgba(185,28,28,0.35)", label: "Serial Killer" },
  bodyguard: { accent: "rgb(45 212 191)", glow: "rgba(20,184,166,0.26)", label: "Bodyguard" },
  mayor: { accent: "rgb(250 204 21)", glow: "rgba(250,204,21,0.30)", label: "Mayor" },
  witch: { accent: "rgb(168 85 247)", glow: "rgba(168,85,247,0.30)", label: "Witch" }
};

export const WEREWOLF_PHASE_LABELS: Record<WerewolfPhase, string> = {
  role_reveal: "Role Reveal",
  night: "Night Falls",
  night_result: "Morning Comes",
  day_discussion: "Day Discussion",
  voting: "Village Vote",
  vote_result: "Judgment",
  finished: "Game Over"
};

export function getWerewolfRoleTheme(role: WerewolfRoleId) {
  return WEREWOLF_ROLE_THEME[role] ?? WEREWOLF_ROLE_THEME.villager;
}
