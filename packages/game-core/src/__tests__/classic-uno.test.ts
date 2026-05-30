import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLASSIC_UNO_SETTINGS,
  applyClassicUnoAction,
  createClassicUnoDeck,
  createInitialClassicUnoState,
  getPublicClassicUnoState,
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

  it("draw two gives cards to the target and skips them", () => {
    const state = baseState();
    state.currentPlayerId = "u1";
    state.currentColor = "red";
    state.discardPile = [card("red-4", "red", "4", 4)];
    state.drawPile = [card("draw-a", "green", "1", 1), card("draw-b", "yellow", "2", 2)];
    state.players[0]!.hand = [card("red-draw-two", "red", "draw_two", 20), card("blue-1", "blue", "1", 1)];
    const before = state.players[1]!.hand.length;

    const result = applyClassicUnoAction({
      state,
      settings: state.settings,
      playerId: "u1",
      action: { type: "play_card", cardId: "red-draw-two" },
      now: "2026-01-01T00:00:10.000Z"
    });

    expect(result.state.players[1]!.hand).toHaveLength(before + 2);
    expect(result.state.currentPlayerId).toBe("u3");
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
