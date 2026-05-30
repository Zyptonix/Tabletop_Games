"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, RoomStateView, ServerToClientEvents, TimerView } from "@tabletop/shared";
import { useAuthStore } from "@/lib/stores/authStore";

type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface RoomSocketState {
  socket: ArenaSocket | null;
  connected: boolean;
  room: RoomStateView | null;
  gameState: unknown | null;
  legalActions: unknown[];
  timer: TimerView | null;
  error: string | null;
  sendAction: (roomId: string, type: string, payload?: Record<string, unknown>) => void;
  sendReady: (roomId: string, ready: boolean) => void;
  startRoom: (roomId: string) => void;
  pauseRoom: (roomId: string) => void;
  resumeRoom: (roomId: string) => void;
  sendChat: (roomId: string, body: string) => void;
}

export function useRoomSocket(roomCode?: string): RoomSocketState {
  const setUser = useAuthStore((state) => state.setUser);
  const [socket, setSocket] = useState<ArenaSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [gameState, setGameState] = useState<unknown | null>(null);
  const [legalActions, setLegalActions] = useState<unknown[]>([]);
  const [timer, setTimer] = useState<TimerView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const nextSocket: ArenaSocket = io(socketUrl, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH ?? "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    setSocket(nextSocket);

    nextSocket.on("connect", () => {
      setConnected(true);
      setError(null);
      nextSocket.emit("auth:resume");
      if (roomCode) {
        nextSocket.emit("room:join", { code: roomCode });
      }
    });
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("connect_error", (connectError) => {
      setConnected(false);
      setError(connectError.message || "Could not connect to the realtime server.");
    });
    nextSocket.on("auth:ok", ({ user }) => setUser(user));
    nextSocket.on("room:state", (payload) => setRoom(payload));
    nextSocket.on("game:state", (payload) => {
      setGameState(payload.state);
      setLegalActions(payload.legalActions);
    });
    nextSocket.on("game:timer", setTimer);
    nextSocket.on("room:error", (payload) => setError(payload.message));
    nextSocket.on("game:error", (payload) => setError(payload.message));
    nextSocket.on("server:error", (payload) => setError(payload.message));

    return () => {
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
      timer,
      error,
      sendAction: (roomId: string, type: string, payload: Record<string, unknown> = {}) => {
        socket?.emit("game:action", {
          actionId: crypto.randomUUID(),
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
      sendChat: (roomId: string, body: string) => socket?.emit("chat:send", { roomId, body })
    }),
    [connected, error, gameState, legalActions, room, socket, timer]
  );
}
