import { finish, nextPlayerId, coordsKey } from "../shared/utils";
import type { Shot } from "../shared/types";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceBattleshipAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "fire" && state.gameId === "battleship"){const targetId = nextPlayerId(state, playerId);
    if (!targetId || targetId === playerId) return {accepted:false,message:""};
    const targetCell = coordsKey(action.x, action.y);
    const hit = (state.shipCellsByPlayer[targetId] ?? []).includes(targetCell);
    const priorTargetShots = state.shots.filter((item) => item.targetId === targetId);
    if (priorTargetShots.some((item) => item.x === action.x && item.y === action.y)) return {accepted:false,message:""};
    const shot: Shot = { shooterId: playerId, targetId, x: action.x, y: action.y, hit, sunk: false };
    state.shots.push(shot);
    const targetShots = state.shots.filter((item) => item.targetId === targetId && item.hit);
    const hitCells = new Set(targetShots.map((item) => coordsKey(item.x, item.y)));
    state.shipGroupsByPlayer ??= {};
    const groups = state.shipGroupsByPlayer[targetId] ?? (() => {
      const flattened = state.shipCellsByPlayer[targetId] ?? [];
      let offset = 0;
      return [5, 4, 3, 3, 2].map((length) => {
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
    shot.sunk = Boolean(newlySunk);
    const fleetDestroyed = groups.length > 0 ? sunkGroups.length === groups.length : targetShots.length >= (state.shipCellsByPlayer[targetId] ?? []).length;
    const shipNames = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];
    const sunkName = newlySunk ? shipNames[groups.indexOf(newlySunk)] ?? `${newlySunk.length}-cell ship` : "";
    message = `${hit ? "💥 HIT" : "🌊 Splash"}! ${player.displayName} fired at ${String.fromCharCode(65 + action.x)}${action.y + 1}${newlySunk ? ` — ${sunkName} sunk!` : ""}${fleetDestroyed ? " — entire fleet destroyed!" : ""}`;
    if (fleetDestroyed) finish(state, playerId, now);
    else state.currentPlayerId = targetId;} else return {accepted:false,message:""};return {accepted:true,message};}
