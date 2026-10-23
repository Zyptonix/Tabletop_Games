import { describe, expect, it } from "vitest";
import { createTwentyNineDeck, cardStrength, teamCardPoints } from "../games/twenty-nine/deck";
import { createTwentyNineDeal } from "../games/twenty-nine/setup";
import { getLegalTwentyNineActions } from "../games/twenty-nine/selectors";
import { validateTwentyNineAction } from "../games/twenty-nine/validation";
import { applyTwentyNineAction } from "../games/twenty-nine/reducer";
import { getPublicTwentyNineState } from "../games/twenty-nine/public-state";
import { TWENTY_NINE_DEFAULT_SETTINGS } from "../games/twenty-nine/constants";
import type { GamePlayer } from "../engine/GameTypes";
import type { TwentyNineCard, TwentyNineSettings, TwentyNineState } from "../games/twenty-nine/types";

const players: GamePlayer[] = [
  { userId: "p0", username: "p0", displayName: "South", seat: 0 },
  { userId: "p1", username: "p1", displayName: "East", seat: 1 },
  { userId: "p2", username: "p2", displayName: "North", seat: 2 },
  { userId: "p3", username: "p3", displayName: "West", seat: 3 }
];
const settings: TwentyNineSettings = { ...TWENTY_NINE_DEFAULT_SETTINGS };

function makeState(): TwentyNineState {
  return createTwentyNineDeal({ players, settings, seed: "twenty-nine-tests", now: "2026-10-22T00:00:00.000Z" });
}

function action(state: TwentyNineState, playerId: string, type: Parameters<typeof applyTwentyNineAction>[0]["action"]["type"], payload: Record<string, unknown> = {}) {
  return applyTwentyNineAction({
    state,
    settings: state.settings,
    playerId,
    action: { type, ...payload } as Parameters<typeof applyTwentyNineAction>[0]["action"],
    now: "2026-10-22T00:00:01.000Z"
  });
}

