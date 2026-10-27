import { finish, nextPlayerId } from "../shared/utils";
import { chessActions, chessBoardAfterMove, chessDrawClaimAvailable, chessInsufficientMaterial, chessKingInCheck, chessPositionCount, chessPositionKey, playerOwnsChessPiece } from "./rules";
import type { BoardGameAction, BoardGameState, ChessMoveRecord } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";

export function computeChessMoveSan(params: {
  stateBeforeMove: BoardGameState;
  playerId: string;
  from: number;
  to: number;
  promotion?: string | undefined;
  isCheck: boolean;
  isCheckmate: boolean;
}): string {
  const { stateBeforeMove, playerId, from, to, promotion, isCheck, isCheckmate } = params;
  const fromRow = Math.floor(from / 8), fromCol = from % 8;
  const toRow = Math.floor(to / 8), toCol = to % 8;
  const piece = stateBeforeMove.board[fromRow]?.[fromCol] ?? null;
  if (!piece) return `${String.fromCharCode(97 + toCol)}${8 - toRow}`;

  const destination = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
  const captured = stateBeforeMove.board[toRow]?.[toCol] ?? null;
  const epCapture = piece.toLowerCase() === "p" && fromCol !== toCol && !captured && stateBeforeMove.chessEnPassantTarget === to;
  const isCapture = captured !== null || epCapture;
  const kind = piece.toLowerCase();

  let san = "";

  if (kind === "k" && Math.abs(toCol - fromCol) === 2) {
    san = toCol > fromCol ? "O-O" : "O-O-O";
  } else if (kind === "p") {
    if (isCapture) {
      san = `${String.fromCharCode(97 + fromCol)}x${destination}`;
    } else {
      san = destination;
    }
    if (promotion) {
      san += `=${promotion.toUpperCase()}`;
    }
  } else {
    const pieceLetter = piece.toUpperCase();
    let disambiguation = "";
    const legalMoves = chessActions(stateBeforeMove, playerId);
    const otherCandidates = legalMoves.filter((candidate) => {
      if (candidate.type !== "move_piece" || candidate.to !== to || candidate.from === from) return false;
      const otherPiece = stateBeforeMove.board[Math.floor(candidate.from / 8)]?.[candidate.from % 8] ?? null;
      return otherPiece && otherPiece.toUpperCase() === pieceLetter;
    });

    if (otherCandidates.length > 0) {
      const sameCol = otherCandidates.some((c) => c.type === "move_piece" && (c.from % 8) === fromCol);
      const sameRow = otherCandidates.some((c) => c.type === "move_piece" && Math.floor(c.from / 8) === fromRow);
      if (!sameCol) {
        disambiguation = String.fromCharCode(97 + fromCol);
      } else if (!sameRow) {
        disambiguation = String(8 - fromRow);
      } else {
        disambiguation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`;
      }
    }

    san = `${pieceLetter}${disambiguation}${isCapture ? "x" : ""}${destination}`;
  }

  if (isCheckmate) {
    san += "#";
  } else if (isCheck) {
    san += "+";
  }

  return san;
}

export function reduceChessAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{
  const player=state.players.find(p=>p.userId===playerId);
  if(!player) return {accepted:false,message:""};
  let message="";

  if(action.type === "claim_chess_draw" && state.gameId === "chess"){
    if (!chessDrawClaimAvailable(state)) return {accepted:false,message:""};
    finish(state, null, now);
    message = `🤝 ${player.displayName} claimed a draw by ${state.chessHalfmoveClock >= 100 ? "the 50-move rule" : "threefold repetition"}.`;
  } else if(action.type === "move_piece" && state.gameId === "chess"){
    const legalMove = chessActions(state, playerId).some((candidate) => candidate.type === "move_piece" && candidate.from === action.from && candidate.to === action.to && (candidate.promotion ?? "") === (action.promotion ?? ""));
    if (!legalMove) return {accepted:false,message:""};

    const fromRow = Math.floor(action.from / 8), fromCol = action.from % 8;
    const toRow = Math.floor(action.to / 8), toCol = action.to % 8;
    const piece = state.board[fromRow]?.[fromCol] ?? null;
    const captured = state.board[toRow]?.[toCol] ?? null;
    if (!piece || !playerOwnsChessPiece(state, playerId, piece)) return {accepted:false,message:""};

    const epCapture = piece.toLowerCase() === "p" && fromCol !== toCol && !captured && state.chessEnPassantTarget === action.to;
    const board = chessBoardAfterMove(state, action);
    if (!board) return {accepted:false,message:""};

    const isWhite = player.seat % 2 === 0;
    const stateBeforeMove = {
      ...state,
      board: state.board.map((r) => r.slice())
    };

    let rights = state.chessCastlingRights ?? "KQkq";
    if (piece === "K") rights = rights.replace(/[KQ]/g, "");
    if (piece === "k") rights = rights.replace(/[kq]/g, "");
    if (piece === "R" && action.from === 63) rights = rights.replace("K", "");
    if (piece === "R" && action.from === 56) rights = rights.replace("Q", "");
    if (piece === "r" && action.from === 7) rights = rights.replace("k", "");
    if (piece === "r" && action.from === 0) rights = rights.replace("q", "");
    if (captured === "R" && action.to === 63) rights = rights.replace("K", "");
    if (captured === "R" && action.to === 56) rights = rights.replace("Q", "");
    if (captured === "r" && action.to === 7) rights = rights.replace("k", "");
    if (captured === "r" && action.to === 0) rights = rights.replace("q", "");
    state.chessCastlingRights = rights;
    state.chessEnPassantTarget = piece.toLowerCase() === "p" && Math.abs(action.to - action.from) === 16 ? (action.to + action.from) / 2 : null;
    state.chessHalfmoveClock = piece.toLowerCase() === "p" || captured !== null || epCapture ? 0 : (state.chessHalfmoveClock ?? 0) + 1;
    state.board = board;
    state.currentPlayerId = nextPlayerId(state, playerId);
    state.turnNumber += 1;
    state.chessPositionHistory = [...(state.chessPositionHistory ?? []), chessPositionKey(state)].slice(-200);

    const opponentId = state.currentPlayerId;
    const destination = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const repetitionCount = chessPositionCount(state);

    let isCheck = false;
    let isCheckmate = false;

    if (opponentId) {
      const replies = chessActions(state, opponentId);
      const checked = chessKingInCheck(state, opponentId);
      isCheck = checked && replies.length > 0;
      isCheckmate = checked && replies.length === 0;

      if (replies.length === 0 && checked) {
        finish(state, playerId, now);
        message = `♟️ ${player.displayName} delivered checkmate on ${destination} and wins!`;
      } else if (replies.length === 0) {
        finish(state, null, now);
        message = `🤝 Stalemate after ${player.displayName}'s move to ${destination}. The game is a draw.`;
      } else if ((state.chessHalfmoveClock ?? 0) >= 150 || repetitionCount >= 5 || chessInsufficientMaterial(state)) {
        finish(state, null, now);
        message = `🤝 Draw after ${player.displayName}'s move (${(state.chessHalfmoveClock ?? 0) >= 150 ? "75-move rule" : repetitionCount >= 5 ? "fivefold repetition" : "insufficient material"}).`;
      } else {
        message = `♟️ ${player.displayName} moved ${piece}${action.promotion ? `=${action.promotion.toUpperCase()}` : ""} from ${String.fromCharCode(97 + fromCol)}${8 - fromRow} to ${destination}${captured || epCapture ? " and captured a piece" : ""}${checked ? " — CHECK!" : ""}${Math.abs(toCol-fromCol)===2 && piece.toLowerCase()==="k" ? " — CASTLING" : ""}.`;
      }
    } else {
      message = `♟️ ${player.displayName} moved ${piece} to ${destination}.`;
    }

    const san = computeChessMoveSan({
      stateBeforeMove,
      playerId,
      from: action.from,
      to: action.to,
      promotion: action.promotion,
      isCheck,
      isCheckmate
    });

    const moveCount = (state.chessMoveHistory?.length ?? 0) + 1;
    const moveNumber = Math.ceil(moveCount / 2);
    const moveRecord: ChessMoveRecord = {
      ply: moveCount,
      moveNumber,
      playerId,
      side: isWhite ? "w" : "b",
      from: action.from,
      to: action.to,
      san,
      piece,
      captured: captured ?? (epCapture ? (isWhite ? "p" : "P") : null),
      promotion: action.promotion ?? null,
      isCheck,
      isCheckmate,
      clockRemainingMs: state.clockRemainingMsByPlayer?.[playerId]
    };

    state.chessMoveHistory = [...(state.chessMoveHistory ?? []), moveRecord];
    state.chessLastMove = { from: action.from, to: action.to };
  } else {
    return {accepted:false,message:""};
  }

  return {accepted:true,message};
}
