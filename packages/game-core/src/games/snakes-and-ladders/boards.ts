import type { BoardPresetId, Ladder, Snake, SnakesAndLaddersBoard } from "./types";

/**
 * 10x10 Boustrophedon (Snake Alternating) Track Math:
 * Square 1: Bottom-Left (row 9, col 0)
 * Square 10: Bottom-Right (row 9, col 9)
 * Square 11: Row 8, Col 9 (right-to-left)
 * Square 20: Row 8, Col 0
 * ...
 * Square 91: Row 0, Col 9
 * Square 100: Top-Left (row 0, col 0)
 */
export function getSquareCoordinates(square: number): { row: number; col: number; xPercent: number; yPercent: number } {
  const clamped = Math.max(1, Math.min(100, square));
  const idx = clamped - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const row = 9 - rowFromBottom; // 0 at top, 9 at bottom

  const isEvenRowFromBottom = rowFromBottom % 2 === 0;
  const col = isEvenRowFromBottom ? idx % 10 : 9 - (idx % 10);

  // Center coordinate within the tile (0 to 100%)
  const xPercent = (col + 0.5) * 10;
  const yPercent = (row + 0.5) * 10;

  return { row, col, xPercent, yPercent };
}

export const CLASSIC_BOARD: SnakesAndLaddersBoard = {
  presetId: "classic",
  name: "Classic Meadow",
  ladders: [
    { id: "ladder-1", from: 4, to: 14 },
    { id: "ladder-2", from: 8, to: 26 },
    { id: "ladder-3", from: 23, to: 37 },
    { id: "ladder-4", from: 33, to: 50 },
    { id: "ladder-5", from: 46, to: 64 },
    { id: "ladder-6", from: 68, to: 88 },
    { id: "ladder-7", from: 76, to: 97 },
    { id: "ladder-8", from: 82, to: 100 }
  ],
  snakes: [
    { id: "snake-1", from: 16, to: 6 },
    { id: "snake-2", from: 41, to: 19 },
    { id: "snake-3", from: 54, to: 34 },
    { id: "snake-4", from: 58, to: 22 },
    { id: "snake-5", from: 67, to: 36 },
    { id: "snake-6", from: 93, to: 73 },
    { id: "snake-7", from: 95, to: 75 },
    { id: "snake-8", from: 98, to: 79 }
  ]
};

export const JUNGLE_BOARD: SnakesAndLaddersBoard = {
  presetId: "jungle",
  name: "Serpent Jungle",
  ladders: [
    { id: "ladder-j1", from: 2, to: 23 },
    { id: "ladder-j2", from: 8, to: 34 },
    { id: "ladder-j3", from: 21, to: 42 },
    { id: "ladder-j4", from: 36, to: 77 },
    { id: "ladder-j5", from: 50, to: 69 },
    { id: "ladder-j6", from: 65, to: 86 },
    { id: "ladder-j7", from: 72, to: 93 }
  ],
  snakes: [
    { id: "snake-j1", from: 27, to: 5 },
    { id: "snake-j2", from: 44, to: 16 },
    { id: "snake-j3", from: 66, to: 45 },
    { id: "snake-j4", from: 79, to: 35 },
    { id: "snake-j5", from: 89, to: 53 },
    { id: "snake-j6", from: 96, to: 61 },
    { id: "snake-j7", from: 99, to: 25 }
  ]
};

export const DUNES_BOARD: SnakesAndLaddersBoard = {
  presetId: "dunes",
  name: "Desert Dunes",
  ladders: [
    { id: "ladder-d1", from: 5, to: 26 },
    { id: "ladder-d2", from: 13, to: 46 },
    { id: "ladder-d3", from: 24, to: 64 },
    { id: "ladder-d4", from: 38, to: 82 },
    { id: "ladder-d5", from: 57, to: 76 },
    { id: "ladder-d6", from: 68, to: 89 },
    { id: "ladder-d7", from: 75, to: 96 }
  ],
  snakes: [
    { id: "snake-d1", from: 32, to: 10 },
    { id: "snake-d2", from: 48, to: 18 },
    { id: "snake-d3", from: 61, to: 39 },
    { id: "snake-d4", from: 74, to: 33 },
    { id: "snake-d5", from: 85, to: 55 },
    { id: "snake-d6", from: 92, to: 70 },
    { id: "snake-d7", from: 97, to: 42 }
  ]
};

export function getBoardPreset(presetId: BoardPresetId, seed?: number): SnakesAndLaddersBoard {
  switch (presetId) {
    case "jungle":
      return JUNGLE_BOARD;
    case "dunes":
      return DUNES_BOARD;
    case "chaos":
      return generateProceduralBoard(seed ?? 42);
    case "classic":
    default:
      return CLASSIC_BOARD;
  }
}

/**
 * Deterministic procedural board generator ensuring no overlapping endpoints,
 * no infinite loops (ladder top cannot be snake head), and balanced spread.
 */
export function generateProceduralBoard(seed: number): SnakesAndLaddersBoard {
  let rng = (seed ^ 0x9e3779b9) >>> 0;
  function nextRandom(max: number): number {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng % max;
  }

  const usedSquares = new Set<number>([1, 100]); // 1 and 100 never have snakes or ladder feet
  const ladders: Ladder[] = [];
  const snakes: Snake[] = [];

  // Generate 7-8 Ladders
  const ladderRounds = 8;
  for (let i = 0; i < ladderRounds; i++) {
    const bottomMin = 2 + i * 10;
    const bottomMax = Math.min(85, bottomMin + 8);
    const from = bottomMin + nextRandom(Math.max(1, bottomMax - bottomMin));
    const distance = 15 + nextRandom(35);
    const to = Math.min(99, from + distance);

    if (!usedSquares.has(from) && !usedSquares.has(to) && to > from) {
      usedSquares.add(from);
      usedSquares.add(to);
      ladders.push({ id: `ladder-p${i + 1}`, from, to });
    }
  }

  // Generate 7-8 Snakes
  const snakeRounds = 8;
  for (let i = 0; i < snakeRounds; i++) {
    const headMin = 25 + i * 9;
    const headMax = Math.min(99, headMin + 8);
    const from = headMin + nextRandom(Math.max(1, headMax - headMin));
    const drop = 12 + nextRandom(35);
    const to = Math.max(2, from - drop);

    if (!usedSquares.has(from) && !usedSquares.has(to) && from > to) {
      usedSquares.add(from);
      usedSquares.add(to);
      snakes.push({ id: `snake-p${i + 1}`, from, to });
    }
  }

  return {
    presetId: "chaos",
    name: "Procedural Chaos",
    ladders,
    snakes
  };
}
