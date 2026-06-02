import { findPlayer } from "./rules";
import type { WerewolfAction, WerewolfState } from "./types";

export function getLegalWerewolfActions(params: { state: WerewolfState; playerId: string }): WerewolfAction[] {
  const { state, playerId } = params;
  const player = findPlayer(state, playerId);
  if (!player || state.phase === "finished") return [];

  const actions: WerewolfAction[] = [];

  if (playerId === state.moderatorPlayerId) {
    actions.push({ type: "advance_phase" });
  }

  if (!player.alive) return actions;

  const aliveTargets = state.players.filter((target) => target.alive && target.userId !== playerId);
  const aliveIncludingSelf = state.players.filter((target) => target.alive);

  if (state.phase === "night") {
    if (player.role === "werewolf") {
      for (const target of aliveTargets.filter((target) => target.team !== "werewolf")) {
        actions.push({ type: "night_werewolf_target", targetPlayerId: target.userId });
      }
    }

    if (player.role === "doctor") {
      for (const target of aliveIncludingSelf) actions.push({ type: "night_doctor_save", targetPlayerId: target.userId });
    }

    if (player.role === "seer") {
      for (const target of aliveTargets) actions.push({ type: "night_seer_check", targetPlayerId: target.userId });
    }

    if (player.role === "bodyguard") {
      for (const target of aliveIncludingSelf) actions.push({ type: "night_bodyguard_protect", targetPlayerId: target.userId });
    }

    if (player.role === "vigilante" && !player.usedVigilanteShot) {
      for (const target of aliveTargets) actions.push({ type: "night_vigilante_shoot", targetPlayerId: target.userId });
      actions.push({ type: "night_vigilante_skip" });
    }

    if (player.role === "serial_killer") {
      for (const target of aliveTargets) actions.push({ type: "night_serial_killer_target", targetPlayerId: target.userId });
    }

    if (player.role === "witch") {
      if (!player.usedWitchHeal) {
        for (const target of aliveIncludingSelf) actions.push({ type: "night_witch_heal", targetPlayerId: target.userId });
      }
      if (!player.usedWitchPoison) {
        for (const target of aliveTargets) actions.push({ type: "night_witch_poison", targetPlayerId: target.userId });
      }
      actions.push({ type: "night_witch_skip" });
    }
  }

  if (state.phase === "voting") {
    for (const target of aliveTargets) actions.push({ type: "cast_vote", targetPlayerId: target.userId });
    actions.push({ type: "pass_vote" });
    if (state.votesByVoterId[playerId]) actions.push({ type: "clear_vote" });
  }

  return actions;
}
