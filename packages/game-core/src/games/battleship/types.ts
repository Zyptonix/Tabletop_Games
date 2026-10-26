import type { BoardGameAction, BoardGameState, PublicBoardGameState } from "../shared/types";
export type BattleshipState = Omit<BoardGameState,"gameId"> & { gameId: "battleship" };
export type BattleshipAction = Extract<BoardGameAction,{ type: "fire" }>;
export type PublicBattleshipState = PublicBoardGameState & { gameId: "battleship" };
