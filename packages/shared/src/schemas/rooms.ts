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
