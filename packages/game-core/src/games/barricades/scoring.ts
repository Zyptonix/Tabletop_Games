import type { GamePlayer, GameResults } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { makeStandardResults } from "../shared/utils";

export function scoreBarricadesPlayer(state: BoardGameState, player: GamePlayer): number {
  const pos = state.pawns[player.userId];
  if (!pos) return 0;
  if (state.players.length > 2) {
    const center = Math.floor((state.board.length || 13) / 2);
    return 100 - Math.abs(center - pos.x) - Math.abs(center - pos.y);
  }
  const i = state.players.findIndex((p) => p.userId === player.userId);
  const last = (state.board.length || 9) - 1;
  const distance = i % 2 === 0 ? last - pos.y : pos.y;
  return 100 - distance;
}

export function getBarricadesResults(state: BoardGameState): GameResults {
  return makeStandardResults(state);
}
