import type { Territory } from "../shared/types";
import { RISK_TERRITORIES } from "../risk/map";
export const WORLD_TERRITORIES: Territory[] = RISK_TERRITORIES.map((territory, index) => ({
  ...territory,
  id: `world-${territory.id}`,
  label: territory.label,
  x: territory.x + (index % 3 === 0 ? 0.2 : 0),
  neighbors: territory.neighbors.map((neighbor) => `world-${neighbor}`)
}));
