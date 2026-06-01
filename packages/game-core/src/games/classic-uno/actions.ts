import { z } from "zod";
import { UNO_COLORS } from "./types";

export const classicUnoSettingsSchema = z.object({
  cardsPerPlayer: z.number().int().min(5).max(12).default(7),
  turnSeconds: z.number().int().min(20).max(600).nullable().default(60),
  allowDrawingWhenPlayable: z.boolean().default(true),
  timeoutBehavior: z.enum(["draw_then_pass", "skip"]).default("draw_then_pass"),
  mustCallUno: z.boolean().default(true)
});

export const unoActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("play_card"),
    cardId: z.string().min(1),
    declaredColor: z.enum(UNO_COLORS).optional()
  }),
  z.object({
    type: z.literal("draw_card")
  }),
  z.object({
    type: z.literal("pass_turn")
  }),
  z.object({
    type: z.literal("call_uno")
  })
]);
