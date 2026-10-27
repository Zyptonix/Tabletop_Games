// TABLETOP ARENA FULL PATCH V4
// TABLETOP GAME ENGINE CONTINUATION V3
import { describe, expect, it } from "vitest";
import {
  barricadesModule,
  battleshipModule,
  chessModule,
  codenamesModule,
  ludoModule,
  monopolyModule,
  pokerModule,
  riskModule,
  worldConquestModule,
  evaluateTexasHoldemHand,
  type BoardGameState
} from "../games";
import type { GamePlayer } from "../engine/GameTypes";

const players: GamePlayer[] = [
  { userId: "p1", username: "p1", displayName: "Player One", seat: 0 },
  { userId: "p2", username: "p2", displayName: "Player Two", seat: 1 }
];
function start(module: { createInitialState: (params: { players: GamePlayer[]; settings: never; seed: string; now: string }) => unknown }) {
  return module.createInitialState({ players, settings: { turnSeconds: null } as never, seed: "board-game-test", now: "2026-10-25T00:00:00.000Z" }) as BoardGameState;
}

describe("board-game board-game modules are registered and start valid states", () => {
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
    const state = start(monopolyModule);
    expect(state.properties).toHaveLength(40);
    expect(state.money.p1).toBe(1500);
  });
  it("provides separate compact Risk and larger World Conquest maps", () => {
    expect(start(riskModule).territories.length).toBeGreaterThan(10);
    expect(start(worldConquestModule).territories.length).toBeGreaterThan(10);
    expect(start(worldConquestModule).territories[0]?.id).toContain("world-");
  });
  it("does not leak the hidden Codenames key to an operative", () => {
    const operativePlayers: GamePlayer[] = [
      { userId: "p1", username: "p1", displayName: "Red Spy", seat: 0 },
      { userId: "p2", username: "p2", displayName: "Blue Spy", seat: 1 },
      { userId: "p3", username: "p3", displayName: "Red Operative", seat: 2 },
      { userId: "p4", username: "p4", displayName: "Blue Operative", seat: 3 }
    ];
    const state = codenamesModule.createInitialState({ players: operativePlayers, settings: { turnSeconds: null } as never, seed: "hidden-key-test", now: "2026-10-25T00:00:00.000Z" }) as BoardGameState;
    const view = codenamesModule.getPublicState({ state, viewerId: "p3" }) as { wordCards: Array<{ revealedRole: string | null; keyRole: string | null }> };
    expect(view.wordCards).toHaveLength(25);
    expect(view.wordCards.every((card) => card.revealedRole === null && card.keyRole === null)).toBe(true);
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

// Backend rules hardening v2: focused regression tests for previously incorrect mechanics.
describe("backend rules hardening v2", () => {
  it("requires exact Ludo home entry rather than clamping an overshoot", () => {
    const state = start(ludoModule);
    state.hasRolled = true;
    state.diceRoll = 2;
    state.ludoTokens.p1![0] = 56;
    expect(ludoModule.getLegalActions({ state, playerId: "p1" })).not.toContainEqual({ type: "move_token", tokenIndex: 0 });
    state.diceRoll = 1;
    expect(ludoModule.getLegalActions({ state, playerId: "p1" })).toContainEqual({ type: "move_token", tokenIndex: 0 });
  });

  it("captures an opponent token on an unprotected Ludo square and grants the capture bonus turn", () => {
    const state = start(ludoModule);
    state.hasRolled = true;
    state.diceRoll = 1;
    state.ludoTokens.p1![0] = 3;
    state.ludoTokens.p2![0] = 43; // seat 1's progress 43 maps onto seat 0's track square 4.
    const result = ludoModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "move_token", tokenIndex: 0 },
      now: "2026-10-25T00:01:00.000Z"
    });
    expect(result.state.ludoTokens.p2?.[0]).toBe(-1);
    expect(result.state.currentPlayerId).toBe("p1");
  });

  it("rejects overlapping/crossing Barricades walls", () => {
    const state = start(barricadesModule);
    state.walls = [{ x: 3, y: 0, orientation: "h", playerId: "p2" }];
    const legal = barricadesModule.getLegalActions({ state, playerId: "p1" });
    expect(legal).not.toContainEqual({ type: "place_wall", x: 3, y: 0, orientation: "h" });
    expect(legal).not.toContainEqual({ type: "place_wall", x: 3, y: 0, orientation: "v" });
  });

  it("ranks Texas Hold'em hands by the best five-card combination", () => {
    const royalFlush = evaluateTexasHoldemHand(["A♠", "K♠", "Q♠", "J♠", "10♠", "2♦", "3♣"]);
    const fourOfAKind = evaluateTexasHoldemHand(["A♠", "A♥", "A♦", "A♣", "K♠", "K♦", "2♣"]);
    const wheelStraight = evaluateTexasHoldemHand(["A♠", "2♥", "3♦", "4♣", "5♠", "K♦", "9♣"]);
    expect(royalFlush[0]).toBe(8);
    expect(fourOfAKind[0]).toBe(7);
    expect(wheelStraight).toEqual([4, 5]);
  });
});

