import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { prisma } from "@tabletop/db";
import {
  chatSendSchema,
  createRoomSchema,
  ERROR_CODES,
  gameActionEnvelopeSchema,
  joinRoomSchema,
  kickPlayerSchema,
  readySchema,
  roomIdSchema,
  transferHostSchema,
  type ClientToServerEvents,
  type ServerToClientEvents
} from "@tabletop/shared";
import { readSessionFromCookie } from "../auth/session";
import { serializeUser } from "../auth/serializeUser";
import { corsOriginDelegate, env } from "../config/env";
import { RoomManager } from "../rooms/RoomManager";
import { RoomTimers } from "../rooms/RoomTimers";
import { AppError } from "../utils/AppError";
import type { RoomRuntime } from "../rooms/RoomTypes";
import type { SocketData } from "./events";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type BotTimer = { userId: string; timeout: ReturnType<typeof setTimeout> };

function socketError(error: unknown) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }

  return {
    code: ERROR_CODES.INVALID_ACTION,
    message: error instanceof Error ? error.message : "Something went wrong."
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chooseBotAction(legalActions: unknown[]): { type: string; payload: Record<string, unknown> } | null {
  const actions = legalActions.filter(isRecord);
  const preferred =
    actions.find((action) => action.type === "play_card") ??
    actions.find((action) => action.type === "resolve_roulette") ??
    actions.find((action) => action.type === "draw_card") ??
    actions.find((action) => action.type === "pass_turn") ??
    actions.find((action) => action.type === "call_uno");

  if (!preferred || typeof preferred.type !== "string") {
    return null;
  }

  const { type, ...payload } = preferred;
  return { type, payload };
}

async function authenticateSocket(socket: AppSocket, next: (error?: Error) => void) {
  try {
    const claims = readSessionFromCookie(socket.request.headers.cookie);
    if (!claims) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      include: { profile: true }
    });

    if (!user) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data.user = serializeUser(user);
    next();
  } catch (error) {
    console.error("Socket authentication failed.", error);
    next(new Error("UNAUTHORIZED"));
  }
}

