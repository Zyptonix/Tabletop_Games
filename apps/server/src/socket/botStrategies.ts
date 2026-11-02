import { evaluateTexasHoldemHand } from "@tabletop/game-core";

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


const TWENTY_NINE_CARD_POINTS: Record<string, number> = {
  J: 3,
  "9": 2,
  A: 1,
  "10": 1,
  K: 0,
  Q: 0,
  "8": 0,
  "7": 0
};

const TWENTY_NINE_CARD_STRENGTH: Record<string, number> = {
  "7": 0,
  "8": 1,
  Q: 2,
  K: 3,
  "10": 4,
  A: 5,
  "9": 6,
  J: 7
};

function beatsTwentyNineCard(
  cardA: { rank: string; suit: string },
  cardB: { rank: string; suit: string },
  leadSuit: string,
  trumpSuit: string | null,
  trumpRevealed: boolean
): boolean {
  const isATrump = trumpRevealed && trumpSuit !== null && cardA.suit === trumpSuit;
  const isBTrump = trumpRevealed && trumpSuit !== null && cardB.suit === trumpSuit;

  if (isATrump && !isBTrump) return true;
  if (!isATrump && isBTrump) return false;

  if (isATrump && isBTrump) {
    return (TWENTY_NINE_CARD_STRENGTH[cardA.rank] ?? 0) > (TWENTY_NINE_CARD_STRENGTH[cardB.rank] ?? 0);
  }

  if (cardA.suit === leadSuit && cardB.suit !== leadSuit) return true;
  if (cardA.suit !== leadSuit && cardB.suit === leadSuit) return false;
  if (cardA.suit === leadSuit && cardB.suit === leadSuit) {
    return (TWENTY_NINE_CARD_STRENGTH[cardA.rank] ?? 0) > (TWENTY_NINE_CARD_STRENGTH[cardB.rank] ?? 0);
  }

  return false;
}

function getTwentyNineTrickWinner(
  currentTrick: Array<{ playerId: string; card: { id: string; rank: string; suit: string; points: number } }>,
  trumpSuit: string | null,
  trumpRevealed: boolean
): { playerId: string; card: { id: string; rank: string; suit: string; points: number } } | null {
  if (currentTrick.length === 0) return null;
  const first = currentTrick[0]!;
  const leadSuit = first.card.suit;
  let winner = first;

  for (let i = 1; i < currentTrick.length; i += 1) {
    const entry = currentTrick[i]!;
    if (beatsTwentyNineCard(entry.card, winner.card, leadSuit, trumpSuit, trumpRevealed)) {
      winner = entry;
    }
  }
  return winner;
}

