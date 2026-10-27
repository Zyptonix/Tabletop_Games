import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer, nextPlayerId } from "../shared/utils";
import { hasShot } from "./rules";

export const battleshipActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fire"),
    x: z.number().int().min(0).max(9),
    y: z.number().int().min(0).max(9),
  }),
  z.object({
    type: z.literal("place_fleet"),
    ships: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number().int().min(2).max(5),
        x: z.number().int().min(0).max(9),
        y: z.number().int().min(0).max(9),
        orientation: z.enum(["h", "v"]),
        cells: z.array(z.string()),
      })
    ),
  }),
]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;

export function getBattleshipLegalActions(state: BoardGameState, playerId: string): BoardGameAction[] {
  // Placement phase
  if (state.battleshipPhase === "placement" && !state.battleshipReady?.[playerId]) {
    const current = state.shipDetailsByPlayer?.[playerId];
    return current ? [{ type: "place_fleet", ships: current }] : [];
  }

  // If in battle phase (or phase undefined)
  if (!currentPlayer(state, playerId)) return [];
  const target = nextPlayerId(state, playerId);
  if (!target || target === playerId) return [];

  return Array.from({ length: 100 }, (_, i) => ({
    type: "fire" as const,
    x: i % 10,
    y: Math.floor(i / 10),
  })).filter((a) => !hasShot(state, playerId, a.x, a.y));
}
