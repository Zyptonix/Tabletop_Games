import type { ValidationResult } from "../../engine/GameTypes";
import { findPlayer, isAlive } from "./rules";
import type { WerewolfAction, WerewolfState } from "./types";

const ok: ValidationResult = { ok: true };

function fail(code: string, message: string): ValidationResult {
  return { ok: false, code, message };
}

function aliveTarget(state: WerewolfState, targetPlayerId: string): ValidationResult {
  return isAlive(state, targetPlayerId) ? ok : fail("INVALID_TARGET", "Target must be alive.");
}

export function validateWerewolfAction(params: {
  state: WerewolfState;
  playerId: string;
  action: WerewolfAction;
}): ValidationResult {
  const { state, playerId, action } = params;
  const player = findPlayer(state, playerId);

  if (!player) return fail("PLAYER_NOT_IN_GAME", "You are not in this Werewolf game.");
  if (state.phase === "finished") return fail("GAME_OVER", "The game is already over.");

  if (action.type === "advance_phase") {
    return playerId === state.moderatorPlayerId ? ok : fail("HOST_ONLY", "Only the host can advance the computer moderator.");
  }

  if (!player.alive) return fail("DEAD_PLAYER", "Dead players cannot act.");

  if (action.type === "night_werewolf_target") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Werewolves act at night.");
    if (player.role !== "werewolf") return fail("WRONG_ROLE", "Only Werewolves can choose a night kill.");
    const target = findPlayer(state, action.targetPlayerId);
    if (!target?.alive) return fail("INVALID_TARGET", "Target must be alive.");
    if (target.team === "werewolf") return fail("INVALID_TARGET", "Werewolves cannot target another Werewolf.");
    return ok;
  }

  if (action.type === "night_doctor_save") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Doctor acts at night.");
    if (player.role !== "doctor") return fail("WRONG_ROLE", "Only the Doctor can save a player.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_seer_check") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Seer acts at night.");
    if (player.role !== "seer") return fail("WRONG_ROLE", "Only the Seer can inspect a player.");
    if (action.targetPlayerId === playerId) return fail("INVALID_TARGET", "The Seer must inspect another player.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_bodyguard_protect") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Bodyguard acts at night.");
    if (player.role !== "bodyguard") return fail("WRONG_ROLE", "Only the Bodyguard can guard a player.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_vigilante_shoot") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Vigilante acts at night.");
    if (player.role !== "vigilante") return fail("WRONG_ROLE", "Only the Vigilante can shoot.");
    if (player.usedVigilanteShot) return fail("ABILITY_USED", "The Vigilante shot has already been used.");
    if (action.targetPlayerId === playerId) return fail("INVALID_TARGET", "You cannot shoot yourself.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_vigilante_skip") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Vigilante skips at night.");
    return player.role === "vigilante" ? ok : fail("WRONG_ROLE", "Only the Vigilante can skip shooting.");
  }

  if (action.type === "night_serial_killer_target") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Serial Killer acts at night.");
    if (player.role !== "serial_killer") return fail("WRONG_ROLE", "Only the Serial Killer can choose a victim.");
    if (action.targetPlayerId === playerId) return fail("INVALID_TARGET", "You cannot target yourself.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_witch_heal") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Witch acts at night.");
    if (player.role !== "witch") return fail("WRONG_ROLE", "Only the Witch can heal.");
    if (player.usedWitchHeal) return fail("ABILITY_USED", "The healing potion has already been used.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_witch_poison") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Witch acts at night.");
    if (player.role !== "witch") return fail("WRONG_ROLE", "Only the Witch can poison.");
    if (player.usedWitchPoison) return fail("ABILITY_USED", "The poison potion has already been used.");
    if (action.targetPlayerId === playerId) return fail("INVALID_TARGET", "You cannot poison yourself.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "night_witch_skip") {
    if (state.phase !== "night") return fail("WRONG_PHASE", "Witch skips at night.");
    return player.role === "witch" ? ok : fail("WRONG_ROLE", "Only the Witch can skip potions.");
  }

  if (action.type === "cast_vote") {
    if (state.phase !== "voting") return fail("WRONG_PHASE", "Voting is not active.");
    if (action.targetPlayerId === playerId) return fail("INVALID_TARGET", "You cannot vote for yourself.");
    return aliveTarget(state, action.targetPlayerId);
  }

  if (action.type === "pass_vote") {
    if (state.phase !== "voting") return fail("WRONG_PHASE", "Voting is not active.");
    return ok;
  }

  if (action.type === "clear_vote") {
    if (state.phase !== "voting") return fail("WRONG_PHASE", "Voting is not active.");
    return ok;
  }

  return fail("INVALID_ACTION", "Invalid Werewolf action.");
}
