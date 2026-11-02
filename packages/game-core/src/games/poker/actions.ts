import { z } from "zod";
import type { ValidationResult } from "../../engine/GameTypes";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const pokerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("poker_action"),
    choice: z.enum(["fold", "check", "call", "raise", "all_in", "next_hand", "resume_play"]),
    amount: z.number().int().min(1).max(100000).optional()
  })
]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;

export function getPokerLegalActions(state: BoardGameState, playerId: string): BoardGameAction[] {
  if (state.phase !== "playing") return [];
  if ((state.pokerStacks[playerId] ?? 0) <= 0) return [];
  const actions: BoardGameAction[] = [];

  if (state.pokerSittingOut?.[playerId]) {
    actions.push({ type: "poker_action", choice: "resume_play" });
  }

  if (state.pokerAwaitingNextHand) {
    actions.push({ type: "poker_action", choice: "next_hand" });
    return actions;
  }

  if (!currentPlayer(state, playerId)) return actions;
  const paid = state.pokerBets[playerId] ?? 0;
  const stack = state.pokerStacks[playerId] ?? 0;
  const owes = Math.max(0, state.pokerBetToCall - paid);
  actions.push({ type: "poker_action", choice: "fold" });
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
  if (action.type !== "poker_action") {
    return { ok: false, code: "ILLEGAL_ACTION", message: "Invalid action type for poker." };
  }

  if (action.choice === "resume_play") {
    if (state.pokerSittingOut?.[playerId]) return { ok: true };
    return { ok: false, code: "NOT_SITTING_OUT", message: "You are not sitting out." };
  }

  if (action.choice === "next_hand") {
    if (state.pokerAwaitingNextHand) return { ok: true };
    return { ok: false, code: "ILLEGAL_ACTION", message: "Hand is still in progress." };
  }

  if (state.currentPlayerId !== playerId) {
    return { ok: false, code: "NOT_YOUR_TURN", message: "That action is not legal for the current turn. It is not your turn." };
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
