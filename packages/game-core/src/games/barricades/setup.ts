import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

export function setupBarricades(state: BoardGameState, players: GamePlayer[], rngState: number): number {
  const size = state.board.length || (players.length > 2 ? 13 : 9);
  const mid = Math.floor(size / 2);
  const starts = players.length > 2
    ? [{ x: mid, y: 0 }, { x: mid, y: size - 1 }, { x: 0, y: mid }, { x: size - 1, y: mid }]
    : [{ x: mid, y: 0 }, { x: mid, y: size - 1 }];

  players.forEach((player, index) => {
    state.pawns[player.userId] = starts[index] ?? { x: mid, y: 0 };
    state.wallsRemaining[player.userId] = players.length > 2 ? 8 : 10;
  });
  return rngState;
}
