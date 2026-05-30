import type { AuthUser } from "@tabletop/shared";

type UserWithProfile = {
  id: string;
  username: string;
  email: string | null;
  role: "USER" | "ADMIN";
  profile: {
    displayName: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    coins: number;
  } | null;
};

export function serializeUser(user: UserWithProfile): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.profile?.displayName ?? user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
    xp: user.profile?.xp ?? 0,
    level: user.profile?.level ?? 1,
    coins: user.profile?.coins ?? 0
  };
}