// Chess special-move and draw-regression cases for V3.
describe("chess rules continuation v3", () => {
  it("offers legal castling only when rights and clear king-side path exist", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![4] = "K"; state.board[7]![7] = "R";
    state.board[0]![4] = "k"; state.board[0]![7] = "r";
    state.chessCastlingRights = "K"; state.currentPlayerId = "p1";
    expect(chessModule.getLegalActions({ state, playerId: "p1" })).toContainEqual({ type: "move_piece", from: 60, to: 62 });
    state.board[7]![5] = "N";
    expect(chessModule.getLegalActions({ state, playerId: "p1" })).not.toContainEqual({ type: "move_piece", from: 60, to: 62 });
  });

  it("supports en passant and removes the bypassed pawn", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![7] = "K"; state.board[0]![7] = "k";
    state.board[3]![4] = "P"; state.board[3]![3] = "p";
    state.chessCastlingRights = ""; state.chessEnPassantTarget = 19; state.currentPlayerId = "p1";
    const result = chessModule.applyAction({ state, playerId: "p1", action: { type: "move_piece", from: 28, to: 19 }, now: "2026-10-25T00:02:00.000Z" });
    expect(result.state.board[2]?.[3]).toBe("P");
    expect(result.state.board[3]?.[3]).toBeNull();
    expect((result.state as BoardGameState).chessEnPassantTarget).toBeNull();
  });

  it("offers all four standard promotion choices", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![7] = "K"; state.board[0]![7] = "k"; state.board[1]![0] = "P";
    state.chessCastlingRights = ""; state.currentPlayerId = "p1";
    const moves = chessModule.getLegalActions({ state, playerId: "p1" }).filter((action) => action.type === "move_piece" && action.from === 8 && action.to === 0);
    expect(moves.map((action) => action.type === "move_piece" ? action.promotion : null).sort()).toEqual(["b", "n", "q", "r"]);
  });
});

// V4: a completed hand is not a completed Poker tournament.
describe("Poker tournament hand lifecycle v4", () => {
  it("rotates the button and starts a second hand after a fold-out", () => {
    const state = start(pokerModule);
    const beforeHand = state.pokerHandNumber;
    const beforeChips = Object.values(state.pokerStacks).reduce((sum, stack) => sum + stack, 0) + state.pokerPot;
    const actor = state.currentPlayerId;
    expect(actor).toBeTruthy();
    const result = pokerModule.applyAction({
      state,
      playerId: actor!,
      action: { type: "poker_action", choice: "fold" },
      now: "2026-10-25T00:03:00.000Z"
    });
    const next = result.state as BoardGameState;
    const afterChips = Object.values(next.pokerStacks).reduce((sum, stack) => sum + stack, 0) + next.pokerPot;
    expect(next.phase).toBe("playing");
    expect(next.pokerHandNumber).toBe(beforeHand + 1);
    expect(next.pokerStreet).toBe("preflop");
    expect(next.communityCards).toHaveLength(0);
    expect(next.pokerButtonSeat).not.toBe(state.pokerButtonSeat);
    expect(afterChips).toBe(beforeChips);
  });
});


