import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const ludoActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("roll_dice")}), z.object({type:z.literal("move_token"),tokenIndex:z.number().int().min(0).max(3)}), z.object({type:z.literal("end_turn")})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getLudoLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  if(!state.hasRolled||state.diceRoll===null)return [{type:"roll_dice"}]; const tokens=state.ludoTokens[playerId]??[]; const moves=tokens.map((position,tokenIndex)=>({position,tokenIndex})).filter(({position})=>position<57&&(position>=0?position+state.diceRoll!<=57:state.diceRoll===6)).map(({tokenIndex})=>({type:"move_token" as const,tokenIndex})); return moves.length?moves:[{type:"end_turn"}];
}
