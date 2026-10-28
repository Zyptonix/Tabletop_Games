/** Small, deterministic-rule-aware bot policies for turn-based board games. */
type RecordValue = Record<string, unknown>;
type BotAction = { type: string; payload: Record<string, unknown> } | null;
type BoardCell = string | null;
type Board = BoardCell[][];
type GridState = {
  board: Board;
  rows: number;
  columns: number;
  players: Array<{ userId: string }>;
  currentPlayerId?: string | null;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toActions(values: unknown[]): RecordValue[] {
  return values.filter(isRecord);
}

function toGridState(value: unknown): GridState | null {
  if (!isRecord(value) || !Array.isArray(value.board) || !Array.isArray(value.players)) return null;
  const board = value.board as unknown[];
  if (!board.every((row) => Array.isArray(row) && row.every((cell) => cell === null || typeof cell === "string"))) return null;
  const players = value.players as unknown[];
  if (!players.every((player) => isRecord(player) && typeof player.userId === "string")) return null;
  const matrix = board as unknown[][];
  const rows = typeof value.rows === "number" ? value.rows : matrix.length;
  const columns = typeof value.columns === "number" ? value.columns : (Array.isArray(matrix[0]) ? matrix[0].length : 0);
  if (rows <= 0 || columns <= 0 || matrix.length !== rows || !matrix.every((row) => row.length === columns)) return null;
  return { board: matrix as Board, rows, columns, players: players as Array<{ userId: string }>, currentPlayerId: typeof value.currentPlayerId === "string" ? value.currentPlayerId : null };
}

function otherPlayerId(state: GridState, playerId: string): string | null {
  return state.players.find((player) => player.userId !== playerId)?.userId ?? null;
}

function simulateDrop(board: Board, column: number, playerId: string): { board: Board; row: number } | null {
  const copy = board.map((row) => row.slice());
  for (let row = copy.length - 1; row >= 0; row -= 1) {
    if (copy[row]?.[column] === null) {
      copy[row]![column] = playerId;
      return { board: copy, row };
    }
  }
  return null;
}

function hasFour(board: Board, row: number, column: number, playerId: string): boolean {
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (board[r]?.[c] === playerId) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    return count >= 4;
  });
}

function scoreConnectFour(board: Board, botId: string, opponentId: string): number {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  let score = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (board[row]?.[column] === botId) score += 3 - Math.abs(3 - column);
    }
  }
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      for (const [dr, dc] of directions) {
        const cells: BoardCell[] = [];
        for (let offset = 0; offset < 4; offset += 1) {
          const r = row + dr * offset;
          const c = column + dc * offset;
          if (r < 0 || r >= rows || c < 0 || c >= columns) break;
          cells.push(board[r]?.[c] ?? null);
        }
        if (cells.length !== 4) continue;
        const own = cells.filter((cell) => cell === botId).length;
        const enemy = cells.filter((cell) => cell === opponentId).length;
        const empty = cells.filter((cell) => cell === null).length;
        if (own > 0 && enemy > 0) continue;
        if (own === 4) score += 100_000;
        else if (own === 3 && empty === 1) score += 180;
        else if (own === 2 && empty === 2) score += 22;
        else if (own === 1 && empty === 3) score += 2;
        if (enemy === 3 && empty === 1) score -= 210;
        else if (enemy === 2 && empty === 2) score -= 24;
        else if (enemy === 1 && empty === 3) score -= 2;
      }
    }
  }
  return score;
}

function chooseConnectFour(actions: RecordValue[], stateValue: unknown, playerId: string): RecordValue | undefined {
  const state = toGridState(stateValue);
  if (!state) return actions.find((action) => action.type === "drop");
  const opponentId = otherPlayerId(state, playerId);
  if (!opponentId) return actions.find((action) => action.type === "drop");
  const columns = actions
    .filter((action) => action.type === "drop" && Number.isInteger(action.column))
    .map((action) => Number(action.column));
  if (!columns.length) return undefined;

  const candidates = columns.map((column) => {
    const result = simulateDrop(state.board, column, playerId);
    if (!result) return { column, score: -Infinity };
    if (hasFour(result.board, result.row, column, playerId)) return { column, score: 1_000_000 };
    let opponentWins = 0;
    for (let replyColumn = 0; replyColumn < state.columns; replyColumn += 1) {
      const reply = simulateDrop(result.board, replyColumn, opponentId);
      if (reply && hasFour(reply.board, reply.row, replyColumn, opponentId)) opponentWins += 1;
    }
    const score = scoreConnectFour(result.board, playerId, opponentId) - opponentWins * 20_000;
    return { column, score };
  });
  const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
  const best = candidates.filter((candidate) => candidate.score === bestScore);
  const selected = best[Math.floor(Math.random() * best.length)];
  return selected ? actions.find((action) => action.type === "drop" && action.column === selected.column) : undefined;
}

