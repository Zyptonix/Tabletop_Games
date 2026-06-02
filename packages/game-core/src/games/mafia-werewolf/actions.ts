import { z } from "zod";
import { WEREWOLF_ROLE_IDS } from "./types";

export const werewolfSettingsSchema = z.object({
  revealRoleOnDeath: z.boolean().default(true),
  roleRevealSeconds: z.number().int().min(3).max(60).default(12),
  nightSeconds: z.number().int().min(8).max(300).default(45),
  nightResultSeconds: z.number().int().min(3).max(60).default(8),
  dayDiscussionSeconds: z.number().int().min(5).max(600).default(120),
  votingSeconds: z.number().int().min(5).max(300).default(45),
  voteResultSeconds: z.number().int().min(3).max(60).default(8),
  enabledOptionalRoles: z.array(z.enum(WEREWOLF_ROLE_IDS)).default([])
});

export const werewolfActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("night_werewolf_target"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_doctor_save"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_seer_check"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_bodyguard_protect"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_vigilante_shoot"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_vigilante_skip") }),
  z.object({ type: z.literal("night_serial_killer_target"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_witch_heal"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_witch_poison"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("night_witch_skip") }),
  z.object({ type: z.literal("cast_vote"), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal("pass_vote") }),
  z.object({ type: z.literal("clear_vote") }),
  z.object({ type: z.literal("advance_phase") })
]);
