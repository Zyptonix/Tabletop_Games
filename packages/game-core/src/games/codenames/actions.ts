import { z } from "zod";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import { currentPlayer } from "../shared/utils";

export const codenamesActionSchema = z.discriminatedUnion("type", [z.object({type:z.literal("give_clue"),clue:z.string().max(30),number:z.number().int().min(0).max(9)}), z.object({type:z.literal("reveal_word"),index:z.number().int().min(0).max(24)}), z.object({type:z.literal("end_codenames_turn")})]) as unknown as z.ZodType<BoardGameAction, z.ZodTypeDef, unknown>;
export function getCodenamesLegalActions(state:BoardGameState,playerId:string):BoardGameAction[]{if(!currentPlayer(state,playerId))return [];
  const team=state.codenamesTeamByPlayer[playerId]; if(!team||team!==state.codenamesRoundTeam)return []; const spy=state.codenamesSpymasterByTeam[team]; if(state.codenamesClue===null)return playerId===spy?[{type:"give_clue",clue:"",number:1}]:[]; if(playerId===spy)return []; return [...state.wordCards.map((card,index)=>({card,index})).filter(({card})=>!card.revealed).map(({index})=>({type:"reveal_word" as const,index})),{type:"end_codenames_turn"}];
}
