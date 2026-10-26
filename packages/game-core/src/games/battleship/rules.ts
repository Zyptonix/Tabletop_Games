import type { BoardGameState } from "../shared/types";
export function hasShot(state: BoardGameState, shooterId: string, x: number, y: number): boolean { return state.shots.some((shot) => shot.shooterId === shooterId && shot.x === x && shot.y === y); }
