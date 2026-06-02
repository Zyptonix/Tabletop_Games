import { z } from "zod";
import { NO_MERCY_COLORS } from "./types";

export const noMercySettingsSchema = z.object({
  cardsPerPlayer: z.number().int().min(5).max(20).default(7),
  turnSeconds: z.number().int().min(20).max(600).nullable().default(60),
  eliminationHandSize: z.number().int().min(15).max(60).default(25),
  allowDrawingWhenPlayable: z.boolean().default(true),
  mustCallUno: z.boolean().default(false)
});

export const noMercyActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("play_card"),
    cardId: z.string().min(1),
    declaredColor: z.enum(NO_MERCY_COLORS).optional(),
    targetPlayerId: z.string().min(1).optional()
  }),
  z.object({ type: z.literal("draw_card") }),
  z.object({
    type: z.literal("resolve_roulette"),
    chosenColor: z.enum(NO_MERCY_COLORS)
  })
]);
