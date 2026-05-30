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
    await prisma.roomSnapshot.create({
      data: {
        roomId: payload.roomId,
        gameId: payload.gameId,
        stateJson: toPrismaJson(payload.stateJson),
        roomStateJson: toPrismaJson(payload.roomStateJson),
        actionNumber: payload.actionNumber
      }
    });
  }

  async getLatestForRoom(roomId: string) {
    return prisma.roomSnapshot.findFirst({
      where: { roomId },
      orderBy: [{ actionNumber: "desc" }, { createdAt: "desc" }]
    });
  }
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
