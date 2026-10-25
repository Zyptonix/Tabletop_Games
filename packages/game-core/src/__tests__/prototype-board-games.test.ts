import { describe, expect, it } from "vitest";
import {
  barricadesModule,
  battleshipModule,
  chessModule,
  codenamesPrototypeModule,
  ludoModule,
  monopolyPrototypeModule,
  pokerModule,
  riskModule,
  worldConquestModule,
  type PrototypeGameState
} from "../games/prototype-board-games";
import type { GamePlayer } from "../engine/GameTypes";

const players: GamePlayer[] = [
  { userId: "p1", username: "p1", displayName: "Player One", seat: 0 },
  { userId: "p2", username: "p2", displayName: "Player Two", seat: 1 }
];
function start(module: { createInitialState: (params: { players: GamePlayer[]; settings: never; seed: string; now: string }) => unknown }) {
  return module.createInitialState({ players, settings: { turnSeconds: null } as never, seed: "prototype-test", now: "2026-10-25T00:00:00.000Z" }) as PrototypeGameState;
}

describe("prototype board-game modules are registered and start valid states", () => {
  it("creates a standard chess layout and legal opening moves", () => {
    const state = start(chessModule);
    expect(state.board).toHaveLength(8);
    expect(state.board[0]).toEqual(["r", "n", "b", "q", "k", "b", "n", "r"]);
    expect(chessModule.getLegalActions({ state, playerId: "p1" }).length).toBeGreaterThan(0);
  });
  it("keeps battleship fleet cells private to each viewer", () => {
    const state = start(battleshipModule);
    const one = battleshipModule.getPublicState({ state, viewerId: "p1" }) as { ownShipCells: string[] };
    const two = battleshipModule.getPublicState({ state, viewerId: "p2" }) as { ownShipCells: string[] };
    expect(one.ownShipCells.length).toBe(17);
    expect(two.ownShipCells.length).toBe(17);
    expect(one.ownShipCells).not.toEqual(two.ownShipCells);
  });
  it("starts Ludo with four tokens in each base", () => {
    const state = start(ludoModule);
    expect(state.ludoTokens.p1).toEqual([-1, -1, -1, -1]);
    expect(ludoModule.getLegalActions({ state, playerId: "p1" })).toContainEqual({ type: "roll_dice" });
  });
  it("initializes Barricades walls and player pawns", () => {
    const state = start(barricadesModule);
    expect(state.pawns.p1).toEqual({ x: 4, y: 0 });
    expect(state.pawns.p2).toEqual({ x: 4, y: 8 });
    expect(state.wallsRemaining.p1).toBe(10);
  });
  it("initializes a property track with 40 spaces and starting funds", () => {
    const state = start(monopolyPrototypeModule);
    expect(state.properties).toHaveLength(40);
    expect(state.money.p1).toBe(1500);
  });
  it("provides separate compact Risk and larger World Conquest maps", () => {
    expect(start(riskModule).territories.length).toBeGreaterThan(10);
    expect(start(worldConquestModule).territories.length).toBeGreaterThan(10);
    expect(start(worldConquestModule).territories[0]?.id).toContain("world-");
  });
  it("does not leak the hidden Codenames key before cards are revealed", () => {
    const state = start(codenamesPrototypeModule);
    const view = codenamesPrototypeModule.getPublicState({ state, viewerId: "p1" }) as { wordCards: Array<{ revealedRole: string | null }> };
    expect(view.wordCards).toHaveLength(25);
    expect(view.wordCards.every((card) => card.revealedRole === null)).toBe(true);
  });
  it("deals two private poker cards and hides other players' holes", () => {
    const state = start(pokerModule);
    const p1 = pokerModule.getPublicState({ state, viewerId: "p1" }) as { myPokerCards: string[] };
    const p2 = pokerModule.getPublicState({ state, viewerId: "p2" }) as { myPokerCards: string[] };
    expect(p1.myPokerCards).toHaveLength(2);
    expect(p2.myPokerCards).toHaveLength(2);
    expect(p1.myPokerCards).not.toEqual(p2.myPokerCards);
  });
});
