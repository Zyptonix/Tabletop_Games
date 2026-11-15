import { Router } from "express";
import { prisma } from "@tabletop/db";
import { ERROR_CODES, updateProfileSchema } from "@tabletop/shared";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware";
import { serializeUser } from "../auth/serializeUser";
import { LeaderboardService } from "./LeaderboardService";
import { feedbackService } from "./FeedbackService";
import { sendError } from "../utils/http";
import type { RoomManager } from "../rooms/RoomManager";

export function createServicesRouter(leaderboards = new LeaderboardService(), manager?: RoomManager) {
  const router = Router();

  // Public / Optionally Authenticated Leaderboard Endpoints
  router.get("/leaderboards/summary", optionalAuthMiddleware, async (_request, response) => {
    try {
      const summary = await leaderboards.getSummary();
      response.json(summary);
    } catch (error) {
      console.error("Leaderboard summary error:", error);
      response.status(500).json({ code: "LEADERBOARD_ERROR", message: "Failed to load leaderboard summary." });
    }
  });

  router.get("/leaderboards/xp", optionalAuthMiddleware, async (_request, response) => {
    try {
      const rows = await leaderboards.getGlobalXp();
      response.json({ leaderboard: rows });
    } catch (error) {
      console.error("Global XP leaderboard error:", error);
      response.status(500).json({ code: "LEADERBOARD_ERROR", message: "Failed to load global leaderboard." });
    }
  });

  router.get("/leaderboards/:gameId/wins", optionalAuthMiddleware, async (request, response) => {
    try {
      const gameId = String(request.params.gameId ?? "");
      const rows = await leaderboards.getGameWins(gameId);
      response.json({ leaderboard: rows });
    } catch (error) {
      console.error("Game leaderboard error:", error);
      response.status(500).json({ code: "LEADERBOARD_ERROR", message: "Failed to load game leaderboard." });
    }
  });

  // Authenticated Profile Routes
  router.get("/profile/me", authMiddleware, async (request, response) => {
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

  router.patch("/profile/me", authMiddleware, async (request, response) => {
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

  // Feedback Endpoints
  router.get("/feedback", optionalAuthMiddleware, async (request, response) => {
    try {
      const filters: { gameId?: string; category?: string; status?: string } = {};
      if (typeof request.query.gameId === "string" && request.query.gameId) {
        filters.gameId = request.query.gameId;
      }
      if (typeof request.query.category === "string" && request.query.category) {
        filters.category = request.query.category;
      }
      if (typeof request.query.status === "string" && request.query.status) {
        filters.status = request.query.status;
      }

      const feedbacks = await feedbackService.list(filters);
      response.json({ feedbacks });
    } catch (error) {
      console.error("Feedback list error:", error);
      response.status(500).json({ code: "FEEDBACK_ERROR", message: "Failed to load feedbacks." });
    }
  });

  router.post("/feedback", optionalAuthMiddleware, async (request, response) => {
    try {
      const { gameId, category, rating, title, message, guestName } = request.body ?? {};

      if (!gameId || typeof gameId !== "string" || !gameId.trim()) {
        sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "gameId is required.");
        return;
      }

      if (!message || typeof message !== "string" || !message.trim()) {
        sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Feedback message cannot be empty.");
        return;
      }

      if (message.length > 2500) {
        sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Feedback message exceeds maximum length of 2500 characters.");
        return;
      }

      const numRating = typeof rating === "number" && rating >= 1 && rating <= 5 ? rating : null;

      const created = await feedbackService.create(
        {
          gameId: gameId.trim(),
          category,
          rating: numRating,
          title: typeof title === "string" ? title.trim() : null,
          message: message.trim(),
          guestName: typeof guestName === "string" ? guestName.trim() : null
        },
        request.user
      );

      response.status(201).json({ feedback: created });
    } catch (error) {
      console.error("Create feedback error:", error);
      response.status(500).json({ code: "FEEDBACK_ERROR", message: "Failed to create feedback." });
    }
  });

  router.delete("/feedback/:id", authMiddleware, async (request, response) => {
    try {
      if (!request.user) {
        sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required to delete feedback.");
        return;
      }

      const id = String(request.params.id ?? "");
      const deleted = await feedbackService.delete(id, request.user);
      if (!deleted) {
        sendError(response, 404, ERROR_CODES.INVALID_ACTION, "Feedback not found.");
        return;
      }

      response.json({ ok: true, id });
    } catch (error: any) {
      if (error?.message?.includes("permission")) {
        sendError(response, 403, ERROR_CODES.UNAUTHORIZED, error.message);
        return;
      }
      console.error("Delete feedback error:", error);
      response.status(500).json({ code: "FEEDBACK_ERROR", message: "Failed to delete feedback." });
    }
  });

  router.patch("/feedback/:id/status", authMiddleware, async (request, response) => {
    try {
      if (!request.user) {
        sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Login required.");
        return;
      }

      const id = String(request.params.id ?? "");
      const { status } = request.body ?? {};
      if (status !== "open" && status !== "in_progress" && status !== "done") {
        sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Status must be open, in_progress, or done.");
        return;
      }

      const updated = await feedbackService.updateStatus(id, status, request.user);
      if (!updated) {
        sendError(response, 404, ERROR_CODES.INVALID_ACTION, "Feedback not found.");
        return;
      }

      response.json({ feedback: updated });
    } catch (error: any) {
      if (error?.message?.includes("Admin")) {
        sendError(response, 403, ERROR_CODES.UNAUTHORIZED, error.message);
        return;
      }
      console.error("Update feedback status error:", error);
      response.status(500).json({ code: "FEEDBACK_ERROR", message: "Failed to update feedback status." });
    }
  });

  return router;
}