import type { AuthUser, CreateFeedbackInput, FeedbackItem, JoinableRoomSummary, RoomStateView } from "@tabletop/shared";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const TOKEN_KEY = "tabletop_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

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
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined)
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.code ?? "REQUEST_FAILED", data?.message ?? "Request failed.", data?.details);
  }

  return data as T;
}

export const api = {
  login: async (payload: { username: string; password: string }) => {
    const result = await request<{ user: AuthUser; token?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (result.token) {
      setStoredToken(result.token);
    }
    return result;
  },
  guestLogin: async (payload: { displayName: string }) => {
    const result = await request<{ user: AuthUser; token?: string }>("/auth/guest", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (result.token) {
      setStoredToken(result.token);
    }
    return result;
  },
  register: async (payload: {
    username: string;
    email?: string | null;
    displayName: string;
    password: string;
  }) => {
    const result = await request<{ user: AuthUser; token?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (result.token) {
      setStoredToken(result.token);
    }
    return result;
  },
  logout: async () => {
    try {
      await request<{ ok: true }>("/auth/logout", { method: "POST" });
    } finally {
      setStoredToken(null);
    }
    return { ok: true as const };
  },
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
        isGuest?: boolean;
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

  adminUpdateUserRole: (userId: string, role: "USER" | "ADMIN") =>
    request<{ ok: true; role: string }>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    }),

  adminPruneGuests: () =>
    request<{ ok: true; prunedCount: number }>("/admin/users/prune-guests", {
      method: "POST"
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
  pauseRoom: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/pause`, { method: "POST" }),
  resumeRoom: (roomId: string) => request<{ room: RoomStateView }>(`/rooms/${roomId}/resume`, { method: "POST" }),
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
