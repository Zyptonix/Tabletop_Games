import { z } from "zod";
import type { GameId } from "@tabletop/shared";
import type { GameModule } from "../../engine/GameModule";
import type { GameEvent, GamePlacement, GamePlayer, GameResults, GameTurnInfo, ValidationResult } from "../../engine/GameTypes";

export type GridGameId = "connect-four" | "reversi";
export type GridGameSettings = { turnSeconds: number | null };
export type GridGameAction =
  | { type: "drop"; column: number }
  | { type: "place"; row: number; column: number }
  | { type: "pass" };

export interface GridGamePlayer {
  userId: string;
  displayName: string;
  seat: number;
}

export interface GridGameState {
  gameId: GridGameId;
  version: string;
  settings: GridGameSettings;
  phase: "playing" | "finished";
  players: GridGamePlayer[];
  currentPlayerId: string | null;
  board: (string | null)[][];
  rows: number;
  columns: number;
  winnerUserId: string | null;
  turnStartedAt: string;
  updatedAt: string;
  moveCount: number;
  lastMove: { row: number; column: number; playerId: string } | null;
  results: GameResults | null;
  consecutivePasses: number;
}

export type PublicGridGameState = Pick<
  GridGameState,
  | "gameId"
  | "phase"
  | "players"
  | "currentPlayerId"
  | "board"
  | "rows"
  | "columns"
  | "winnerUserId"
  | "turnStartedAt"
  | "updatedAt"
  | "moveCount"
  | "lastMove"
  | "results"
  | "consecutivePasses"
> & { discsByPlayerId?: Record<string, number> };

const settingsSchema = z.object({
  turnSeconds: z.number().int().min(0).max(600).nullable().default(60)
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("drop"), column: z.number().int().min(0).max(6) }),
  z.object({ type: z.literal("place"), row: z.number().int().min(0).max(7), column: z.number().int().min(0).max(7) }),
  z.object({ type: z.literal("pass") })
]);

const DEFAULT_SETTINGS: GridGameSettings = { turnSeconds: 60 };
const CONNECT_FOUR_ROWS = 6;
const CONNECT_FOUR_COLUMNS = 7;
const REVERSI_SIZE = 8;

