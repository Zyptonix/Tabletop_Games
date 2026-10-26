"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";

const PIECES: Record<string, string> = { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" };

const CHESS_PIECE_FILES: Record<string, string> = {
  K: "white_king.png", Q: "white_queen.png", R: "white_rook.png", B: "white_bishop.png", N: "white_knight.png", P: "white_pawn.png",
  k: "black_king.png", q: "black_queen.png", r: "black_rook.png", b: "black_bishop.png", n: "black_knight.png", p: "black_pawn.png"
};

function ChessPieceArt({ piece }: { piece: string }) {
  const file = CHESS_PIECE_FILES[piece];
  const [failedFile, setFailedFile] = useState<string | null>(null);
  if (!file || failedFile === file) return <span className={piece === piece.toUpperCase() ? "text-white" : "text-black"}>{PIECES[piece] ?? piece}</span>;
  const sizeClass =
    piece.toLowerCase() === "p"
      ? "h-[70%] w-[70%]"
      : "h-[75%] w-[75%]";

  return (
    <img
      src={`/game-assets/chess/${file}`}
      alt=""
      draggable={false}
      onError={() => setFailedFile(file)}
      className={`pointer-events-none ${sizeClass} select-none object-contain drop-shadow-none`}
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
        // White pawns attack one row up; black pawns attack one row down.
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
export function ChessTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
const [selectedSquare,setSelectedSquare]=useState<number|null>(null);const [chessMoveNotice,setChessMoveNotice]=useState<string|null>(null);const [pendingChessPromotion,setPendingChessPromotion]=useState<AnyAction[]|null>(null);

function renderChess() {
    const legalMoves = legalActions.filter(isAction).filter((action) => action.type === "move_piece");
    const selectedMoves = legalMoves.filter((action) => action.from === selectedSquare);
    const checkedKingSquares = getCheckedKingSquares(state.board);
    const chessFlipped = (me?.seat ?? 0) % 2 === 1;
    return <div className="mx-auto w-full max-w-[min(75vh,740px)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[.2em] text-white/45">Your pieces at the bottom · Select a piece, then a highlighted square</div><div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold">{currentPlayer?.displayName ?? "Waiting"} to move</div></div>
      <div className="overflow-hidden rounded-2xl border-[7px] border-[#214b2a] bg-[#214b2a] shadow-[0_24px_50px_rgba(0,0,0,.45)]"><div className="grid grid-cols-8">
       {Array.from({ length: 64 }, (_, displayIndex) => {
          const displayRow = Math.floor(displayIndex / 8);
          const displayColumn = displayIndex % 8;

          // Reverse both axes for the Black player's view.
          const rowIndex = chessFlipped ? 7 - displayRow : displayRow;
          const column = chessFlipped ? 7 - displayColumn : displayColumn;

          // Always use the real board coordinates for game actions.
          const piece = state.board[rowIndex]?.[column] ?? null;
          const index = rowIndex * 8 + column;
          const highlighted = selectedMoves.some((action) => action.to === index);
          const selected = selectedSquare === index;
          return <button key={index} type="button" aria-label={`Chess square ${String.fromCharCode(97 + column)}${8 - rowIndex}`} onClick={() => {
            if (!isMyTurn) return;
            const isOwnPiece = Boolean(piece && ((me?.seat ?? 0) % 2 === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase()));
            if (selectedSquare !== null) {
              const choices = selectedMoves.filter((action) => action.to === index);
              if (choices.length > 1) {
                setPendingChessPromotion(choices);
                setChessMoveNotice(null);
                return;
              }
              if (choices.length === 1) {
                const move = choices[0];
                if (move) onAction("move_piece", { from: selectedSquare, to: index });
                setSelectedSquare(null);
                setPendingChessPromotion(null);
                setChessMoveNotice(null);
                return;
              }
              if (isOwnPiece) {
                // Clicking another friendly piece switches the selected piece.
                setSelectedSquare(index);
                setPendingChessPromotion(null);
                setChessMoveNotice(null);
              } else {
                // Keep the current piece selected so its legal destinations stay visible.
                setChessMoveNotice("Illegal move — that destination is not legal. Your king may be exposed to check, or the piece may not move that way.");
                setPendingChessPromotion(null);
              }
              return;
            }
            if (isOwnPiece) {
              setSelectedSquare(index);
              setPendingChessPromotion(null);
              setChessMoveNotice(null);
            } else {
              setChessMoveNotice("Select one of your own pieces first.");
              setSelectedSquare(null);
              setPendingChessPromotion(null);
            }
          }} className={`relative grid aspect-square place-items-center text-[clamp(1.5rem,4.6vw,3.2rem)] leading-none transition-colors ${((rowIndex + column) % 2 === 0) ? "bg-[#c9eac5] text-[#142a18]" : "bg-[#4f8e5b] text-white"} ${selected ? "ring-4 ring-inset ring-amber-300" : ""} ${highlighted ? "after:absolute after:h-3 after:w-3 after:rounded-full after:bg-emerald-500/80 after:shadow-[0_0_0_4px_rgba(16,185,129,.18)]" : ""}`}>
            {piece ? <ChessPieceArt piece={piece} /> : null}
            {piece && checkedKingSquares.has(index) ? (
              <span
                role="img"
                aria-label="King in check"
                title="King in check"
                className="pointer-events-none absolute inset-0 z-0 bg-red-300/45 ring-2 ring-inset ring-red-400/70"
              />
            ) : null}
            {/* CHESS CHECK FULL-SQUARE HIGHLIGHT V1 */}
            {displayColumn === 0 ? <span className="absolute left-1 top-1 text-[9px] font-black opacity-40">{8 - rowIndex}</span> : null}{displayRow === 7 ? <span className="absolute bottom-1 right-1 text-[9px] font-black opacity-40">{"abcdefgh"[column]}</span> : null}
          </button>;
        })}
      </div></div>{chessMoveNotice ? <p role="status" className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">⚠️ {chessMoveNotice}</p> : null}<div className="mt-2 flex flex-wrap items-center justify-between gap-2">{pendingChessPromotion ? <div className="flex items-center gap-2 rounded-lg border border-amber-200/20 bg-amber-100/[.06] p-2"><span className="text-[10px] font-black text-amber-100">Promote to</span>{pendingChessPromotion.map((action) => <button key={String(action.promotion)} type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/10 text-lg font-black hover:bg-emerald-300/20" onClick={() => { onAction("move_piece", { from: action.from, to: action.to, promotion: action.promotion }); setPendingChessPromotion(null); setSelectedSquare(null); setChessMoveNotice(null); }}>{String(action.promotion).toUpperCase()}</button>)}<button type="button" onClick={() => setPendingChessPromotion(null)} className="rounded-lg px-2 py-1 text-xs text-white/50">Cancel</button></div> : null}{hasAction(legalActions, "claim_chess_draw") ? <button type="button" onClick={() => onAction("claim_chess_draw")} className="rounded-lg border border-amber-200/25 bg-amber-100/10 px-3 py-2 text-[10px] font-black text-amber-100 hover:bg-amber-100/20">Claim draw</button> : null}</div><p className="mt-2 text-[10px] leading-relaxed text-white/40">Legal moves, castling, en passant, promotion, checkmate and draw rules are enforced by the server.</p>
    </div>;
  }
return renderChess();
}
