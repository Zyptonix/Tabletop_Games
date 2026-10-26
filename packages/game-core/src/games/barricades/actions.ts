import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";
import { barricadesPawnDestinations, barricadesWallAllowed } from "./rules";

export const barricadesActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("move_pawn"),x:z.number().int().min(0).max(8),y:z.number().int().min(0).max(8)}), z.object({type:z.literal("place_wall"),x:z.number().int().min(0).max(7),y:z.number().int().min(0).max(7),orientation:z.enum(["h","v"])})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getBarricadesLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  if(!state.pawns[playerId])return []; const moves:BoardGameAction[]=barricadesPawnDestinations(state,playerId).map(p=>({type:"move_pawn",x:p.x,y:p.y})); if((state.wallsRemaining[playerId]??0)>0) for(let y=0;y<8;y+=1)for(let x=0;x<8;x+=1)for(const orientation of ["h","v"] as const)if(barricadesWallAllowed(state,x,y,orientation,playerId))moves.push({type:"place_wall",x,y,orientation}); return moves;
}
