"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Flag,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Send,
  AlertTriangle,
  Crown
} from "lucide-react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { owns, isAction, hasAction } from "../board-games/shared/ui-utils";
import type { ChessMoveRecord } from "@tabletop/game-core";

const PIECES: Record<string, string> = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙"
};

const CHESS_PIECE_FILES: Record<string, string> = {
  K: "white_king.png",
  Q: "white_queen.png",
  R: "white_rook.png",
  B: "white_bishop.png",
  N: "white_knight.png",
  P: "white_pawn.png",
  k: "black_king.png",
  q: "black_queen.png",
  r: "black_rook.png",
  b: "black_bishop.png",
  n: "black_knight.png",
  p: "black_pawn.png"
};

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0
};

const CHESS_OPENINGS: Record<string, string> = {
  "d4 d5 2. Nf3 Bg4": "Queen's Pawn Opening: Anti-Torre Attack",
  "d4 d5 2. c4": "Queen's Gambit",
  "d4 d5 2. Nf3 Nf6": "Queen's Pawn Game: Symmetrical",
  "d4 d5": "Queen's Pawn Opening",
  "d4 Nf6 2. c4 e6 3. Nc3 Bb4": "Nimzo-Indian Defense",
  "d4 Nf6 2. c4 g6": "King's Indian Defense",
  "d4 Nf6 2. c4 e6": "Queen's Indian / Bogo-Indian",
  "d4 Nf6 2. c4 c5": "Benoni Defense",
  "d4 Nf6": "Indian Defense",
  "d4 f5": "Dutch Defense",
  "e4 e5 2. Nf3 Nc6 3. Bb5": "Ruy Lopez",
  "e4 e5 2. Nf3 Nc6 3. Bc4": "Italian Game",
  "e4 e5 2. Nf3 Nc6 3. d4": "Scotch Game",
  "e4 e5 2. Nf3 Nf6": "Petrov's Defense",
  "e4 e5 2. f4": "King's Gambit",
  "e4 e5": "King's Pawn Game",
  "e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4": "Sicilian Defense: Open",
  "e4 c5": "Sicilian Defense",
  "e4 e6 2. d4 d5": "French Defense",
  "e4 e6": "French Defense",
  "e4 c6 2. d4 d5": "Caro-Kann Defense",
  "e4 c6": "Caro-Kann Defense",
  "e4 d5": "Scandinavian Defense",
  "e4 d6": "Pirc Defense",
  "e4 g6": "Modern Defense",
  "c4": "English Opening",
  "Nf3": "Réti Opening",
  "f4": "Bird's Opening",
  "b3": "Nimzo-Larsen Attack",
  "g3": "King's Indian Attack"
};

function ChessPieceArt({ piece }: { piece: string }) {
  const file = CHESS_PIECE_FILES[piece];
  const [failedFile, setFailedFile] = useState<string | null>(null);

  if (!file || failedFile === file) {
    return (
      <span className={piece === piece.toUpperCase() ? "text-slate-100 drop-shadow" : "text-slate-900 drop-shadow"}>
        {PIECES[piece] ?? piece}
      </span>
    );
  }

  const kind = piece.toLowerCase();
  const sizeClass =
    kind === "p"
      ? "h-[45%] w-[45%]"
      : kind === "k" || kind === "q"
        ? "h-[64%] w-[64%]"
        : "h-[54%] w-[54%]";

  return (
    <img
      src={`/game-assets/chess/${file}`}
      alt={piece}
      draggable={false}
      onError={() => setFailedFile(file)}
      className={`pointer-events-none select-none object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] transition-transform duration-150 ${sizeClass}`}
    />
  );
}

