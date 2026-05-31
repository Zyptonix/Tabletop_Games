import { prisma, type Prisma } from "@tabletop/db";

export interface RoomSnapshotPayload {
  roomId: string;
  gameId: string;
  stateJson: unknown;
  roomStateJson: unknown;
  actionNumber: number;
}

export class SnapshotService {
  async saveLatest(payload: RoomSnapshotPayload): Promise<void> {
    try {
      await prisma.roomSnapshot.create({
        data: {
          roomId: payload.roomId,
          gameId: payload.gameId,
          stateJson: toPrismaJson(payload.stateJson),
          roomStateJson: toPrismaJson(payload.roomStateJson),
          actionNumber: payload.actionNumber
        }
      });
    } catch (error) {
      // Snapshots are recovery aids, not part of the realtime move commit path.
      // A persistence issue must not kill the authoritative in-memory room.
      console.warn(
        `[snapshot] save failed room=${payload.roomId} action=${payload.actionNumber}: ${formatSnapshotError(error)}`
      );
    }
  }

  async getLatestForRoom(roomId: string) {
    return prisma.roomSnapshot.findFirst({
      where: { roomId },
      orderBy: [{ actionNumber: "desc" }, { createdAt: "desc" }]
    });
  }
}

export function sanitizeSnapshotForPersistence(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [sanitizeString(key), sanitizeValue(entry, seen)])
  );
}

function sanitizeString(value: string): string {
  // The user's local PostgreSQL cluster was initialized with WIN1252, so emoji and
  // many non-latin code points can fail JSON inserts. Store an ASCII-safe recovery
  // snapshot while keeping the live in-memory room unchanged.
  return value.replace(/\u0000/g, "").replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(sanitizeSnapshotForPersistence(value ?? null))) as Prisma.InputJsonValue;
}

function formatSnapshotError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeString(error.message).slice(0, 500);
  }

  try {
    return sanitizeString(JSON.stringify(error)).slice(0, 500);
  } catch {
    return "Unknown snapshot error.";
  }
}
