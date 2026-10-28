import { z } from "zod";
import type { ValidationResult } from "../../engine/GameTypes";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const pokerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("poker_action"),
    choice: z.enum(["fold", "check", "call", "raise", "all_in"]),
    amount: z.number().int().min(1).max(100000).optional()
  })
]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getPokerLegalActions(state: BoardGameState, playerId: string): BoardGameAction[] {
  if (!currentPlayer(state, playerId)) return [];
  const paid = state.pokerBets[playerId] ?? 0;
  const stack = state.pokerStacks[playerId] ?? 0;
  const owes = Math.max(0, state.pokerBetToCall - paid);
  const actions: BoardGameAction[] = [{ type: "poker_action", choice: "fold" }];
  if (owes <= 0) actions.push({ type: "poker_action", choice: "check" });
  if (owes > 0 && stack > 0) actions.push({ type: "poker_action", choice: "call" });
  if (stack >= owes + 10) actions.push({ type: "poker_action", choice: "raise" });
  if (stack > 0) actions.push({ type: "poker_action", choice: "all_in" });
  return actions;
}

export function validatePokerAction({
  state,
  playerId,
  action
}: {
  state: BoardGameState;
  playerId: string;
  action: BoardGameAction;
}): ValidationResult {
  if (state.phase !== "playing") {
    return { ok: false, code: "ILLEGAL_ACTION", message: "That action is not legal. Game is not active." };
  }
  if (state.currentPlayerId !== playerId) {
    return { ok: false, code: "NOT_YOUR_TURN", message: "That action is not legal for the current turn. It is not your turn." };
  }
  if (action.type !== "poker_action") {
    return { ok: false, code: "ILLEGAL_ACTION", message: "Invalid action type for poker." };
  }
  if (state.pokerFolded.includes(playerId)) {
    return { ok: false, code: "PLAYER_FOLDED", message: "You have folded." };
  }

  const legal = getPokerLegalActions(state, playerId);
  const legalChoice = legal.some(
    (cand) => cand.type === "poker_action" && cand.choice === action.choice
  );
  if (!legalChoice) {
    return { ok: false, code: "ILLEGAL_ACTION", message: `Action "${action.choice}" is not legal for the current turn.` };
  }

  if (action.choice === "raise") {
    const paid = state.pokerBets[playerId] ?? 0;
    const stack = state.pokerStacks[playerId] ?? 0;
    const owes = Math.max(0, state.pokerBetToCall - paid);
    if (stack < owes + 10) {
      return { ok: false, code: "INSUFFICIENT_FUNDS", message: "Not enough chips to raise." };
    }
    if (typeof action.amount === "number") {
      if (action.amount <= 0 || action.amount > stack) {
        return { ok: false, code: "INVALID_AMOUNT", message: "Invalid raise amount." };
      }
    }
  }

  return { ok: true };
}
