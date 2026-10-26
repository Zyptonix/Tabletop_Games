import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeProperties } from "./properties";

export function setupMonopoly(state:BoardGameState,players:GamePlayer[],rngState:number):number {state.properties=makeProperties();for(const player of players){state.money[player.userId]=1500;state.positions[player.userId]=0;}return rngState;}
