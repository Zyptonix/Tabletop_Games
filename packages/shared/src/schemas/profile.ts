import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  avatarUrl: z
    .union([z.string().trim().url().max(500), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value))
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;