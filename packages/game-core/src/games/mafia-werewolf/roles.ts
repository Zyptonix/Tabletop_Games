import type { WerewolfRoleDefinition, WerewolfRoleId, WerewolfTeam } from "./types";

export const WEREWOLF_ROLES: Record<WerewolfRoleId, WerewolfRoleDefinition> = {
  villager: {
    id: "villager",
    name: "Villager",
    team: "village",
    shortDescription: "Find and vote out the Werewolves.",
    detailedDescription:
      "You are a Villager. You have no night power, but your vote matters. Watch how people talk during the day, look for lies, and help the Village eliminate every Werewolf.",
    nightAction: "none",
    enabledInMvp: true
  },
  werewolf: {
    id: "werewolf",
    name: "Werewolf",
    team: "werewolf",
    shortDescription: "Kill villagers at night and blend in during the day.",
    detailedDescription:
      "You are a Werewolf. Each night, choose one player to kill with your Werewolf team. During the day, pretend to be innocent and avoid being voted out. You win when Werewolves equal or outnumber the Village.",
    nightAction: "kill",
    enabledInMvp: true
  },
  seer: {
    id: "seer",
    name: "Seer",
    team: "village",
    shortDescription: "Inspect one player each night.",
    detailedDescription:
      "You are the Seer. Each night, choose one player to inspect. You will privately learn whether that player is a Werewolf or not. Use the information carefully; revealing yourself too early can make you a target.",
    nightAction: "inspect",
    enabledInMvp: true
  },
  doctor: {
    id: "doctor",
    name: "Doctor",
    team: "village",
    shortDescription: "Protect one player each night.",
    detailedDescription:
      "You are the Doctor. Each night, choose one player to protect. If the Werewolves attack that same player, the attack fails and nobody dies from the Werewolf attack. You may protect yourself.",
    nightAction: "protect",
    enabledInMvp: true
  },
  jester: {
    id: "jester",
    name: "Jester",
    team: "solo",
    shortDescription: "Get yourself voted out.",
    detailedDescription:
      "You are the Jester. Your goal is to be voted out during the day. Act suspicious, confuse people, and trick the Village into eliminating you.",
    nightAction: "none",
    recommendedMinPlayers: 7,
    enabledInMvp: false
  },
  vigilante: {
    id: "vigilante",
    name: "Vigilante",
    team: "village",
    shortDescription: "Shoot one player once per game.",
    detailedDescription:
      "You are the Vigilante. Once per game, you may shoot one player at night. Use your shot carefully; shooting wrong can kill an innocent Villager.",
    nightAction: "shoot",
    recommendedMinPlayers: 8,
    enabledInMvp: false
  },
  serial_killer: {
    id: "serial_killer",
    name: "Serial Killer",
    team: "solo",
    shortDescription: "Kill alone and survive until the end.",
    detailedDescription:
      "You are the Serial Killer. You work alone and may kill at night. Your goal is to survive until the end and become the last killer standing.",
    nightAction: "kill",
    recommendedMinPlayers: 9,
    enabledInMvp: false
  },
  bodyguard: {
    id: "bodyguard",
    name: "Bodyguard",
    team: "village",
    shortDescription: "Guard a player and take the hit for them.",
    detailedDescription:
      "You are the Bodyguard. Each night, choose someone to guard. If that player is attacked, you sacrifice yourself and die instead.",
    nightAction: "protect",
    recommendedMinPlayers: 7,
    enabledInMvp: false
  },
  mayor: {
    id: "mayor",
    name: "Mayor",
    team: "village",
    shortDescription: "Your vote counts as two.",
    detailedDescription:
      "You are the Mayor. During voting, your vote counts as two. Use your influence carefully; the village may follow your lead, but evil roles may see you as a threat.",
    nightAction: "none",
    recommendedMinPlayers: 8,
    enabledInMvp: false
  },
  witch: {
    id: "witch",
    name: "Witch",
    team: "village",
    shortDescription: "Use one healing potion and one poison potion.",
    detailedDescription:
      "You are the Witch. You have a healing potion and a poison potion, each usable once per game. Timing matters. This advanced role is scaffolded for a later patch.",
    nightAction: "poison",
    recommendedMinPlayers: 10,
    enabledInMvp: false
  }
};

export function getWerewolfRoleInfo(role: WerewolfRoleId): WerewolfRoleDefinition {
  return WEREWOLF_ROLES[role];
}

export function getWerewolfTeam(role: WerewolfRoleId): WerewolfTeam {
  return WEREWOLF_ROLES[role].team;
}
