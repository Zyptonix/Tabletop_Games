import { describe, it, expect } from "vitest";
import { twentyNineModule } from "../index";
import { getLegalTwentyNineActions } from "../games/twenty-nine/selectors";
import type { TwentyNineState } from "../games/twenty-nine/types";

describe("Twenty-Nine Bangladesh Bidding Rules", () => {
  // Seats:
  // Seat 0: Team 0 (u0)
  // Seat 1: Team 1 (u1)
  // Seat 2: Team 0 (u2)
  // Seat 3: Team 1 (u3)
  const players = [
    { userId: "u0", username: "user0", displayName: "User 0", seat: 0, isBot: false },
    { userId: "u1", username: "user1", displayName: "User 1", seat: 1, isBot: false },
    { userId: "u2", username: "user2", displayName: "User 2", seat: 2, isBot: true },
    { userId: "u3", username: "user3", displayName: "User 3", seat: 3, isBot: true }
  ];

  it("advances turn correctly when first bidder passes and second bidder opens", () => {
    let state = twentyNineModule.createInitialState({
      players,
      settings: { turnSeconds: 45, allowSeventhCard: true, allowDoubleRedouble: true, allowSingleHand: true, biddingStyle: "bangladesh" },
      seed: "fixed-seed-test-1",
      now: new Date().toISOString()
    });

    expect(state.dealerPlayerId).toBe("u0");
    expect(state.currentPlayerId).toBe("u1"); // Left of dealer

    // u1 passes
    state = twentyNineModule.applyAction({
      state,
      playerId: "u1",
      action: { type: "pass_bid" },
      now: new Date().toISOString()
    }).state;

    expect(state.passedPlayerIds).toContain("u1");
    expect(state.currentPlayerId).toBe("u2");

    // u2 bids 16
    state = twentyNineModule.applyAction({
      state,
      playerId: "u2",
      action: { type: "bid", value: 16 },
      now: new Date().toISOString()
    }).state;

    expect(state.currentBid).toBe(16);
    expect(state.highestBidderId).toBe("u2");
    expect(state.biddingDefenderId).toBe("u2");
    // Turn must advance to u3 (challenger), NOT stay with u2, and NOT return to u1
    expect(state.currentPlayerId).toBe("u3");
    expect(state.passedPlayerIds).not.toContain(state.currentPlayerId);
  });

  it("handles ditto correctly between opponents and returns turn to challenger", () => {
    let state = twentyNineModule.createInitialState({
      players,
      settings: { turnSeconds: 45, allowSeventhCard: true, allowDoubleRedouble: true, allowSingleHand: true, biddingStyle: "bangladesh" },
      seed: "fixed-seed-test-1",
      now: new Date().toISOString()
    });

    // Dealer is u0. Speaking order: u1, u2, u3, u0.
    // u1 (Team 1) bids 16.
    state = twentyNineModule.applyAction({ state, playerId: "u1", action: { type: "bid", value: 16 }, now: new Date().toISOString() }).state;
    expect(state.currentPlayerId).toBe("u2"); // Challenger u2 (Team 0)

    // Opponent u2 bids 17
    state = twentyNineModule.applyAction({ state, playerId: "u2", action: { type: "bid", value: 17 }, now: new Date().toISOString() }).state;
    expect(state.currentPlayerId).toBe("u1"); // Defender u1 gets turn to respond

    // Defender u1 says ditto (matches 17)
    state = twentyNineModule.applyAction({ state, playerId: "u1", action: { type: "ditto" }, now: new Date().toISOString() }).state;
    expect(state.currentPlayerId).toBe("u2"); // Back to challenger u2
    expect(state.lastBidWasDitto).toBe(true);

    // u2 passes
    state = twentyNineModule.applyAction({ state, playerId: "u2", action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    // Next challenger is u3 (partner of u1)
    expect(state.currentPlayerId).toBe("u3");

    // u3 passes
    state = twentyNineModule.applyAction({ state, playerId: "u3", action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    // Next challenger is u0 (opponent)
    expect(state.currentPlayerId).toBe("u0");

    // u0 passes -> u1 wins contract with 17!
    state = twentyNineModule.applyAction({ state, playerId: "u0", action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    expect(state.phase).toBe("trump");
    expect(state.declarerId).toBe("u1");
    expect(state.contractTarget).toBe(17);
  });

  it("allows partner to raise and take over as defender", () => {
    let state = twentyNineModule.createInitialState({
      players,
      settings: { turnSeconds: 45, allowSeventhCard: true, allowDoubleRedouble: true, allowSingleHand: true, biddingStyle: "bangladesh" },
      seed: "fixed-seed-test-1",
      now: new Date().toISOString()
    });

    // u1 (Team 1) bids 16
    state = twentyNineModule.applyAction({ state, playerId: "u1", action: { type: "bid", value: 16 }, now: new Date().toISOString() }).state;
    // u2 (Team 0) passes
    state = twentyNineModule.applyAction({ state, playerId: "u2", action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    expect(state.currentPlayerId).toBe("u3"); // u3 (Team 1 - partner)

    // Partner u3 raises to 18
    state = twentyNineModule.applyAction({ state, playerId: "u3", action: { type: "bid", value: 18 }, now: new Date().toISOString() }).state;
    // u3 becomes new defender; next challenger is opponent u0 (Team 0)
    expect(state.biddingDefenderId).toBe("u3");
    expect(state.highestBidderId).toBe("u3");
    expect(state.currentPlayerId).toBe("u0");

    // u0 passes -> u3 wins auction with 18
    state = twentyNineModule.applyAction({ state, playerId: "u0", action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    expect(state.phase).toBe("trump");
    expect(state.declarerId).toBe("u3");
    expect(state.contractTarget).toBe(18);
  });

  it("cancels and redeals when the first three players pass", () => {
    let state = twentyNineModule.createInitialState({
      players,
      settings: { turnSeconds: 45, allowSeventhCard: true, allowDoubleRedouble: true, allowSingleHand: true, biddingStyle: "bangladesh" },
      seed: "fixed-seed-test-1",
      now: new Date().toISOString()
    });

    const d0 = state.dealerPlayerId;
    state = twentyNineModule.applyAction({ state, playerId: state.currentPlayerId!, action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    state = twentyNineModule.applyAction({ state, playerId: state.currentPlayerId!, action: { type: "pass_bid" }, now: new Date().toISOString() }).state;
    state = twentyNineModule.applyAction({ state, playerId: state.currentPlayerId!, action: { type: "pass_bid" }, now: new Date().toISOString() }).state;

    // After 3 passes with no bids, it should redeal to next dealer
    expect(state.phase).toBe("bidding");
    expect(state.dealerPlayerId).not.toBe(d0);
    expect(state.passedPlayerIds.length).toBe(0);
  });

  it("runs 500 simulated auctions without ever giving turn to a passed player", () => {
    for (let sim = 0; sim < 500; sim++) {
      let state = twentyNineModule.createInitialState({
        players,
        settings: { turnSeconds: 45, allowSeventhCard: true, allowDoubleRedouble: true, allowSingleHand: true, biddingStyle: "bangladesh" },
        seed: `sim-seed-${sim}`,
        now: new Date().toISOString()
      });

      let steps = 0;
      while (state.phase === "bidding" && steps < 50) {
        steps++;
        const current = state.currentPlayerId;
        expect(current).not.toBeNull();
        expect(state.passedPlayerIds).not.toContain(current);

        const legal = getLegalTwentyNineActions({ state, playerId: current! });
        expect(legal.length).toBeGreaterThan(0);

        // Pick a random legal action
        const action = legal[Math.floor(Math.random() * legal.length)]!;
        state = twentyNineModule.applyAction({
          state,
          playerId: current!,
          action: action as any,
          now: new Date().toISOString()
        }).state;
      }
      expect(steps).toBeLessThan(50);
    }
  });
});
