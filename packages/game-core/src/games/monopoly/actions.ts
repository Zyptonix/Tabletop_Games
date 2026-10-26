import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";
import { canBuyProperty } from "./rules";

export const monopolyActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("roll_dice")}), z.object({type:z.literal("buy_property")}), z.object({type:z.literal("end_turn")})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getMonopolyLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  if(!state.hasRolled)return [{type:"roll_dice"}]; return [...(canBuyProperty(state,playerId)?[{type:"buy_property" as const}]:[]),{type:"end_turn"}];
}