function makeEvent(type: string, message: string, now: string, payload?: unknown): GameEvent {
  return { id: `${type}-${Date.parse(now) || Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, message, payload, createdAt: now };
}

function cloneBoard(board: (string | null)[][]): (string | null)[][] {
  return board.map((row) => row.slice());
}

function playerFor(state: GridGameState, userId: string): GridGamePlayer | undefined {
  return state.players.find((player) => player.userId === userId);
}

function nextPlayerId(state: GridGameState, userId: string): string | null {
  if (state.players.length < 2) return null;
  const index = state.players.findIndex((player) => player.userId === userId);
  return state.players[(index + 1) % state.players.length]?.userId ?? null;
}

function makeResults(players: GridGamePlayer[], winnerUserId: string | null): GameResults {
  const placements: GamePlacement[] = players
    .slice()
    .sort((a, b) => Number(b.userId === winnerUserId) - Number(a.userId === winnerUserId) || a.seat - b.seat)
    .map((player, index) => ({
      userId: player.userId,
      placement: winnerUserId ? (player.userId === winnerUserId ? 1 : 2) : 1,
      score: player.userId === winnerUserId ? 1 : 0,
      result: winnerUserId ? (player.userId === winnerUserId ? "WIN" : "LOSS") : "DRAW"
    }));
  const scoreByUserId = Object.fromEntries(placements.map((item) => [item.userId, item.score]));
  return { winnerUserId, placements, scoreByUserId };
}

function finish(state: GridGameState, winnerUserId: string | null, now: string): GridGameState {
  return {
    ...state,
    phase: "finished",
    currentPlayerId: null,
    winnerUserId,
    updatedAt: now,
    results: makeResults(state.players, winnerUserId)
  };
}

function countDiscs(board: (string | null)[][], userId: string): number {
  return board.reduce((total, row) => total + row.filter((cell) => cell === userId).length, 0);
}

function isInside(row: number, column: number, rows: number, columns: number): boolean {
  return row >= 0 && row < rows && column >= 0 && column < columns;
}

function connectFourHasWon(board: (string | null)[][], row: number, column: number, playerId: string): boolean {
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let total = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (isInside(r, c, CONNECT_FOUR_ROWS, CONNECT_FOUR_COLUMNS) && board[r]?.[c] === playerId) {
        total += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    return total >= 4;
  });
}

function connectFourLegalActions(state: GridGameState): GridGameAction[] {
  if (state.phase !== "playing" || !state.currentPlayerId) return [];
  return Array.from({ length: CONNECT_FOUR_COLUMNS }, (_, column) => ({ type: "drop" as const, column }))
    .filter((action) => state.board[0]?.[action.column] === null);
}

const REVERSI_DIRECTIONS: Array<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
];

function reversiFlips(board: (string | null)[][], row: number, column: number, playerId: string, opponentId: string): Array<[number, number]> {
  if (!isInside(row, column, REVERSI_SIZE, REVERSI_SIZE) || board[row]?.[column] !== null) return [];
  const flips: Array<[number, number]> = [];
  for (const [dr, dc] of REVERSI_DIRECTIONS) {
    const line: Array<[number, number]> = [];
    let r = row + dr;
    let c = column + dc;
    while (isInside(r, c, REVERSI_SIZE, REVERSI_SIZE) && board[r]?.[c] === opponentId) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }
    if (line.length > 0 && isInside(r, c, REVERSI_SIZE, REVERSI_SIZE) && board[r]?.[c] === playerId) {
      flips.push(...line);
    }
  }
  return flips;
}

function reversiMoveActions(state: GridGameState, playerId: string): GridGameAction[] {
  const opponentId = state.players.find((player) => player.userId !== playerId)?.userId;
  if (!opponentId) return [];
  const actions: GridGameAction[] = [];
  for (let row = 0; row < REVERSI_SIZE; row += 1) {
    for (let column = 0; column < REVERSI_SIZE; column += 1) {
      if (reversiFlips(state.board, row, column, playerId, opponentId).length > 0) {
        actions.push({ type: "place", row, column });
      }
    }
  }
  return actions;
}

function reversiScoreWinner(state: GridGameState): string | null {
  const counts = state.players.map((player) => ({ userId: player.userId, count: countDiscs(state.board, player.userId) }));
  const first = counts[0];
  const second = counts[1];
  if (!first || !second || first.count === second.count) return null;
  return first.count > second.count ? first.userId : second.userId;
}

function reversiIsFull(board: (string | null)[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

function getLegalActionsForState(state: GridGameState, playerId: string): GridGameAction[] {
  if (state.phase !== "playing" || state.currentPlayerId !== playerId) return [];
  if (state.gameId === "connect-four") return connectFourLegalActions(state);
  const moves = reversiMoveActions(state, playerId);
  if (moves.length > 0) return moves;
  const opponentId = state.players.find((player) => player.userId !== playerId)?.userId;
  if (!opponentId || reversiMoveActions(state, opponentId).length === 0) return [];
  return [{ type: "pass" }];
}

function createInitialState(params: {
  players: GamePlayer[];
  settings: GridGameSettings;
  seed: string;
  now: string;
}, gameId: GridGameId): GridGameState {
  const players = params.players.slice().sort((a, b) => a.seat - b.seat).map((player) => ({
    userId: player.userId,
    displayName: player.displayName,
    seat: player.seat
  }));
  const rows = gameId === "connect-four" ? CONNECT_FOUR_ROWS : REVERSI_SIZE;
  const columns = gameId === "connect-four" ? CONNECT_FOUR_COLUMNS : REVERSI_SIZE;
  const board: (string | null)[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
  if (gameId === "reversi") {
    const first = players[0]?.userId;
    const second = players[1]?.userId;
    if (first && second) {
      board[3]![3] = second;
      board[3]![4] = first;
      board[4]![3] = first;
      board[4]![4] = second;
    }
  }
  return {
    gameId,
    version: "0.1.0",
    settings: params.settings,
    phase: "playing",
    players,
    currentPlayerId: players[0]?.userId ?? null,
    board,
    rows,
    columns,
    winnerUserId: null,
    turnStartedAt: params.now,
    updatedAt: params.now,
    moveCount: 0,
    lastMove: null,
    results: null,
    consecutivePasses: 0
  };
}

function applyGridAction(params: {
  state: GridGameState;
  playerId: string;
  action: GridGameAction;
  now: string;
}): { state: GridGameState; events: GameEvent[] } {
  const { state, playerId, action, now } = params;
  const legal = getLegalActionsForState(state, playerId);
  const isLegal = legal.some((item) => item.type === action.type &&
    (item.type !== "drop" || (action.type === "drop" && item.column === action.column)) &&
    (item.type !== "place" || (action.type === "place" && item.row === action.row && item.column === action.column)));
  if (!isLegal) return { state, events: [] };

  if (state.gameId === "connect-four" && action.type === "drop") {
    const board = cloneBoard(state.board);
    let row = -1;
    for (let r = state.rows - 1; r >= 0; r -= 1) {
      if (board[r]?.[action.column] === null) { row = r; break; }
    }
    if (row < 0) return { state, events: [] };
    board[row]![action.column] = playerId;
    const moved: GridGameState = {
      ...state,
      board,
      moveCount: state.moveCount + 1,
      lastMove: { row, column: action.column, playerId },
      updatedAt: now,
      turnStartedAt: now,
      consecutivePasses: 0
    };
    if (connectFourHasWon(board, row, action.column, playerId)) {
      return { state: finish(moved, playerId, now), events: [makeEvent("connect_four_win", `${playerFor(state, playerId)?.displayName ?? "A player"} connected four.`, now, { playerId, row, column: action.column })] };
    }
    if (board.every((cells) => cells.every((cell) => cell !== null))) {
      return { state: finish(moved, null, now), events: [makeEvent("connect_four_draw", "The board is full. The match is a draw.", now)] };
    }
    const next = nextPlayerId(state, playerId);
    return { state: { ...moved, currentPlayerId: next }, events: [makeEvent("disc_dropped", `${playerFor(state, playerId)?.displayName ?? "A player"} dropped a disc.`, now, { playerId, row, column: action.column })] };
  }

  if (state.gameId === "reversi" && action.type === "place") {
    const opponentId = state.players.find((player) => player.userId !== playerId)?.userId;
    if (!opponentId) return { state, events: [] };
    const flips = reversiFlips(state.board, action.row, action.column, playerId, opponentId);
    const board = cloneBoard(state.board);
    board[action.row]![action.column] = playerId;
    for (const [row, column] of flips) board[row]![column] = playerId;
    let moved: GridGameState = {
      ...state,
      board,
      moveCount: state.moveCount + 1,
      lastMove: { row: action.row, column: action.column, playerId },
      updatedAt: now,
      turnStartedAt: now,
      consecutivePasses: 0
    };
    if (reversiIsFull(board) || (reversiMoveActions(moved, playerId).length === 0 && reversiMoveActions(moved, opponentId).length === 0)) {
      return { state: finish(moved, reversiScoreWinner(moved), now), events: [makeEvent("reversi_finished", "No more legal moves remain.", now, { discsByPlayerId: Object.fromEntries(moved.players.map((player) => [player.userId, countDiscs(board, player.userId)])) })] };
    }
    const nextMoves = reversiMoveActions(moved, opponentId);
    if (nextMoves.length === 0) {
      moved = { ...moved, currentPlayerId: playerId, consecutivePasses: 1 };
      return { state: moved, events: [makeEvent("reversi_move", `${playerFor(state, playerId)?.displayName ?? "A player"} placed a disc and flipped ${flips.length} disc${flips.length === 1 ? "" : "s"}. The opponent has no legal move, so the turn continues.`, now, { playerId, row: action.row, column: action.column, flips })] };
    }
    return { state: { ...moved, currentPlayerId: opponentId }, events: [makeEvent("reversi_move", `${playerFor(state, playerId)?.displayName ?? "A player"} placed a disc and flipped ${flips.length} disc${flips.length === 1 ? "" : "s"}.`, now, { playerId, row: action.row, column: action.column, flips })] };
  }

  if (state.gameId === "reversi" && action.type === "pass") {
    const next = nextPlayerId(state, playerId);
    if (!next) return { state, events: [] };
    const passed = { ...state, currentPlayerId: next, consecutivePasses: state.consecutivePasses + 1, updatedAt: now, turnStartedAt: now };
    if (reversiMoveActions(passed, next).length === 0) {
      return { state: finish(passed, reversiScoreWinner(passed), now), events: [makeEvent("reversi_finished", "Neither player can make a legal move.", now)] };
    }
    return { state: passed, events: [makeEvent("reversi_pass", `${playerFor(state, playerId)?.displayName ?? "A player"} has no legal move and passes.`, now)] };
  }
  return { state, events: [] };
}

function createModule(gameId: GridGameId, displayName: string, minPlayers: number, maxPlayers: number): GameModule<GridGameState, GridGameAction, GridGameSettings> {
  return {
    id: gameId as GameId,
    displayName,
    version: "0.1.0",
    minPlayers,
    maxPlayers,
    defaultSettings: DEFAULT_SETTINGS,
    settingsSchema,
    actionSchema,
    createInitialState: (params) => createInitialState(params, gameId),
    getPublicState: ({ state }) => {
      const publicState: PublicGridGameState = {
        gameId: state.gameId,
        phase: state.phase,
        players: state.players,
        currentPlayerId: state.currentPlayerId,
        board: state.board,
        rows: state.rows,
        columns: state.columns,
        winnerUserId: state.winnerUserId,
        turnStartedAt: state.turnStartedAt,
        updatedAt: state.updatedAt,
        moveCount: state.moveCount,
        lastMove: state.lastMove,
        results: state.results,
        consecutivePasses: state.consecutivePasses,
        ...(state.gameId === "reversi" ? { discsByPlayerId: Object.fromEntries(state.players.map((player) => [player.userId, countDiscs(state.board, player.userId)])) } : {})
      };
      return publicState;
    },
    getLegalActions: ({ state, playerId }) => getLegalActionsForState(state, playerId),
    validateAction: ({ state, playerId, action }): ValidationResult => {
      const legal = getLegalActionsForState(state, playerId);
      const allowed = legal.some((item) => item.type === action.type &&
        (item.type !== "drop" || (action.type === "drop" && item.column === action.column)) &&
        (item.type !== "place" || (action.type === "place" && item.row === action.row && item.column === action.column)));
      return allowed ? { ok: true } : { ok: false, code: "ILLEGAL_ACTION", message: "That move is not legal in the current position." };
    },
    applyAction: applyGridAction,
    getTurnInfo: (state): GameTurnInfo => ({
      currentPlayerId: state.currentPlayerId,
      turnStartedAt: state.phase === "playing" ? state.turnStartedAt : null,
      turnSeconds: state.settings.turnSeconds
    }),
    getTimeoutAction: ({ state, playerId }) => {
      const action = getLegalActionsForState(state, playerId)[0];
      return action ? { playerId, action } : null;
    },
    isGameOver: (state) => state.phase === "finished",
    getResults: (state) => state.results ?? makeResults(state.players, state.winnerUserId)
  };
}

export const connectFourModule = createModule("connect-four", "Connect Four", 2, 2);
export const reversiModule = createModule("reversi", "Reversi", 2, 2);
