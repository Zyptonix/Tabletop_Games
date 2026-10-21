import { Router } from "express";
import { ERROR_CODES, roomIdSchema } from "@tabletop/shared";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware";
import { RoomManager } from "../rooms/RoomManager";
import { sendError } from "../utils/http";
import { AppError } from "../utils/AppError";
import { prisma } from "@tabletop/db";
import { hashPassword } from "../auth/password";


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
  // List registered profiles and indicate who is in an active game room.
  router.get("/admin/users", async (_request, response) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { profile: true }
    });

    response.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName ?? user.username,
        createdAt: user.createdAt,
        inActiveRoom: manager.listRoomsForUser(user.id).length > 0
      }))
    });
  });

  // Admin can set a new password for any account.
  router.patch("/admin/users/:userId/password", async (request, response) => {
    const userId = request.params.userId;
    const password = request.body?.password;

    if (typeof userId !== "string" || !userId ||
        typeof password !== "string" || password.length < 1 ||
        password.length > 200) {
      sendError(
        response,
        400,
        ERROR_CODES.INVALID_PAYLOAD,
        "Enter a password between 1 and 200 characters."
      );
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      sendError(response, 404, ERROR_CODES.INVALID_PAYLOAD, "User not found.");
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password) }
    });

    response.json({ ok: true });
  });

  // Delete a user account and its associated hosted-room records.
  router.delete("/admin/users/:userId", async (request, response) => {
    const userId = request.params.userId;

    if (!request.user || typeof userId !== "string" || !userId) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid user id.");
      return;
    }

    if (request.user.id === userId) {
      sendError(response, 400, ERROR_CODES.INVALID_ACTION, "You cannot delete your own admin account.");
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      sendError(response, 404, ERROR_CODES.INVALID_PAYLOAD, "User not found.");
      return;
    }

    if (manager.listRoomsForUser(userId).length > 0) {
      sendError(
        response,
        409,
        ERROR_CODES.INVALID_ACTION,
        "This user is in an active room. End or leave that game before deleting the account."
      );
      return;
    }

    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        sendError(
          response,
          409,
          ERROR_CODES.INVALID_ACTION,
          "The last admin account cannot be deleted."
        );
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      // Rooms reference their host without cascade deletion, so remove them first.
      await tx.room.deleteMany({ where: { hostUserId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    response.json({ ok: true });
  });
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