function chessSquareIsAttacked(
  board: Array<Array<string | null>>,
  targetRow: number,
  targetColumn: number,
  byWhite: boolean
): boolean {
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (!piece || (piece === piece.toUpperCase()) !== byWhite) continue;

      const kind = piece.toLowerCase();
      const dr = targetRow - row;
      const dc = targetColumn - column;
      const absRow = Math.abs(dr);
      const absColumn = Math.abs(dc);

      if (kind === "p") {
        if (dr === (byWhite ? -1 : 1) && absColumn === 1) return true;
        continue;
      }
      if (kind === "n" && ((absRow === 2 && absColumn === 1) || (absRow === 1 && absColumn === 2))) {
        return true;
      }
      if (kind === "k" && Math.max(absRow, absColumn) === 1) return true;

      const straight = (dr === 0 && dc !== 0) || (dc === 0 && dr !== 0);
      const diagonal = absRow === absColumn && absRow > 0;
      const compatible =
        (kind === "q" && (straight || diagonal)) ||
        (kind === "r" && straight) ||
        (kind === "b" && diagonal);
      if (!compatible) continue;

      let scanRow = row + Math.sign(dr);
      let scanColumn = column + Math.sign(dc);
      let blocked = false;
      while (scanRow !== targetRow || scanColumn !== targetColumn) {
        if (board[scanRow]?.[scanColumn]) {
          blocked = true;
          break;
        }
        scanRow += Math.sign(dr);
        scanColumn += Math.sign(dc);
      }
      if (!blocked) return true;
    }
  }
  return false;
}

function getCheckedKingSquares(board: Array<Array<string | null>>): Set<number> {
  const checked = new Set<number>();
  for (const king of [
    { piece: "K", isWhite: true },
    { piece: "k", isWhite: false }
  ]) {
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        if (board[row]?.[column] !== king.piece) continue;
        if (chessSquareIsAttacked(board, row, column, !king.isWhite)) {
          checked.add(row * 8 + column);
        }
      }
    }
  }
  return checked;
}

