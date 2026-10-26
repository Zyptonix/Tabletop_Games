import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getMonopolyPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Movement, purchases, rent and turns are handled server-side; this is a simplified ruleset.");return {...base,money:{...state.money},positions:{...state.positions},properties:state.properties.map(p=>({...p}))};}