describe("Bangladesh 29", () => {
  it("builds the exact 32-card deck with 28 card points and Bangladesh ranking", () => {
    const deck = createTwentyNineDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((card) => card.id)).size).toBe(32);
    expect(teamCardPoints(deck)).toBe(28);
    expect(new Set(deck.map((card) => card.suit))).toEqual(new Set(["spades", "hearts", "diamonds", "clubs"]));
    for (const suit of ["spades", "hearts", "diamonds", "clubs"] as const) {
      expect(deck.filter((card) => card.suit === suit)).toHaveLength(8);
    }
    expect(cardStrength("J")).toBeGreaterThan(cardStrength("9"));
    expect(cardStrength("9")).toBeGreaterThan(cardStrength("A"));
    expect(cardStrength("A")).toBeGreaterThan(cardStrength("10"));
    expect(cardStrength("10")).toBeGreaterThan(cardStrength("K"));
    expect(cardStrength("K")).toBeGreaterThan(cardStrength("Q"));
    expect(cardStrength("Q")).toBeGreaterThan(cardStrength("8"));
    expect(cardStrength("8")).toBeGreaterThan(cardStrength("7"));
  });

  it("deals four cards to each player for the opening auction and assigns opposite partnerships", () => {
    const state = makeState();
    expect(state.phase).toBe("bidding");
    expect(state.players).toHaveLength(4);
    expect(state.players.every((player) => player.hand.length === 4)).toBe(true);
    expect(state.players[0]?.team).toBe(state.players[2]?.team);
    expect(state.players[1]?.team).toBe(state.players[3]?.team);
    expect(state.players[0]?.team).not.toBe(state.players[1]?.team);
    expect(state.drawPile).toHaveLength(16);
    expect(state.currentPlayerId).not.toBe(state.dealerPlayerId);
    const orderedSeats = state.players.slice().sort((a, b) => a.seat - b.seat);
    const dealerIndex = orderedSeats.findIndex((player) => player.userId === state.dealerPlayerId);
    expect(state.currentPlayerId).toBe(orderedSeats[(dealerIndex + 1) % orderedSeats.length]?.userId);
  });

  it("offers bids from 16 upward and validates only legal auction actions", () => {
    const state = makeState();
    const current = state.currentPlayerId;
    expect(current).toBeTruthy();
    const legal = getLegalTwentyNineActions({ state, playerId: current! });
    expect(legal).toContainEqual({ type: "bid", value: 16 });
    expect(legal).toContainEqual({ type: "bid", value: 28 });
    expect(legal).not.toContainEqual({ type: "bid", value: 29 });
    expect(validateTwentyNineAction({ state, settings, playerId: current!, action: { type: "bid", value: 16 } }).ok).toBe(true);
    expect(validateTwentyNineAction({ state, settings, playerId: current!, action: { type: "bid", value: 15 } }).ok).toBe(false);
    expect(validateTwentyNineAction({ state, settings, playerId: "not-seated", action: { type: "pass_bid" } }).ok).toBe(false);
  });

  it("allows Ditto only to an opposing team and never immediately after another Ditto", () => {
    const state = makeState();
    state.currentBid = 17;
    state.highestBidderId = "p0";
    state.lastBidWasDitto = false;
    state.firstBidderId = "p1";
    state.phase = "bidding";
    state.currentPlayerId = "p1";
    expect(getLegalTwentyNineActions({ state, playerId: "p1" })).toContainEqual({ type: "ditto" });
    state.currentPlayerId = "p2";
    expect(getLegalTwentyNineActions({ state, playerId: "p2" })).not.toContainEqual({ type: "ditto" });
    state.currentPlayerId = "p1";
    state.lastBidWasDitto = true;
    expect(getLegalTwentyNineActions({ state, playerId: "p1" })).not.toContainEqual({ type: "ditto" });
  });

  it("requires following suit even after trump has been revealed", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p1";
    state.trumpSuit = "hearts";
    state.trumpRevealed = true;
    state.declarerId = "p0";
    state.currentTrick = [{ playerId: "p0", card: { id: "spades-7", suit: "spades", rank: "7", points: 0 } }];
    const offSuit: TwentyNineCard = { id: "hearts-J", suit: "hearts", rank: "J", points: 3 };
    const followSuit: TwentyNineCard = { id: "spades-8", suit: "spades", rank: "8", points: 0 };
    state.players.find((player) => player.userId === "p1")!.hand = [offSuit, followSuit];
    const legal = getLegalTwentyNineActions({ state, playerId: "p1" });
    expect(legal).toContainEqual({ type: "play_card", cardId: followSuit.id });
    expect(legal).not.toContainEqual({ type: "play_card", cardId: offSuit.id });
  });


  it("does not leak the hidden trump suit to opponents or room-wide selection events", () => {
    const state = makeState();
    state.phase = "trump";
    state.currentPlayerId = "p0";
    state.declarerId = "p0";
    state.highestBidderId = "p0";
    state.currentBid = 18;
    const result = action(state, "p0", "choose_trump_suit", { suit: "hearts" });
    const selectedEvent = result.events.find((event) => event.type === "twenty-nine:trump_selected");
    expect(selectedEvent).toBeTruthy();
    expect((selectedEvent?.payload as Record<string, unknown> | undefined)?.suit).toBe(undefined);
    expect(getPublicTwentyNineState({ state: result.state, viewerId: "p1" }).trumpSuit).toBe(null);
    expect(getPublicTwentyNineState({ state: result.state, viewerId: "p0" }).trumpSuit).toBe("hearts");
  });



  it("follows the Bangladesh partner-takeover bidding sequence", () => {
    let live = makeState();
    // Use the seat layout from the published South-deals example: East, North, West, South.
    live.dealerPlayerId = "p0";
    live.firstBidderId = "p1";
    live.currentPlayerId = "p1";
    const order = (playerId: string, type: Parameters<typeof applyTwentyNineAction>[0]["action"]["type"], payload: Record<string, unknown> = {}) => {
      const result = action(live, playerId, type, payload);
      live = result.state;
      return result;
    };

    order("p1", "bid", { value: 16 });
    expect(live.currentPlayerId).toBe("p2");
    order("p2", "bid", { value: 17 });
    expect(live.currentPlayerId).toBe("p1");
    order("p1", "ditto");
    expect(live.currentPlayerId).toBe("p2");
    order("p2", "bid", { value: 18 });
    order("p1", "pass_bid");
    expect(live.currentPlayerId).toBe("p3");
    order("p3", "ditto");
    expect(live.currentPlayerId).toBe("p2");
    order("p2", "bid", { value: 19 });
    expect(live.currentPlayerId).toBe("p3");
    order("p3", "ditto");
    expect(live.currentPlayerId).toBe("p2");
    order("p2", "pass_bid");
    expect(live.currentPlayerId).toBe("p0");
    order("p0", "bid", { value: 20 });
    expect(live.currentPlayerId).toBe("p3");
    order("p3", "pass_bid");
    expect(live.phase).toBe("trump");
    expect(live.declarerId).toBe("p0");
    expect(live.currentBid).toBe(20);
  });

  it("finishes the auction, handles double passes, and deals the remaining four cards", () => {
    let live = makeState();
    const openingPlayer = live.currentPlayerId;
    expect(openingPlayer).toBeTruthy();
    live = action(live, openingPlayer!, "bid", { value: 16 }).state;
    const nextBidder = live.currentPlayerId;
    expect(nextBidder).toBeTruthy();
    live = action(live, nextBidder!, "bid", { value: 17 }).state;

    let guard = 0;
    while (live.phase === "bidding" && guard < 8) {
      const acting = live.currentPlayerId;
      expect(acting).toBeTruthy();
      live = action(live, acting!, "pass_bid").state;
      guard += 1;
    }
    expect(live.phase).toBe("trump");
    expect(live.declarerId).toBe(live.highestBidderId);

    const declarer = live.currentPlayerId;
    expect(declarer).toBeTruthy();
    live = action(live, declarer!, "choose_trump_suit", { suit: "hearts" }).state;
    expect(live.phase).toBe("doubling");

    guard = 0;
    while (live.phase === "doubling" && guard < 4) {
      const acting = live.currentPlayerId;
      expect(acting).toBeTruthy();
      live = action(live, acting!, "pass_double").state;
      guard += 1;
    }
    expect(live.phase).toBe("playing");
    expect(live.players.every((player) => player.hand.length === 8)).toBe(true);
    expect(live.drawPile).toHaveLength(0);
    expect(live.trumpSuit).toBe("hearts");
    expect(live.trumpRevealed).toBe(false);
  });

  it("requires a trump reveal before playing off-suit while trump is concealed", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p1";
    state.declarerId = "p0";
    state.trumpSuit = "hearts";
    state.trumpRevealed = false;
    const lead: TwentyNineCard = { id: "lead-spades-7", suit: "spades", rank: "7", points: 0 };
    const offSuit: TwentyNineCard = { id: "heart-J-test", suit: "hearts", rank: "J", points: 3 };
    state.currentTrick = [{ playerId: "p0", card: lead }];
    state.players.find((player) => player.userId === "p1")!.hand = [offSuit];

    const legalBefore = getLegalTwentyNineActions({ state, playerId: "p1" });
    expect(legalBefore).toContainEqual({ type: "reveal_trump" });
    expect(legalBefore).not.toContainEqual({ type: "play_card", cardId: offSuit.id });

    const revealed = action(state, "p1", "reveal_trump").state;
    expect(revealed.trumpRevealed).toBe(true);
    expect(getLegalTwentyNineActions({ state: revealed, playerId: "p1" })).toContainEqual({ type: "play_card", cardId: offSuit.id });
  });

  it("keeps the seventh trump card private until reveal", () => {
    const state = makeState();
    const seventh: TwentyNineCard = { id: "hidden-seventh", suit: "clubs", rank: "A", points: 1 };
    state.phase = "playing";
    state.declarerId = "p0";
    state.trumpSuit = "clubs";
    state.trumpRevealed = false;
    state.seventhCard = seventh;
    state.seventhCardOwnerId = "p0";

    const declarerView = getPublicTwentyNineState({ state, viewerId: "p0" });
    const opponentView = getPublicTwentyNineState({ state, viewerId: "p1" });
    expect(declarerView.privateSeventhCard?.id).toBe("hidden-seventh");
    expect(opponentView.privateSeventhCard).toBe(undefined);
    expect(opponentView.trumpSuit).toBe(null);
    expect(opponentView.players.find((player) => player.userId === "p0")?.handCount).toBe(
      state.players.find((player) => player.userId === "p0")!.hand.length + 1
    );
  });

  it("applies the Bangladesh pair target adjustment", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p1";
    state.declarerId = "p0";
    state.highestBidderId = "p0";
    state.currentBid = 19;
    state.contractTarget = 19;
    state.trumpSuit = "hearts";
    state.trumpRevealed = true;
    state.trumpRevealTrickNumber = 0;
    state.completedTricks = [{
      number: 1,
      cards: [],
      winnerPlayerId: "p0",
      winnerTeam: 0,
      ledSuit: "spades",
      points: 0,
      trumpWasRevealed: true
    }];
    state.players.find((player) => player.userId === "p0")!.hand = [
      { id: "pair-K", suit: "hearts", rank: "K", points: 0 },
      { id: "pair-Q", suit: "hearts", rank: "Q", points: 0 }
    ];
    expect(getLegalTwentyNineActions({ state, playerId: "p0" })).toContainEqual({ type: "declare_pair" });
    const result = action(state, "p0", "declare_pair");
    expect(result.state.contractTarget).toBe(16);
    expect(result.state.pairDeclaredTeam).toBe(0);
  });

  it("awards a trick to the highest card in the led suit when trump does not appear", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentBid = 16;
    state.contractTarget = 16;
    state.highestBidderId = "p0";
    state.declarerId = "p0";
    state.currentPlayerId = "p0";
    state.trumpSuit = "hearts";
    state.trumpRevealed = true;
    state.players.forEach((player) => { player.hand = []; player.tricksWon = 0; });
    const cards: Array<{ playerId: string; card: TwentyNineCard }> = [
      { playerId: "p0", card: { id: "spades-7", suit: "spades", rank: "7", points: 0 } },
      { playerId: "p1", card: { id: "spades-9", suit: "spades", rank: "9", points: 2 } },
      { playerId: "p2", card: { id: "spades-J", suit: "spades", rank: "J", points: 3 } },
      { playerId: "p3", card: { id: "spades-8", suit: "spades", rank: "8", points: 0 } }
    ];
    for (const entry of cards) state.players.find((player) => player.userId === entry.playerId)!.hand = [entry.card];
    let live = state;
    for (let index = 0; index < 4; index += 1) {
      const playerId = live.currentPlayerId;
      expect(playerId).toBeTruthy();
      const entry = cards.find((item) => item.playerId === playerId);
      expect(entry).toBeTruthy();
      const result = action(live, playerId!, "play_card", { cardId: entry!.card.id });
      live = result.state;
    }
    expect(live.completedTricks).toHaveLength(1);
    expect(live.completedTricks[0]?.winnerPlayerId).toBe("p2");
    expect(live.capturedPointsByTeam["0"]).toBe(5);
    expect(live.tricksWonByTeam["0"]).toBe(1);
  });

  it("offers Single Hand to any player before the first card and restores a withheld seventh card", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p0";
    state.declarerId = "p0";
    state.selectedTrumpMode = "seventh";
    state.trumpSuit = "clubs";
    state.trumpRevealed = false;
    state.seventhCard = { id: "seventh-clubs-9", suit: "clubs", rank: "9", points: 2 };
    state.seventhCardOwnerId = "p0";

    expect(getLegalTwentyNineActions({ state, playerId: "p2" })).toContainEqual({ type: "declare_single_hand" });
    const result = action(state, "p2", "declare_single_hand");
    expect(result.state.singleHandPlayerId).toBe("p2");
    expect(result.state.currentPlayerId).toBe("p2");
    expect(result.state.trumpSuit).toBe(null);
    expect(result.state.trumpRevealed).toBe(false);
    expect(result.state.seventhCard).toBe(null);
    expect(result.state.players.find((player) => player.userId === "p0")?.hand.some((card) => card.id === "seventh-clubs-9")).toBe(true);
    expect(getLegalTwentyNineActions({ state: result.state, playerId: "p0" })).toEqual([]);
    expect(getLegalTwentyNineActions({ state: result.state, playerId: "p2" }).some((item) => item.type === "play_card")).toBe(true);
  });

  it("scores Single Hand at +3 after the caller wins all eight three-card tricks", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p0";
    state.singleHandPlayerId = "p0";
    state.declarerId = "p0";
    state.trumpSuit = null;
    state.trumpRevealed = false;
    state.selectedTrumpMode = null;
    state.completedTricks = [];
    state.currentTrick = [];
    state.players.forEach((player) => { player.hand = []; player.tricksWon = 0; });
    state.players.find((player) => player.userId === "p0")!.hand = Array.from({ length: 8 }, (_, index) => ({ id: `solo-${index}`, suit: "spades", rank: "J", points: 3 } as TwentyNineCard));
    state.players.find((player) => player.userId === "p1")!.hand = Array.from({ length: 8 }, (_, index) => ({ id: `enemy1-${index}`, suit: "spades", rank: "7", points: 0 } as TwentyNineCard));
    state.players.find((player) => player.userId === "p3")!.hand = Array.from({ length: 8 }, (_, index) => ({ id: `enemy3-${index}`, suit: "spades", rank: "8", points: 0 } as TwentyNineCard));
    state.players.find((player) => player.userId === "p2")!.hand = Array.from({ length: 8 }, (_, index) => ({ id: `partner-${index}`, suit: "clubs", rank: "7", points: 0 } as TwentyNineCard));

    let live = state;
    for (let trick = 0; trick < 8; trick += 1) {
      for (const playerId of ["p0", "p1", "p3"]) {
        expect(live.currentPlayerId).toBe(playerId);
        const player = live.players.find((item) => item.userId === playerId)!;
        live = action(live, playerId, "play_card", { cardId: player.hand[0]!.id }).state;
      }
    }
    expect(live.phase).toBe("bidding");
    expect(live.handNumber).toBe(2);
    expect(live.teamGamePoints["0"]).toBe(3);
    expect(live.lastHandResult?.scoreChange).toBe(3);
    expect(live.lastHandResult?.succeeded).toBe(true);
  });

  it("scores Single Hand at -3 and ends it immediately when the caller loses a trick", () => {
    const state = makeState();
    state.phase = "playing";
    state.currentPlayerId = "p0";
    state.singleHandPlayerId = "p0";
    state.declarerId = "p0";
    state.trumpSuit = null;
    state.trumpRevealed = false;
    state.selectedTrumpMode = null;
    state.completedTricks = [];
    state.currentTrick = [];
    state.players.forEach((player) => { player.hand = []; player.tricksWon = 0; });
    const cards: Array<{ playerId: string; card: TwentyNineCard }> = [
      { playerId: "p0", card: { id: "solo-spades-7", suit: "spades", rank: "7", points: 0 } },
      { playerId: "p1", card: { id: "enemy-spades-J", suit: "spades", rank: "J", points: 3 } },
      { playerId: "p3", card: { id: "enemy-spades-9", suit: "spades", rank: "9", points: 2 } }
    ];
    for (const entry of cards) state.players.find((player) => player.userId === entry.playerId)!.hand = [entry.card];
    let live = state;
    for (let index = 0; index < 3; index += 1) {
      const playerId = live.currentPlayerId;
      expect(playerId).toBeTruthy();
      const entry = cards.find((item) => item.playerId === playerId);
      expect(entry).toBeTruthy();
      live = action(live, playerId!, "play_card", { cardId: entry!.card.id }).state;
    }
    expect(live.phase).toBe("bidding");
    expect(live.teamGamePoints["0"]).toBe(-3);
    expect(live.handNumber).toBe(2);
  });
});
