import type { AuthUser, RoomStateView } from "@tabletop/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.code ?? "REQUEST_FAILED", data?.message ?? "Request failed.", data?.details);
  }

  return data as T;
}

export const api = {
  login: (payload: { username: string; password: string }) =>
    request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: AuthUser }>("/auth/me"),
  createUser: (payload: {
    username: string;
    email?: string | null;
    displayName: string;
    password: string;
    role: "USER" | "ADMIN";
  }) =>
    request<{ user: AuthUser }>("/auth/users", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  games: () => request<{ games: Array<{ id: string; displayName: string; minPlayers: number; maxPlayers: number }> }>("/games"),
  createRoom: (payload: { gameId: string; settings?: Record<string, unknown> }) =>
    request<{ room: RoomStateView }>("/rooms", {
      method: "POST",
      body: JSON.stringify({ ...payload, settings: payload.settings ?? {} })
    }),
  joinRoom: (payload: { code: string }) =>
    request<{ room: RoomStateView }>("/rooms/join", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  myRoom: () => request<{ room: RoomStateView | null; rooms: RoomStateView[] }>("/rooms/me"),
  endRoom: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/end`, { method: "POST" }),
  addBot: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots`, { method: "POST" }),
  fillBots: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots/fill`, { method: "POST" }),
  removeBots: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots`, { method: "DELETE" }),
  profile: () => request<{ profile: unknown; stats: unknown[] }>("/profile/me"),
  xpLeaderboard: () => request<{ leaderboard: unknown[] }>("/leaderboards/xp"),
  gameWinsLeaderboard: (gameId: string) => request<{ leaderboard: unknown[] }>(`/leaderboards/${gameId}/wins`),
  activeRooms: () => request<{ rooms: unknown[] }>("/admin/rooms")
};