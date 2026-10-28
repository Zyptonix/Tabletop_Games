import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { cardRank, evaluateBlackjackHand } from "./deck";
import { MIN_BET, MAX_BET } from "./setup";

export const blackjackActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("blackjack_action"),
    choice: z.enum(["bet", "clear_bet", "deal", "hit", "stand", "double", "split", "next_round"]),
    amount: z.number().int().min(1).max(10000).optional()
  })
]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;

export function getBlackjackLegalActions(state: BoardGameState, playerId: string): BoardGameAction[] {
  const phase = state.blackjackPhase ?? "betting";
  const chips = state.blackjackChips?.[playerId] ?? 0;
  const playerBets = state.blackjackBets?.[playerId] ?? [0];
  const totalBet = playerBets.reduce((a, b) => a + b, 0);

  if (phase === "betting") {
    const actions: BoardGameAction[] = [];
    const ready = state.blackjackReadyPlayers?.includes(playerId);

    if (!ready) {
      // Betting increments
      const increments = [5, 10, 25, 50, 100, 500];
      for (const inc of increments) {
        if (chips >= inc && totalBet + inc <= MAX_BET) {
          actions.push({ type: "blackjack_action", choice: "bet", amount: inc });
        }
      }

      if (totalBet > 0) {
        actions.push({ type: "blackjack_action", choice: "clear_bet" });
      }

      if (totalBet >= MIN_BET) {
        actions.push({ type: "blackjack_action", choice: "deal" });
      }
    }

    return actions;
  }

  if (phase === "player_turns") {
    if (state.currentPlayerId !== playerId) return [];

    const hands = state.blackjackPlayerHands?.[playerId] ?? [[]];
    const handIndex = state.blackjackActiveHandIndex ?? 0;
    const hand = hands[handIndex] ?? [];
    const currentBet = playerBets[handIndex] ?? 0;

    const evalResult = evaluateBlackjackHand(hand);
    if (evalResult.isBust || evalResult.isBlackjack) {
      return [{ type: "blackjack_action", choice: "stand" }];
    }

    const actions: BoardGameAction[] = [
      { type: "blackjack_action", choice: "hit" },
      { type: "blackjack_action", choice: "stand" }
    ];

    // Double down: allowed on initial 2 cards if player has enough chips
    if (hand.length === 2 && chips >= currentBet) {
      actions.push({ type: "blackjack_action", choice: "double" });
    }

    // Split: allowed if 2 cards have equal rank, chips >= bet, and hands.length < 4
    if (
      hand.length === 2 &&
      cardRank(hand[0]!) === cardRank(hand[1]!) &&
      chips >= currentBet &&
      hands.length < 4
    ) {
      actions.push({ type: "blackjack_action", choice: "split" });
    }

    return actions;
  }

  if (phase === "round_end") {
    return [{ type: "blackjack_action", choice: "next_round" }];
  }

  return [];
}

