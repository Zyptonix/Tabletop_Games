import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
export function getBattleshipPublicState(state:BoardGameState,viewerId:string):PublicBoardGameState{const base=publicBoardGameBase(state,"Alternating target shots, hits and fleet elimination are handled server-side.");return {...base,ownShipCells:(state.shipCellsByPlayer[viewerId]??[]).slice(),shots:state.shots.map(s=>({...s}))};}
