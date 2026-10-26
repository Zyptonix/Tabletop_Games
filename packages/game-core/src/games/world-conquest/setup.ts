import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { WORLD_TERRITORIES } from "./map";

export function setupWorldConquest(state:BoardGameState,_players:GamePlayer[],rngState:number):number {state.territories=WORLD_TERRITORIES.map(t=>({...t,neighbors:t.neighbors.slice()}));for(const t of state.territories){state.territoryOwners[t.id]=null;state.territoryTroops[t.id]=0;}return rngState;}
