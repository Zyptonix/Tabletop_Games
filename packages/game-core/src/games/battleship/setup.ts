import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";

const BATTLESHIP_LENGTHS = [5, 4, 3, 3, 2];

export function fleetForSeat(
  seat: number,
  seed: number
): { cells: string[]; ships: string[][]; rngState: number } {
  // Generate a deterministic fleet while keeping its positions private
  // in the server-side game state.
  let localRng = (seed ^ Math.imul(seat + 1, 0x9e3779b1)) >>> 0 || 1;

  const occupied = new Set<string>();
  const ships: string[][] = [];

  const nextInt = (max: number) => {
    localRng = (Math.imul(localRng, 1664525) + 1013904223) >>> 0;
    return Math.floor((localRng / 0x1_0000_0000) * max);
  };

  const canPlace = (
    x: number,
    y: number,
    length: number,
    horizontal: boolean
  ): string[] | null => {
    const cells: string[] = [];

    for (let step = 0; step < length; step += 1) {
      const cellX = x + (horizontal ? step : 0);
      const cellY = y + (horizontal ? 0 : step);

      if (cellX < 0 || cellX >= 10 || cellY < 0 || cellY >= 10) {
        return null;
      }

      const key = `${cellX},${cellY}`;

      if (occupied.has(key)) return null;

      cells.push(key);
    }

    return cells;
  };

  for (const length of BATTLESHIP_LENGTHS) {
    let placed: string[] | null = null;

    for (let attempt = 0; attempt < 500 && !placed; attempt += 1) {
      placed = canPlace(
        nextInt(10),
        nextInt(10),
        length,
        nextInt(2) === 0
      );
    }

    if (!placed) {
      // Deterministic fallback in case the random attempts fail.
      for (let y = 0; y < 10 && !placed; y += 1) {
        for (let x = 0; x < 10 && !placed; x += 1) {
          for (const horizontal of [true, false]) {
            placed = canPlace(x, y, length, horizontal);
            if (placed) break;
          }
        }
      }
    }

    if (!placed) {
      throw new Error("Could not generate a valid Battleships fleet.");
    }

    ships.push(placed);
    placed.forEach((cell) => occupied.add(cell));
  }

  return {
    cells: ships.flat(),
    ships,
    rngState: localRng,
  };
}

export function setupBattleship(state:BoardGameState,players:GamePlayer[],rngState:number):number { for(const player of players){const fleet=fleetForSeat(player.seat,rngState);state.shipCellsByPlayer[player.userId]=fleet.cells;state.shipGroupsByPlayer[player.userId]=fleet.ships;rngState=fleet.rngState;} return rngState; }