const REVERSI_WEIGHTS = [
  [120, -25, 20, 8, 8, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [8, -5, 3, 3, 3, 3, -5, 8],
  [8, -5, 3, 3, 3, 3, -5, 8],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20, 8, 8, 20, -25, 120]
];
const REVERSI_DIRECTIONS: Array<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
];

function reversiFlips(board: Board, row: number, column: number, playerId: string, opponentId: string): Array<[number, number]> {
  if (board[row]?.[column] !== null) return [];
  const flips: Array<[number, number]> = [];
  for (const [dr, dc] of REVERSI_DIRECTIONS) {
    const line: Array<[number, number]> = [];
    let r = row + dr;
    let c = column + dc;
    while (board[r]?.[c] === opponentId) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }
    if (line.length > 0 && board[r]?.[c] === playerId) flips.push(...line);
  }
  return flips;
}

function reversiMobility(board: Board, playerId: string, opponentId: string): number {
  let count = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (reversiFlips(board, row, column, playerId, opponentId).length) count += 1;
    }
  }
  return count;
}

function chooseReversi(actions: RecordValue[], stateValue: unknown, playerId: string): RecordValue | undefined {
  const placements = actions.filter((action) => action.type === "place" && Number.isInteger(action.row) && Number.isInteger(action.column));
  if (placements.length === 0) return actions.find((action) => action.type === "pass");
  const state = toGridState(stateValue);
  if (!state) return placements[Math.floor(Math.random() * placements.length)];
  const opponentId = otherPlayerId(state, playerId);
  if (!opponentId) return placements[0];

  const scored = placements.map((action) => {
    const row = Number(action.row);
    const column = Number(action.column);
    const flips = reversiFlips(state.board, row, column, playerId, opponentId);
    const board = state.board.map((cells) => cells.slice());
    board[row]![column] = playerId;
    for (const [flipRow, flipColumn] of flips) board[flipRow]![flipColumn] = playerId;

    let positional = 0;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if (board[r]?.[c] === playerId) positional += REVERSI_WEIGHTS[r]?.[c] ?? 0;
        else if (board[r]?.[c] === opponentId) positional -= REVERSI_WEIGHTS[r]?.[c] ?? 0;
      }
    }
    // Prefer corners and stable edges, avoid feeding the opponent easy corners.
    const corner = (row === 0 || row === 7) && (column === 0 || column === 7);
    let cornerGiftPenalty = 0;
    const adjacentCorners: Array<{ cornerRow: number; cornerColumn: number; cells: Array<[number, number]> }> = [
      { cornerRow: 0, cornerColumn: 0, cells: [[0, 1], [1, 0], [1, 1]] },
      { cornerRow: 0, cornerColumn: 7, cells: [[0, 6], [1, 7], [1, 6]] },
      { cornerRow: 7, cornerColumn: 0, cells: [[7, 1], [6, 0], [6, 1]] },
      { cornerRow: 7, cornerColumn: 7, cells: [[7, 6], [6, 7], [6, 6]] }
    ];
    for (const cornerInfo of adjacentCorners) {
      if (state.board[cornerInfo.cornerRow]?.[cornerInfo.cornerColumn] === null && cornerInfo.cells.some(([r, c]) => r === row && c === column)) cornerGiftPenalty -= 75;
    }
    const mobilityPenalty = reversiMobility(board, opponentId, playerId) * 4;
    const score = positional + flips.length * 1.8 + (corner ? 250 : 0) + cornerGiftPenalty - mobilityPenalty + Math.random() * 0.01;
    return { action, score };
  });
  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.action;
}

function fromAction(action: RecordValue | undefined): BotAction {
  if (!action || typeof action.type !== "string") return null;
  const { type, ...payload } = action;
  return { type, payload };
}

