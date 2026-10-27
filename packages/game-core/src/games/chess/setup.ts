import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { chessPositionKey } from "./rules";

export function setupChess(state:BoardGameState,_players:GamePlayer[],rngState:number):number {
  const line=(s:string)=>s.split("");
  state.board=[line("rnbqkbnr"),line("pppppppp"),...Array.from({length:4},()=>Array<string|null>(8).fill(null)),line("PPPPPPPP"),line("RNBQKBNR")];
  state.chessPositionHistory=[chessPositionKey(state)];
  state.chessMoveHistory=[];
  state.chessLastMove=null;
  return rngState;
}
