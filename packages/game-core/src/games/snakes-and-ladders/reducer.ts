import { nextRandom } from "../../engine/rng";
import { getBoardPreset } from "./boards";
import { getSnakesAndLaddersResults } from "./scoring";
import {
  SNAKES_AND_LADDERS_PIECES,
  type SnakesAndLaddersAction,
  type SnakesAndLaddersActivityItem,
  type SnakesAndLaddersMoveEvent,
  type SnakesAndLaddersPieceId,
  type SnakesAndLaddersPlayer,
  type SnakesAndLaddersState
} from "./types";

export interface SnakesAndLaddersReduction {
  accepted: boolean;
  message?: string;
  state: SnakesAndLaddersState;
}

export function createInitialSnakesAndLaddersState(params: {
  players: Array<{ userId: string; username: string; displayName: string; seat: number; isBot?: boolean }>;
  settings?: {
    boardPreset?: "classic" | "jungle" | "dunes" | "chaos";
    turnSeconds?: number | null;
    exactRollToWin?: boolean;
    rollOneToEnter?: boolean;
    playerPieces?: Record<string, SnakesAndLaddersPieceId>;
  };
  seed: string;
  now: string;
}): SnakesAndLaddersState {
  const seedNum = params.seed.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 12345);
  const presetId = params.settings?.boardPreset ?? "classic";
  const board = getBoardPreset(presetId, seedNum);

  // Assign creative pieces (use selection from settings or unique random distribution)
  const piecePool = [...SNAKES_AND_LADDERS_PIECES.map((p) => p.id)];
  const assignedPieces = new Set<string>();

  const players: SnakesAndLaddersPlayer[] = params.players
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((p, index) => {
      let piece: SnakesAndLaddersPieceId | undefined = params.settings?.playerPieces?.[p.userId];
      if (!piece || assignedPieces.has(piece)) {
        // Find first available unused piece or rotate
        piece = piecePool.find((candidate) => !assignedPieces.has(candidate)) ?? piecePool[index % piecePool.length]!;
      }
      assignedPieces.add(piece);

      return {
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        seat: p.seat,
        isBot: Boolean(p.isBot),
        piece,
        position: 0, // Starts at Home (0)
        enteredBoard: false,
        consecutiveSixes: 0,
        lastRoll: null,
        lastRollResult: null
      };
    });

  const turnOrder = players.map((p) => p.userId);

  return {
    gameId: "snakes-and-ladders",
    version: "1.0.0",
    settings: {
      boardPreset: presetId,
      turnSeconds: params.settings?.turnSeconds ?? 20,
      exactRollToWin: params.settings?.exactRollToWin ?? true,
      rollOneToEnter: params.settings?.rollOneToEnter ?? true,
      playerPieces: params.settings?.playerPieces ?? {}
    },
    phase: "playing",
    players,
    turnOrder,
    currentPlayerId: turnOrder[0] ?? null,
    diceRoll: null,
    hasRolled: false,
    board,
    lastMove: null,
    winnerUserId: null,
    results: null,
    activityLog: [
      {
        id: `act-init-${Date.now()}`,
        type: "game_started",
        message: "🎲 Snakes and Ladders match started! Roll a 1 to enter the board.",
        playerId: null,
        createdAt: params.now
      }
    ],
    actionNumber: 0,
    rngState: seedNum,
    turnStartedAt: params.now,
    startedAt: params.now,
    updatedAt: params.now
  };
}

function nextPlayerId(state: SnakesAndLaddersState, currentId: string): string {
  const index = state.turnOrder.indexOf(currentId);
  if (index === -1) return state.turnOrder[0] ?? currentId;
  return state.turnOrder[(index + 1) % state.turnOrder.length]!;
}

function pushActivity(
  state: SnakesAndLaddersState,
  type: string,
  message: string,
  playerId: string | null,
  now: string
): void {
  state.activityLog.push({
    id: `act-${state.actionNumber}-${Date.now()}`,
    type,
    message,
    playerId,
    createdAt: now
  });
  if (state.activityLog.length > 30) {
    state.activityLog.shift();
  }
}

