import { z } from "zod";

export const chatSendSchema = z.object({
  roomId: z.string().min(1),
  body: z.string().trim().min(1).max(500)
});

export type ChatSendInput = z.infer<typeof chatSendSchema>;
