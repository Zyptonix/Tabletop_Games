import type { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@tabletop/shared";
import type { RoomManager } from "./RoomManager";
import type { RoomRuntime } from "./RoomTypes";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class RoomTimers {
  private readonly intervals = new Map<string, NodeJS.Timeout>();

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
  }

  private async tick(roomId: string): Promise<void> {
    try {
      const timer = await this.manager.getTimerView(roomId);
      if (!timer) {
        this.stop(roomId);
        return;
      }

      this.io.to(roomId).emit("game:timer", timer);

      if (timer.running && timer.remainingMs !== null && timer.remainingMs <= 0) {
        const result = await this.manager.applyTimeout(roomId);
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