export function applySnakesAndLaddersAction(params: {
  state: SnakesAndLaddersState;
  playerId: string;
  action: SnakesAndLaddersAction;
  now: string;
}): SnakesAndLaddersReduction {
  const { playerId, action, now } = params;
  const state: SnakesAndLaddersState = {
    ...params.state,
    players: params.state.players.map((p) => ({ ...p })),
    activityLog: [...params.state.activityLog]
  };

  if (state.phase === "finished") {
    return { accepted: false, message: "Game has already finished.", state: params.state };
  }

  // Allow piece customization
  if (action.type === "select_piece") {
    const player = state.players.find((p) => p.userId === playerId);
    if (!player) return { accepted: false, message: "Player not found.", state: params.state };
    // Enforce uniqueness: no two players can have the same piece
    const alreadyTaken = state.players.some((p) => p.userId !== playerId && p.piece === action.piece);
    if (alreadyTaken) {
      return { accepted: false, message: "That game piece is already taken by another player.", state: params.state };
    }
    player.piece = action.piece;
    state.updatedAt = now;
    return { accepted: true, message: `${player.displayName} selected piece: ${action.piece}`, state };
  }

  if (state.currentPlayerId !== playerId) {
    return { accepted: false, message: "Not your turn.", state: params.state };
  }

  const player = state.players.find((p) => p.userId === playerId);
  if (!player) return { accepted: false, message: "Current player not found.", state: params.state };

  if (action.type === "end_turn") {
    state.hasRolled = false;
    state.diceRoll = null;
    player.consecutiveSixes = 0;
    state.currentPlayerId = nextPlayerId(state, playerId);
    state.turnStartedAt = now;
    state.updatedAt = now;
    state.actionNumber += 1;
    return { accepted: true, state };
  }

  if (action.type === "roll_dice") {
    // Generate fair 1 to 6 roll
    const next = nextRandom(state.rngState);
    state.rngState = next.state;
    const roll = Math.floor(next.value * 6) + 1;

    state.diceRoll = roll;
    state.hasRolled = true;
    state.actionNumber += 1;
    state.updatedAt = now;

    const initialPosition = player.position;
    let targetPosition = initialPosition;
    let entered = false;
    let bounced = false;

    // Check entry rule (Standard Bangladesh rule: roll a 1 to enter)
    if (!player.enteredBoard && state.settings.rollOneToEnter) {
      if (roll === 1) {
        player.enteredBoard = true;
        player.position = 1;
        targetPosition = 1;
        entered = true;
        player.lastRoll = roll;
        player.lastRollResult = "Entered Board 🚀";
        pushActivity(state, "board_entered", `🎉 ${player.displayName} rolled a 1 and entered the board at square 1!`, playerId, now);
      } else {
        player.lastRoll = roll;
        player.lastRollResult = `Rolled ${roll} (Needs 1)`;
        pushActivity(state, "roll_failed_entry", `🎲 ${player.displayName} rolled a ${roll} (needs 1 to enter).`, playerId, now);
      }
    } else {
      // Piece is already on board: advance
      targetPosition = player.position + roll;

      // Bounce-back rule for square 100
      if (state.settings.exactRollToWin && targetPosition > 100) {
        const overshoot = targetPosition - 100;
        targetPosition = 100 - overshoot;
        bounced = true;
        player.lastRoll = roll;
        player.lastRollResult = `Bounced to ${targetPosition} ↩️`;
        pushActivity(state, "bounce_back", `↩️ ${player.displayName} rolled a ${roll} and bounced back to square ${targetPosition}!`, playerId, now);
      } else if (!state.settings.exactRollToWin && targetPosition > 100) {
        targetPosition = 100;
        player.lastRoll = roll;
        player.lastRollResult = "Tile 100 🏆";
      } else {
        player.lastRoll = roll;
        player.lastRollResult = `Advanced to ${targetPosition} 🎯`;
        pushActivity(state, "moved", `🎲 ${player.displayName} rolled a ${roll} and advanced to square ${targetPosition}.`, playerId, now);
      }
      player.position = targetPosition;
    }

    // Check Ladder climb
    const ladder = state.board.ladders.find((l) => l.from === player.position);
    if (ladder) {
      player.position = ladder.to;
      player.lastRollResult = `Ladder to ${ladder.to} 🪜`;
      pushActivity(state, "ladder_climb", `🪜 ${player.displayName} landed on a ladder at ${ladder.from} and climbed up to ${ladder.to}!`, playerId, now);
    }

    // Check Snake bite
    const snake = state.board.snakes.find((s) => s.from === player.position);
    if (snake) {
      player.position = snake.to;
      player.lastRollResult = `Snake drop to ${snake.to} 🐍`;
      pushActivity(state, "snake_bite", `🐍 ${player.displayName} was bitten by a snake at ${snake.from} and swallowed down to ${snake.to}!`, playerId, now);
    }

    const moveEvent: SnakesAndLaddersMoveEvent = {
      playerId,
      from: initialPosition,
      to: player.position,
      rolled: roll,
      ladder,
      snake,
      bounced,
      entered
    };
    state.lastMove = moveEvent;

    // Victory Check: Reached square 100
    if (player.position === 100) {
      state.phase = "finished";
      state.winnerUserId = player.userId;
      state.results = getSnakesAndLaddersResults(state);
      pushActivity(state, "game_won", `🏆 ${player.displayName} reached square 100 and won the match!`, playerId, now);
      return { accepted: true, message: `${player.displayName} won the game!`, state };
    }

    // Turn Rotation & 6-Bonus Rule
    if (roll === 6) {
      player.consecutiveSixes += 1;
      if (player.consecutiveSixes >= 3) {
        player.consecutiveSixes = 0;
        state.hasRolled = false;
        state.diceRoll = roll;
        state.currentPlayerId = nextPlayerId(state, playerId);
        state.turnStartedAt = now;
        pushActivity(state, "three_sixes", `⚠️ ${player.displayName} rolled 3 consecutive sixes! Turn forfeited.`, playerId, now);
      } else {
        // Bonus roll awarded: player keeps turn
        state.hasRolled = false; // ready for next roll
        state.diceRoll = roll;
        pushActivity(state, "bonus_roll", `⭐ ${player.displayName} rolled a 6! Bonus roll awarded.`, playerId, now);
      }
    } else {
      player.consecutiveSixes = 0;
      state.hasRolled = false;
      state.diceRoll = roll;
      state.currentPlayerId = nextPlayerId(state, playerId);
      state.turnStartedAt = now;
    }

    return { accepted: true, state };
  }

  return { accepted: false, message: "Unknown action.", state: params.state };
}
