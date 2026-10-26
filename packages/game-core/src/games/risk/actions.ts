import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const riskActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("claim_territory"),territoryId:z.string().min(1)}), z.object({type:z.literal("reinforce_territory"),territoryId:z.string().min(1)}), z.object({type:z.literal("attack_territory"),fromId:z.string().min(1),toId:z.string().min(1)}), z.object({type:z.literal("end_turn")})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getRiskLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  const actions:BoardGameAction[]=[]; for(const t of state.territories)if(state.territoryOwners[t.id]===null)actions.push({type:"claim_territory",territoryId:t.id}); if(!state.reinforcedThisTurn)for(const t of state.territories)if(state.territoryOwners[t.id]===playerId)actions.push({type:"reinforce_territory",territoryId:t.id}); for(const t of state.territories){if(state.territoryOwners[t.id]!==playerId||(state.territoryTroops[t.id]??0)<2)continue;for(const neighborId of t.neighbors)if(state.territoryOwners[neighborId]&&state.territoryOwners[neighborId]!==playerId)actions.push({type:"attack_territory",fromId:t.id,toId:neighborId});} return [...actions,{type:"end_turn"}];
}
