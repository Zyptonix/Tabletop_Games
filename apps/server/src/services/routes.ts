import { Router } from "express";
import { prisma } from "@tabletop/db";
import { ERROR_CODES } from "@tabletop/shared";
import { authMiddleware } from "../middleware/authMiddleware";
import { LeaderboardService } from "./LeaderboardService";
import { sendError } from "../utils/http";

export function createServicesRouter(leaderboards = new LeaderboardService()) {
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

  router.get("/leaderboards/xp", async (_request, response) => {
    response.json({ leaderboard: await leaderboards.getGlobalXp() });
  });

  router.get("/leaderboards/:gameId/wins", async (request, response) => {
    response.json({ leaderboard: await leaderboards.getGameWins(request.params.gameId) });
  });

  return router;
}
