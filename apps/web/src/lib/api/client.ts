import type { AuthUser, CreateFeedbackInput, FeedbackItem, JoinableRoomSummary, RoomStateView } from "@tabletop/shared";

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
  register: (payload: {
    username: string;
    email?: string | null;
    displayName: string;
    password: string;
  }) =>
    request<{ user: AuthUser }>("/auth/register", {
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
  adminUsers: () =>
    request<{
      users: Array<{
        id: string;
        username: string;
        email: string | null;
        role: "USER" | "ADMIN";
        displayName: string;
        createdAt: string;
        inActiveRoom: boolean;
      }>;
    }>("/admin/users"),

  adminSetPassword: (userId: string, password: string) =>
    request<{ ok: true }>(`/admin/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password })
    }),

  adminDeleteUser: (userId: string) =>
    request<{ ok: true }>(`/admin/users/${userId}`, {
      method: "DELETE"
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
  joinableRooms: () => request<{ rooms: JoinableRoomSummary[] }>("/rooms/joinable"),
  endRoom: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/end`, { method: "POST" }),
  addBot: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots`, { method: "POST" }),
  fillBots: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots/fill`, { method: "POST" }),
  removeBots: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/bots`, { method: "DELETE" }),
  profile: () => request<{ profile: unknown; stats: unknown[] }>("/profile/me"),
  updateProfile: (payload: { displayName?: string; avatarUrl?: string | null }) =>
    request<{ profile: unknown; user: AuthUser }>("/profile/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  xpLeaderboard: () => request<{ leaderboard: unknown[] }>("/leaderboards/xp"),
  gameWinsLeaderboard: (gameId: string) => request<{ leaderboard: unknown[] }>(`/leaderboards/${gameId}/wins`),
  leaderboardSummary: () =>
    request<{
      global: Array<{
        rank: number;
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        xp: number;
        level: number;
        coins: number;
        totalGamesPlayed: number;
        totalWins: number;
        losses: number;
        winRate: number;
      }>;
      games: Record<
        string,
        Array<{
          rank: number;
          userId: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
          level: number;
          xp: number;
          coins: number;
          totalGamesPlayed: number;
          totalWins: number;
          gameId: string;
          gamesPlayed: number;
          wins: number;
          losses: number;
          winRate: number;
          totalScore: number;
          bestScore: number;
          rating: number;
        }>
      >;
      stats: {
        totalMatches: number;
        totalPlayers: number;
        totalGamesPlayed: number;
      };
    }>("/leaderboards/summary"),
  activeRooms: () => request<{ rooms: unknown[] }>("/admin/rooms"),
  getFeedbacks: (params?: { gameId?: string; category?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.gameId && params.gameId !== "all") searchParams.set("gameId", params.gameId);
    if (params?.category && params.category !== "all") searchParams.set("category", params.category);
    if (params?.status && params.status !== "all") searchParams.set("status", params.status);
    const query = searchParams.toString();
    return request<{ feedbacks: FeedbackItem[] }>(`/feedback${query ? `?${query}` : ""}`);
  },
  createFeedback: (payload: CreateFeedbackInput) =>
    request<{ feedback: FeedbackItem }>("/feedback", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteFeedback: (id: string) =>
    request<{ ok: true; id: string }>(`/feedback/${id}`, {
      method: "DELETE"
    }),
  updateFeedbackStatus: (id: string, status: "open" | "in_progress" | "done") =>
    request<{ feedback: FeedbackItem }>(`/feedback/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};