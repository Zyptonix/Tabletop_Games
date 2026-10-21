"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { GameEvent } from "@tabletop/game-core";
import type { ClientToServerEvents, RoomStateView, ServerToClientEvents, TimerView } from "@tabletop/shared";
import { useAuthStore } from "@/lib/stores/authStore";

type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const REACTION_PREFIX = "__reaction:";

/**
 * crypto.randomUUID() is restricted to secure contexts in browsers.
 * Local LAN URLs served over plain HTTP are not secure contexts, so fall back
 * to getRandomValues(), which is available in insecure contexts.
 */
function createActionId(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    // Set UUID v4 version and variant bits.
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Action IDs are deduplication identifiers, not authentication secrets.
  return `action-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export interface RoomSocketState {
  socket: ArenaSocket | null;
  connected: boolean;
  room: RoomStateView | null;
  gameState: unknown | null;
  legalActions: unknown[];
  gameEvents: GameEvent[];
  timer: TimerView | null;
  error: string | null;
  sendAction: (roomId: string, type: string, payload?: Record<string, unknown>) => void;
  sendReady: (roomId: string, ready: boolean) => void;
  startRoom: (roomId: string) => void;
  pauseRoom: (roomId: string) => void;
  resumeRoom: (roomId: string) => void;
  endRoom: (roomId: string) => void;
  addBot: (roomId: string) => void;
  fillBots: (roomId: string) => void;
  removeBots: (roomId: string) => void;
  sendChat: (roomId: string, body: string) => void;
  sendDebugScenario: (roomId: string, scenario: string, targetPlayerId?: string) => void;
}

function isGameEvent(value: unknown): value is GameEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as { id?: unknown; type?: unknown; createdAt?: unknown };
  return typeof event.id === "string" && typeof event.type === "string" && typeof event.createdAt === "string";
}

export function useRoomSocket(roomCode?: string): RoomSocketState {
  const setUser = useAuthStore((state) => state.setUser);
  const lastReactionAtRef = useRef(0);
  const roomCodeRef = useRef<string | null>(roomCode?.toUpperCase() ?? null);
  const joinedRoomCodeRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<ArenaSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [gameState, setGameState] = useState<unknown | null>(null);
  const [legalActions, setLegalActions] = useState<unknown[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [timer, setTimer] = useState<TimerView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    roomCodeRef.current = roomCode?.toUpperCase() ?? null;
    joinedRoomCodeRef.current = null;
    setRoom(null);
    setGameState(null);
    setLegalActions([]);
    setGameEvents([]);
  }, [roomCode]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const nextSocket: ArenaSocket = io(socketUrl, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH ?? "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      timeout: 20_000
    });

    setSocket(nextSocket);

    const joinIfNeeded = () => {
      const currentRoomCode = roomCodeRef.current;
      if (!currentRoomCode || joinedRoomCodeRef.current === currentRoomCode) {
        return;
      }

      joinedRoomCodeRef.current = currentRoomCode;
      nextSocket.emit("room:join", { code: currentRoomCode });
    };

    nextSocket.on("connect", () => {
      setConnected(true);
      setError(null);
      nextSocket.emit("auth:resume");
      joinIfNeeded();
    });
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("connect_error", (connectError) => {
      setConnected(false);
      setError(connectError.message || "Could not connect to the realtime server.");
    });
    nextSocket.on("auth:ok", ({ user }) => {
      setUser(user);
      if (roomCodeRef.current) {
        joinIfNeeded();
      }
    });
    nextSocket.on("room:state", (payload) => {
      setRoom(payload);
      const normalizedCode = payload.code?.toUpperCase();
      if (normalizedCode && roomCodeRef.current && normalizedCode === roomCodeRef.current) {
        joinedRoomCodeRef.current = normalizedCode;
      }
    });
    
    nextSocket.on("game:state", (payload) => {
      setGameState(payload.state);
      setLegalActions(payload.legalActions);
    });
    nextSocket.on("game:event", (payload) => {
      const event = payload.event;
      if (!isGameEvent(event)) {
        return;
      }
      setGameEvents((current) => [...current, event].slice(-50));
    });
    nextSocket.on("game:timer", setTimer);
    nextSocket.on("room:error", (payload) => setError(payload.message));
    nextSocket.on("game:error", (payload) => setError(payload.message));
    nextSocket.on("server:error", (payload) => setError(payload.message));

    return () => {
      joinedRoomCodeRef.current = null;
      nextSocket.disconnect();
    };
  }, [roomCode, setUser]);

  return useMemo(
    () => ({
      socket,
      connected,
      room,
      gameState,
      legalActions,
      gameEvents,
      timer,
      error,
      sendAction: (roomId: string, type: string, payload: Record<string, unknown> = {}) => {
        socket?.emit("game:action", {
          actionId: createActionId(),
          roomId,
          type,
          payload,
          clientCreatedAt: new Date().toISOString()
        });
      },
      sendReady: (roomId: string, ready: boolean) => socket?.emit("room:ready", { roomId, ready }),
      startRoom: (roomId: string) => socket?.emit("room:start", { roomId }),
      pauseRoom: (roomId: string) => socket?.emit("room:pause", { roomId }),
      resumeRoom: (roomId: string) => socket?.emit("room:resume", { roomId }),
      endRoom: (roomId: string) => socket?.emit("admin:end-room", { roomId }),
      addBot: (roomId: string) => socket?.emit("room:add-bot", { roomId }),
      fillBots: (roomId: string) => socket?.emit("room:fill-bots", { roomId }),
      removeBots: (roomId: string) => socket?.emit("room:remove-bots", { roomId }),
      sendDebugScenario: (roomId: string, scenario: string, targetPlayerId?: string) => {
        socket?.emit("debug:uno-scenario", { roomId, scenario, targetPlayerId });
      },
      sendChat: (roomId: string, body: string) => {
        if (body.startsWith(REACTION_PREFIX)) {
          const now = Date.now();
          if (now - lastReactionAtRef.current < 750) {
            return;
          }
          lastReactionAtRef.current = now;
        }
        socket?.emit("chat:send", { roomId, body });
      }
    }),
    [connected, error, gameEvents, gameState, legalActions, room, socket, timer]
  );
}