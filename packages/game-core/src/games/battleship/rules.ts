import type { BattleshipPlacedShip, BoardGameState } from "../shared/types";
import { coordsKey } from "../shared/utils";

const EXPECTED_SIZES = [5, 4, 3, 3, 2];

export function hasShot(state: BoardGameState, shooterId: string, x: number, y: number): boolean {
  return state.shots.some((shot) => shot.shooterId === shooterId && shot.x === x && shot.y === y);
}

export function validateFleet(ships: BattleshipPlacedShip[]): boolean {
  if (!Array.isArray(ships) || ships.length !== 5) return false;

  const sizes = ships.map((s) => s.size).sort((a, b) => b - a);
  if (JSON.stringify(sizes) !== JSON.stringify(EXPECTED_SIZES)) return false;

  const occupied = new Set<string>();

  for (const ship of ships) {
    if (ship.x < 0 || ship.x > 9 || ship.y < 0 || ship.y > 9) return false;
    if (ship.orientation !== "h" && ship.orientation !== "v") return false;

    const expectedCells: string[] = [];
    for (let step = 0; step < ship.size; step += 1) {
      const cx = ship.x + (ship.orientation === "h" ? step : 0);
      const cy = ship.y + (ship.orientation === "v" ? step : 0);
      if (cx < 0 || cx >= 10 || cy < 0 || cy >= 10) return false;
      const key = coordsKey(cx, cy);
      if (occupied.has(key)) return false;
      occupied.add(key);
      expectedCells.push(key);
    }

    if (ship.cells.length !== expectedCells.length) return false;
    if (!expectedCells.every((cell) => ship.cells.includes(cell))) return false;
  }

  return occupied.size === 17;
}
