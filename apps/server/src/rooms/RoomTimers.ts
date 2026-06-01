import type { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@tabletop/shared";
import type { TimeoutReason } from "@tabletop/game-core";
import type { RoomManager } from "./RoomManager";
import type { RoomRuntime } from "./RoomTypes";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

type OfflineGrace = {
  playerId: string;
  deadlineMs: number;
};

const OFFLINE_TURN_GRACE_MS = 15_000;

export class RoomTimers {
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly offlineGraceByRoom = new Map<string, OfflineGrace>();

  constructor(
    private readonly io: IOServer,
    private readonly manager: RoomManager,
    private readonly onTimeoutApplied: (room: RoomRuntime, events: unknown[]) => void
  ) {}

  start(roomId: string): void {
    this.stop(roomId);
    const interval = setInterval(() => {
      void this.tick(roomId);
    }, 1000);
    this.intervals.set(roomId, interval);
  }

  stop(roomId: string): void {
    const interval = this.intervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(roomId);
    }
    this.offlineGraceByRoom.delete(roomId);
  }

  private async tick(roomId: string): Promise<void> {
    try {
      const timer = await this.manager.getTimerView(roomId);
      if (!timer) {
        this.stop(roomId);
        return;
      }

      this.io.to(roomId).emit("game:timer", timer);

      const presence = this.manager.getCurrentTurnPresence(roomId);
      if (timer.running && presence && !presence.connected && !presence.isBot) {
        const now = Date.now();
        const existing = this.offlineGraceByRoom.get(roomId);
        const grace = existing?.playerId === presence.userId
          ? existing
          : { playerId: presence.userId, deadlineMs: now + OFFLINE_TURN_GRACE_MS };

        this.offlineGraceByRoom.set(roomId, grace);

        if (now >= grace.deadlineMs) {
          this.offlineGraceByRoom.delete(roomId);
          const result = await this.manager.applyTimeout(roomId, "offline_grace");
          if (result) {
            this.onTimeoutApplied(result.room, result.events);
          }
        }
        return;
      }

      this.offlineGraceByRoom.delete(roomId);

      if (timer.running && timer.remainingMs !== null && timer.remainingMs <= 0) {
        const result = await this.manager.applyTimeout(roomId, "turn_timer");
        if (result) {
          this.onTimeoutApplied(result.room, result.events);
        }
      }
    } catch (error) {
      console.error(`Timer tick failed for room ${roomId}.`, error);
      this.stop(roomId);
    }
  }
}
