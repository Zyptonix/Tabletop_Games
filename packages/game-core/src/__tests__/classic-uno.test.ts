import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLASSIC_UNO_SETTINGS,
  applyClassicUnoAction,
  createClassicUnoDeck,
  createInitialClassicUnoState,
  getPublicClassicUnoState,
  getLegalClassicUnoActions,
  refillDrawPileIfNeeded,
  validateClassicUnoAction,
  type ClassicUnoState,
  type UnoCard
} from "../games/classic-uno";

const players = [
  { userId: "u1", username: "one", displayName: "One", seat: 0 },
  { userId: "u2", username: "two", displayName: "Two", seat: 1 },
  { userId: "u3", username: "three", displayName: "Three", seat: 2 }
];

function card(id: string, color: UnoCard["color"], value: UnoCard["value"], points = 0): UnoCard {
  return { id, color, value, points };
}

function baseState(): ClassicUnoState {
  return createInitialClassicUnoState({
    players,
    settings: DEFAULT_CLASSIC_UNO_SETTINGS,
    seed: "test-seed",
    now: "2026-01-01T00:00:00.000Z"
  });
}

describe("classic UNO", () => {
  it("defaults new Classic UNO rooms to a 60 second turn timer", () => {
    expect(DEFAULT_CLASSIC_UNO_SETTINGS.turnSeconds).toBe(60);
    expect(baseState().settings.turnSeconds).toBe(60);
  });

  it("creates a standard 108-card deck", () => {
    const deck = createClassicUnoDeck();
    expect(deck).toHaveLength(108);
    expect(deck.filter((item) => item.color === "wild")).toHaveLength(8);
  });

  it("validates card play by color, value, or wild", () => {
    const state = baseState();
    state.discardPile = [card("red-5", "red", "5", 5)];
    state.currentColor = "red";
    state.currentPlayerId = "u1";
    state.players[0]!.hand = [
      card("blue-5", "blue", "5", 5),
      card("green-9", "green", "9", 9),
      card("wild-1", "wild", "wild", 50)
    ];

    expect(
      validateClassicUnoAction({
        state,
        settings: state.settings,
        playerId: "u1",
        action: { type: "play_card", cardId: "blue-5" }
      }).ok
    ).toBe(true);

    expect(
      validateClassicUnoAction({
        state,
        settings: state.settings,
        playerId: "u1",
        action: { type: "play_card", cardId: "green-9" }
      }).ok
    ).toBe(false);

    expect(
      validateClassicUnoAction({
        state,
        settings: state.settings,
        playerId: "u1",
        action: { type: "play_card", cardId: "wild-1", declaredColor: "yellow" }
      }).ok
    ).toBe(true);
  });

  it("reverses direction and advances turn", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.players[0]!.hand = [card("red-reverse", "red", "reverse", 20), card("blue-1", "blue", "1", 1)];

    const result = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-reverse" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(result.state.direction).toBe(-1);
    expect(result.state.currentPlayerId).toBe("u3");
  });

  it("skips the next player", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.players[0]!.hand = [card("red-skip", "red", "skip", 20), card("blue-1", "blue", "1", 1)];

    const result = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-skip" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(result.state.currentPlayerId).toBe("u3");
  });

  it("starts and resolves a Classic draw stack", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.drawPile = [
      card("draw-a", "green", "1", 1),
      card("draw-b", "yellow", "2", 2),
      card("draw-c", "blue", "3", 3),
      card("draw-d", "red", "6", 6)
    ];
    state.players[0]!.hand = [card("red-draw-two", "red", "draw_two", 20), card("blue-1", "blue", "1", 1)];
    state.players[1]!.hand = [card("blue-5", "blue", "5", 5)];

    const stacked = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-draw-two" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(stacked.state.pendingPenalty).toEqual({
      amount: 2,
      source: "draw_two",
      requiredResponseMinPower: 2,
      targetPlayerId: "u2"
    });
    expect(stacked.state.currentPlayerId).toBe("u2");

    const before = stacked.state.players[1]!.hand.length;
    const resolved = applyClassicUnoAction({
      state: stacked.state,
      settings: stacked.state.settings,
      playerId: "u2",
      action: { type: "draw_card" },
      now: "2026-01-01T00:00:11.000Z"
    });

    expect(resolved.state.pendingPenalty).toBeNull();
    expect(resolved.state.players[1]!.hand).toHaveLength(before + 2);
    expect(resolved.state.currentPlayerId).toBe("u3");
  });

  it("allows +2 and +4 Classic stacking by same-or-higher draw power", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.players[0]!.hand = [card("red-draw-two", "red", "draw_two", 20), card("blue-1", "blue", "1", 1)];
    state.players[1]!.hand = [card("wild-plus-four", "wild", "wild_draw_four", 50), card("red-2", "red", "2", 2)];
    state.players[2]!.hand = [card("red-draw-two-next", "red", "draw_two", 20)];

    const first = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-draw-two" },
      now: "2026-01-01T00:00:10.000Z"
    });

    const second = applyClassicUnoAction({
      state: first.state,
      settings: first.state.settings,
      playerId: "u2",
      action: { type: "play_card", cardId: "wild-plus-four", declaredColor: "blue" },
      now: "2026-01-01T00:00:11.000Z"
    });

    expect(second.state.pendingPenalty?.amount).toBe(6);
    expect(second.state.pendingPenalty?.requiredResponseMinPower).toBe(4);
    expect(second.state.pendingPenalty?.targetPlayerId).toBe("u3");
    expect(
      validateClassicUnoAction({
        state: second.state,
        settings: second.state.settings,
        playerId: "u3",
        action: { type: "play_card", cardId: "red-draw-two-next" }
      }).ok
    ).toBe(false);
    expect(getLegalClassicUnoActions({ state: second.state, playerId: "u3" }).some((action) => action.type === "draw_card")).toBe(true);
  });


  it("draws one card at a time until a playable card appears", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.drawPile = [card("blue-9", "blue", "9", 9), card("red-2", "red", "2", 2)];
    state.players[0]!.hand = [card("yellow-3", "yellow", "3", 3)];

    const first = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "draw_card" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(first.state.players[0]!.hand).toHaveLength(2);
    expect(first.state.lastDrawnCardId).toBeNull();
    expect(first.state.currentPlayerId).toBe("u1");
    expect(
      validateClassicUnoAction({ state: first.state, settings: first.state.settings, playerId: "u1", action: { type: "draw_card" } }).ok
    ).toBe(true);

    const second = applyClassicUnoAction({
      state: first.state,
      settings: first.state.settings,
      playerId: "u1",
      action: { type: "draw_card" },
      now: "2026-01-01T00:00:11.000Z"
    });

    expect(second.state.players[0]!.hand).toHaveLength(3);
    expect(second.state.lastDrawnCardId).toBe("red-2");
    expect(second.state.currentPlayerId).toBe("u1");
  });
  it("wild cards require and set declared color", () => {

    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.players[0]!.hand = [card("wild-change", "wild", "wild", 50), card("blue-1", "blue", "1", 1)];

    const result = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "wild-change", declaredColor: "green" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(result.state.currentColor).toBe("green");
  });

  it("detects win condition and creates results", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.players[0]!.hand = [card("red-9", "red", "9", 9)];

    const result = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-9" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(result.state.phase).toBe("finished");
    expect(result.state.winnerUserId).toBe("u1");
    expect(result.state.results?.placements[0]?.userId).toBe("u1");
  });

  it("refills the Classic draw pile by preserving the top discard and shuffling the rest", () => {
    const state = baseState();
    state.drawPile = [];
    state.discardPile = [
      card("old-red-1", "red", "1", 1),
      card("old-blue-2", "blue", "2", 2),
      card("top-green-3", "green", "3", 3)
    ];
    const refilled = refillDrawPileIfNeeded(state);

    expect(refilled.discardPile.map((item) => item.id)).toEqual(["top-green-3"]);
    expect(refilled.drawPile).toHaveLength(2);
    expect(new Set(refilled.drawPile.map((item) => item.id)).size).toBe(2);
    expect(refilled.drawPile.map((item) => item.id).sort()).toEqual(["old-blue-2", "old-red-1"]);
  });
  it("hides other players' hands in public state", () => {
    const state = baseState();
    const publicState = getPublicClassicUnoState({ state, viewerId: "u1" });
    const self = publicState.players.find((player) => player.userId === "u1");
    const other = publicState.players.find((player) => player.userId === "u2");

    expect(self?.hand).toBeDefined();
    expect(other?.hand).toBeUndefined();
    expect(other?.handCount).toBe(DEFAULT_CLASSIC_UNO_SETTINGS.cardsPerPlayer);
  });
});
