import type { BattleshipPlacedShip, BattleshipShipStatus, BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
import { coordsKey } from "../shared/utils";

export function getBattleshipPublicState(state: BoardGameState, viewerId: string): PublicBoardGameState {
  const base = publicBoardGameBase(
    state,
    state.battleshipPhase === "placement"
      ? "Position your fleet on the grid. Drag or click to place and rotate ships, then confirm."
      : "Alternating naval combat. Take turns targeting enemy waters on the radar."
  );

  const opponent = state.players.find((p) => p.userId !== viewerId);
  const opponentId = opponent?.userId;

  // Viewer incoming shots (enemy firing on viewer)
  const incomingHits = new Set(
    state.shots.filter((s) => s.targetId === viewerId && s.hit).map((s) => coordsKey(s.x, s.y))
  );

  // Viewer outgoing shots (viewer firing on enemy)
  const outgoingHits = new Set(
    state.shots.filter((s) => s.shooterId === viewerId && s.hit).map((s) => coordsKey(s.x, s.y))
  );

  // Viewer's own ships with hit counts and sunk state
  const viewerShips = state.shipDetailsByPlayer?.[viewerId] ?? [];
  const ownShips: Array<BattleshipPlacedShip & { hits: number; sunk: boolean }> = viewerShips.map((ship) => {
    const hits = ship.cells.filter((c) => incomingHits.has(c)).length;
    return {
      ...ship,
      hits,
      sunk: hits === ship.size,
    };
  });

  const myFleetStatus: BattleshipShipStatus[] = ownShips.map((s) => ({
    id: s.id,
    name: s.name,
    size: s.size,
    sunk: s.sunk,
    hits: s.hits,
  }));

  // Enemy fleet status (names and sizes only, hidden coordinates)
  const enemyShips = opponentId ? state.shipDetailsByPlayer?.[opponentId] ?? [] : [];
  const enemyFleetStatus: BattleshipShipStatus[] = enemyShips.map((ship) => {
    const hits = ship.cells.filter((c) => outgoingHits.has(c)).length;
    return {
      id: ship.id,
      name: ship.name,
      size: ship.size,
      sunk: hits === ship.size,
    };
  });

  // Enemy SUNK ships: revealed only once fully destroyed!
  const enemySunkShips: BattleshipPlacedShip[] = enemyShips.filter((ship) =>
    ship.cells.every((c) => outgoingHits.has(c))
  );

  return {
    ...base,
    ownShipCells: (state.shipCellsByPlayer[viewerId] ?? []).slice(),
    ownShips,
    enemySunkShips,
    enemyFleetStatus,
    myFleetStatus,
    battleshipPhase: state.battleshipPhase ?? "battle",
    battleshipReady: state.battleshipReady ?? {},
    lastSunkShip: state.lastSunkShip ?? null,
    shots: state.shots.map((s) => ({ ...s })),
  };
}
