import { Router } from "express";
import { ERROR_CODES, roomIdSchema } from "@tabletop/shared";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware";
import { RoomManager } from "../rooms/RoomManager";
import { sendError } from "../utils/http";
import { AppError } from "../utils/AppError";

function routeError(response: Parameters<typeof sendError>[0], error: unknown) {
  if (error instanceof AppError) {
    sendError(response, 400, error.code, error.message, error.details);
    return;
  }
  sendError(response, 500, ERROR_CODES.INVALID_ACTION, error instanceof Error ? error.message : "Unknown error.");
}

export function createAdminRouter(manager: RoomManager) {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);

  router.get("/admin/rooms", (_request, response) => {
    response.json({ rooms: manager.listActiveRooms() });
  });

  router.post("/admin/rooms/:roomId/pause", (request, response) => {
    const parsed = roomIdSchema.safeParse(request.params);
    if (!parsed.success || !request.user) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = manager.pauseRoom(parsed.data.roomId, request.user.id, true);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/admin/rooms/:roomId/resume", (request, response) => {
    const parsed = roomIdSchema.safeParse(request.params);
    if (!parsed.success || !request.user) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = manager.resumeRoom(parsed.data.roomId, request.user.id, true);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/admin/rooms/:roomId/snapshot", async (request, response) => {
    const parsed = roomIdSchema.safeParse(request.params);
    if (!parsed.success || !request.user) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      await manager.forceSnapshot(parsed.data.roomId, request.user.id, true);
      response.json({ ok: true });
    } catch (error) {
      routeError(response, error);
    }
  });

  router.post("/admin/rooms/:roomId/end", async (request, response) => {
    const parsed = roomIdSchema.safeParse(request.params);
    if (!parsed.success || !request.user) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid room id.");
      return;
    }

    try {
      const room = await manager.endRoom(parsed.data.roomId, request.user.id, true);
      response.json({ room: manager.getRoomStateView(room) });
    } catch (error) {
      routeError(response, error);
    }
  });

  return router;
}
