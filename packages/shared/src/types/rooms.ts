import type { GameId } from "../constants/gameIds";
import type { RoomStatus } from "../constants/rooms";

export interface RoomPlayerView {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  seat: number;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  temporaryHost: boolean;
  isBot?: boolean;
  score?: number;
}

export interface ChatMessageView {
  id: string;
  roomId: string;
  userId: string | null;
  displayName: string;
  type: "user" | "system";
  body: string;
  createdAt: string;
}

export interface RoomStateView {
  id: string;
  code: string;
  gameId: GameId;
  status: RoomStatus;
  hostUserId: string;
  effectiveHostUserId: string | null;
  settings: Record<string, unknown>;
  players: RoomPlayerView[];
  chat: ChatMessageView[];
  createdAt: string;
  actionNumber: number;
}

export interface ActiveRoomSummary {
  id: string;
  code: string;
  gameId: GameId;
  status: RoomStatus;
  playerCount: number;
  connectedCount: number;
  hostUserId: string;
  actionNumber: number;
  createdAt: string;
}

export interface JoinableRoomSummary {
  id: string;
  code: string;
  gameId: GameId;
  gameName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hostDisplayName?: string | undefined;
  createdAt: string;
}