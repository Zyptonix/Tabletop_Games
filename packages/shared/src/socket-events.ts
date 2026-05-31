import type { AppErrorPayload } from "./errors/codes";
import type { AuthUser } from "./types/auth";
import type { ChatMessageView, RoomStateView } from "./types/rooms";

export interface TimerView {
  roomId: string;
  running: boolean;
  currentPlayerId: string | null;
  remainingMs: number | null;
  deadlineAt: string | null;
}

export interface ServerToClientEvents {
  "auth:ok": (payload: { user: AuthUser }) => void;
  "auth:error": (payload: AppErrorPayload) => void;
  "room:state": (payload: RoomStateView) => void;
  "room:error": (payload: AppErrorPayload) => void;
  "player:joined": (payload: { roomId: string; userId: string }) => void;
  "player:left": (payload: { roomId: string; userId: string }) => void;
  "player:disconnected": (payload: { roomId: string; userId: string }) => void;
  "player:reconnected": (payload: { roomId: string; userId: string }) => void;
  "game:state": (payload: { roomId: string; state: unknown; legalActions: unknown[] }) => void;
  "game:event": (payload: { roomId: string; event: unknown }) => void;
  "game:error": (payload: AppErrorPayload) => void;
  "game:timer": (payload: TimerView) => void;
  "chat:message": (payload: ChatMessageView) => void;
  "system:message": (payload: { roomId?: string; message: string }) => void;
  "server:error": (payload: AppErrorPayload) => void;
}

export interface ClientToServerEvents {
  "auth:resume": () => void;
  "room:create": (payload: unknown) => void;
  "room:join": (payload: unknown) => void;
  "room:leave": (payload: unknown) => void;
  "room:ready": (payload: unknown) => void;
  "room:start": (payload: unknown) => void;
  "room:pause": (payload: unknown) => void;
  "room:resume": (payload: unknown) => void;
  "room:kick": (payload: unknown) => void;
  "room:transfer-host": (payload: unknown) => void;
  "room:add-bot": (payload: unknown) => void;
  "room:fill-bots": (payload: unknown) => void;
  "room:remove-bots": (payload: unknown) => void;
  "game:action": (payload: unknown) => void;
  "chat:send": (payload: unknown) => void;
  "admin:force-snapshot": (payload: unknown) => void;
  "admin:end-room": (payload: unknown) => void;
}
