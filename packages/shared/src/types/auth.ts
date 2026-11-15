export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  coins: number;
  isGuest?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export interface SessionClaims {
  sub: string;
  username: string;
  role: UserRole;
  isGuest?: boolean;
}
