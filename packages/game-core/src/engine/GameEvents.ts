import type { GameEvent } from "./GameTypes";

let eventCounter = 0;

export function createGameEvent(
  type: string,
  params: {
    message?: string;
    payload?: unknown;
    targetUserIds?: string[];
  } = {}
): GameEvent {
  eventCounter += 1;
  const event: GameEvent = {
    id: `${Date.now()}-${eventCounter}`,
    type,
    createdAt: new Date().toISOString()
  };

  if (params.message !== undefined) {
    event.message = params.message;
  }

  if (params.payload !== undefined) {
    event.payload = params.payload;
  }

  if (params.targetUserIds !== undefined) {
    event.targetUserIds = params.targetUserIds;
  }

  return event;
}
