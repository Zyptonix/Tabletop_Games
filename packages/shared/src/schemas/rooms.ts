import { z } from "zod";
import { GAME_IDS } from "../constants/gameIds";

export const roomCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(12)
  .transform((code) => code.toUpperCase());

export const createRoomSchema = z.object({
  gameId: z.enum(GAME_IDS),
  settings: z.record(z.unknown()).default({})
});

export const joinRoomSchema = z.object({
  code: roomCodeSchema
});

export const readySchema = z.object({
  roomId: z.string().min(1),
  ready: z.boolean()
});

export const roomIdSchema = z.object({
  roomId: z.string().min(1)
});

export const kickPlayerSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1)
});

export const transferHostSchema = kickPlayerSchema;

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

export const UNO_DEBUG_SCENARIOS = [
  "give_me_playable",
  "give_me_no_playable",
  "force_draw_until_playable",
  "classic_plus2_stack",
  "classic_plus4_stack",
  "no_mercy_plus10_stack",
  "no_mercy_plus20_stack",
  "roulette_against_me",
  "zero_pass",
  "seven_swap",
  "reverse",
  "skip_everyone",
  "low_draw_pile_refill",
  "mercy_elimination",
  "reset_match"
] as const;

export const debugUnoScenarioSchema = z.object({
  roomId: z.string().min(1),
  scenario: z.enum(UNO_DEBUG_SCENARIOS),
  targetPlayerId: z.string().min(1).optional()
});

export type UnoDebugScenario = (typeof UNO_DEBUG_SCENARIOS)[number];
export type DebugUnoScenarioInput = z.infer<typeof debugUnoScenarioSchema>;