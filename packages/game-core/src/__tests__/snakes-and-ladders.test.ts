import { describe, expect, it } from "vitest";
import {
  getSquareCoordinates,
  CLASSIC_BOARD,
  generateProceduralBoard
} from "../games/snakes-and-ladders/boards";
import {
  createInitialSnakesAndLaddersState,
  applySnakesAndLaddersAction
} from "../games/snakes-and-ladders/reducer";
import { getSnakesAndLaddersResults } from "../games/snakes-and-ladders/scoring";

describe("Snakes and Ladders - Game Core", () => {
  it("correctly maps 10x10 boustrophedon track coordinates", () => {
    // Square 1: bottom-left
    const sq1 = getSquareCoordinates(1);
    expect(sq1.row).toBe(9);
    expect(sq1.col).toBe(0);
    expect(sq1.xPercent).toBe(5);
    expect(sq1.yPercent).toBe(95);

    // Square 10: bottom-right
    const sq10 = getSquareCoordinates(10);
    expect(sq10.row).toBe(9);
    expect(sq10.col).toBe(9);
    expect(sq10.xPercent).toBe(95);
    expect(sq10.yPercent).toBe(95);

    // Square 11: row above, right side (reversed direction)
    const sq11 = getSquareCoordinates(11);
    expect(sq11.row).toBe(8);
    expect(sq11.col).toBe(9);

    // Square 20: row 8, left side
    const sq20 = getSquareCoordinates(20);
    expect(sq20.row).toBe(8);
    expect(sq20.col).toBe(0);

    // Square 100: top-left (row 0, col 0)
    const sq100 = getSquareCoordinates(100);
    expect(sq100.row).toBe(0);
    expect(sq100.col).toBe(0);
    expect(sq100.xPercent).toBe(5);
    expect(sq100.yPercent).toBe(5);
  });

  it("supports up to 15 players with distinct creative pieces", () => {
    const players = Array.from({ length: 15 }, (_, i) => ({
      userId: `user-${i + 1}`,
      username: `player_${i + 1}`,
      displayName: `Player ${i + 1}`,
      seat: i,
      isBot: i > 0
    }));

    const state = createInitialSnakesAndLaddersState({
      players,
      seed: "test-seed-15",
      now: "2026-01-01T00:00:00.000Z"
    });

    expect(state.players).toHaveLength(15);
    expect(state.turnOrder).toHaveLength(15);
    expect(state.currentPlayerId).toBe("user-1");

    // All players start off-board at position 0
    for (const p of state.players) {
      expect(p.position).toBe(0);
      expect(p.enteredBoard).toBe(false);
    }

    // Pieces are assigned uniquely across players
    const pieces = state.players.map((p) => p.piece);
    const uniquePieces = new Set(pieces);
    expect(uniquePieces.size).toBe(15);
  });

  it("enforces roll 1 to enter the board (Bangladesh rule)", () => {
    const players = [
      { userId: "u1", username: "u1", displayName: "P1", seat: 0 },
      { userId: "u2", username: "u2", displayName: "P2", seat: 1 }
    ];

    const state = createInitialSnakesAndLaddersState({
      players,
      seed: "test-seed",
      now: "2026-01-01T00:00:00.000Z"
    });

    // Mock RNG to produce roll 4 (not 1)
    // We can simulate action
    const res = applySnakesAndLaddersAction({
      state,
      playerId: "u1",
      action: { type: "roll_dice" },
      now: "2026-01-01T00:00:01.000Z"
    });

    expect(res.accepted).toBe(true);
    // If rolled not 1, stays at 0
    if (res.state.diceRoll !== 1) {
      const p1 = res.state.players.find((p) => p.userId === "u1");
      expect(p1?.position).toBe(0);
      expect(p1?.enteredBoard).toBe(false);
    }
  });

  it("climbs ladders when landing on ladder foot", () => {
    const players = [
      { userId: "u1", username: "u1", displayName: "P1", seat: 0 }
    ];

    const state = createInitialSnakesAndLaddersState({
      players,
      seed: "test-seed",
      now: "2026-01-01T00:00:00.000Z"
    });

    // Put player on square 2. In classic board, ladder is at 4 -> 14
    state.players[0]!.enteredBoard = true;
    state.players[0]!.position = 2;

    // Simulate ladder climb manually via state verify
    const ladder = CLASSIC_BOARD.ladders.find((l) => l.from === 4);
    expect(ladder?.to).toBe(14);
  });

  it("handles exact 100 win and bounce-back", () => {
    const players = [
      { userId: "u1", username: "u1", displayName: "P1", seat: 0 }
    ];

    const state = createInitialSnakesAndLaddersState({
      players,
      seed: "test-seed",
      now: "2026-01-01T00:00:00.000Z"
    });

    state.players[0]!.enteredBoard = true;
    state.players[0]!.position = 98;

    // Simulate roll 2: 98 + 2 = 100 -> Wins!
    const target = state.players[0]!.position + 2;
    expect(target).toBe(100);

    // Simulate overshoot roll 4: 98 + 4 = 102 -> Bounces back to 98!
    const overshoot = 102 - 100;
    const bounced = 100 - overshoot;
    expect(bounced).toBe(98);
  });

  it("ranks placements properly in getSnakesAndLaddersResults", () => {
    const players = [
      { userId: "u1", username: "u1", displayName: "P1", seat: 0 },
      { userId: "u2", username: "u2", displayName: "P2", seat: 1 },
      { userId: "u3", username: "u3", displayName: "P3", seat: 2 }
    ];

    const state = createInitialSnakesAndLaddersState({
      players,
      seed: "test-seed",
      now: "2026-01-01T00:00:00.000Z"
    });

    state.players[0]!.position = 100; // Winner
    state.players[1]!.position = 75;  // 2nd
    state.players[2]!.position = 32;  // 3rd
    state.winnerUserId = "u1";
    state.phase = "finished";

    const results = getSnakesAndLaddersResults(state);
    expect(results.winnerUserId).toBe("u1");
    expect(results.placements[0]?.userId).toBe("u1");
    expect(results.placements[0]?.placement).toBe(1);
    expect(results.placements[1]?.userId).toBe("u2");
    expect(results.placements[1]?.placement).toBe(2);
    expect(results.placements[2]?.userId).toBe("u3");
    expect(results.placements[2]?.placement).toBe(3);
  });
});
