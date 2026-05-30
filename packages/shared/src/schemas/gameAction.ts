import { z } from "zod";

export const gameActionEnvelopeSchema = z.object({
  actionId: z.string().min(8).max(120),
  roomId: z.string().min(1),
  type: z.string().min(1).max(80),
  payload: z.unknown().default({}),
  clientCreatedAt: z.string().datetime().optional()
});

export type GameActionEnvelope = z.infer<typeof gameActionEnvelopeSchema>;
