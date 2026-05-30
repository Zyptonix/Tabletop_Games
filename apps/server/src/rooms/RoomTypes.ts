import type { GameId, RoomStateView, RoomStatus } from "@tabletop/shared";
import type { ActionQueue } from "@tabletop/game-core";

export interface RoomPlayerRuntime {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  seat: number;
  ready: boolean;
  connected: boolean;
  temporaryHost: boolean;
  socketIds: Set<string>;
}

export interface RoomChatMessage {
  id: string;
  roomId: string;
  userId: string | null;
  displayName: string;
  type: "user" | "system";
  body: string;
  createdAt: string;
}

export interface RoomRuntime {
  id: string;
  code: string;
  gameId: GameId;
  status: RoomStatus;
  hostUserId: string;
  settings: Record<string, unknown>;
  players: RoomPlayerRuntime[];
  chat: RoomChatMessage[];
  gameState: unknown | null;
  matchId: string | null;
  matchStartedAt: string | null;
  actionNumber: number;
  createdAt: string;
  processedActionIds: Map<string, Set<string>>;
  queue: ActionQueue;
}

export interface SerializableRoomState {
  id: string;
  code: string;
  gameId: GameId;
  status: RoomStatus;
  hostUserId: string;
  settings: Record<string, unknown>;
  players: Array<Omit<RoomPlayerRuntime, "socketIds">>;
  chat: RoomChatMessage[];
  matchId: string | null;
  matchStartedAt: string | null;
  actionNumber: number;
  createdAt: string;
}

export interface RoomBroadcasts {
  roomState: RoomStateView;
  gameStateByUserId: Map<string, { state: unknown; legalActions: unknown[] }>;
}
