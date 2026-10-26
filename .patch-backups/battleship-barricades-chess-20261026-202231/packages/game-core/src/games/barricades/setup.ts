import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

export function setupBarricades(state:BoardGameState,players:GamePlayer[],rngState:number):number { players.forEach((player,index)=>{const starts=players.length>2?[{x:4,y:0},{x:4,y:8},{x:0,y:4},{x:8,y:4}]:[{x:4,y:0},{x:4,y:8}];state.pawns[player.userId]=starts[index]??{x:4,y:0};state.wallsRemaining[player.userId]=players.length>2?5:10;});return rngState;}