function chooseTwentyNine(
  actions: RecordValue[],
  gameState: unknown,
  playerId: string
): RecordValue | undefined {
  const s = gameState as any;
  if (!s || !Array.isArray(s.players)) return actions[0];

  const me = s.players.find((p: any) => p.userId === playerId);
  const botHand: Array<{ id: string; rank: string; suit: string; points: number }> = me?.hand ?? [];
  const partner = s.players.find((p: any) => p.team === me?.team && p.userId !== playerId);
  const partnerId = partner?.userId;

  // 1. Declare Pair (Immediate +4 / -4 point benefit)
  const pairAction = actions.find((a) => a.type === "declare_pair");
  if (pairAction) return pairAction;

  // 2. Bidding & Ditto (Bangladesh duel auction evaluation)
  const isBiddingAction = actions.some((a) => a.type === "bid" || a.type === "pass_bid" || a.type === "ditto");
  if (isBiddingAction) {
    const isPartnerHighest = s.highestBidderId && s.highestBidderId === partnerId;
    const passBid = actions.find((a) => a.type === "pass_bid");

    // Rule: Never raise or ditto over own partner
    if (isPartnerHighest && passBid) {
      return passBid;
    }

    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const suitEvaluations = suits.map((suit) => {
      const suitCards = botHand.filter((c) => c.suit === suit);
      const count = suitCards.length;
      const hasJ = suitCards.some((c) => c.rank === "J");
      const has9 = suitCards.some((c) => c.rank === "9");
      const hasA = suitCards.some((c) => c.rank === "A");
      const has10 = suitCards.some((c) => c.rank === "10");
      const hasKQ = suitCards.some((c) => c.rank === "K") && suitCards.some((c) => c.rank === "Q");
      const power = count * 2.5 + (hasJ ? 4.5 : 0) + (has9 ? 3.5 : 0) + (hasA ? 2 : 0) + (hasKQ ? 3.5 : 0) + (has10 ? 1 : 0);
      return { suit, count, hasJ, has9, hasA, hasKQ, power };
    });
    suitEvaluations.sort((a, b) => b.power - a.power);
    const bestSuit = suitEvaluations[0]!;
    const totalHcp = botHand.reduce((acc, c) => acc + (TWENTY_NINE_CARD_POINTS[c.rank] ?? 0), 0);
    const handStrength = bestSuit.power + totalHcp * 0.8;

    let maxSafeBid = 0;
    if (handStrength >= 11.5) maxSafeBid = 21;
    else if (handStrength >= 9.0) maxSafeBid = 19;
    else if (handStrength >= 7.2) maxSafeBid = 18;
    else if (handStrength >= 5.5) maxSafeBid = 17;
    else if (bestSuit.count >= 2 && (bestSuit.hasJ || bestSuit.has9 || totalHcp >= 3)) maxSafeBid = 16;

    // Challenge with Ditto if within safe budget
    const dittoAction = actions.find((a) => a.type === "ditto");
    const currentBid = typeof s.currentBid === "number" ? s.currentBid : 0;
    if (dittoAction && currentBid > 0 && currentBid <= maxSafeBid) {
      return dittoAction;
    }

    // Challenge with higher bid if within safe budget
    const bids = actions
      .filter((a): a is RecordValue & { type: "bid"; value: number } => a.type === "bid" && typeof a.value === "number")
      .sort((a, b) => Number(a.value) - Number(b.value));
    const lowestBid = bids[0];
    if (lowestBid && lowestBid.value <= maxSafeBid) {
      return lowestBid;
    }

    if (passBid) return passBid;
  }

  // 3. Trump Selection (Pick strongest suit or ask 7th card)
  const isTrumpSelection = actions.some((a) => a.type === "choose_trump_suit" || a.type === "choose_seventh_trump");
  if (isTrumpSelection) {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const suitScores = suits.map((suit) => {
      const suitCards = botHand.filter((c) => c.suit === suit);
      const hasJ = suitCards.some((c) => c.rank === "J");
      const has9 = suitCards.some((c) => c.rank === "9");
      const hasA = suitCards.some((c) => c.rank === "A");
      const hasKQ = suitCards.some((c) => c.rank === "K") && suitCards.some((c) => c.rank === "Q");
      const score = suitCards.length * 3 + (hasJ ? 6 : 0) + (has9 ? 4 : 0) + (hasA ? 2 : 0) + (hasKQ ? 5 : 0);
      return { suit, score };
    });
    suitScores.sort((a, b) => b.score - a.score);
    const best = suitScores[0]!;

    if (best.score >= 5) {
      const suitAction = actions.find((a) => a.type === "choose_trump_suit" && a.suit === best.suit);
      if (suitAction) return suitAction;
    }
    return actions.find((a) => a.type === "choose_seventh_trump") ?? actions.find((a) => a.type === "choose_trump_suit" && a.suit === best.suit);
  }

  // 4. Doubling / Redoubling
  const doubleAction = actions.find((a) => a.type === "double");
  const redoubleAction = actions.find((a) => a.type === "redouble");
  const passDoubleAction = actions.find((a) => a.type === "pass_double") ?? actions.find((a) => a.type === "continue_contract");

  if (doubleAction) {
    const declarerTeam = s.players.find((p: any) => p.userId === s.declarerId)?.team;
    const isOpponentDeclarer = declarerTeam !== me?.team;
    const contractTarget = s.contractTarget ?? s.currentBid ?? 0;
    const totalHcp = botHand.reduce((acc, c) => acc + (TWENTY_NINE_CARD_POINTS[c.rank] ?? 0), 0);
    if (isOpponentDeclarer && contractTarget >= 20 && totalHcp >= 5) {
      return doubleAction;
    }
    if (passDoubleAction) return passDoubleAction;
  }
  if (redoubleAction) {
    const totalHcp = botHand.reduce((acc, c) => acc + (TWENTY_NINE_CARD_POINTS[c.rank] ?? 0), 0);
    if (totalHcp >= 6) {
      return redoubleAction;
    }
    if (passDoubleAction) return passDoubleAction;
  }
  if (passDoubleAction && !actions.some((a) => a.type === "play_card")) {
    return passDoubleAction;
  }

  // 5. Trump Reveal Decision (Only reveal if trick has points and opponent is winning)
  const revealAction = actions.find((a) => a.type === "reveal_trump");
  if (revealAction) {
    const currentTrick: Array<{ playerId: string; card: any }> = s.currentTrick ?? [];
    const winner = getTwentyNineTrickWinner(currentTrick, s.trumpSuit, s.trumpRevealed);
    const isPartnerWinning = winner && winner.playerId === partnerId;
    const trickPoints = currentTrick.reduce((acc: number, e: any) => acc + (e.card?.points ?? 0), 0);

    // Only reveal when opponent is winning valuable points
    if (!isPartnerWinning && trickPoints >= 1) {
      return revealAction;
    }
  }

  // 6. Play Card (Smart Trick-Taking Strategy)
  const playCardActions = actions.filter((a) => a.type === "play_card" && typeof a.cardId === "string");
  if (playCardActions.length > 0) {
    const currentTrick: Array<{ playerId: string; card: any }> = s.currentTrick ?? [];
    const trumpSuit = s.trumpSuit ?? null;
    const trumpRevealed = Boolean(s.trumpRevealed);

    const playableCards = playCardActions.map((a) => {
      const card = botHand.find((c) => c.id === a.cardId) ?? { id: String(a.cardId), rank: "7", suit: "hearts", points: 0 };
      return { action: a, card };
    });

    if (playableCards.length === 1) {
      return playableCards[0]!.action;
    }

    // If bot is LEADING
    if (currentTrick.length === 0) {
      if (trumpRevealed && trumpSuit) {
        const masterTrump = playableCards.find((p) => p.card.suit === trumpSuit && p.card.rank === "J");
        if (masterTrump) return masterTrump.action;
      }
      const sideAce = playableCards.find((p) => p.card.rank === "A" && p.card.suit !== trumpSuit);
      if (sideAce) return sideAce.action;

      const zeroPointCard = playableCards
        .filter((p) => (TWENTY_NINE_CARD_POINTS[p.card.rank] ?? 0) === 0)
        .sort((a, b) => (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0))[0];
      if (zeroPointCard) return zeroPointCard.action;

      playableCards.sort((a, b) => (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0));
      return playableCards[0]!.action;
    }

    // If bot is FOLLOWING or SLOUGHING
    const leadSuit = currentTrick[0]!.card.suit;
    const currentWinner = getTwentyNineTrickWinner(currentTrick, trumpSuit, trumpRevealed);
    const isPartnerWinning = currentWinner && currentWinner.playerId === partnerId;
    const isLastPlayer = currentTrick.length === 3;
    const trickPoints = currentTrick.reduce((acc: number, e: any) => acc + (e.card?.points ?? 0), 0);

    // Case A: Partner is winning the trick
    if (isPartnerWinning) {
      if (isLastPlayer) {
        // Dump high points into teammate's guaranteed won trick (Fatting)
        const pointCards = playableCards
          .filter((p) => (TWENTY_NINE_CARD_POINTS[p.card.rank] ?? 0) > 0)
          .sort((a, b) => {
            const dumpPriority: Record<string, number> = { "10": 4, A: 3, "9": 2, J: 1 };
            return (dumpPriority[b.card.rank] ?? 0) - (dumpPriority[a.card.rank] ?? 0);
          });
        if (pointCards[0]) return pointCards[0].action;
      }
      // If not last player: preserve points, play lowest zero-point card
      const lowSafeCard = playableCards
        .filter((p) => (TWENTY_NINE_CARD_POINTS[p.card.rank] ?? 0) === 0)
        .sort((a, b) => (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0))[0];
      if (lowSafeCard) return lowSafeCard.action;

      playableCards.sort((a, b) => (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0));
      return playableCards[0]!.action;
    }

    // Case B: Opponent is winning the trick
    const winningCards = playableCards.filter((p) =>
      beatsTwentyNineCard(p.card, currentWinner!.card, leadSuit, trumpSuit, trumpRevealed)
    );

    if (winningCards.length > 0) {
      // Pick the lowest card that beats the opponent's card (win cheaply)
      winningCards.sort((a, b) => (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0));
      if (trickPoints >= 1 || isLastPlayer || (TWENTY_NINE_CARD_POINTS[winningCards[0]!.card.rank] ?? 0) <= 1) {
        return winningCards[0]!.action;
      }
    }

    // Duck: Opponent is taking the trick. Dump lowest point trash card to starve them!
    playableCards.sort((a, b) => {
      const ptDiff = (TWENTY_NINE_CARD_POINTS[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_POINTS[b.card.rank] ?? 0);
      if (ptDiff !== 0) return ptDiff;
      return (TWENTY_NINE_CARD_STRENGTH[a.card.rank] ?? 0) - (TWENTY_NINE_CARD_STRENGTH[b.card.rank] ?? 0);
    });
    return playableCards[0]!.action;
  }

  return actions[0];
}

function choosePoker(actions: RecordValue[], gameState: unknown, playerId: string): RecordValue | null {
  const state = isRecord(gameState) ? gameState : null;
  if (!state) return actions[0] ?? null;

  // 1. Resume play if sitting out
  const resume = actions.find((a) => a.type === "poker_action" && a.choice === "resume_play");
  if (resume) return resume;

  // 2. Next hand during showdown pause:
  // Bots shouldn't prematurely skip showdown so human player can enjoy the reveal
  const nextHand = actions.find((a) => a.type === "poker_action" && a.choice === "next_hand");
  if (nextHand) {
    const players = Array.isArray(state.players) ? state.players : [];
    const hasHuman = players.some((p: any) => !p.isBot && !(state.pokerSittingOut as any)?.[p.userId]);
    if (!hasHuman) return nextHand;
    return null; // Let human click next hand or let server timer advance
  }

  const checkAction = actions.find((a) => a.type === "poker_action" && a.choice === "check");
  const callAction = actions.find((a) => a.type === "poker_action" && a.choice === "call");
  const raiseAction = actions.find((a) => a.type === "poker_action" && a.choice === "raise");
  const allInAction = actions.find((a) => a.type === "poker_action" && a.choice === "all_in");
  const foldAction = actions.find((a) => a.type === "poker_action" && a.choice === "fold");

  // Get bot cards
  const cardsByPlayer = state.pokerCardsByPlayer as Record<string, string[]> | undefined;
  const botCards: string[] = cardsByPlayer?.[playerId] ?? (Array.isArray(state.myPokerCards) ? (state.myPokerCards as string[]) : []);
  const communityCards: string[] = Array.isArray(state.communityCards) ? (state.communityCards as string[]) : [];
  const pot = typeof state.pokerPot === "number" ? state.pokerPot : 0;
  const betToCall = typeof state.pokerBetToCall === "number" ? state.pokerBetToCall : 0;
  const myBets = (state.pokerBets as Record<string, number> | undefined)?.[playerId] ?? 0;
  const myStack = (state.pokerStacks as Record<string, number> | undefined)?.[playerId] ?? 0;
  const toCall = Math.max(0, betToCall - myBets);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // If no cards known, fallback safely
  if (botCards.length < 2) {
    return checkAction ?? callAction ?? foldAction ?? actions[0] ?? null;
  }

  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const parseCard = (c: string) => {
    const suit = c.slice(-1);
    const rankStr = c.slice(0, -1);
    const rankIdx = RANKS.indexOf(rankStr);
    return { rank: rankIdx >= 0 ? rankIdx + 2 : 2, rankStr, suit };
  };

  const c1 = parseCard(botCards[0]!);
  const c2 = parseCard(botCards[1]!);
  const highRank = Math.max(c1.rank, c2.rank);
  const lowRank = Math.min(c1.rank, c2.rank);
  const isPair = c1.rank === c2.rank;
  const isSuited = c1.suit === c2.suit;
  const gap = isPair ? 0 : highRank - lowRank - 1;

  // Pre-flop evaluation (Chen score)
  let chenScore = 0;
  if (highRank === 14) chenScore = 10;
  else if (highRank === 13) chenScore = 8;
  else if (highRank === 12) chenScore = 7;
  else if (highRank === 11) chenScore = 6;
  else chenScore = highRank / 2;

  if (isPair) {
    chenScore = Math.max(5, chenScore * 2);
  }
  if (isSuited) chenScore += 2;
  if (gap === 1) chenScore -= 1;
  else if (gap === 2) chenScore -= 2;
  else if (gap >= 3) chenScore -= 4;
  if (gap < 2 && highRank < 12 && !isPair) chenScore += 1; // Connector bonus for medium cards

  const isPreflop = communityCards.length === 0;

  // Preflop Strategy
  if (isPreflop) {
    // Monster (AA, KK, QQ, JJ, AKs)
    if (chenScore >= 10) {
      if (raiseAction) {
        const raiseAmt = Math.min(myStack, Math.max(20, Math.floor(pot * 0.75)));
        return { ...raiseAction, amount: raiseAmt };
      }
      return callAction ?? checkAction ?? actions[0] ?? null;
    }
    // Strong (TT, 99, 88, AKo, AQs, AJs, KQs)
    if (chenScore >= 7.5) {
      if (raiseAction && toCall <= 40) {
        const raiseAmt = Math.min(myStack, 40);
        return { ...raiseAction, amount: raiseAmt };
      }
      return callAction ?? checkAction ?? actions[0] ?? null;
    }
    // Playable (77-55, QJs, JTs, ATs, KJs, AQo)
    if (chenScore >= 6.0) {
      if (toCall <= 60) return callAction ?? checkAction ?? actions[0] ?? null;
      return foldAction ?? checkAction ?? actions[0] ?? null;
    }
    // Marginal (small pairs, suited cards)
    if (chenScore >= 4.5) {
      if (toCall === 0) return checkAction ?? actions[0] ?? null;
      if (toCall <= 20) return callAction ?? actions[0] ?? null; // Defend big blind or min-bet
      return foldAction ?? actions[0] ?? null;
    }
    // Junk
    if (toCall === 0) return checkAction ?? actions[0] ?? null;
    return foldAction ?? actions[0] ?? null;
  }

  // Post-Flop Strategy
  const allCards = [...botCards, ...communityCards];
  let handRank = 0;
  try {
    const value = evaluateTexasHoldemHand(allCards);
    handRank = value[0] ?? 0;
  } catch {
    handRank = 0;
  }

  // Draw checking (Flop & Turn)
  const isDrawStreet = communityCards.length >= 3 && communityCards.length <= 4;
  let outs = 0;
  if (isDrawStreet) {
    const suitCounts: Record<string, number> = {};
    for (const c of allCards) {
      const s = c.slice(-1);
      suitCounts[s] = (suitCounts[s] ?? 0) + 1;
    }
    if (Object.values(suitCounts).some((count) => count === 4)) {
      outs += 9; // 4-flush = 9 outs
    }
    const distinctRanks = [...new Set(allCards.map((c) => parseCard(c).rank))].sort((a, b) => a - b);
    for (let i = 0; i < distinctRanks.length - 3; i++) {
      if (distinctRanks[i + 3]! - distinctRanks[i]! === 3) outs += 8; // Open-ended straight draw
      else if (distinctRanks[i + 3]! - distinctRanks[i]! === 4) outs += 4; // Gutshot straight draw
    }
  }

  const drawEquity = outs * (communityCards.length === 3 ? 0.04 : 0.02);

  // Post-Flop Decisions:
  // 1. Monster: Straight (4), Flush (5), Full House (6), Quads (7), Straight Flush (8)
  if (handRank >= 4) {
    if (raiseAction && myStack > toCall + 20) {
      const raiseAmt = Math.min(myStack, Math.max(40, Math.floor(pot * 0.75)));
      return { ...raiseAction, amount: raiseAmt };
    }
    if (allInAction && toCall >= myStack * 0.7) return allInAction;
    return callAction ?? checkAction ?? actions[0] ?? null;
  }

  // 2. Strong: Three of a Kind (3), Two Pair (2)
  if (handRank >= 2) {
    if (toCall === 0 && raiseAction) {
      const betAmt = Math.min(myStack, Math.max(20, Math.floor(pot * 0.5)));
      return { ...raiseAction, amount: betAmt };
    }
    if (toCall <= pot * 0.8) {
      return callAction ?? checkAction ?? actions[0] ?? null;
    }
    if (raiseAction && toCall <= pot * 0.3) {
      const raiseAmt = Math.min(myStack, Math.max(20, Math.floor(pot * 0.5)));
      return { ...raiseAction, amount: raiseAmt };
    }
    return callAction ?? foldAction ?? actions[0] ?? null;
  }

  // 3. Medium: One Pair (1)
  if (handRank === 1) {
    const communityRanks = communityCards.map((c) => parseCard(c).rank);
    const maxCommunityRank = Math.max(...communityRanks, 0);
    const isOverpairOrTopPair = (isPair && c1.rank > maxCommunityRank) || (c1.rank === maxCommunityRank || c2.rank === maxCommunityRank);

    if (toCall === 0) {
      if (isOverpairOrTopPair && raiseAction && Math.random() < 0.6) {
        const betAmt = Math.min(myStack, Math.max(20, Math.floor(pot * 0.4)));
        return { ...raiseAction, amount: betAmt };
      }
      return checkAction ?? actions[0] ?? null;
    }

    if (isOverpairOrTopPair && toCall <= pot * 0.5) {
      return callAction ?? foldAction ?? actions[0] ?? null;
    }
    if (toCall <= pot * 0.25 || (outs >= 4 && potOdds <= drawEquity + 0.15)) {
      return callAction ?? foldAction ?? actions[0] ?? null;
    }
    return foldAction ?? checkAction ?? actions[0] ?? null;
  }

  // 4. Weak / Trash (HandRank 0 = High Card)
  if (toCall === 0) {
    // Bluff in late position occasionally (12% of time) if checked to us
    if (raiseAction && Math.random() < 0.12 && communityCards.length >= 3) {
      const bluffAmt = Math.min(myStack, Math.max(20, Math.floor(pot * 0.35)));
      return { ...raiseAction, amount: bluffAmt };
    }
    return checkAction ?? actions[0] ?? null;
  }

  // Has a strong draw (Flush draw or Open-ended straight draw)
  if (outs >= 8 && potOdds <= drawEquity + 0.05) {
    return callAction ?? foldAction ?? actions[0] ?? null;
  }

  // Otherwise, fold junk!
  return foldAction ?? checkAction ?? actions[0] ?? null;
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
    preferred = chooseTwentyNine(actions, gameState, playerId);
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
      preferred = choosePoker(actions, gameState, playerId) ?? undefined;
    } else if (gameId === "blackjack") {
      const stateObj = isRecord(gameState) ? gameState : null;
      const hands = stateObj?.blackjackPlayerHands as Record<string, string[][]> | undefined;
      const botHands = hands?.[playerId] ?? [[]];
      const activeIdx = (typeof stateObj?.blackjackActiveHandIndex === "number" ? stateObj.blackjackActiveHandIndex : 0);
      const curHand = botHands[activeIdx] ?? botHands[0] ?? [];

      let total = 0;
      let aces = 0;
      for (const c of curHand) {
        if (!c || c === "hidden") continue;
        const rank = c.slice(0, -1);
        if (rank === "A") { aces += 1; total += 11; }
        else if (["K", "Q", "J", "10"].includes(rank)) { total += 10; }
        else { total += parseInt(rank, 10) || 0; }
      }
      while (total > 21 && aces > 0) { total -= 10; aces -= 1; }

      const hitAction = actions.find((a) => a.type === "blackjack_action" && a.choice === "hit");
      const standAction = actions.find((a) => a.type === "blackjack_action" && a.choice === "stand");
      const doubleAction = actions.find((a) => a.type === "blackjack_action" && a.choice === "double");

      let turnChoice: RecordValue | undefined;
      if (total >= 17) {
        turnChoice = standAction ?? hitAction;
      } else if (total === 10 || total === 11) {
        turnChoice = doubleAction ?? hitAction ?? standAction;
      } else {
        turnChoice = hitAction ?? standAction;
      }

      preferred =
        actions.find((action) => action.type === "blackjack_action" && action.choice === "deal") ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "bet" && action.amount === 25) ??
        actions.find((action) => action.type === "blackjack_action" && action.choice === "next_round") ??
        turnChoice;
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
