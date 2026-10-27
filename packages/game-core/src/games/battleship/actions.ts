import { z } from "zod";
import type { ValidationResult } from "../../engine/GameTypes";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer, nextPlayerId } from "../shared/utils";
import { hasShot, validateFleet } from "./rules";

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

export function validateBattleshipAction({
  state,
  playerId,
  action,
}: {
  state: BoardGameState;
  playerId: string;
  action: BoardGameAction;
}): ValidationResult {
  if (action.type === "place_fleet") {
    if (state.battleshipPhase && state.battleshipPhase !== "placement") {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Fleet placement is already completed." };
    }
    if (!validateFleet(action.ships)) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Invalid fleet positioning. Ships cannot overlap or leave the grid." };
    }
    return { ok: true };
  }

  if (action.type === "fire") {
    if (state.battleshipPhase === "placement") {
      return { ok: true };
    }
    if (!currentPlayer(state, playerId)) {
      return { ok: false, code: "NOT_YOUR_TURN", message: "It is not your turn to fire." };
    }
    if (hasShot(state, playerId, action.x, action.y)) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "You have already fired at that coordinate." };
    }
    return { ok: true };
  }

  return { ok: false, code: "ILLEGAL_ACTION", message: "That action is not legal for the current turn." };
}
