import type { BoardGameState } from "../shared/types";
export const PROPERTY_NAMES = ["Start", "Old Kent Road", "Community Chest", "Whitechapel Road", "Income Tax", "King's Cross", "The Angel Islington", "Chance", "Euston Road", "Pentonville Road", "Jail / Just Visiting", "Pall Mall", "Electric Company", "Whitehall", "Northumberland Avenue", "Marylebone Station", "Bow Street", "Community Chest", "Marlborough Street", "Vine Street", "Free Parking", "Strand", "Chance", "Fleet Street", "Trafalgar Square", "Fenchurch Street", "Leicester Square", "Coventry Street", "Water Works", "Piccadilly", "Go To Jail", "Regent Street", "Oxford Street", "Community Chest", "Bond Street", "Liverpool Street Station", "Chance", "Park Lane", "Luxury Tax", "Mayfair"];
export const PROPERTY_COSTS: Record<number, number> = { 1: 60, 3: 60, 5: 200, 6: 100, 8: 100, 9: 120, 11: 140, 12: 150, 13: 140, 14: 160, 15: 200, 16: 180, 18: 180, 19: 200, 21: 220, 23: 220, 24: 240, 25: 200, 26: 260, 27: 260, 28: 150, 29: 280, 31: 300, 32: 300, 34: 320, 35: 200, 37: 350, 39: 400 };
export function makeProperties(): BoardGameState["properties"] {
  return PROPERTY_NAMES.map((label, index) => {
    const cost = PROPERTY_COSTS[index] ?? 0;
    return { id: `property-${index}`, label, cost, rent: cost ? Math.max(10, Math.round(cost * 0.12)) : 0, ownerId: null };
  });
}
