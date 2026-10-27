import type { GamePlayer } from "../../engine/GameTypes";
import type { BattleshipPlacedShip, BoardGameState } from "../shared/types";

export const BATTLESHIP_SHIP_CONFIGS = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
] as const;

export function fleetForSeat(
  seat: number,
  seed: number
): { cells: string[]; ships: string[][]; shipDetails: BattleshipPlacedShip[]; rngState: number } {
  let localRng = (seed ^ Math.imul(seat + 1, 0x9e3779b1)) >>> 0 || 1;

  const occupied = new Set<string>();
  const ships: string[][] = [];
  const shipDetails: BattleshipPlacedShip[] = [];

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

  for (const shipConfig of BATTLESHIP_SHIP_CONFIGS) {
    let placed: string[] | null = null;
    let placedX = 0;
    let placedY = 0;
    let placedHorizontal = true;

    for (let attempt = 0; attempt < 500 && !placed; attempt += 1) {
      const x = nextInt(10);
      const y = nextInt(10);
      const horizontal = nextInt(2) === 0;
      placed = canPlace(x, y, shipConfig.size, horizontal);
      if (placed) {
        placedX = x;
        placedY = y;
        placedHorizontal = horizontal;
      }
    }

    if (!placed) {
      for (let y = 0; y < 10 && !placed; y += 1) {
        for (let x = 0; x < 10 && !placed; x += 1) {
          for (const horizontal of [true, false]) {
            placed = canPlace(x, y, shipConfig.size, horizontal);
            if (placed) {
              placedX = x;
              placedY = y;
              placedHorizontal = horizontal;
              break;
            }
          }
        }
      }
    }

    if (!placed) {
      throw new Error("Could not generate a valid Battleships fleet.");
    }

    ships.push(placed);
    placed.forEach((cell) => occupied.add(cell));
    shipDetails.push({
      id: shipConfig.id,
      name: shipConfig.name,
      size: shipConfig.size,
      x: placedX,
      y: placedY,
      orientation: placedHorizontal ? "h" : "v",
      cells: placed,
    });
  }

  return {
    cells: ships.flat(),
    ships,
    shipDetails,
    rngState: localRng,
  };
}

export function setupBattleship(state: BoardGameState, players: GamePlayer[], rngState: number): number {
  state.shipCellsByPlayer = {};
  state.shipGroupsByPlayer = {};
  state.shipDetailsByPlayer = {};
  state.battleshipReady = {};
  state.battleshipPhase = "placement";
  state.lastSunkShip = null;

  for (const player of players) {
    const fleet = fleetForSeat(player.seat, rngState);
    state.shipCellsByPlayer[player.userId] = fleet.cells;
    state.shipGroupsByPlayer[player.userId] = fleet.ships;
    state.shipDetailsByPlayer[player.userId] = fleet.shipDetails;
    rngState = fleet.rngState;

    if (player.isBot) {
      state.battleshipReady[player.userId] = true;
    }
  }

  // If all players are bots, immediately start battle
  if (players.every((p) => state.battleshipReady?.[p.userId])) {
    state.battleshipPhase = "battle";
  }

  return rngState;
}
