import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";
import { chessActions, chessDrawClaimAvailable } from "./rules";

export const chessActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("move_piece"),from:z.number().int().min(0).max(63),to:z.number().int().min(0).max(63),promotion:z.enum(["q","r","b","n"]).optional()}), z.object({type:z.literal("claim_chess_draw")})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getChessLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  const moves=chessActions(state,playerId); if(chessDrawClaimAvailable(state)) moves.push({type:"claim_chess_draw"}); return moves;
}
