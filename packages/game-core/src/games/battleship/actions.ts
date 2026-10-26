import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";
import { hasShot } from "./rules";
import { nextPlayerId } from "../shared/utils";

export const battleshipActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("fire"),x:z.number().int().min(0).max(9),y:z.number().int().min(0).max(9)})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getBattleshipLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  const target=nextPlayerId(state,playerId); if(!target||target===playerId)return []; return Array.from({length:100},(_,i)=>({type:"fire" as const,x:i%10,y:Math.floor(i/10)})).filter(a=>!hasShot(state,playerId,a.x,a.y));
}
