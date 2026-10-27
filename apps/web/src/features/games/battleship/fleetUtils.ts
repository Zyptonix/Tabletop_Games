export interface ShipConfig {
  id: string;
  name: string;
  size: number;
}

export const FLEET_CONFIG: ShipConfig[] = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

export interface ClientPlacedShip {
  id: string;
  name: string;
  size: number;
  x: number;
  y: number;
  orientation: "h" | "v";
  cells: string[];
}

export function computeShipCells(x: number, y: number, size: number, orientation: "h" | "v"): string[] {
  const cells: string[] = [];
  for (let i = 0; i < size; i += 1) {
    const cx = x + (orientation === "h" ? i : 0);
    const cy = y + (orientation === "v" ? i : 0);
    cells.push(`${cx},${cy}`);
  }
  return cells;
}

export function isValidPlacement(
  x: number,
  y: number,
  size: number,
  orientation: "h" | "v",
  existingShips: ClientPlacedShip[],
  ignoreShipId?: string
): boolean {
  // Check bounds
  if (x < 0 || y < 0) return false;
  if (orientation === "h" && x + size > 10) return false;
  if (orientation === "v" && y + size > 10) return false;

  const newCells = new Set(computeShipCells(x, y, size, orientation));

  // Check collision with other ships
  for (const ship of existingShips) {
    if (ship.id === ignoreShipId) continue;
    for (const cell of ship.cells) {
      if (newCells.has(cell)) return false;
    }
  }

  return true;
}

export function generateRandomFleet(): ClientPlacedShip[] {
  const occupied = new Set<string>();
  const fleet: ClientPlacedShip[] = [];

  for (const config of FLEET_CONFIG) {
    let placed = false;
    for (let attempts = 0; attempts < 500 && !placed; attempts += 1) {
      const orientation: "h" | "v" = Math.random() < 0.5 ? "h" : "v";
      const maxX = orientation === "h" ? 10 - config.size : 9;
      const maxY = orientation === "v" ? 10 - config.size : 9;
      const x = Math.floor(Math.random() * (maxX + 1));
      const y = Math.floor(Math.random() * (maxY + 1));

      const cells = computeShipCells(x, y, config.size, orientation);
      if (cells.every((c) => !occupied.has(c))) {
        cells.forEach((c) => occupied.add(c));
        fleet.push({
          id: config.id,
          name: config.name,
          size: config.size,
          x,
          y,
          orientation,
          cells,
        });
        placed = true;
      }
    }

    if (!placed) {
      // Fallback: restart generation
      return generateRandomFleet();
    }
  }

  return fleet;
}

