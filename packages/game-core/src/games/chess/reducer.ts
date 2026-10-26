import { finish, nextPlayerId } from "../shared/utils";
import { chessActions, chessBoardAfterMove, chessDrawClaimAvailable, chessInsufficientMaterial, chessKingInCheck, chessPositionCount, chessPositionKey, playerOwnsChessPiece } from "./rules";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceChessAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "claim_chess_draw" && state.gameId === "chess"){if (!chessDrawClaimAvailable(state)) return {accepted:false,message:""};
    finish(state, null, now);
    message = `🤝 ${player.displayName} claimed a draw by ${state.chessHalfmoveClock >= 100 ? "the 50-move rule" : "threefold repetition"}.`;} else if(action.type === "move_piece" && state.gameId === "chess"){const legalMove = chessActions(state, playerId).some((candidate) => candidate.type === "move_piece" && candidate.from === action.from && candidate.to === action.to && (candidate.promotion ?? "") === (action.promotion ?? ""));
    if (!legalMove) return {accepted:false,message:""};
    const fromRow = Math.floor(action.from / 8), fromCol = action.from % 8;
    const toRow = Math.floor(action.to / 8), toCol = action.to % 8;
    const piece = state.board[fromRow]?.[fromCol] ?? null;
    const captured = state.board[toRow]?.[toCol] ?? null;
    if (!piece || !playerOwnsChessPiece(state, playerId, piece)) return {accepted:false,message:""};
    const epCapture = piece.toLowerCase() === "p" && fromCol !== toCol && !captured && state.chessEnPassantTarget === action.to;
    const board = chessBoardAfterMove(state, action);
    if (!board) return {accepted:false,message:""};
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
    if (opponentId) {
      const replies = chessActions(state, opponentId);
      const checked = chessKingInCheck(state, opponentId);
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
    }} else return {accepted:false,message:""};return {accepted:true,message};}
