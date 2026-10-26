import type { GameEvent, PublicBoardGameState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
export type AnyAction = { type: string; [key: string]: unknown };
export type BoardGameTableProps = { room: RoomStateView; state: PublicBoardGameState; legalActions: unknown[]; gameEvents: GameEvent[]; currentUserId: string; onAction: (type: string, payload?: Record<string, unknown>) => void; onChat: (roomId: string, body: string) => void; onEndMatch?: (roomId: string) => void };
