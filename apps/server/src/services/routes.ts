import { Router } from "express";
import { prisma } from "@tabletop/db";
import { ERROR_CODES, updateProfileSchema } from "@tabletop/shared";
import { authMiddleware } from "../middleware/authMiddleware";
import { serializeUser } from "../auth/serializeUser";
import { LeaderboardService } from "./LeaderboardService";
import { sendError } from "../utils/http";
import type { RoomManager } from "../rooms/RoomManager";

export function createServicesRouter(leaderboards = new LeaderboardService(), manager?: RoomManager) {
  const router = Router();

  router.use(authMiddleware);

  router.get("/profile/me", async (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: request.user.id }
    });
    const stats = await prisma.playerGameStats.findMany({
      where: { userId: request.user.id },
      orderBy: { gamesPlayed: "desc" }
    });

    response.json({ profile, stats });
  });

  router.patch("/profile/me", async (request, response) => {
    if (!request.user) {
      sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
      return;
    }

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid profile payload.", parsed.error.flatten());
      return;
    }

    const displayName = parsed.data.displayName ?? request.user.displayName;
    const avatarUrl = parsed.data.avatarUrl === undefined ? request.user.avatarUrl : parsed.data.avatarUrl;

    const profile = await prisma.profile.upsert({
      where: { userId: request.user.id },
      create: {
        userId: request.user.id,
        displayName,
        avatarUrl
      },
      update: {
        displayName,
        avatarUrl
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { profile: true }
    });

    if (!user) {
      sendError(response, 404, ERROR_CODES.UNAUTHORIZED, "User not found.");
      return;
    }

    manager?.updateUserProfileInRooms({
      userId: request.user.id,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl
    });

    response.json({ profile, user: serializeUser(user) });
  });

  router.get("/leaderboards/xp", async (_request, response) => {
    response.json({ leaderboard: await leaderboards.getGlobalXp() });
  });

  router.get("/leaderboards/:gameId/wins", async (request, response) => {
    response.json({ leaderboard: await leaderboards.getGameWins(request.params.gameId) });
  });

  return router;
}