import { z } from "zod";
import type { SnakesAndLaddersPieceId, SnakesAndLaddersState } from "./types";

export const PIECE_IDS = [
  "horse",
  "cart",
  "rocket",
  "racecar",
  "ship",
  "crown",
  "dragon",
  "turtle",
  "tophat",
  "cat",
  "shoe",
  "ufo",
  "gem",
  "lion",
  "fox"
] as const;

export const snakesAndLaddersSettingsSchema = z.object({
  boardPreset: z.enum(["classic", "jungle", "dunes", "chaos"]).default("classic"),
  turnSeconds: z.number().int().min(10).max(300).nullable().default(20),
  exactRollToWin: z.boolean().default(true),
  rollOneToEnter: z.boolean().default(true),
  playerPieces: z.record(z.string(), z.enum(PIECE_IDS)).default({})
}) as unknown as z.ZodType<import("./types").SnakesAndLaddersSettings>;

export const snakesAndLaddersActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("roll_dice")
  }),
  z.object({
    type: z.literal("select_piece"),
    piece: z.enum(PIECE_IDS)
  }),
  z.object({
    type: z.literal("end_turn")
  })
]);

export function getSnakesAndLaddersLegalActions(params: {
  state: SnakesAndLaddersState;
  playerId: string;
}) {
  const { state, playerId } = params;
  if (state.phase !== "playing" || state.currentPlayerId !== playerId) {
    return [];
  }
  return [{ type: "roll_dice" as const }];
}
