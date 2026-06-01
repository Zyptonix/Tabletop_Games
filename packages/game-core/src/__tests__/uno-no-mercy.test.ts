import { describe, expect, it } from "vitest";
import {
  DEFAULT_NO_MERCY_SETTINGS,
  NO_MERCY_COLORS,
  NO_MERCY_COUNTS,
  NO_MERCY_DECK_TOTAL,
  applyNoMercyAction,
  createInitialNoMercyState,
  createNoMercyDeck,
  getNoMercyDeckCountSummary,
  getPublicNoMercyState,
  validateNoMercyAction,
  type NoMercyCard,
  type NoMercyState
} from "../games/uno-no-mercy";
import type { GamePlayer } from "../engine/GameTypes";
import { refillDrawPileIfNeeded } from "../games/uno-no-mercy/rules";

const players: GamePlayer[] = [
  { userId: "p1", username: "p1", displayName: "P1", seat: 0 },
  { userId: "p2", username: "p2", displayName: "P2", seat: 1 },
  { userId: "p3", username: "p3", displayName: "P3", seat: 2 }
];

let testCardCounter = 0;

function cloneCard(source: NoMercyCard): NoMercyCard {
  testCardCounter += 1;
  return { ...source, id: `${source.id}-test-${testCardCounter}` };
}

function card(color: NoMercyCard["color"], value: NoMercyCard["value"]): NoMercyCard {
  const found = createNoMercyDeck().find((item) => item.color === color && item.value === value);
  if (!found) {
    throw new Error(`Missing ${color} ${value}`);
  }
  return cloneCard(found);
}

function many(source: NoMercyCard, count: number): NoMercyCard[] {
  return Array.from({ length: count }, () => cloneCard(source));
}

function stateWithHands(
  hands: Record<string, NoMercyCard[]>,
  currentColor: NoMercyState["currentColor"] = "red",
  drawPile: NoMercyCard[] = []
): NoMercyState {
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
    drawPile,
    discardPile: [card(currentColor, "5")],
    players: state.players.map((player) => ({
      ...player,
      hand: hands[player.userId] ?? []
    }))
  };
}

function stateWithPending(candidate: NoMercyCard, minStackValue: number, amount = minStackValue): NoMercyState {
  return {
    ...stateWithHands({ p1: [candidate] }, "red"),
    currentPlayerId: "p1",
    pendingPenalty: {
      amount,
      source: minStackValue === 2 ? "draw_two" : minStackValue === 4 ? "draw_four" : minStackValue === 6 ? "wild_draw_six" : "wild_draw_ten",
      requiredResponseMinPower: minStackValue,
      targetPlayerId: "p1"
    }
  };
}

function expectPlayable(state: NoMercyState, action: { type: "play_card"; cardId: string; declaredColor?: NoMercyState["currentColor"] }) {
  expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action }).ok).toBe(true);
}

function expectNotPlayable(state: NoMercyState, action: { type: "play_card"; cardId: string; declaredColor?: NoMercyState["currentColor"] }) {
  expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action }).ok).toBe(false);
}

function getEventPayload<T extends Record<string, unknown>>(
  events: Array<{ type: string; payload?: unknown }>,
  type: string
): T {
  const event = events.find((item) => item.type === type);
  expect(event).toBeDefined();
  return event?.payload as T;
}

