import type {
  BoardGameAction,
  BoardGameState,
} from "../shared/types";

export function playerOwnsChessPiece(state: BoardGameState, playerId: string, piece: string | null): boolean {
  const player = state.players.find((item) => item.userId === playerId);
  return Boolean(player && piece && (player.seat % 2 === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase()));
}
export function chessPseudoMoves(state: BoardGameState, playerId: string): BoardGameAction[] {
  const output: BoardGameAction[] = [];
  const player = state.players.find((candidate) => candidate.userId === playerId);
  if (!player) return output;
  const board = state.board;
  const isWhite = player.seat % 2 === 0;
  const own = (piece: string | null) => playerOwnsChessPiece(state, playerId, piece);
  const push = (from: number, to: number) => {
    const row = Math.floor(to / 8);
    const piece = board[Math.floor(from / 8)]?.[from % 8] ?? null;
    if (piece?.toLowerCase() === "p" && (row === 0 || row === 7)) {
      for (const promotion of ["q", "r", "b", "n"] as const) output.push({ type: "move_piece", from, to, promotion });
    } else output.push({ type: "move_piece", from, to });
  };
  const directions: Record<string, Array<[number, number]>> = {
    n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    b: [[-1,-1],[-1,1],[1,-1],[1,1]],
    r: [[-1,0],[0,-1],[0,1],[1,0]]
  };
  for (let from = 0; from < 64; from += 1) {
    const fr = Math.floor(from / 8), fc = from % 8;
    const piece = board[fr]?.[fc] ?? null;
    if (!own(piece)) continue;
    const kind = piece!.toLowerCase();
    const tryMove = (r: number, c: number): boolean => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r]?.[c] ?? null;
      if (target && (own(target) || target.toLowerCase() === "k")) return false;
      push(from, r * 8 + c);
      return !target;
    };
    if (kind === "p") {
      const dir = isWhite ? -1 : 1;
      const one = fr + dir;
      if (one >= 0 && one <= 7 && !board[one]?.[fc]) {
        push(from, one * 8 + fc);
        const startRow = isWhite ? 6 : 1;
        const two = fr + dir * 2;
        if (fr === startRow && !board[two]?.[fc]) push(from, two * 8 + fc);
      }
      for (const dc of [-1, 1]) {
        const r = fr + dir, c = fc + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const target = board[r]?.[c] ?? null;
        const to = r * 8 + c;
        if (target && !own(target) && target.toLowerCase() !== "k") push(from, to);
        else if (!target && state.chessEnPassantTarget === to) {
          const passedPawn = board[fr]?.[c] ?? null;
          if (passedPawn?.toLowerCase() === "p" && !own(passedPawn)) push(from, to);
        }
      }
      continue;
    }
    const dirs = kind === "q" ? [...directions.b!, ...directions.r!] : directions[kind];
    if (!dirs) continue;
    const slides = ["b", "r", "q"].includes(kind);
    for (const [dr, dc] of dirs) {
      for (let step = 1; step <= (slides ? 7 : 1); step += 1) {
        if (!tryMove(fr + dr * step, fc + dc * step)) break;
      }
    }
    if (kind === "k") {
      const homeRow = isWhite ? 7 : 0;
      const home = homeRow * 8 + 4;
      const enemy = state.players.find((candidate) => candidate.userId !== playerId);
      const rights = state.chessCastlingRights ?? "KQkq";
      const kingSide = isWhite ? "K" : "k";
      const queenSide = isWhite ? "Q" : "q";
      const rook = isWhite ? "R" : "r";
      if (from === home && enemy && !chessKingInCheck(state, playerId)) {
        if (rights.includes(kingSide) && board[homeRow]?.[7] === rook && !board[homeRow]?.[5] && !board[homeRow]?.[6]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 5) && !chessSquareAttacked(state, enemy.userId, homeRow, 6)) {
          output.push({ type: "move_piece", from, to: home + 2 });
        }
        if (rights.includes(queenSide) && board[homeRow]?.[0] === rook && !board[homeRow]?.[1] && !board[homeRow]?.[2] && !board[homeRow]?.[3]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 3) && !chessSquareAttacked(state, enemy.userId, homeRow, 2)) {
          output.push({ type: "move_piece", from, to: home - 2 });
        }
      }
    }
  }
  return output;
}

// TABLETOP GAME LOGIC PHASE 1: legal king-safety filtering
export function chessSquareAttacked(state: BoardGameState, byPlayerId: string, targetRow: number, targetColumn: number, board = state.board): boolean {
  const attacker = state.players.find((player) => player.userId === byPlayerId);
  if (!attacker) return false;
  const knightOffsets: Array<[number, number]> = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const kingOffsets: Array<[number, number]> = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const rayDirections: Array<[number, number]> = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const pawnDirection = attacker.seat % 2 === 0 ? -1 : 1;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (!piece || !playerOwnsChessPiece(state, byPlayerId, piece)) continue;
      const kind = piece.toLowerCase();
      const rowDelta = targetRow - row;
      const columnDelta = targetColumn - column;
      if (kind === "p") {
        if (rowDelta === pawnDirection && Math.abs(columnDelta) === 1) return true;
        continue;
      }
      if (kind === "n") {
        if (knightOffsets.some(([dr, dc]) => row + dr === targetRow && column + dc === targetColumn)) return true;
        continue;
      }
      if (kind === "k") {
        if (kingOffsets.some(([dr, dc]) => row + dr === targetRow && column + dc === targetColumn)) return true;
        continue;
      }
      const allowedRay = kind === "q"
        ? rayDirections
        : kind === "r"
          ? rayDirections.filter(([dr, dc]) => dr === 0 || dc === 0)
          : kind === "b"
            ? rayDirections.filter(([dr, dc]) => dr !== 0 && dc !== 0)
            : [];
      for (const [dr, dc] of allowedRay) {
        let r = row + dr;
        let c = column + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (r === targetRow && c === targetColumn) return true;
          if (board[r]?.[c]) break;
          r += dr;
          c += dc;
        }
      }
    }
  }
  return false;
}

