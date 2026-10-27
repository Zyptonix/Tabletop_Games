import type { GameEvent, PublicBoardGameState } from "@tabletop/game-core";
import type { RoomStateView, TimerView } from "@tabletop/shared";
export type AnyAction = { type: string; [key: string]: unknown };
export type BoardGameTableProps = { room: RoomStateView; state: PublicBoardGameState; legalActions: unknown[]; gameEvents: GameEvent[]; currentUserId: string; timer?: TimerView | null | undefined; onAction: (type: string, payload?: Record<string, unknown>) => void; onChat: (roomId: string, body: string) => void; onEndMatch?: ((roomId: string) => void) | undefined };