export function chooseBotAction(legalActions: unknown[], gameId: string, gameState: unknown, playerId: string): BotAction {
  const actions = toActions(legalActions);
  let preferred: RecordValue | undefined;

  if (gameId === "connect-four") {
    preferred = chooseConnectFour(actions, gameState, playerId);
  } else if (gameId === "reversi") {
    preferred = chooseReversi(actions, gameState, playerId);
  } else if (gameId === "strategic-shockwave") {
    // Bomber Tag is real-time; its bot brain runs inside the server tick loop, not turn scheduling.
    return null;
  } else if (gameId === "twenty-nine") {
    const bids = actions
      .filter((action): action is RecordValue & { type: "bid"; value: number } => action.type === "bid" && typeof action.value === "number")
      .sort((left, right) => Number(left.value) - Number(right.value));
    const ditto = actions.find((action) => action.type === "ditto");
    const passBid = actions.find((action) => action.type === "pass_bid");
    const lowestBid = bids[0];
    if (lowestBid && Number(lowestBid.value) <= 19) {
      preferred = ditto && Number(lowestBid.value) >= 18 && Math.random() < 0.18 ? ditto : lowestBid;
    } else if (passBid) {
      preferred = passBid;
    }
    preferred ??= actions.find((action) => action.type === "choose_trump_suit" && action.suit === "spades");
    preferred ??= actions.find((action) => action.type === "choose_seventh_trump");
    preferred ??= actions.find((action) => action.type === "pass_double");
    preferred ??= actions.find((action) => action.type === "continue_contract");
    preferred ??= actions.find((action) => action.type === "reveal_trump");
    preferred ??= actions.find((action) => action.type === "declare_pair");
    preferred ??= actions.find((action) => action.type === "play_card");
    preferred ??= actions.find((action) => action.type === "redouble");
    preferred ??= actions.find((action) => action.type === "double");
  } else if (["chess", "battleship", "ludo", "barricades", "monopoly", "risk", "world-conquest", "codenames", "poker", "blackjack"].includes(gameId)) {
    if (gameId === "ludo") {
      preferred = actions.find((action) => action.type === "roll_dice") ?? actions.find((action) => action.type === "move_token") ?? actions.find((action) => action.type === "end_turn");
    } else if (gameId === "battleship") {
      const placeAction = actions.find((action) => action.type === "place_fleet");
      if (placeAction) {
        preferred = placeAction;
      } else {
        const fireActions = actions.filter((action) => action.type === "fire" && typeof action.x === "number" && typeof action.y === "number");
        if (fireActions.length > 0) {
          const stateObj = isRecord(gameState) ? gameState : null;
          const shots = Array.isArray(stateObj?.shots) ? (stateObj.shots as Array<Record<string, unknown>>) : [];
          const myHits = shots.filter((s) => s.shooterId === playerId && s.hit && !s.sunk);

          let targetShot: RecordValue | undefined;
          for (const hit of myHits.slice().reverse()) {
            const hx = Number(hit.x);
            const hy = Number(hit.y);
            const neighbors = [
              { x: hx + 1, y: hy },
              { x: hx - 1, y: hy },
              { x: hx, y: hy + 1 },
              { x: hx, y: hy - 1 },
            ];
            const candidate = fireActions.find((a) => neighbors.some((n) => n.x === a.x && n.y === a.y));
            if (candidate) {
              targetShot = candidate;
              break;
            }
          }
          if (!targetShot) {
            const parityShots = fireActions.filter((a) => (Number(a.x) + Number(a.y)) % 2 === 0);
            targetShot = parityShots.length ? parityShots[Math.floor(Math.random() * parityShots.length)] : undefined;
          }
          preferred = targetShot ?? fireActions[Math.floor(Math.random() * fireActions.length)];
        }
      }
    } else if (gameId === "monopoly") {
      preferred = actions.find((action) => action.type === "roll_dice") ?? actions.find((action) => action.type === "buy_property") ?? actions.find((action) => action.type === "end_turn");
    } else if (gameId === "barricades") {
      preferred = actions.find((action) => action.type === "move_pawn") ?? actions.find((action) => action.type === "place_wall") ?? actions.find((action) => action.type === "end_turn");
    } else if (gameId === "risk" || gameId === "world-conquest") {
      preferred = actions.find((action) => action.type === "claim_territory") ?? actions.find((action) => action.type === "attack_territory") ?? actions.find((action) => action.type === "reinforce_territory") ?? actions.find((action) => action.type === "end_turn");
    } else if (gameId === "poker") {
      preferred = actions.find((action) => action.type === "poker_action" && action.choice === "check") ?? actions.find((action) => action.type === "poker_action" && action.choice === "call") ?? actions.find((action) => action.type === "poker_action" && action.choice === "raise") ?? actions.find((action) => action.type === "poker_action" && action.choice === "all_in") ?? actions.find((action) => action.type === "poker_action" && action.choice === "fold");
    } else if (gameId === "blackjack") {
      preferred =
        actions.find((action) => action.type === "blackjack_action" && action.choice === "deal") ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "bet" && action.amount === 25) ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "next_round") ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "hit") ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "stand");
    } else {
      const candidates = actions.filter((action) => ["move_piece", "fire", "reveal_word"].includes(String(action.type)));
      preferred = candidates[Math.floor(Math.random() * candidates.length)];
    }
  } else {
    preferred =
      actions.find((action) => action.type === "play_card") ??
      actions.find((action) => action.type === "resolve_roulette") ??
      actions.find((action) => action.type === "draw_card") ??
      actions.find((action) => action.type === "pass_turn") ??
      actions.find((action) => action.type === "call_uno");
  }

  return fromAction(preferred);
}
