import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
export const LUDO_START_BY_SEAT = [0, 13, 26, 39] as const;
export const LUDO_SAFE_TRACK_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export function ludoGlobalTrackPosition(player: GamePlayer, progress: number): number | null {
  if (progress < 0 || progress >= 52) return null;
  return ((LUDO_START_BY_SEAT[player.seat % 4] ?? 0) + progress) % 52;
}
