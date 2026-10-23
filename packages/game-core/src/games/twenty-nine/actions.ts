import { z } from "zod";
import { TWENTY_NINE_MAX_BID, TWENTY_NINE_MIN_BID } from "./constants";
import { TWENTY_NINE_SUITS } from "./types";

export const twentyNineSettingsSchema = z.object({
  turnSeconds: z.number().int().min(20).max(300).nullable().default(45),
  allowSeventhCard: z.boolean().default(true),
  allowDoubleRedouble: z.boolean().default(true),
  allowSingleHand: z.boolean().default(true)
});

export const twentyNineActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bid"), value: z.number().int().min(TWENTY_NINE_MIN_BID).max(TWENTY_NINE_MAX_BID) }),
  z.object({ type: z.literal("ditto") }),
  z.object({ type: z.literal("pass_bid") }),
  z.object({ type: z.literal("choose_trump_suit"), suit: z.enum(TWENTY_NINE_SUITS) }),
  z.object({ type: z.literal("choose_seventh_trump") }),
  z.object({ type: z.literal("pass_double") }),
  z.object({ type: z.literal("double") }),
  z.object({ type: z.literal("redouble") }),
  z.object({ type: z.literal("continue_contract") }),
  z.object({ type: z.literal("reveal_trump") }),
  z.object({ type: z.literal("declare_pair") }),
  z.object({ type: z.literal("declare_single_hand") }),
  z.object({ type: z.literal("play_card"), cardId: z.string().min(1) })
]);
