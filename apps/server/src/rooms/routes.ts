import { Router } from "express";
import { createRoomSchema, ERROR_CODES, joinRoomSchema, roomCodeSchema, roomIdSchema } from "@tabletop/shared";
import { authMiddleware } from "../middleware/authMiddleware";
import { RoomManager } from "./RoomManager";
import { sendError } from "../utils/http";
import { AppError } from "../utils/AppError";

function routeError(response: Parameters<typeof sendError>[0], error: unknown) {
  if (error instanceof AppError) {
    sendError(response, 400, error.code, error.message, error.details);
    return;
  }
  sendError(response, 500, ERROR_CODES.INVALID_ACTION, error instanceof Error ? error.message : "Unknown error.");
}

export function createRoomsRouter(manager: RoomManager) {
  const router = Router();

  router.use(authMiddleware);

  router.get("/games", (_request, response) => {
    response.json({ games: manager.listGames() });
  });


  router.get("/rooms/joinable", (_request, response) => {
    response.json({ rooms: manager.listJoinableRooms() });
  });
  router.get("/rooms/me", (request, response) => {
    const rooms = request.user ? manager.listRoomsForUser(request.user.id).map((room) => manager.getRoomStateView(room)) : [];
    response.json({ room: rooms[0] ?? null, rooms });
  });

  router.get("/rooms/code/:code", (request, response) => {
    const parsed = roomCodeSchema.safeParse(request.params.code);
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room code.");
      return;
    }

    const room = manager.getRoomByCode(parsed.data);
    if (!room) {
      sendError(response, 404, ERROR_CODES.ROOM_NOT_FOUND, "Room not found.");
      return;
    }

    response.json({ room: manager.getRoomStateView(room) });
  });

  router.post("/rooms", async (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = createRoomSchema.safeParse(request.body);
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room payload.", parsed.error.flatten());
      return;
    }

    try {
      const room = await manager.createRoom({
        host: request.user,
        gameId: parsed.data.gameId,
        settings: parsed.data.settings
      });
      response.status(201).json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/rooms/join", async (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = joinRoomSchema.safeParse(request.body);
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid join payload.", parsed.error.flatten());
      return;
    }

    try {
      const room = await manager.joinRoom({
        user: request.user,
        code: parsed.data.code
      });
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/rooms/:roomId/end", async (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = roomIdSchema.safeParse({ roomId: request.params.roomId });
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = await manager.endRoom(parsed.data.roomId, request.user.id, request.user.role === "ADMIN");
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/rooms/:roomId/bots", (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = roomIdSchema.safeParse({ roomId: request.params.roomId });
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = manager.addBot(parsed.data.roomId, request.user.id);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/rooms/:roomId/bots/fill", (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = roomIdSchema.safeParse({ roomId: request.params.roomId });
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = manager.fillBots(parsed.data.roomId, request.user.id);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.delete("/rooms/:roomId/bots", (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }
    const parsed = roomIdSchema.safeParse({ roomId: request.params.roomId });
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = manager.removeBots(parsed.data.roomId, request.user.id);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  return router;
}