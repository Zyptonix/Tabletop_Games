import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens.");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200)
});

export const guestLoginSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Please enter a display name.")
    .max(30, "Display name cannot exceed 30 characters.")
});

export const createUserSchema = z.object({
  username: usernameSchema,
  email: z.string().email().optional().nullable(),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(200),
  role: z.enum(["USER", "ADMIN"]).default("USER")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type GuestLoginInput = z.infer<typeof guestLoginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
