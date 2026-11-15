import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@tabletop/db";
import {
  GAME_LABELS,
  type AuthUser,
  type CreateFeedbackInput,
  type FeedbackCategory,
  type FeedbackItem,
  type GameId
} from "@tabletop/shared";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedbacks.json");

export class FeedbackService {
  private cache: FeedbackItem[] | null = null;
  private writeLock: Promise<void> = Promise.resolve();

  private async ensureDataLoaded(): Promise<FeedbackItem[]> {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      // First try to load from Prisma / PostgreSQL
      const rows = await prisma.feedback.findMany({
        orderBy: { createdAt: "desc" }
      });
      if (rows && rows.length > 0) {
        this.cache = rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          authorName: r.authorName,
          authorAvatarUrl: r.authorAvatarUrl,
          authorRole: (r.authorRole as "USER" | "ADMIN") || null,
          gameId: r.gameId,
          gameName: r.gameName,
          category: r.category as FeedbackCategory,
          title: r.title,
          message: r.message,
          rating: r.rating,
          status: r.status as "open" | "in_progress" | "done",
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString()
        }));
        return this.cache;
      }
    } catch {
      // Prisma table may not exist yet or local DB unreachable
    }

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.cache = parsed;
        return this.cache;
      }
    } catch {
      // File does not exist yet or is empty
    }

    this.cache = [];
    return this.cache;
  }

  private async persistFile(): Promise<void> {
    const dataToSave = this.cache ?? [];
    this.writeLock = this.writeLock.then(async () => {
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const tempPath = `${FEEDBACK_FILE}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, JSON.stringify(dataToSave, null, 2), "utf-8");
        await fs.rename(tempPath, FEEDBACK_FILE);
      } catch (error) {
        console.error("[FeedbackService] Failed to persist feedback file:", error);
      }
    });
    return this.writeLock;
  }

  async list(filters?: { gameId?: string; category?: string; status?: string }): Promise<FeedbackItem[]> {
    const list = await this.ensureDataLoaded();

    return list
      .filter((item) => {
        if (filters?.gameId && filters.gameId !== "all" && item.gameId !== filters.gameId) {
          return false;
        }
        if (filters?.category && filters.category !== "all" && item.category !== filters.category) {
          return false;
        }
        if (filters?.status && filters.status !== "all" && item.status !== filters.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(input: CreateFeedbackInput, user?: AuthUser | null): Promise<FeedbackItem> {
    const list = await this.ensureDataLoaded();

    const normalizedGameId = input.gameId.trim().toLowerCase();
    const gameName =
      GAME_LABELS[normalizedGameId as GameId] ??
      normalizedGameId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const now = new Date();
    const newItem: FeedbackItem = {
      id: `fb_${crypto.randomUUID()}`,
      userId: user?.id ?? null,
      authorName: user?.displayName ?? (input.guestName?.trim() || "Anonymous Player"),
      authorAvatarUrl: user?.avatarUrl ?? null,
      authorRole: user?.role ?? null,
      gameId: normalizedGameId,
      gameName,
      category: (input.category as FeedbackCategory) || "general",
      rating: typeof input.rating === "number" && input.rating >= 1 && input.rating <= 5 ? input.rating : null,
      title: input.title?.trim() || null,
      message: input.message.trim(),
      status: "open",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    list.unshift(newItem);

    // Save to Prisma asynchronously
    try {
      await prisma.feedback.create({
        data: {
          id: newItem.id,
          userId: newItem.userId ?? null,
          authorName: newItem.authorName,
          authorAvatarUrl: newItem.authorAvatarUrl ?? null,
          authorRole: newItem.authorRole ?? null,
          gameId: newItem.gameId,
          gameName: newItem.gameName,
          category: newItem.category,
          title: newItem.title ?? null,
          message: newItem.message,
          rating: newItem.rating ?? null,
          status: newItem.status,
          createdAt: now,
          updatedAt: now
        }
      });
    } catch {
      // Fallback to file persistence
      await this.persistFile();
    }

    return newItem;
  }

  async delete(id: string, user: AuthUser): Promise<boolean> {
    const list = await this.ensureDataLoaded();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    const item = list[index];
    const isAdmin = user.role === "ADMIN";
    const isOwner = Boolean(item?.userId && item.userId === user.id);

    if (!isAdmin && !isOwner) {
      throw new Error("You do not have permission to delete this feedback.");
    }

    list.splice(index, 1);

    try {
      await prisma.feedback.delete({ where: { id } });
    } catch {
      await this.persistFile();
    }

    return true;
  }

  async updateStatus(id: string, status: "open" | "in_progress" | "done", user: AuthUser): Promise<FeedbackItem | null> {
    if (user.role !== "ADMIN") {
      throw new Error("Admin privileges required to update feedback status.");
    }

    const list = await this.ensureDataLoaded();
    const item = list.find((it) => it.id === id);
    if (!item) {
      return null;
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();

    try {
      await prisma.feedback.update({
        where: { id },
        data: { status, updatedAt: new Date() }
      });
    } catch {
      await this.persistFile();
    }

    return item;
  }
}

export const feedbackService = new FeedbackService();