export function chessKingInCheck(state: BoardGameState, playerId: string, board = state.board): boolean {
  let kingRow = -1;
  let kingColumn = -1;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (piece?.toLowerCase() === "k" && playerOwnsChessPiece(state, playerId, piece)) {
        kingRow = row;
        kingColumn = column;
        break;
      }
    }
    if (kingRow >= 0) break;
  }
  if (kingRow < 0) return true;
  const opponent = state.players.find((player) => player.userId !== playerId);
  return opponent ? chessSquareAttacked(state, opponent.userId, kingRow, kingColumn, board) : false;
}

export function chessBoardAfterMove(state: BoardGameState, action: BoardGameAction): Array<Array<string | null>> | null {
  if (action.type !== "move_piece" || !Number.isInteger(action.from) || !Number.isInteger(action.to) || action.from < 0 || action.from >= 64 || action.to < 0 || action.to >= 64) return null;
  const board = state.board.map((row) => row.slice());
  const fromRow = Math.floor(action.from / 8), fromColumn = action.from % 8;
  const toRow = Math.floor(action.to / 8), toColumn = action.to % 8;
  const piece = board[fromRow]?.[fromColumn] ?? null;
  if (!piece || board[toRow]?.[toColumn]?.toLowerCase() === "k") return null;
  const target = board[toRow]?.[toColumn] ?? null;
  // En passant captures the pawn behind the empty destination square.
  if (piece.toLowerCase() === "p" && fromColumn !== toColumn && !target && state.chessEnPassantTarget === action.to) {
    board[fromRow]![toColumn] = null;
  }
  board[fromRow]![fromColumn] = null;
  board[toRow]![toColumn] = piece;
  // Castling moves the rook as part of the same indivisible move.
  if (piece.toLowerCase() === "k" && Math.abs(toColumn - fromColumn) === 2) {
    const rookFrom = toColumn > fromColumn ? 7 : 0;
    const rookTo = toColumn > fromColumn ? 5 : 3;
    const rook = board[toRow]?.[rookFrom] ?? null;
    if (rook?.toLowerCase() !== "r") return null;
    board[toRow]![rookTo] = rook;
    board[toRow]![rookFrom] = null;
  }
  if (piece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    const promotion = action.promotion ?? "q";
    if (!( ["q", "r", "b", "n"] as string[]).includes(promotion)) return null;
    board[toRow]![toColumn] = piece === piece.toUpperCase() ? promotion.toUpperCase() : promotion.toLowerCase();
  }
  return board;
}

export function chessActions(state: BoardGameState, playerId: string): BoardGameAction[] {
  return chessPseudoMoves(state, playerId).filter((action) => {
    const board = chessBoardAfterMove(state, action);
    return board !== null && !chessKingInCheck(state, playerId, board);
  });
}

export function chessPositionKey(state: BoardGameState): string {
  const active = state.players.find((player) => player.userId === state.currentPlayerId);
  const sideToMove = active && active.seat % 2 === 0 ? "w" : "b";
  let ep = "-";
  const target = state.chessEnPassantTarget ?? null;
  if (target !== null) {
    const targetRow = Math.floor(target / 8), targetColumn = target % 8;
    const pawnRow = targetRow + (sideToMove === "w" ? 1 : -1);
    const pawn = sideToMove === "w" ? "P" : "p";
    if ([-1, 1].some((delta) => state.board[pawnRow]?.[targetColumn + delta] === pawn)) ep = String(target);
  }
  return `${state.board.map((row) => row.join("")).join("/")}:${sideToMove}:${state.chessCastlingRights ?? "KQkq"}:${ep}`;
}
export function chessPositionCount(state: BoardGameState): number {
  const key = chessPositionKey(state);
  return (state.chessPositionHistory ?? []).filter((position) => position === key).length;
}
export function chessDrawClaimAvailable(state: BoardGameState): boolean {
  return (state.chessHalfmoveClock ?? 0) >= 100 || chessPositionCount(state) >= 3;
}
export function chessInsufficientMaterial(state: BoardGameState): boolean {
  const pieces: Array<{kind:string; color:number}> = [];
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    const piece = state.board[row]?.[column] ?? null;
    if (!piece || piece.toLowerCase() === "k") continue;
    pieces.push({ kind: piece.toLowerCase(), color: (row + column) % 2 });
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && ["b", "n"].includes(pieces[0]!.kind)) return true;
  return pieces.every((piece) => piece.kind === "b") && new Set(pieces.map((piece) => piece.color)).size === 1;
}
