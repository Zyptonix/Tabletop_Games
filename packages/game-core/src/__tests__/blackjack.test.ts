import { describe, expect, it } from "vitest";
import { blackjackModule, evaluateBlackjackHand } from "../games/blackjack";
import type { BoardGameState } from "../games/shared/types";

function startBlackjack(playerCount = 2): BoardGameState {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    userId: `p${i + 1}`,
    displayName: `Player ${i + 1}`,
    seat: i
  }));
  return blackjackModule.createInitialState({
    players,
    settings: { turnSeconds: null, clockSeconds: null },
    seed: "blackjack-test-seed-123",
    now: new Date().toISOString()
  });
}

describe("Blackjack hand evaluation", () => {
  it("evaluates hard hands correctly", () => {
    expect(evaluateBlackjackHand(["10♠", "7♥"]).total).toBe(17);
    expect(evaluateBlackjackHand(["10♠", "7♥"]).isSoft).toBe(false);
    expect(evaluateBlackjackHand(["10♠", "7♥"]).isBlackjack).toBe(false);
  });

  it("identifies natural 2-card blackjack", () => {
    const res = evaluateBlackjackHand(["A♠", "K♦"]);
    expect(res.total).toBe(21);
    expect(res.isBlackjack).toBe(true);
  });

  it("adjusts Ace from 11 to 1 when busting", () => {
    const res = evaluateBlackjackHand(["A♠", "8♥", "5♣"]);
    expect(res.total).toBe(14); // 11 + 8 + 5 = 24 -> 1 + 8 + 5 = 14
    expect(res.isSoft).toBe(false);
  });

  it("handles double aces correctly", () => {
    const res = evaluateBlackjackHand(["A♠", "A♥"]);
    expect(res.total).toBe(12); // 11 + 1
    expect(res.isSoft).toBe(true);
  });
});

describe("Blackjack module lifecycle", () => {
  it("initializes with 1000 chips per player in betting phase", () => {
    const state = startBlackjack(2);
    expect(state.blackjackPhase).toBe("betting");
    expect(state.blackjackChips?.["p1"]).toBe(1000);
    expect(state.blackjackChips?.["p2"]).toBe(1000);
    expect(state.blackjackRoundNumber).toBe(1);
  });

  it("allows betting and clearing bets", () => {
    const state = startBlackjack(2);
    const p1Actions = blackjackModule.getLegalActions({ state, playerId: "p1" });
    expect(p1Actions.some((a) => a.type === "blackjack_action" && a.choice === "bet")).toBe(true);

    const betRes = blackjackModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "blackjack_action", choice: "bet", amount: 50 },
      now: new Date().toISOString()
    });

    const nextState = betRes.state as BoardGameState;
    expect(nextState.blackjackChips?.["p1"]).toBe(950);
    expect(nextState.blackjackBets?.["p1"]?.[0]).toBe(50);

    // Clear bet
    const clearRes = blackjackModule.applyAction({
      state: nextState,
      playerId: "p1",
      action: { type: "blackjack_action", choice: "clear_bet" },
      now: new Date().toISOString()
    });
    const cleared = clearRes.state as BoardGameState;
    expect(cleared.blackjackChips?.["p1"]).toBe(1000);
    expect(cleared.blackjackBets?.["p1"]?.[0]).toBe(0);
  });

  it("deals cards and advances to player turns upon deal action", () => {
    let state = startBlackjack(2);

    // Both players bet $50
    state = blackjackModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "blackjack_action", choice: "bet", amount: 50 },
      now: new Date().toISOString()
    }).state as BoardGameState;

    state = blackjackModule.applyAction({
      state,
      playerId: "p2",
      action: { type: "blackjack_action", choice: "bet", amount: 50 },
      now: new Date().toISOString()
    }).state as BoardGameState;

    // Player 1 ready to deal
    state = blackjackModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "blackjack_action", choice: "deal" },
      now: new Date().toISOString()
    }).state as BoardGameState;

    // Player 2 ready to deal -> triggers deal!
    state = blackjackModule.applyAction({
      state,
      playerId: "p2",
      action: { type: "blackjack_action", choice: "deal" },
      now: new Date().toISOString()
    }).state as BoardGameState;

    expect(state.blackjackDealerHand).toHaveLength(2);
    expect(state.blackjackPlayerHands?.["p1"]?.[0]).toHaveLength(2);
    expect(state.blackjackPlayerHands?.["p2"]?.[0]).toHaveLength(2);

    // Public state conceals the dealer's hole card
    const pub = blackjackModule.getPublicState({ state, viewerId: "p1" });
    expect(pub.blackjackDealerHand?.[1]).toBe("hidden");
  });
});