describe("uno no mercy", () => {
  it("builds the exact provided No Mercy deck counts", () => {
    const deck = createNoMercyDeck();
    const summary = getNoMercyDeckCountSummary(deck);

    expect(deck).toHaveLength(NO_MERCY_DECK_TOTAL);
    expect(NO_MERCY_DECK_TOTAL).toBe(168);

    for (const color of NO_MERCY_COLORS) {
      for (let value = 0; value <= 9; value += 1) {
        expect(summary[`${color}:${value}`]).toBe(NO_MERCY_COUNTS.perColor.numbersEach);
      }
      expect(summary[`${color}:skip`]).toBe(NO_MERCY_COUNTS.perColor.skip);
      expect(summary[`${color}:comeback`]).toBe(NO_MERCY_COUNTS.perColor.skipEveryone);
      expect(summary[`${color}:reverse`]).toBe(NO_MERCY_COUNTS.perColor.reverse);
      expect(summary[`${color}:draw_two`]).toBe(NO_MERCY_COUNTS.perColor.drawTwo);
      expect(summary[`${color}:draw_four`]).toBe(NO_MERCY_COUNTS.perColor.drawFour);
      expect(summary[`${color}:discard_all`]).toBe(NO_MERCY_COUNTS.perColor.discardAll);
    }

    expect(summary["wild:wild_draw_four_reverse"]).toBe(NO_MERCY_COUNTS.wild.reverseDrawFour);
    expect(summary["wild:wild_draw_six"]).toBe(NO_MERCY_COUNTS.wild.drawSix);
    expect(summary["wild:wild_draw_ten"]).toBe(NO_MERCY_COUNTS.wild.drawTen);
    expect(summary["wild:roulette"]).toBe(NO_MERCY_COUNTS.wild.colorRoulette);
    expect(summary["wild:wild_draw_four"] ?? 0).toBe(0);
  });

  it("allows colored draw four only on matching current color", () => {
    const redDrawFour = card("red", "draw_four");
    const greenDrawFour = card("green", "draw_four");
    const state = stateWithHands({ p1: [redDrawFour, greenDrawFour] }, "red");

    expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action: { type: "play_card", cardId: redDrawFour.id } }).ok).toBe(true);
    expect(validateNoMercyAction({ state, settings: state.settings, playerId: "p1", action: { type: "play_card", cardId: greenDrawFour.id } }).ok).toBe(false);
  });

  it("enforces equal-or-higher draw stacking", () => {
    const plusTwo = card("red", "draw_two");
    const plusFour = card("red", "draw_four");
    const plusSix = card("wild", "wild_draw_six");
    const plusTen = card("wild", "wild_draw_ten");

    expectPlayable(stateWithPending(plusTwo, 2), { type: "play_card", cardId: plusTwo.id });
    expectPlayable(stateWithPending(plusFour, 2), { type: "play_card", cardId: plusFour.id });
    expectNotPlayable(stateWithPending(plusTwo, 4), { type: "play_card", cardId: plusTwo.id });
    expectPlayable(stateWithPending(plusTen, 6), { type: "play_card", cardId: plusTen.id, declaredColor: "blue" });
    expectNotPlayable(stateWithPending(plusSix, 10), { type: "play_card", cardId: plusSix.id, declaredColor: "green" });
  });

  it("accumulates stacked draw penalties and raises the required response value", () => {
    const redDrawTwo = card("red", "draw_two");
    const redDrawFour = card("red", "draw_four");
    let state = stateWithHands({
      p1: [redDrawTwo, card("blue", "1")],
      p2: [redDrawFour, card("blue", "2")],
      p3: [card("yellow", "3")]
    });

    let result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: redDrawTwo.id },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.pendingPenalty?.amount).toBe(2);
    expect(result.state.pendingPenalty?.requiredResponseMinPower).toBe(2);
    expect(result.state.currentPlayerId).toBe("p2");

    state = result.state;
    result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p2",
      action: { type: "play_card", cardId: redDrawFour.id },
      now: "2026-05-30T00:00:02.000Z"
    });

    expect(result.state.pendingPenalty?.amount).toBe(6);
    expect(result.state.pendingPenalty?.requiredResponseMinPower).toBe(4);
    expect(result.state.currentPlayerId).toBe("p3");
  });

  it("resolves an unresolved stack by drawing the total amount and losing the turn", () => {
    const drawPile = many(card("blue", "1"), 6);
    const state = {
      ...stateWithHands({ p1: [], p2: [card("green", "3")], p3: [card("yellow", "4")] }, "red", drawPile),
      pendingPenalty: {
        amount: 6,
        source: "draw_four" as const,
        requiredResponseMinPower: 4,
        targetPlayerId: "p1"
      }
    };

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.pendingPenalty).toBeNull();
    expect(result.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(6);
    expect(result.state.currentPlayerId).toBe("p2");

    const payload = getEventPayload<{ playerId: string; amount: number; actuallyDrawn: number; source: string }>(
      result.events,
      "uno-no-mercy:penalty_resolved"
    );
    expect(payload.playerId).toBe("p1");
    expect(payload.amount).toBe(6);
    expect(payload.actuallyDrawn).toBe(6);
    expect(payload.source).toBe("stack");
  });

  it("eliminates a player at the 25-card mercy limit", () => {
    const state = stateWithHands(
      { p1: many(card("red", "1"), 24) },
      "red",
      [card("blue", "2")]
    );

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.players.find((player) => player.userId === "p1")?.eliminated).toBe(true);
    expect(result.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(0);
    expect(result.state.mercyPile).toHaveLength(25);
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

    const payload = getEventPayload<{ fromPlayerId: string; toPlayerId: string; fromCount: number; toCount: number }>(
      result.events,
      "uno-no-mercy:seven_swap"
    );
    expect(payload.fromPlayerId).toBe("p1");
    expect(payload.toPlayerId).toBe("p2");
    expect(payload.fromCount).toBe(0);
    expect(payload.toCount).toBe(2);
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

    const payload = getEventPayload<{ transfers: Array<{ fromPlayerId: string; toPlayerId: string; cardCount: number }> }>(
      result.events,
      "uno-no-mercy:zero_pass"
    );
    expect(payload.transfers.map((transfer) => transfer.cardCount).sort()).toEqual([0, 1, 1]);
  });



  it("lets any equal-or-higher draw card stack regardless of color", () => {
    const greenDrawFour = card("green", "draw_four");
    const state = stateWithPending(greenDrawFour, 2, 2);
    state.currentColor = "red";

    expectPlayable(state, { type: "play_card", cardId: greenDrawFour.id });
  });

  it("draws one normal card at a time until a playable card appears", () => {
    const drawPile = [card("blue", "1"), card("green", "2"), card("red", "9")];
    const state = stateWithHands({ p1: [card("yellow", "3")], p2: [card("blue", "4")], p3: [card("green", "5")] }, "red", drawPile);

    const first = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(first.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(2);
    expect(first.state.lastDrawnCardId).toBeNull();
    expect(first.state.currentPlayerId).toBe("p1");
    expect(validateNoMercyAction({ state: first.state, settings: first.state.settings, playerId: "p1", action: { type: "draw_card" } }).ok).toBe(true);

    const second = applyNoMercyAction({
      state: first.state,
      settings: first.state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:02.000Z"
    });

    expect(second.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(3);
    expect(second.state.lastDrawnCardId).toBeNull();
    expect(second.state.currentPlayerId).toBe("p1");

    const third = applyNoMercyAction({
      state: second.state,
      settings: second.state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:03.000Z"
    });

    expect(third.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(4);
    expect(third.state.lastDrawnCardId).toBe(drawPile[2]?.id);
    expect(third.state.currentPlayerId).toBe("p1");
  });

  it("keeps Discard All as the visible top discard after extra discards", () => {
    const discardAll = card("red", "discard_all");
    const extraRed = card("red", "5");
    const blue = card("blue", "1");
    const state = stateWithHands({ p1: [discardAll, extraRed, blue], p2: [card("green", "4")], p3: [card("yellow", "6")] }, "red");

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: discardAll.id },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.discardPile.at(-1)?.id).toBe(discardAll.id);
    expect(result.state.players.find((player) => player.userId === "p1")?.hand.map((item) => item.id)).toEqual([blue.id]);
  });

  it("Wild Reverse Draw 4 targets the player who played it in a two-player game", () => {
    const twoPlayers = players.slice(0, 2);
    const wildReverse = card("wild", "wild_draw_four_reverse");
    const initial = createInitialNoMercyState({
      players: twoPlayers,
      settings: DEFAULT_NO_MERCY_SETTINGS,
      seed: "two-player-test",
      now: "2026-05-30T00:00:00.000Z"
    });
    const state: NoMercyState = {
      ...initial,
      currentPlayerId: "p1",
      currentColor: "red",
      discardPile: [card("red", "5")],
      players: initial.players.map((player) => ({
        ...player,
        hand: player.userId === "p1" ? [wildReverse] : [card("blue", "2")]
      }))
    };

    const result = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: wildReverse.id, declaredColor: "blue" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(result.state.pendingPenalty?.amount).toBe(4);
    expect(result.state.pendingPenalty?.targetPlayerId).toBe("p1");
    expect(result.state.currentPlayerId).toBe("p1");
  });

  it("starts pending roulette, then target chooses a color and draws revealed cards one by one", () => {
    const roulette = card("wild", "roulette");
    const wildSix = card("wild", "wild_draw_six");
    const blue = card("blue", "2");
    const yellow = card("yellow", "3");
    const state = stateWithHands(
      { p1: [roulette, card("blue", "9")], p2: [card("red", "1")], p3: [card("green", "1")] },
      "red",
      [wildSix, blue, yellow]
    );

    const pending = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "play_card", cardId: roulette.id },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(pending.state.pendingRoulette).toEqual({ targetPlayerId: "p2", playedByPlayerId: "p1", revealedCards: [] });
    expect(pending.state.currentPlayerId).toBe("p2");
    expect(pending.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(1);
    expect(validateNoMercyAction({ state: pending.state, settings: pending.state.settings, playerId: "p2", action: { type: "draw_card" } }).ok).toBe(false);
    expect(validateNoMercyAction({ state: pending.state, settings: pending.state.settings, playerId: "p2", action: { type: "resolve_roulette", chosenColor: "yellow" } }).ok).toBe(true);

    const chosen = applyNoMercyAction({
      state: pending.state,
      settings: pending.state.settings,
      playerId: "p2",
      action: { type: "resolve_roulette", chosenColor: "yellow" },
      now: "2026-05-30T00:00:02.000Z"
    });

    expect(chosen.state.pendingRoulette).toEqual({
      targetPlayerId: "p2",
      playedByPlayerId: "p1",
      chosenColor: "yellow",
      revealedCards: []
    });
    expect(chosen.state.currentPlayerId).toBe("p2");
    expect(validateNoMercyAction({ state: chosen.state, settings: chosen.state.settings, playerId: "p2", action: { type: "draw_card" } }).ok).toBe(true);

    const firstReveal = applyNoMercyAction({
      state: chosen.state,
      settings: chosen.state.settings,
      playerId: "p2",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:03.000Z"
    });

    expect(firstReveal.state.pendingRoulette?.revealedCards.map((item) => item.id)).toEqual([wildSix.id]);
    expect(firstReveal.state.currentPlayerId).toBe("p2");
    expect(firstReveal.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(2);

    const secondReveal = applyNoMercyAction({
      state: firstReveal.state,
      settings: firstReveal.state.settings,
      playerId: "p2",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:04.000Z"
    });

    expect(secondReveal.state.pendingRoulette?.revealedCards.map((item) => item.id)).toEqual([wildSix.id, blue.id]);
    expect(secondReveal.state.currentPlayerId).toBe("p2");
    expect(secondReveal.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(3);

    const result = applyNoMercyAction({
      state: secondReveal.state,
      settings: secondReveal.state.settings,
      playerId: "p2",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:05.000Z"
    });

    expect(result.state.pendingRoulette).toBeNull();
    expect(result.state.players.find((player) => player.userId === "p2")?.hand).toHaveLength(4);
    expect(result.state.currentPlayerId).toBe("p3");

    const payload = getEventPayload<{
      targetPlayerId: string;
      chosenColor: string;
      revealedCards: NoMercyCard[];
      matchedCardId?: string;
      actuallyDrawn: number;
    }>(result.events, "uno-no-mercy:roulette");
    expect(payload.targetPlayerId).toBe("p2");
    expect(payload.chosenColor).toBe("yellow");
    expect(payload.revealedCards.map((item) => item.id)).toEqual([wildSix.id, blue.id, yellow.id]);
    expect(payload.matchedCardId).toBe(yellow.id);
    expect(payload.actuallyDrawn).toBe(3);
  });

  it("refills from discard and mercy piles without duplicating cards", () => {
    const state = stateWithHands({ p1: [card("red", "1")], p2: [], p3: [] });
    const discardA = card("blue", "2");
    const discardB = card("green", "3");
    const topDiscard = card("red", "5");
    const mercyA = card("yellow", "4");
    const mercyB = card("blue", "6");
    const refilled = refillDrawPileIfNeeded({
      ...state,
      drawPile: [],
      discardPile: [discardA, discardB, topDiscard],
      mercyPile: [mercyA, mercyB]
    });

    expect(refilled.discardPile.map((item) => item.id)).toEqual([topDiscard.id]);
    expect(refilled.mercyPile).toHaveLength(0);
    expect(refilled.drawPile).toHaveLength(4);
    expect(new Set(refilled.drawPile.map((item) => item.id)).size).toBe(4);
    expect(refilled.drawPile.map((item) => item.id).sort()).toEqual([discardA.id, discardB.id, mercyA.id, mercyB.id].sort());
  });
  it("sets eliminated hands aside and refills from mercy pile for full stack penalties", () => {
    const filler = card("blue", "1");
    let state = stateWithHands(
      { p1: many(card("red", "1"), 24), p2: [], p3: [] },
      "red",
      [filler]
    );

    const eliminated = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p1",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:01.000Z"
    });

    expect(eliminated.state.players.find((player) => player.userId === "p1")?.eliminated).toBe(true);
    expect(eliminated.state.players.find((player) => player.userId === "p1")?.hand).toHaveLength(0);
    expect(eliminated.state.mercyPile).toHaveLength(25);

    state = {
      ...eliminated.state,
      phase: "playing",
      currentPlayerId: "p2",
      pendingPenalty: {
        amount: 20,
        source: "wild_draw_ten",
        requiredResponseMinPower: 10,
        targetPlayerId: "p2"
      },
      drawPile: many(card("green", "2"), 4),
      discardPile: [card("red", "5")],
      players: eliminated.state.players.map((player) =>
        player.userId === "p2" ? { ...player, hand: [], eliminated: false } : player
      )
    };

    const resolved = applyNoMercyAction({
      state,
      settings: state.settings,
      playerId: "p2",
      action: { type: "draw_card" },
      now: "2026-05-30T00:00:02.000Z"
    });

    const p2 = resolved.state.players.find((player) => player.userId === "p2");
    expect(p2?.hand).toHaveLength(20);

    const payload = getEventPayload<{ amount: number; actuallyDrawn: number }>(
      resolved.events,
      "uno-no-mercy:penalty_resolved"
    );
    expect(payload.amount).toBe(20);
    expect(payload.actuallyDrawn).toBe(20);
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
    expect(publicForP1.turnStartedAt).toBe(state.turnStartedAt);
    expect(publicForP1.turnDurationMs).toBe((state.settings.turnSeconds ?? 0) * 1000);
    expect(publicForP1.turnExpiresAt).toBeTruthy();
  });
});

