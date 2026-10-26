import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type BarricadesState = Omit<BoardGameState,"gameId"> & { gameId: "barricades" };
export type BarricadesAction = Extract<BoardGameAction,{ type: "move_pawn" | "place_wall" }>;
export type PublicBarricadesState = PublicBoardGameState & { gameId: "barricades" };
