import { describe, expect, it } from "vitest";
import { connectFourModule, reversiModule, type GridGameState } from "../games/board-games";

const players = [
  { userId: "p1", username: "p1", displayName: "Player One", seat: 0 },
  { userId: "p2", username: "p2", displayName: "Player Two", seat: 1 }
];
const settings = { turnSeconds: 60 };
const now = "2026-10-25T00:00:00.000Z";

function move(module: typeof connectFourModule, state: GridGameState, playerId: string, action: { type: "drop"; column: number } | { type: "place"; row: number; column: number } | { type: "pass" }, minute: number) {
  const result = module.applyAction({ state, playerId, action, now: `2026-10-25T00:0${minute}:00.000Z` });
  expect(result.events.length).toBeGreaterThan(0);
  return result.state;
}

describe("Connect Four", () => {
  it("starts empty, alternates turns, and detects a vertical four", () => {
    let state = connectFourModule.createInitialState({ players, settings, seed: "test", now }) as GridGameState;
    expect(state.board).toHaveLength(6);
    expect(connectFourModule.getLegalActions({ state, playerId: "p1" })).toHaveLength(7);
    const sequence = [0, 1, 0, 1, 0, 1, 0];
    sequence.forEach((column, index) => {
      const userId = index % 2 === 0 ? "p1" : "p2";
      state = move(connectFourModule, state, userId, { type: "drop", column }, index + 1);
    });
    expect(state.phase).toBe("finished");
    expect(state.winnerUserId).toBe("p1");
    expect(connectFourModule.getResults(state).placements.find((item) => item.userId === "p1")?.result).toBe("WIN");
  });

  it("rejects a move from the wrong player", () => {
    const state = connectFourModule.createInitialState({ players, settings, seed: "test", now }) as GridGameState;
    expect(connectFourModule.validateAction({ state, playerId: "p2", action: { type: "drop", column: 2 } }).ok).toBe(false);
  });
});

describe("Reversi", () => {
  it("starts with the four center discs and four legal moves", () => {
    const state = reversiModule.createInitialState({ players, settings, seed: "test", now }) as GridGameState;
    expect(state.board.flat().filter(Boolean)).toHaveLength(4);
    expect(reversiModule.getLegalActions({ state, playerId: "p1" })).toHaveLength(4);
  });

  it("places a disc and flips the bracketed opponent disc", () => {
    const state = reversiModule.createInitialState({ players, settings, seed: "test", now }) as GridGameState;
    const legal = reversiModule.getLegalActions({ state, playerId: "p1" }) as Array<{ type: string; row: number; column: number }>;
    const action = legal.find((candidate) => candidate.row === 2 && candidate.column === 3);
    expect(action).toBeDefined();
    const result = reversiModule.applyAction({ state, playerId: "p1", action: action as { type: "place"; row: number; column: number }, now });
    expect(result.state.board[2]?.[3]).toBe("p1");
    expect(result.state.board[3]?.[3]).toBe("p1");
    expect(result.state.currentPlayerId).toBe("p2");
  });

  it("only permits a pass when the current player has no legal moves", () => {
    const state = reversiModule.createInitialState({ players, settings, seed: "test", now }) as GridGameState;
    expect(reversiModule.validateAction({ state, playerId: "p1", action: { type: "pass" } }).ok).toBe(false);
  });
});