export function ChessTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, timer, onAction, onChat, onEndMatch } = props;

  const me = state.players.find((player) => player.userId === currentUserId);
  const isWhite = (me?.seat ?? 0) % 2 === 0;
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
  const opponent = state.players.find((player) => player.userId !== currentUserId) ?? state.players[1];

  const [manualFlipped, setManualFlipped] = useState<boolean | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [chessMoveNotice, setChessMoveNotice] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ choices: AnyAction[]; targetSquare: number } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"moves" | "chat" | "info">("moves");
  const [chatDraft, setChatDraft] = useState("");
  const [confirmResign, setConfirmResign] = useState(false);

  // Default orientation: Player's pieces at bottom (flip if Black)
  const isFlipped = manualFlipped !== null ? manualFlipped : !isWhite;

  const clockSeconds = Number(room.settings?.clockSeconds ?? 0);
  const chessClockEnabled = clockSeconds > 0;

  const clockFor = (userId: string) =>
    timer != null && timer.currentPlayerId === userId && timer.remainingMs !== null
      ? timer.remainingMs
      : state.clockRemainingMsByPlayer?.[userId] ?? clockSeconds * 1000;

  const formatClock = (milliseconds: number) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const legalMoves = useMemo(
    () => legalActions.filter(isAction).filter((action) => action.type === "move_piece"),
    [legalActions]
  );
  const selectedMoves = useMemo(
    () => legalMoves.filter((action) => action.from === selectedSquare),
    [legalMoves, selectedSquare]
  );
  const checkedKingSquares = useMemo(() => getCheckedKingSquares(state.board), [state.board]);

  // Compute Material Difference & Captured Pieces
  const materialData = useMemo(() => {
    const startingCounts: Record<string, number> = {
      p: 8, n: 2, b: 2, r: 2, q: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1
    };
    const currentCounts: Record<string, number> = {
      p: 0, n: 0, b: 0, r: 0, q: 0,
      P: 0, N: 0, B: 0, R: 0, Q: 0
    };

    let whiteMaterial = 0;
    let blackMaterial = 0;

    for (const row of state.board) {
      for (const piece of row) {
        if (!piece) continue;
        if (currentCounts[piece] !== undefined) {
          currentCounts[piece] += 1;
        }
        const val = PIECE_VALUES[piece] ?? 0;
        if (piece === piece.toUpperCase()) {
          whiteMaterial += val;
        } else {
          blackMaterial += val;
        }
      }
    }

    const capturedWhite: string[] = [];
    const capturedBlack: string[] = [];

    for (const [p, startCount] of Object.entries(startingCounts)) {
      const remaining = currentCounts[p] ?? 0;
      const capturedCount = Math.max(0, startCount - remaining);
      for (let i = 0; i < capturedCount; i++) {
        if (p === p.toUpperCase()) {
          capturedWhite.push(p);
        } else {
          capturedBlack.push(p);
        }
      }
    }

    const diff = whiteMaterial - blackMaterial;

    return {
      whiteAdvantage: diff > 0 ? diff : 0,
      blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
      capturedByWhite: capturedBlack, // White took Black's pieces
      capturedByBlack: capturedWhite  // Black took White's pieces
    };
  }, [state.board]);

  // Opening Book Name Calculation
  const moveHistory: ChessMoveRecord[] = useMemo(() => {
    return state.chessMoveHistory ?? [];
  }, [state.chessMoveHistory]);

  const openingName = useMemo(() => {
    if (!moveHistory.length) return "Standard Chess Match";

    // Format like: "d4 d5 2. Nf3 Bg4"
    const movesSan: string[] = [];
    for (let i = 0; i < moveHistory.length; i++) {
      const record = moveHistory[i]!;
      if (record.side === "w") {
        movesSan.push(`${record.moveNumber > 1 ? `${record.moveNumber}. ` : ""}${record.san}`);
      } else {
        movesSan.push(record.san);
      }
    }

    const fullSequence = movesSan.join(" ");

    // Search for longest matching opening prefix
    let bestMatch = "Standard Chess Opening";
    let maxLen = 0;
    for (const [seq, name] of Object.entries(CHESS_OPENINGS)) {
      if (fullSequence.startsWith(seq) && seq.length > maxLen) {
        maxLen = seq.length;
        bestMatch = name;
      }
    }

    return bestMatch;
  }, [moveHistory]);

  // Group Moves for Dual Column Notation Display: 1. d4 d5
  const movePairs = useMemo(() => {
    const pairs: Array<{
      moveNumber: number;
      white?: ChessMoveRecord | undefined;
      black?: ChessMoveRecord | undefined;
    }> = [];

    for (const record of moveHistory) {
      let existing = pairs.find((p) => p.moveNumber === record.moveNumber);
      if (!existing) {
        existing = { moveNumber: record.moveNumber };
        pairs.push(existing);
      }
      if (record.side === "w") {
        existing.white = record;
      } else {
        existing.black = record;
      }
    }
    return pairs;
  }, [moveHistory]);

  const lastMove = state.chessLastMove;

  function handleSquareClick(index: number, rowIndex: number, column: number, piece: string | null) {
    if (!isMyTurn || state.phase === "finished") return;

    const isOwnPiece = Boolean(
      piece && (isWhite ? piece === piece.toUpperCase() : piece === piece.toLowerCase())
    );

    if (selectedSquare !== null) {
      const choices = selectedMoves.filter((action) => action.to === index);

      if (choices.length > 1) {
        setPendingPromotion({ choices, targetSquare: index });
        setChessMoveNotice(null);
        return;
      }

      if (choices.length === 1) {
        const move = choices[0];
        if (move) onAction("move_piece", { from: selectedSquare, to: index });
        setSelectedSquare(null);
        setPendingPromotion(null);
        setChessMoveNotice(null);
        return;
      }

      if (isOwnPiece) {
        setSelectedSquare(index);
        setPendingPromotion(null);
        setChessMoveNotice(null);
      } else {
        setChessMoveNotice("Illegal destination. Check king safety or piece movement path.");
        setPendingPromotion(null);
      }
      return;
    }

    if (isOwnPiece) {
      setSelectedSquare(index);
      setPendingPromotion(null);
      setChessMoveNotice(null);
    } else {
      setSelectedSquare(null);
      setPendingPromotion(null);
    }
  }

  const whitePlayer = state.players.find((p) => p.seat % 2 === 0) ?? state.players[0];
  const blackPlayer = state.players.find((p) => p.seat % 2 === 1) ?? state.players[1];

  const topPlayer = isFlipped ? whitePlayer : blackPlayer;
  const bottomPlayer = isFlipped ? blackPlayer : whitePlayer;

  const topIsWhite = topPlayer ? topPlayer.seat % 2 === 0 : false;
  const bottomIsWhite = bottomPlayer ? bottomPlayer.seat % 2 === 0 : true;

  const topAdvantage = topIsWhite ? materialData.whiteAdvantage : materialData.blackAdvantage;
  const bottomAdvantage = bottomIsWhite ? materialData.whiteAdvantage : materialData.blackAdvantage;

  const topCaptured = topIsWhite ? materialData.capturedByWhite : materialData.capturedByBlack;
  const bottomCaptured = bottomIsWhite ? materialData.capturedByWhite : materialData.capturedByBlack;

  return (
    <div className="flex w-full flex-col lg:flex-row items-center justify-center gap-3 lg:gap-6 max-w-7xl mx-auto p-1 sm:p-2 select-none h-full overflow-hidden">
      {/* ============================================================== */}
      {/* LEFT COLUMN: CHESS BOARD & PLAYER PODS (CHESS.COM STRUCTURE)  */}
      {/* ============================================================== */}
      <div className="flex flex-col items-center w-full shrink-0" style={{ maxWidth: "min(100%, calc(100dvh - 120px), 760px)" }}>
        {/* TOP OPPONENT POD */}
        {topPlayer ? (
          <div className="flex w-full items-center justify-between py-1.5 px-1 text-white">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 shadow-md grid place-items-center">
                <span className="text-sm font-black text-slate-300">
                  {topPlayer.displayName.slice(0, 1).toUpperCase()}
                </span>
                {topPlayer.isBot ? (
                  <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-[0.55rem] font-black text-center uppercase tracking-tighter">
                    BOT
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {topPlayer.displayName}
                  </span>
                  <span className="text-xs text-white/50 font-medium">
                    (800)
                  </span>
                  {topPlayer.userId === state.currentPlayerId && state.phase === "playing" ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ) : null}
                </div>

                {/* Captured Pieces & Material Advantage */}
                <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
                  <div className="flex items-center -space-x-1">
                    {topCaptured.map((p, idx) => (
                      <span key={idx} className="text-xs opacity-75">
                        {PIECES[p]}
                      </span>
                    ))}
                  </div>
                  {topAdvantage > 0 ? (
                    <span className="text-[0.65rem] font-black text-amber-300 bg-black/40 px-1 rounded">
                      +{topAdvantage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Top Clock & Settings */}
            <div className="flex items-center gap-2">
              {chessClockEnabled ? (
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-lg font-black tabular-nums shadow-lg transition-all ${
                    topPlayer.userId === state.currentPlayerId && state.phase === "playing"
                      ? clockFor(topPlayer.userId) <= 15000
                        ? "bg-rose-600/90 text-white ring-2 ring-rose-400 animate-pulse"
                        : "bg-white text-slate-900 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                      : "bg-slate-900/90 text-slate-300 border border-white/10"
                  }`}
                >
                  <Clock className="h-4 w-4 opacity-70" />
                  <span>{formatClock(clockFor(topPlayer.userId))}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setManualFlipped((prev) => (prev !== null ? !prev : isWhite))}
                title="Flip Board"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/30 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* 8x8 CHESS BOARD CONTAINER - ALWAYS STRICTLY SQUARE */}
        <div
          className="relative aspect-square w-full rounded-2xl overflow-hidden border-[5px] sm:border-[6px] border-[#2b2b29] bg-[#2b2b29] shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
          style={{ aspectRatio: "1 / 1" }}
        >
          <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
            {Array.from({ length: 64 }, (_, displayIndex) => {
              const displayRow = Math.floor(displayIndex / 8);
              const displayColumn = displayIndex % 8;

              // Flip orientation
              const rowIndex = isFlipped ? 7 - displayRow : displayRow;
              const column = isFlipped ? 7 - displayColumn : displayColumn;

              const index = rowIndex * 8 + column;
              const piece = state.board[rowIndex]?.[column] ?? null;

              const isLightSquare = (rowIndex + column) % 2 === 0;
              const isSelected = selectedSquare === index;
              const isLegalMove = selectedMoves.some((action) => action.to === index);
              const isKingChecked = piece && checkedKingSquares.has(index);
              const isLastMoveSquare = lastMove && (lastMove.from === index || lastMove.to === index);

              // Square Colors: Chess.com Natural Green & Buff
              const squareBgClass = isLightSquare
                ? "bg-[#eae9d2] text-[#4b7399]"
                : "bg-[#4b7399] text-[#eae9d2]";

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSquareClick(index, rowIndex, column, piece)}
                  aria-label={`Chess square ${String.fromCharCode(97 + column)}${8 - rowIndex}`}
                  className={`relative aspect-square flex items-center justify-center transition-colors ${squareBgClass} ${
                    isLastMoveSquare ? "!bg-[#f7ec74]/75 !text-slate-900" : ""
                  } ${isSelected ? "!bg-[#f5e050] !text-slate-900 ring-4 ring-inset ring-amber-400" : ""}`}
                >
                  {/* Square Edge Coordinate Labels (Inside squares like Chess.com) */}
                  {displayColumn === 0 ? (
                    <span className="pointer-events-none absolute left-1 top-1 text-[10px] sm:text-xs font-black opacity-60">
                      {8 - rowIndex}
                    </span>
                  ) : null}
                  {displayRow === 7 ? (
                    <span className="pointer-events-none absolute right-1 bottom-0.5 text-[10px] sm:text-xs font-black opacity-60">
                      {"abcdefgh"[column]}
                    </span>
                  ) : null}

                  {/* King Check Red Glow */}
                  {isKingChecked ? (
                    <span className="pointer-events-none absolute inset-0 z-10 bg-rose-500/50 ring-4 ring-inset ring-rose-600 animate-pulse" />
                  ) : null}

                  {/* Piece Art */}
                  {piece ? (
                    <div className="relative z-10 flex h-full w-full items-center justify-center">
                      <ChessPieceArt piece={piece} />
                    </div>
                  ) : null}

                  {/* Legal Move Indicators */}
                  {isLegalMove && !piece ? (
                    <span className="pointer-events-none absolute z-20 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-700/60 shadow-[0_0_8px_rgba(4,120,87,0.5)]" />
                  ) : null}

                  {/* Legal Capture Target Ring */}
                  {isLegalMove && piece ? (
                    <span className="pointer-events-none absolute inset-1.5 z-20 rounded-full border-[4px] sm:border-[5px] border-emerald-600/75 animate-pulse" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* ELEGANT PROMOTION MODAL OVERLAY (OUTSIDE OF BUTTONS) */}
          {pendingPromotion ? (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
              onClick={() => setPendingPromotion(null)}
            >
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-amber-400/80 bg-slate-900/95 p-4 shadow-2xl max-w-[290px] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Pawn Promotion</p>
                  <p className="text-xs text-white/60">Choose your promotion piece:</p>
                </div>

                <div className="grid grid-cols-4 gap-2 w-full">
                  {pendingPromotion.choices.map((action) => {
                    const promoLetter = String(action.promotion ?? "q").toLowerCase();
                    const pieceSymbol = isWhite ? promoLetter.toUpperCase() : promoLetter;
                    const pieceName = promoLetter === "q" ? "Queen" : promoLetter === "r" ? "Rook" : promoLetter === "b" ? "Bishop" : "Knight";

                    return (
                      <button
                        key={promoLetter}
                        type="button"
                        onClick={() => {
                          onAction("move_piece", {
                            from: action.from,
                            to: action.to,
                            promotion: action.promotion
                          });
                          setPendingPromotion(null);
                          setSelectedSquare(null);
                          setChessMoveNotice(null);
                        }}
                        className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 p-2 transition hover:scale-105 hover:border-amber-400 hover:bg-amber-400/20 active:scale-95 shadow-md"
                      >
                        <div className="h-10 w-10 flex items-center justify-center">
                          <ChessPieceArt piece={pieceSymbol} />
                        </div>
                        <span className="text-[10px] font-bold text-white/80 group-hover:text-amber-200">
                          {pieceName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPendingPromotion(null)}
                  className="mt-0.5 text-xs font-bold text-white/40 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* BOTTOM CURRENT PLAYER POD */}
        {bottomPlayer ? (
          <div className="flex w-full items-center justify-between py-2 px-1 text-white">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 border border-white/20 shadow-md grid place-items-center">
                <span className="text-base font-black text-white">
                  {bottomPlayer.displayName.slice(0, 1).toUpperCase()}
                </span>
                {bottomPlayer.userId === currentUserId ? (
                  <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-[0.55rem] font-black text-center uppercase tracking-tighter">
                    YOU
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white tracking-wide">
                    {bottomPlayer.displayName}
                  </span>
                  <span className="text-xs text-white/50 font-medium">
                    (816)
                  </span>
                  {bottomPlayer.userId === state.currentPlayerId && state.phase === "playing" ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ) : null}
                </div>

                {/* Captured Pieces & Material Advantage */}
                <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
                  <div className="flex items-center -space-x-1">
                    {bottomCaptured.map((p, idx) => (
                      <span key={idx} className="text-xs opacity-75">
                        {PIECES[p]}
                      </span>
                    ))}
                  </div>
                  {bottomAdvantage > 0 ? (
                    <span className="text-[0.65rem] font-black text-amber-300 bg-black/40 px-1 rounded">
                      +{bottomAdvantage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bottom Actions & Clock */}
            <div className="flex items-center gap-2">
              {/* Claim Draw Button */}
              {hasAction(legalActions, "claim_chess_draw") ? (
                <button
                  type="button"
                  onClick={() => onAction("claim_chess_draw")}
                  className="rounded-lg border border-amber-300/60 bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-200 hover:bg-amber-500/30 active:scale-95 shadow-md"
                >
                  ½ Draw
                </button>
              ) : null}

              {/* Resign Button */}
              {onEndMatch && state.phase === "playing" ? (
                <button
                  type="button"
                  onClick={() => setConfirmResign(true)}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white/70 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-400/40 transition"
                  title="Resign Match"
                >
                  <Flag className="h-4 w-4" />
                </button>
              ) : null}

              {/* Bottom Clock */}
              {chessClockEnabled ? (
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-xl font-black tabular-nums shadow-lg transition-all ${
                    bottomPlayer.userId === state.currentPlayerId && state.phase === "playing"
                      ? clockFor(bottomPlayer.userId) <= 15000
                        ? "bg-rose-600/90 text-white ring-2 ring-rose-400 animate-pulse"
                        : "bg-white text-slate-900 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                      : "bg-slate-900/90 text-slate-300 border border-white/10"
                  }`}
                >
                  <Clock className="h-4 w-4 opacity-70" />
                  <span>{formatClock(clockFor(bottomPlayer.userId))}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Floating Notice Toast */}
        {chessMoveNotice ? (
          <div className="absolute top-14 inset-x-4 z-40 flex justify-center pointer-events-none">
            <p
              role="status"
              className="pointer-events-auto rounded-xl border border-rose-400/50 bg-rose-950/90 px-4 py-2 text-center text-xs font-bold text-rose-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
            >
              ⚠️ {chessMoveNotice}
            </p>
          </div>
        ) : null}
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: CHESS.COM SIDEBAR (MOVES, NOTATION, CHAT, INFO) */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 flex flex-col rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl overflow-hidden self-stretch max-h-[min(calc(100dvh-120px),760px)]">
        {/* TOP TABS: MOVES / CHAT / INFO */}
        <div className="flex border-b border-white/10 bg-black/40">
          <button
            type="button"
            onClick={() => setSidebarTab("moves")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition ${
              sidebarTab === "moves"
                ? "border-b-2 border-emerald-400 bg-white/[0.04] text-white"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Moves</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarTab("chat")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition ${
              sidebarTab === "chat"
                ? "border-b-2 border-emerald-400 bg-white/[0.04] text-white"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarTab("info")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition ${
              sidebarTab === "info"
                ? "border-b-2 border-emerald-400 bg-white/[0.04] text-white"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            <Info className="h-4 w-4" />
            <span>Info</span>
          </button>
        </div>

        {/* TAB CONTENT: MOVES (CHESS.COM STYLE) */}
        {sidebarTab === "moves" ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Opening Title Card */}
            <div className="border-b border-white/10 bg-white/[0.03] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-black text-white/90 truncate max-w-[260px]">
                  {openingName}
                </h4>
              </div>
              <span className="text-[0.62rem] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">
                Book
              </span>
            </div>

            {/* Standard Algebraic Notation Table */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.04]">
              {movePairs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <span className="text-3xl opacity-30">♟️</span>
                  <p className="mt-2 text-xs font-bold text-white/40">
                    Moves in Standard Notation will appear here as the game progresses.
                  </p>
                </div>
              ) : (
                movePairs.map((pair) => (
                  <div
                    key={pair.moveNumber}
                    className="grid grid-cols-[3rem_1fr_1fr] items-center py-1.5 px-2 text-xs font-mono rounded hover:bg-white/[0.04] transition"
                  >
                    <span className="text-white/40 font-bold">{pair.moveNumber}.</span>

                    {/* White Move */}
                    <div className="flex items-center gap-1 font-bold text-white/90">
                      {pair.white ? (
                        <>
                          <span className="text-sm opacity-60">
                            {PIECES[pair.white.piece.toUpperCase()] ?? ""}
                          </span>
                          <span>{pair.white.san}</span>
                        </>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </div>

                    {/* Black Move */}
                    <div className="flex items-center gap-1 font-bold text-white/90">
                      {pair.black ? (
                        <>
                          <span className="text-sm opacity-60">
                            {PIECES[pair.black.piece.toLowerCase()] ?? ""}
                          </span>
                          <span>{pair.black.san}</span>
                        </>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Match Meta Card & Nav Controls */}
            <div className="border-t border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>
                  {whitePlayer?.displayName} vs {blackPlayer?.displayName}
                </span>
                <span className="text-[0.65rem] font-bold text-emerald-400">
                  {state.phase === "finished"
                    ? state.winnerUserId
                      ? `Winner: ${state.players.find((p) => p.userId === state.winnerUserId)?.displayName}`
                      : "Drawn Match"
                    : `${currentPlayer?.displayName}'s Turn`}
                </span>
              </div>

              {/* Review Controls (|<, <, >, >|) */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={moveHistory.length === 0}
                  className="grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"
                  title="First Move"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={moveHistory.length === 0}
                  className="grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"
                  title="Previous Move"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={moveHistory.length === 0}
                  className="grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"
                  title="Next Move"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={moveHistory.length === 0}
                  className="grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"
                  title="Latest Move"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* TAB CONTENT: IN-GAME CHAT */}
        {sidebarTab === "chat" ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(state.activityLog ?? []).slice(-20).map((act, i) => (
                <div
                  key={act.id ?? i}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs"
                >
                  <p className="font-semibold text-white/80">{act.message}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatDraft.trim()) return;
                onChat(room.id, chatDraft.trim());
                setChatDraft("");
              }}
              className="border-t border-white/10 p-2.5 flex items-center gap-2 bg-black/40"
            >
              <input
                type="text"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Send match message..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim()}
                className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : null}

        {/* TAB CONTENT: RULES & INFO */}
        {sidebarTab === "info" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-white/70">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
              <span className="text-[0.68rem] font-black uppercase tracking-wider text-emerald-400">
                Match Telemetry
              </span>
              <div className="flex justify-between">
                <span>Total Moves:</span>
                <strong className="text-white">{moveHistory.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Halfmove Clock (50-move):</span>
                <strong className="text-white">{state.chessHalfmoveClock ?? 0}/100</strong>
              </div>
              <div className="flex justify-between">
                <span>Castling Rights:</span>
                <strong className="text-white font-mono">{state.chessCastlingRights || "None"}</strong>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1">
              <span className="text-[0.68rem] font-black uppercase tracking-wider text-amber-300">
                FIDE Rules Enforced
              </span>
              <p className="text-[0.68rem] leading-relaxed text-white/50">
                Kingside and Queenside castling, En Passant pawn captures, pawn promotion with selection (Q, R, B, N), check, checkmate, stalemate, threefold repetition, and the 50-move rule are actively enforced by the server game engine.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* CONFIRM RESIGN MODAL */}
      <AnimatePresence>
        {confirmResign ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-slate-950 p-5 shadow-2xl text-center space-y-4"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-500/20 text-rose-400 mx-auto">
                <Flag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Resign Chess Match?</h3>
                <p className="text-xs text-white/60 mt-1">
                  Resigning concedes the game to your opponent. Are you sure?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmResign(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResign(false);
                    if (onEndMatch) onEndMatch(room.id);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30"
                >
                  Confirm Resign
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
