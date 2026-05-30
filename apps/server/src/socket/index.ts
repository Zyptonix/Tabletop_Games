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
import { corsOrigins, env } from "../config/env";
import { RoomManager } from "../rooms/RoomManager";
import { RoomTimers } from "../rooms/RoomTimers";
import { AppError } from "../utils/AppError";
import type { RoomRuntime } from "../rooms/RoomTypes";
import type { SocketData } from "./events";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

function socketError(error: unknown) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }

  return {
    code: ERROR_CODES.INVALID_ACTION,
    message: error instanceof Error ? error.message : "Something went wrong."
  };
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
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });
  let timers: RoomTimers;

  io.use((socket, next) => {
    void authenticateSocket(socket, next).catch((error) => {
      console.error("Unhandled socket authentication error.", error);
      next(new Error("UNAUTHORIZED"));
    });
  });

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
    } else {
      timers.stop(room.id);
    }
  }

  timers = new RoomTimers(io as unknown as Server<ClientToServerEvents, ServerToClientEvents>, manager, emitRoom);

  function emitError(socket: AppSocket, channel: "room:error" | "game:error" | "server:error", error: unknown) {
    socket.emit(channel, socketError(error));
  }

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.emit("auth:ok", { user });

    const activeRoom = manager.attachSocket(user, socket.id);
    if (activeRoom) {
      socket.join(activeRoom.id);
      socket.to(activeRoom.id).emit("player:reconnected", { roomId: activeRoom.id, userId: user.id });
      emitRoom(activeRoom);
    }

    socket.on("auth:resume", () => {
      socket.emit("auth:ok", { user });
      const room = manager.attachSocket(user, socket.id);
      if (room) {
        socket.join(room.id);
        emitRoom(room);
      }
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
      if (!parsed.success || user.role !== "ADMIN") {
        emitError(socket, "server:error", new AppError(ERROR_CODES.ADMIN_ONLY, "Admin action rejected."));
        return;
      }

      try {
        emitRoom(await manager.endRoom(parsed.data.roomId, user.id, true));
      } catch (error) {
        emitError(socket, "server:error", error);
      }
    });

    socket.on("disconnect", () => {
      const changedRooms = manager.detachSocket(user.id, socket.id);
      for (const room of changedRooms) {
        socket.to(room.id).emit("player:disconnected", { roomId: room.id, userId: user.id });
        emitRoom(room);
      }
    });
  });

  return io;
}

