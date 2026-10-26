import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getWorldConquestPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Territory claims, reinforcements and simplified attacks are handled server-side.");return {...base,territories:state.territories.map(t=>({...t,neighbors:t.neighbors.slice()})),territoryOwners:{...state.territoryOwners},territoryTroops:{...state.territoryTroops},reinforcedThisTurn:state.reinforcedThisTurn};}
