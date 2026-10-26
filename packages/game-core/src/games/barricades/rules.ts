import type { BoardGameState, Wall } from "../shared/types";
import { coordsKey } from "../shared/utils";

export function wallsBlockMove(state: BoardGameState, from: { x: number; y: number }, to: { x: number; y: number }, walls: Wall[] = state.walls): boolean {
  return walls.some((wall) => wall.orientation === "h"
    ? from.x === to.x && Math.min(from.y, to.y) === wall.y && to.x >= wall.x && to.x <= wall.x + 1
    : from.y === to.y && Math.min(from.x, to.x) === wall.x && to.y >= wall.y && to.y <= wall.y + 1);
}

export function barricadesGoalReached(state: BoardGameState, _playerId: string, position: { x: number; y: number }): boolean {
  if (state.players.length > 2) {
    const center = Math.floor((state.board.length || 13) / 2);
    return position.x === center && position.y === center;
  }
  const index = state.players.findIndex((player) => player.userId === _playerId);
  if (index < 0) return false;
  const last = (state.board.length || 9) - 1;
  return index % 2 === 0 ? position.y === last : position.y === 0;
}

export function barricadesCanReachGoal(state: BoardGameState, playerId: string, walls: Wall[]): boolean {
  const start = state.pawns[playerId];
  if (!start) return false;
  const last = (state.board.length || 9) - 1;
  const queue: Array<{ x: number; y: number }> = [start];
  const seen = new Set<string>([coordsKey(start.x, start.y)]);
  const steps: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    if (barricadesGoalReached(state, playerId, current)) return true;
    for (const [dx, dy] of steps) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.x > last || next.y < 0 || next.y > last) continue;
      const key = coordsKey(next.x, next.y);
      if (seen.has(key) || wallsBlockMove(state, current, next, walls)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

export function barricadesWallsOverlap(left: Wall, right: Wall): boolean {
  if (left.orientation !== right.orientation) return left.x === right.x && left.y === right.y;
  if (left.orientation === "h") return left.y === right.y && Math.max(left.x, right.x) < Math.min(left.x + 1, right.x + 1);
  return left.x === right.x && Math.max(left.y, right.y) < Math.min(left.y + 1, right.y + 1);
}

export function barricadesWallAllowed(state: BoardGameState, x: number, y: number, orientation: "h" | "v", playerId: string): boolean {
  const last = (state.board.length || 9) - 2;
  if (x < 0 || x > last || y < 0 || y > last || (state.wallsRemaining[playerId] ?? 0) <= 0) return false;
  const candidate: Wall = { x, y, orientation, playerId };
  if (state.walls.some((wall) => barricadesWallsOverlap(wall, candidate))) return false;
  const proposedWalls = [...state.walls, candidate];
  return state.players.every((player) => barricadesCanReachGoal(state, player.userId, proposedWalls));
}

export function barricadesPawnDestinations(state: BoardGameState, playerId: string): Array<{ x: number; y: number }> {
  const pawn = state.pawns[playerId];
  if (!pawn) return [];
  const last = (state.board.length || 9) - 1;
  const steps: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const destinations: Array<{ x: number; y: number }> = [];
  const occupied = (position: { x: number; y: number }) => Object.entries(state.pawns).some(([otherId, location]) => otherId !== playerId && location.x === position.x && location.y === position.y);
  const inBounds = (position: { x: number; y: number }) => position.x >= 0 && position.x <= last && position.y >= 0 && position.y <= last;
  for (const [dx, dy] of steps) {
    const adjacent = { x: pawn.x + dx, y: pawn.y + dy };
    if (!inBounds(adjacent) || wallsBlockMove(state, pawn, adjacent)) continue;
    if (!occupied(adjacent)) { destinations.push(adjacent); continue; }
    const beyond = { x: adjacent.x + dx, y: adjacent.y + dy };
    if (inBounds(beyond) && !occupied(beyond) && !wallsBlockMove(state, adjacent, beyond)) { destinations.push(beyond); continue; }
    const perpendicular: Array<[number, number]> = dx === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
    for (const [sideX, sideY] of perpendicular) {
      const diagonal = { x: adjacent.x + sideX, y: adjacent.y + sideY };
      if (inBounds(diagonal) && !occupied(diagonal) && !wallsBlockMove(state, adjacent, diagonal)) destinations.push(diagonal);
    }
  }
  return destinations.filter((position, index, all) => all.findIndex((item) => item.x === position.x && item.y === position.y) === index);
}
