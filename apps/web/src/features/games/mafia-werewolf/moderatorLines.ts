import type { PublicWerewolfState } from "@tabletop/game-core";

export function getModeratorLine({
  state,
  lastKilledName,
  lastVotedOutName
}: {
  state: PublicWerewolfState;
  lastKilledName?: string | null;
  lastVotedOutName?: string | null;
}) {
  switch (state.phase) {
    case "role_reveal":
      return "The village gathers beneath a cold moon. Look at your role, and keep it secret.";
    case "night":
      if (state.myRole === "werewolf") return "Night falls. Werewolves, open your eyes. Choose your victim.";
      if (state.myRole === "doctor") return "Night falls. Doctor, choose someone to protect.";
      if (state.myRole === "seer") return "Night falls. Seer, choose someone to inspect.";
      if (state.myRole === "bodyguard") return "Night falls. Bodyguard, choose someone to guard.";
      if (state.myRole === "vigilante") return "Night falls. Vigilante, you may take one shot, or hold your fire.";
      if (state.myRole === "serial_killer") return "Night falls. Serial Killer, choose your victim.";
      if (state.myRole === "witch") return "Night falls. Witch, decide whether to use your potions.";
      return "Night falls. Close your eyes and wait for morning.";
    case "night_result": {
      const deaths = state.lastNightDeathPlayerIds.length;
      if (deaths > 1) return `Morning comes. ${deaths} players did not survive the night.`;
      return lastKilledName ? `Morning comes. ${lastKilledName} did not survive the night.` : "Morning comes. Somehow, everyone survived the night.";
    }
    case "day_discussion":
      return "The village awakens. Discuss who you suspect, but choose your words carefully.";
    case "voting":
      return "The time for talk is over. Vote for a suspect, or pass if the village has no certainty.";
    case "vote_result":
      if (lastVotedOutName) return `${lastVotedOutName} has been condemned by the village.`;
      if (state.lastVotePassed) return "The village steps back from the gallows. No one is eliminated.";
      return "The village could not agree. No one is eliminated.";
    case "finished": {
      const winningIds = new Set(state.results?.placements.filter((placement) => placement.result === "WIN").map((placement) => placement.userId) ?? []);
      const winners = state.players.filter((player) => winningIds.has(player.userId));

      if (winners.some((player) => player.role === "jester")) return "The Jester has won. The village was fooled, and madness takes the crown.";
      if (winners.some((player) => player.role === "serial_killer")) return "The Serial Killer stands alone. Everyone else was merely part of the story.";
      if (winners.some((player) => player.team === "werewolf")) return "The Werewolves have taken control. The village falls silent beneath the moon.";
      if (winners.some((player) => player.team === "village")) return "The Village has won. The shadows have been driven out, and the truth has survived.";

      return "The game is over. The truth has finally come to light.";
    }
    default:
      return "";
  }
}