export function createSocketServer(httpServer: HttpServer, manager: RoomManager): IOServer {
  const io: IOServer = new Server(httpServer, {
    path: env.SOCKET_PATH,
    pingInterval: 25_000,
    pingTimeout: 60_000,
    connectTimeout: 45_000,
    cors: {
      origin: corsOriginDelegate,
      credentials: true
    }
  });
  let timers: RoomTimers;
  const botTimers = new Map<string, BotTimer>();

  io.use((socket, next) => {
    void authenticateSocket(socket, next).catch((error) => {
      console.error("Unhandled socket authentication error.", error);
      next(new Error("UNAUTHORIZED"));
    });
  });

  function clearBotTurn(roomId: string): void {
    const active = botTimers.get(roomId);
    if (active) {
      clearTimeout(active.timeout);
      botTimers.delete(roomId);
    }
  }

  function scheduleBotTurn(room: RoomRuntime): void {
    const currentPlayerId = manager.getCurrentTurnPlayerId(room);
    if (room.status !== "in_game" || !currentPlayerId || !manager.isBotPlayer(room, currentPlayerId)) {
      clearBotTurn(room.id);
      return;
    }

    const active = botTimers.get(room.id);
    if (active?.userId === currentPlayerId) {
      return;
    }
    clearBotTurn(room.id);

    const timeout = setTimeout(() => {
      botTimers.delete(room.id);
      void (async () => {
        const latestRoom = manager.getRoom(room.id);
        if (!latestRoom || latestRoom.status !== "in_game" || manager.getCurrentTurnPlayerId(latestRoom) !== currentPlayerId) {
          return;
        }

        const botAction = chooseBotAction(manager.getLegalActionsFor(latestRoom, currentPlayerId));
        if (!botAction) {
          return;
        }

        try {
          const result = await manager.handleGameAction({
            userId: currentPlayerId,
            envelope: {
              actionId: `bot:${currentPlayerId}:${latestRoom.actionNumber + 1}:${Date.now()}`,
              roomId: latestRoom.id,
              type: botAction.type,
              payload: botAction.payload,
              clientCreatedAt: new Date().toISOString()
            }
          });
          emitRoom(result.room, result.events);
        } catch (error) {
          console.warn(`[bot] failed room=${latestRoom.code} user=${currentPlayerId}: ${socketError(error).message}`);
        }
      })();
    }, 700 + Math.floor(Math.random() * 800));

    botTimers.set(room.id, { userId: currentPlayerId, timeout });
  }

  function emitRoom(room: RoomRuntime, events: unknown[] = []): void {
    io.to(room.id).emit("room:state", manager.getRoomStateView(room));

    for (const player of room.players) {
      const gamePayload = manager.getPrivateGamePayload(room, player.userId);
      if (gamePayload) {
        for (const socketId of player.socketIds) {
          io.to(socketId).emit("game:state", {
            roomId: room.id,
            ...gamePayload
          });
        }
      }
    }

    for (const event of events) {
      const targetUserIds =
        typeof event === "object" && event !== null && "targetUserIds" in event
          ? ((event as { targetUserIds?: string[] }).targetUserIds ?? null)
          : null;

      if (!targetUserIds || targetUserIds.length === 0) {
        io.to(room.id).emit("game:event", { roomId: room.id, event });
        continue;
      }

      for (const userId of targetUserIds) {
        const player = room.players.find((item) => item.userId === userId);
        for (const socketId of player?.socketIds ?? []) {
          io.to(socketId).emit("game:event", { roomId: room.id, event });
        }
      }
    }

    if (room.status === "in_game") {
      timers.start(room.id);
      scheduleBotTurn(room);
    } else {
      timers.stop(room.id);
      clearBotTurn(room.id);
    }
  }

  timers = new RoomTimers(io as unknown as Server<ClientToServerEvents, ServerToClientEvents>, manager, emitRoom);

  function emitError(socket: AppSocket, channel: "room:error" | "game:error" | "server:error", error: unknown) {
    socket.emit(channel, socketError(error));
  }

  function emitRoomControlResult(room: RoomRuntime): void {
    emitRoom(room);
  }

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.emit("auth:ok", { user });

    socket.on("auth:resume", () => {
      socket.emit("auth:ok", { user });
    });

    socket.on("room:create", async (payload) => {
      const parsed = createRoomSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid room payload.", parsed.error.flatten()));
        return;
      }

      try {
        const room = await manager.createRoom({
          host: user,
          gameId: parsed.data.gameId,
          settings: parsed.data.settings,
          socketId: socket.id
        });
        socket.join(room.id);
        emitRoom(room);
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:join", async (payload) => {
      const parsed = joinRoomSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid join payload.", parsed.error.flatten()));
        return;
      }

      try {
        const room = await manager.joinRoom({
          user,
          code: parsed.data.code,
          socketId: socket.id
        });
        socket.join(room.id);
        socket.to(room.id).emit("player:joined", { roomId: room.id, userId: user.id });
        emitRoom(room);
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:leave", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid room payload.", parsed.error.flatten()));
        return;
      }
      socket.leave(parsed.data.roomId);
    });

    socket.on("room:ready", (payload) => {
      const parsed = readySchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid ready payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(manager.setReady(parsed.data.roomId, user.id, parsed.data.ready));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:start", async (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid start payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(await manager.startRoom(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:pause", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid pause payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(manager.pauseRoom(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:resume", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid resume payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(manager.resumeRoom(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:kick", (payload) => {
      const parsed = kickPlayerSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid kick payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(manager.kickPlayer(parsed.data.roomId, user.id, parsed.data.userId));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:transfer-host", (payload) => {
      const parsed = transferHostSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid transfer payload.", parsed.error.flatten()));
        return;
      }

      try {
        emitRoom(manager.transferHost(parsed.data.roomId, user.id, parsed.data.userId));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:add-bot", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid bot payload.", parsed.error.flatten()));
        return;
      }
      try {
        emitRoomControlResult(manager.addBot(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:fill-bots", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid bot payload.", parsed.error.flatten()));
        return;
      }
      try {
        emitRoomControlResult(manager.fillBots(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("room:remove-bots", (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid bot payload.", parsed.error.flatten()));
        return;
      }
      try {
        emitRoomControlResult(manager.removeBots(parsed.data.roomId, user.id));
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("game:action", async (payload) => {
      const parsed = gameActionEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "game:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid game action.", parsed.error.flatten()));
        return;
      }

      try {
        const result = await manager.handleGameAction({
          userId: user.id,
          envelope: parsed.data
        });
        emitRoom(result.room, result.events);
      } catch (error) {
        emitError(socket, "game:error", error);
      }
    });

    socket.on("chat:send", (payload) => {
      const parsed = chatSendSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "room:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid chat payload.", parsed.error.flatten()));
        return;
      }

      try {
        const message = manager.addChatMessage(parsed.data.roomId, user, parsed.data.body);
        io.to(parsed.data.roomId).emit("chat:message", message);
        const room = manager.getRoom(parsed.data.roomId);
        if (room) {
          emitRoom(room);
        }
      } catch (error) {
        emitError(socket, "room:error", error);
      }
    });

    socket.on("admin:force-snapshot", async (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success || user.role !== "ADMIN") {
        emitError(socket, "server:error", new AppError(ERROR_CODES.ADMIN_ONLY, "Admin action rejected."));
        return;
      }

      try {
        await manager.forceSnapshot(parsed.data.roomId, user.id, true);
        socket.emit("system:message", { roomId: parsed.data.roomId, message: "Snapshot saved." });
      } catch (error) {
        emitError(socket, "server:error", error);
      }
    });

    socket.on("admin:end-room", async (payload) => {
      const parsed = roomIdSchema.safeParse(payload);
      if (!parsed.success) {
        emitError(socket, "server:error", new AppError(ERROR_CODES.INVALID_PAYLOAD, "Invalid end-room payload."));
        return;
      }

      try {
        emitRoom(await manager.endRoom(parsed.data.roomId, user.id, user.role === "ADMIN"));
      } catch (error) {
        emitError(socket, "server:error", error);
      }
    });

    socket.on("disconnect", (reason) => {
      if (env.NODE_ENV === "development") {
        console.info(`[socket] disconnected user=${user.id} reason=${reason}`);
      }
      const changedRooms = manager.detachSocket(user.id, socket.id);
      for (const room of changedRooms) {
        socket.to(room.id).emit("player:disconnected", { roomId: room.id, userId: user.id });
        emitRoom(room);
      }
    });
  });

  return io;
}