describe("Ludo and Battleships rule regressions v4", () => {
  it("forfeits a turn on the third consecutive six in Ludo", () => {
    const state = start(ludoModule);
    state.currentPlayerId = "p1";
    state.rngState = 1542; // next LCG value produces a six
    state.ludoConsecutiveSixes.p1 = 2;
    const result = ludoModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "roll_dice" },
      now: "2026-10-25T00:04:00.000Z"
    });
    const next = result.state as BoardGameState;
    expect(next.currentPlayerId).toBe("p2");
    expect(next.hasRolled).toBe(false);
    expect(next.diceRoll).toBeNull();
    expect(next.ludoConsecutiveSixes.p1).toBe(0);
  });

  it("resets the six streak when a six leaves no legal Ludo token move", () => {
    const state = start(ludoModule);
    state.currentPlayerId = "p1";
    state.ludoTokens.p1 = [56, 56, 56, 56];
    state.diceRoll = 6;
    state.hasRolled = true;
    state.ludoConsecutiveSixes.p1 = 1;
    const result = ludoModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "end_turn" },
      now: "2026-10-25T00:04:30.000Z"
    });
    const next = result.state as BoardGameState;
    expect(next.currentPlayerId).toBe("p2");
    expect(next.ludoConsecutiveSixes.p1).toBe(0);
  });

  it("uses five Quoridor walls per player in a four-player table", () => {
    const fourPlayers: GamePlayer[] = [
      { userId: "p1", username: "p1", displayName: "Player One", seat: 0 },
      { userId: "p2", username: "p2", displayName: "Player Two", seat: 1 },
      { userId: "p3", username: "p3", displayName: "Player Three", seat: 2 },
      { userId: "p4", username: "p4", displayName: "Player Four", seat: 3 }
    ];
    const state = barricadesModule.createInitialState({
      players: fourPlayers,
      settings: { turnSeconds: null } as never,
      seed: "barricades-four-player",
      now: "2026-10-25T00:04:45.000Z"
    }) as BoardGameState;
    expect(Object.values(state.wallsRemaining)).toEqual([5, 5, 5, 5]);
  });

  it("tracks individual Battleships ships and only marks a ship sunk on its final hit", () => {
    const state = start(battleshipModule);
    const target = "p2";
    const ships = state.shipGroupsByPlayer[target]!;
    expect(ships).toHaveLength(5);
    expect(ships.map((ship) => ship.length).sort((a, b) => a - b)).toEqual([2, 3, 3, 4, 5]);
    const carrier = ships.find((ship) => ship.length === 5)!;
    for (const cell of carrier.slice(0, -1)) {
      const [x, y] = cell.split(",").map(Number);
      state.shots.push({ shooterId: "p1", targetId: target, x: x!, y: y!, hit: true, sunk: false });
    }
    const remaining = carrier[carrier.length - 1]!;
    const [x, y] = remaining.split(",").map(Number);
    const result = battleshipModule.applyAction({
      state: { ...state, currentPlayerId: "p1" },
      playerId: "p1",
      action: { type: "fire", x: x!, y: y! },
      now: "2026-10-25T00:05:00.000Z"
    });
    const shotHistory = (result.state as BoardGameState).shots;
    const latest = shotHistory[shotHistory.length - 1];
    expect(latest?.hit).toBe(true);
    expect(latest?.sunk).toBe(true);
    expect((result.state as BoardGameState).phase).toBe("playing");
  });

  it("allows custom fleet placement and transitions to battle when both players lock in", () => {
    const state = start(battleshipModule);
    expect(state.battleshipPhase).toBe("placement");
    const p1Ships = state.shipDetailsByPlayer!["p1"]!;
    const p2Ships = state.shipDetailsByPlayer!["p2"]!;

    const validation1 = battleshipModule.validateAction({
      state,
      playerId: "p1",
      action: { type: "place_fleet", ships: p1Ships }
    });
    expect(validation1.ok).toBe(true);

    const res1 = battleshipModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "place_fleet", ships: p1Ships },
      now: "2026-10-25T00:05:00.000Z"
    });
    expect((res1.state as BoardGameState).battleshipReady?.["p1"]).toBe(true);
    expect((res1.state as BoardGameState).battleshipPhase).toBe("placement");

    const res2 = battleshipModule.applyAction({
      state: res1.state as BoardGameState,
      playerId: "p2",
      action: { type: "place_fleet", ships: p2Ships },
      now: "2026-10-25T00:05:01.000Z"
    });
    expect((res2.state as BoardGameState).battleshipReady?.["p2"]).toBe(true);
    expect((res2.state as BoardGameState).battleshipPhase).toBe("battle");
  });

  it("grants another turn on direct hit and switches player on miss", () => {
    const state = start(battleshipModule);
    const p2Ships = state.shipDetailsByPlayer!["p2"]!;
    const hitCoord = p2Ships[0]!.cells[0]!.split(",").map(Number);
    const hitX = hitCoord[0]!;
    const hitY = hitCoord[1]!;

    // P1 fires a hit
    const hitResult = battleshipModule.applyAction({
      state: { ...state, currentPlayerId: "p1", battleshipPhase: "battle" },
      playerId: "p1",
      action: { type: "fire", x: hitX, y: hitY },
      now: "2026-10-25T00:05:00.000Z"
    });
    // P1 should retain their turn!
    expect((hitResult.state as BoardGameState).currentPlayerId).toBe("p1");

    // Find an empty cell for miss
    const p2Cells = new Set(p2Ships.flatMap((s) => s.cells));
    let missX = 0;
    let missY = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!p2Cells.has(`${c},${r}`)) {
          missX = c;
          missY = r;
          break;
        }
      }
    }

    // P1 fires a miss
    const missResult = battleshipModule.applyAction({
      state: hitResult.state as BoardGameState,
      playerId: "p1",
      action: { type: "fire", x: missX, y: missY },
      now: "2026-10-25T00:05:02.000Z"
    });
    // Turn should pass to P2!
    expect((missResult.state as BoardGameState).currentPlayerId).toBe("p2");
  });

  it("supports battleship chess clock time deduction", () => {
    const players: GamePlayer[] = [
      { userId: "p1", username: "p1", displayName: "Commander 1", seat: 0 },
      { userId: "p2", username: "p2", displayName: "Commander 2", seat: 1 }
    ];
    const state = battleshipModule.createInitialState({
      players,
      settings: { clockSeconds: 300, turnSeconds: null } as never,
      seed: "battleship-clock",
      now: "2026-10-25T00:00:00.000Z"
    }) as BoardGameState;

    expect(state.clockRemainingMsByPlayer?.["p1"]).toBe(300000);
    expect(state.clockRemainingMsByPlayer?.["p2"]).toBe(300000);

    // Apply action 5 seconds later
    const result = battleshipModule.applyAction({
      state: { ...state, battleshipPhase: "battle", currentPlayerId: "p1", turnStartedAt: "2026-10-25T00:00:00.000Z" },
      playerId: "p1",
      action: { type: "fire", x: 0, y: 0 },
      now: "2026-10-25T00:00:05.000Z"
    });

    expect((result.state as BoardGameState).clockRemainingMsByPlayer?.["p1"]).toBe(295000);
  });
});

// TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES

describe("Codenames team and clue rules v5", () => {
  const fourPlayers: GamePlayer[] = [
    { userId: "p1", username: "p1", displayName: "Red Spy", seat: 0 },
    { userId: "p2", username: "p2", displayName: "Blue Spy", seat: 1 },
    { userId: "p3", username: "p3", displayName: "Red Operative", seat: 2 },
    { userId: "p4", username: "p4", displayName: "Blue Operative", seat: 3 }
  ];
  const startTeamGame = () => codenamesModule.createInitialState({
    players: fourPlayers,
    settings: { turnSeconds: null } as never,
    seed: "codenames-v5-regression",
    now: "2026-10-26T00:00:00.000Z"
  }) as BoardGameState;

  it("shows the full hidden key only to that team's spymaster", () => {
    const state = startTeamGame();
    const spy = codenamesModule.getPublicState({ state, viewerId: "p1" }) as {
      isCodenamesSpymaster: boolean;
      wordCards: Array<{ revealedRole: string | null; keyRole: string | null }>;
    };
    const operative = codenamesModule.getPublicState({ state, viewerId: "p3" }) as {
      isCodenamesSpymaster: boolean;
      wordCards: Array<{ revealedRole: string | null; keyRole: string | null }>;
    };
    expect(spy.isCodenamesSpymaster).toBe(true);
    expect(spy.wordCards.every((card) => card.keyRole !== null)).toBe(true);
    expect(spy.wordCards.every((card) => card.revealedRole === null)).toBe(true);
    expect(operative.isCodenamesSpymaster).toBe(false);
    expect(operative.wordCards.every((card) => card.keyRole === null && card.revealedRole === null)).toBe(true);
  });

  it("accepts one-word clues from the active spymaster and moves to an operative", () => {
    const state = startTeamGame();
    const clue = { type: "give_clue" as const, clue: "Tropical", number: 2 };
    expect(codenamesModule.validateAction({ state, playerId: "p1", action: clue }).ok).toBe(true);
    expect(codenamesModule.validateAction({ state, playerId: "p3", action: clue }).ok).toBe(false);
    const result = codenamesModule.applyAction({ state, playerId: "p1", action: clue, now: "2026-10-26T00:01:00.000Z" });
    const next = result.state as BoardGameState;
    expect(next.currentPlayerId).toBe("p3");
    expect(next.codenamesClue).toBe("Tropical");
    expect(next.codenamesClueNumber).toBe(2);
    expect(next.codenamesGuessesRemaining).toBe(3);
  });

  it("rejects a clue that repeats a visible grid word", () => {
    const state = startTeamGame();
    const boardWord = state.wordCards[0]!.word.toLowerCase();
    expect(codenamesModule.validateAction({ state, playerId: "p1", action: { type: "give_clue", clue: boardWord, number: 1 } }).ok).toBe(false);
  });

  it("allows a correct guess to continue until the clue budget is consumed", () => {
    const initial = startTeamGame();
    const afterClue = codenamesModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 1 }, now: "2026-10-26T00:01:00.000Z" }).state as BoardGameState;
    const correctIndex = afterClue.wordCards.findIndex((card) => card.role === "red");
    const afterGuess = codenamesModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: correctIndex }, now: "2026-10-26T00:02:00.000Z" }).state as BoardGameState;
    expect(afterGuess.phase).toBe("playing");
    expect(afterGuess.codenamesGuessesRemaining).toBe(1);
    expect(afterGuess.currentPlayerId).toBe("p3");
  });

  it("awards the completed match to every player on the winning team", () => {
    const state = startTeamGame();
    state.phase = "finished";
    state.winnerUserId = "p2";
    const results = codenamesModule.getResults(state);
    expect(results.scoreByUserId).toEqual({ p2: 1, p4: 1, p1: 0, p3: 0 });
    expect(results.placements.filter((placement) => placement.result === "WIN").map((placement) => placement.userId).sort()).toEqual(["p2", "p4"]);
  });

  it("ends immediately when an operative reveals the assassin", () => {
    const initial = startTeamGame();
    const afterClue = codenamesModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 1 }, now: "2026-10-26T00:01:00.000Z" }).state as BoardGameState;
    const assassinIndex = afterClue.wordCards.findIndex((card) => card.role === "assassin");
    const afterGuess = codenamesModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: assassinIndex }, now: "2026-10-26T00:02:00.000Z" }).state as BoardGameState;
    expect(afterGuess.phase).toBe("finished");
    expect(afterGuess.winnerUserId).toBe("p2");
  });

  it("passes the turn after a neutral guess and resets the clue phase", () => {
    const initial = startTeamGame();
    const afterClue = codenamesModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 2 }, now: "2026-10-26T00:01:00.000Z" }).state as BoardGameState;
    const neutralIndex = afterClue.wordCards.findIndex((card) => card.role === "neutral");
    const afterGuess = codenamesModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: neutralIndex }, now: "2026-10-26T00:02:00.000Z" }).state as BoardGameState;
    expect(afterGuess.phase).toBe("playing");
    expect(afterGuess.codenamesRoundTeam).toBe("blue");
    expect(afterGuess.currentPlayerId).toBe("p2");
    expect(afterGuess.codenamesClue).toBeNull();
    expect(afterGuess.codenamesGuessesRemaining).toBe(0);
  });
});
