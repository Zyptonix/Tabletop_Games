import { finish, nextPlayerId, coordsKey } from "../shared/utils";
import type { BattleshipPlacedShip, BoardGameAction, BoardGameState, Shot } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
import { validateFleet } from "./rules";

const EXPECTED_SIZES = [5, 4, 3, 3, 2];
const SHIP_NAMES: Record<number, string> = {
  5: "Carrier",
  4: "Battleship",
  3: "Cruiser",
  2: "Destroyer",
};

export function reduceBattleshipAction(
  state: BoardGameState,
  playerId: string,
  action: BoardGameAction,
  now: string
): BoardGameReduction {
  const player = state.players.find((p) => p.userId === playerId);
  if (!player || state.gameId !== "battleship") return { accepted: false, message: "" };

  // 1. PLACE FLEET ACTION
  if (action.type === "place_fleet") {
    if (state.battleshipPhase && state.battleshipPhase !== "placement") {
      return { accepted: false, message: "Fleet placement is already complete." };
    }

    if (!validateFleet(action.ships)) {
      return { accepted: false, message: "Invalid fleet positioning. Ships cannot overlap or leave the grid." };
    }

    state.shipDetailsByPlayer ??= {};
    state.shipCellsByPlayer ??= {};
    state.shipGroupsByPlayer ??= {};
    state.battleshipReady ??= {};

    state.shipDetailsByPlayer[playerId] = action.ships;
    state.shipCellsByPlayer[playerId] = action.ships.flatMap((s) => s.cells);
    state.shipGroupsByPlayer[playerId] = action.ships.map((s) => s.cells);
    state.battleshipReady[playerId] = true;

    // Check if all players are ready
    const allReady = state.players.every((p) => state.battleshipReady?.[p.userId]);
    if (allReady) {
      state.battleshipPhase = "battle";
      state.currentPlayerId = state.players[0]?.userId ?? null;
      state.turnStartedAt = now;
      return {
        accepted: true,
        message: `⚓ Both commanders have deployed their fleets. Naval battle has commenced!`,
      };
    }

    return {
      accepted: true,
      message: `⚓ ${player.displayName} deployed and locked in their fleet. Waiting for opponent...`,
    };
  }

  // 2. FIRE ACTION
  if (action.type === "fire") {
    // If placement was active, auto-transition to battle so moves are valid
    if (state.battleshipPhase === "placement") {
      state.battleshipPhase = "battle";
    }

    const targetId = nextPlayerId(state, playerId);
    if (!targetId || targetId === playerId) return { accepted: false, message: "" };

    const targetCell = coordsKey(action.x, action.y);
    const priorTargetShots = state.shots.filter((item) => item.targetId === targetId);
    if (priorTargetShots.some((item) => item.x === action.x && item.y === action.y)) {
      return { accepted: false, message: "That sector has already been fired upon." };
    }

    const hit = (state.shipCellsByPlayer[targetId] ?? []).includes(targetCell);
    const shot: Shot = { shooterId: playerId, targetId, x: action.x, y: action.y, hit, sunk: false };
    state.shots.push(shot);

    const targetShots = state.shots.filter((item) => item.targetId === targetId && item.hit);
    const hitCells = new Set(targetShots.map((item) => coordsKey(item.x, item.y)));

    state.shipGroupsByPlayer ??= {};
    const groups = state.shipGroupsByPlayer[targetId] ?? (() => {
      const flattened = state.shipCellsByPlayer[targetId] ?? [];
      let offset = 0;
      return EXPECTED_SIZES.map((length) => {
        const group = flattened.slice(offset, offset + length);
        offset += length;
        return group;
      }).filter((group) => group.length > 0);
    })();
    state.shipGroupsByPlayer[targetId] = groups;

    const sunkGroups = groups.filter((group) => group.every((cell) => hitCells.has(cell)));
    const priorHitCells = new Set(priorTargetShots.filter((item) => item.hit).map((item) => coordsKey(item.x, item.y)));
    const previouslySunkGroups = groups.filter((group) => group.every((cell) => priorHitCells.has(cell)));
    const newlySunk = sunkGroups.find((group) => !previouslySunkGroups.includes(group));

    let sunkName = "";
    if (newlySunk) {
      shot.sunk = true;
      const shipDetails = state.shipDetailsByPlayer?.[targetId];
      const matchedShip = shipDetails?.find((s) => s.cells.length === newlySunk.length && s.cells.every((c) => newlySunk.includes(c)));
      sunkName = matchedShip?.name ?? SHIP_NAMES[newlySunk.length] ?? `${newlySunk.length}-cell vessel`;
      shot.sunkShipName = sunkName;
      state.lastSunkShip = {
        shooterId: playerId,
        ownerId: targetId,
        name: sunkName,
        size: newlySunk.length,
        cells: newlySunk,
      };
    } else {
      state.lastSunkShip = null;
    }

    const fleetDestroyed = groups.length > 0
      ? sunkGroups.length === groups.length
      : targetShots.length >= (state.shipCellsByPlayer[targetId] ?? []).length;

    const colLetter = String.fromCharCode(65 + action.x);
    const rowNum = action.y + 1;
    let message = `${hit ? "💥 Direct Hit!" : "🌊 Splash!"} ${player.displayName} fired at ${colLetter}${rowNum}`;

    if (newlySunk) {
      message += ` — ${sunkName} sunk!`;
    }

    if (fleetDestroyed) {
      message += " — entire enemy fleet destroyed!";
      finish(state, playerId, now);
    } else if (hit) {
      // Direct hit grants another turn to the shooter!
      state.currentPlayerId = playerId;
      message += " — Direct hit! Take another shot!";
    } else {
      // Miss passes turn to the target
      state.currentPlayerId = targetId;
      state.turnNumber += 1;
    }

    return { accepted: true, message };
  }

  return { accepted: false, message: "" };
}
