import { describe, expect, it } from "vitest";
import {
  DEFAULT_NO_MERCY_SETTINGS,
  applyNoMercyAction,
  createInitialNoMercyState,
  createNoMercyDeck,
  getPublicNoMercyState,
  validateNoMercyAction,
  type NoMercyCard,
  type NoMercyState
} from "../games/uno-no-mercy";
import type { GamePlayer } from "../engine/GameTypes";

const players: GamePlayer[] = [
  { userId: "p1", username: "p1", displayName: "P1", seat: 0 },
  { userId: "p2", username: "p2", displayName: "P2", seat: 1 },
  { userId: "p3", username: "p3", displayName: "P3", seat: 2 }
];

function card(color: NoMercyCard["color"], value: NoMercyCard["value"]): NoMercyCard {
  const found = createNoMercyDeck().find((item) => item.color === color && item.value === value);
  if (!found) {
    throw new Error(`Missing ${color} ${value}`);
  }
  return { ...found, id: `${found.id}-test-${Math.random()}` };
}

function stateWithHands(hands: Record<string, NoMercyCard[]>, currentColor: NoMercyState["currentColor"] = "red"): NoMercyState {
  const state = createInitialNoMercyState({
    players,
    settings: DEFAULT_NO_MERCY_SETTINGS,
    seed: "test-seed",
    now: "2026-05-30T00:00:00.000Z"
  });

  return {
    ...state,
    currentPlayerId: "p1",
    currentColor,
    discardPile: [card(currentColor, "5")],
    players: state.players.map((player) => ({
      ...player,
      hand: hands[player.userId] ?? []
    }))
  };
}

describe("uno no mercy", () => {
  it("builds the expected No Mercy-only cards", () => {
    const deck = createNoMercyDeck();
    expect(deck.some((item) => item.color === "red" && item.value === "draw_four")).toBe(true);
    expect(deck.some((item) => item.color === "wild" && item.value === "wild_draw_four_reverse")).toBe(true);
    expect(deck.some((item) => item.color === "wild" && item.value === "wild_draw_six")).toBe(true);
    expect(deck.some((item) => item.color === "wild" && item.value === "wild_draw_ten")).toBe(true);
    expect(deck.some((item) => item.color === "wild" && item.value === "roulette")).toBe(true);
  });

  it("allows colored draw four only on matching current color", () => {
    const redDrawFour = card("red", "draw_four");
    const greenDrawFour = card("green", "draw_four");
    const state = stateWithHands({ p1: [redDrawFour, greenDrawFour] }, "red");

    expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action: { type: "play_card", cardId: redDrawFour.id } }).ok).toBe(true);
    expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action: { type: "play_card", cardId: greenDrawFour.id } }).ok).toBe(false);
  });

  it("swaps hands when a 7 is played with a valid target", () => {
    const seven = card("red", "7");
    const state = stateWithHands({
      p1: [seven],
      p2: [card("blue", "4"), card("green", "8")],
      p3: [card("yellow", "2")]
    });

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: seven.id, targetPlayerId: "p2" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(2);
    expect(result.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(0);
  });

  it("passes hands when a 0 is played", () => {
    const zero = card("red", "0");
    const p2Card = card("blue", "4");
    const p3Card = card("yellow", "2");
    const state = stateWithHands({
      p1: [zero],
      p2: [p2Card],
      p3: [p3Card]
    });

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: zero.id },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.players.find((player) => player.userId === "p1")?.hand[0]?.id).toBe(p3Card.id);
    expect(result.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(0);
    expect(result.state.players.find((player) => player.userId === "p3")?.hand[0]?.id).toBe(p2Card.id);
  });

  it("filters private hands per viewer", () => {
    const state = stateWithHands({
      p1: [card("red", "1")],
      p2: [card("blue", "4")]
    });

    const publicForP1 = getPublicNoMercyState({ state, viewerId: "p1" });
    expect(publicForP1.players.find((player) => player.userId === "p1")?.hand).toHaveLength(1);
    expect(publicForP1.players.find((player) => player.userId === "p2")?.hand).toBeUndefined();
    expect(publicForP1.players.find((player) => player.userId === "p2")?.handCount).toBe(1);
  });
});
