import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const pokerActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("poker_action"),choice:z.enum(["fold","check","call","raise","all_in"])})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getPokerLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  const paid=state.pokerBets[playerId]??0;const stack=state.pokerStacks[playerId]??0;const owes=state.pokerBetToCall-paid;const actions:BoardGameAction[]=[{type:"poker_action",choice:"fold"}];if(owes<=0)actions.push({type:"poker_action",choice:"check"});if(owes>0&&stack>0)actions.push({type:"poker_action",choice:"call"});if(stack>=Math.max(owes,0)+20)actions.push({type:"poker_action",choice:"raise"});if(stack>0)actions.push({type:"poker_action",choice:"all_in"});return actions;
}
