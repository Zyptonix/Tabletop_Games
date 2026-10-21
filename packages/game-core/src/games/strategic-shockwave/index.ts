import { z } from "zod";
import type { GameModule } from "../../engine/GameModule";
import type { GameEvent, GamePlayer, GameResults, GameTurnInfo, ValidationResult } from "../../engine/GameTypes";
import { hashSeed, nextRandom, shuffleWithState } from "../../engine/rng";

export const STRATEGIC_SHOCKWAVE_VERSION = "0.1.0";
export const SHOCKWAVE_MIN_PLAYERS = 2;
export const SHOCKWAVE_MAX_PLAYERS = 10;
export const SHOCKWAVE_WIDTH = 19;
export const SHOCKWAVE_HEIGHT = 15;
export const SHOCKWAVE_TILE_SIZE = 40;
export const SHOCKWAVE_BOMB_FUSE_MS = 1_900;
export const SHOCKWAVE_FLAME_MS = 650;
const PLAYER_RADIUS = 0.22;
const INPUT_LEASE_MS = 700;
const MAX_TICK_MS = 75;

export const strategicShockwaveSettingsSchema = z.object({
  roundSeconds: z.number().int().min(45).max(240).default(120)
});
export type StrategicShockwaveSettings = z.infer<typeof strategicShockwaveSettingsSchema>;
export const DEFAULT_STRATEGIC_SHOCKWAVE_SETTINGS: StrategicShockwaveSettings = { roundSeconds: 120 };

export const strategicShockwaveActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set_input"),
    x: z.number().int().min(-1).max(1),
    y: z.number().int().min(-1).max(1)
  }),
  z.object({ type: z.literal("place_bomb") })
]);
export type StrategicShockwaveAction = z.infer<typeof strategicShockwaveActionSchema>;
export type ShockwaveTile = "floor" | "wall" | "block";
export type ShockwavePowerUpKind = "bomb" | "flame" | "speed";

export interface ShockwaveCell { x: number; y: number }

export interface StrategicShockwavePlayer {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  isBot: boolean;
  x: number;
  y: number;
  inputX: number;
  inputY: number;
  inputUpdatedAt: number;
  lastBotThinkAt: number;
  alive: boolean;
  kills: number;
  deaths: number;
  bombsCapacity: number;
  blastRange: number;
  speed: number;
  invulnerableUntil: number;
}

export interface StrategicShockwaveBomb {
  id: string;
  x: number;
  y: number;
  ownerId: string;
  blastRange: number;
  placedAt: number;
  explodeAt: number;
  ownerCanLeave: boolean;
}

export interface StrategicShockwaveExplosion {
  id: string;
  ownerId: string;
  cells: ShockwaveCell[];
  expiresAt: number;
}

export interface StrategicShockwavePowerUp {
  id: string;
  x: number;
  y: number;
  kind: ShockwavePowerUpKind;
}

export interface StrategicShockwaveState {
  phase: "playing" | "finished";
  width: number;
  height: number;
  settings: StrategicShockwaveSettings;
  board: ShockwaveTile[][];
  players: StrategicShockwavePlayer[];
  bombs: StrategicShockwaveBomb[];
  explosions: StrategicShockwaveExplosion[];
  powerUps: StrategicShockwavePowerUp[];
  startedAt: number;
  deadlineAt: number;
  finishedAt: number | null;
  winnerUserId: string | null;
  pausedAt: number | null;
  rngState: number;
  nextBombId: number;
  nextExplosionId: number;
  nextPowerUpId: number;
  nextEventId: number;
  lastTickAt: number;
}

export interface PublicStrategicShockwavePlayer {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  isBot: boolean;
  x: number;
  y: number;
  alive: boolean;
  kills: number;
  bombsCapacity: number;
  bombsAvailable: number;
  blastRange: number;
  speed: number;
  invulnerableUntil: number;
}

export interface PublicStrategicShockwaveState {
  phase: "playing" | "finished";
  width: number;
  height: number;
  board: ShockwaveTile[][];
  players: PublicStrategicShockwavePlayer[];
  bombs: StrategicShockwaveBomb[];
  explosions: StrategicShockwaveExplosion[];
  powerUps: StrategicShockwavePowerUp[];
  startedAt: number;
  deadlineAt: number;
  finishedAt: number | null;
  winnerUserId: string | null;
}

const SPAWN_CELLS: ShockwaveCell[] = [
  { x: 1, y: 1 }, { x: 17, y: 13 }, { x: 17, y: 1 }, { x: 1, y: 13 },
  { x: 9, y: 1 }, { x: 9, y: 13 }, { x: 1, y: 7 }, { x: 17, y: 7 },
  { x: 5, y: 13 }, { x: 13, y: 1 }
];
const DIRECTIONS: ShockwaveCell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const BOT_DIRECTIONS: ShockwaveCell[] = [{ x: 0, y: 0 }, ...DIRECTIONS];

function cloneState(state: StrategicShockwaveState): StrategicShockwaveState {
  return {
    ...state,
    board: state.board.map((row) => [...row]),
    players: state.players.map((player) => ({ ...player })),
    bombs: state.bombs.map((bomb) => ({ ...bomb })),
    explosions: state.explosions.map((explosion) => ({ ...explosion, cells: explosion.cells.map((cell) => ({ ...cell })) })),
    powerUps: state.powerUps.map((powerUp) => ({ ...powerUp }))
  };
}

function nextRandomValue(state: StrategicShockwaveState): number {
  const result = nextRandom(state.rngState);
  state.rngState = result.state;
  return result.value;
}

function event(state: StrategicShockwaveState, type: string, message: string, nowMs: number, payload?: unknown): GameEvent {
  const id = `shockwave-event-${state.nextEventId++}`;
  return { id, type, message, payload, createdAt: new Date(nowMs).toISOString() };
}

function tileAt(state: StrategicShockwaveState, x: number, y: number): ShockwaveTile | null {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
  return state.board[y]?.[x] ?? null;
}

function isBombAt(state: StrategicShockwaveState, x: number, y: number): boolean {
  return state.bombs.some((bomb) => bomb.x === x && bomb.y === y);
}

function bombCountFor(state: StrategicShockwaveState, userId: string): number {
  return state.bombs.filter((bomb) => bomb.ownerId === userId).length;
}

function makeBomb(state: StrategicShockwaveState, player: StrategicShockwavePlayer, nowMs: number, events: GameEvent[]): boolean {
  if (!player.alive || bombCountFor(state, player.userId) >= player.bombsCapacity) return false;
  const x = Math.floor(player.x);
  const y = Math.floor(player.y);
  if (tileAt(state, x, y) !== "floor" || isBombAt(state, x, y)) return false;

  const bomb: StrategicShockwaveBomb = {
    id: `bomb-${state.nextBombId++}`,
    x,
    y,
    ownerId: player.userId,
    blastRange: player.blastRange,
    placedAt: nowMs,
    explodeAt: nowMs + SHOCKWAVE_BOMB_FUSE_MS,
    ownerCanLeave: true
  };
  state.bombs.push(bomb);
  events.push(event(state, "bomb_placed", `${player.displayName} planted a bomb.`, nowMs, { bombId: bomb.id, x, y, ownerId: player.userId }));
  return true;
}

function isOccupiedByBomb(state: StrategicShockwaveState, playerId: string, tileX: number, tileY: number): boolean {
  const bomb = state.bombs.find((item) => item.x === tileX && item.y === tileY);
  if (!bomb) return false;
  return !(bomb.ownerId === playerId && bomb.ownerCanLeave);
}

function canOccupy(state: StrategicShockwaveState, playerId: string, x: number, y: number): boolean {
  const minTileX = Math.floor(x - PLAYER_RADIUS);
  const maxTileX = Math.floor(x + PLAYER_RADIUS);
  const minTileY = Math.floor(y - PLAYER_RADIUS);
  const maxTileY = Math.floor(y + PLAYER_RADIUS);
  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      if (tileAt(state, tileX, tileY) !== "floor") return false;
      if (isOccupiedByBomb(state, playerId, tileX, tileY)) return false;
    }
  }
  return true;
}

function blastReachesCell(state: StrategicShockwaveState, bomb: StrategicShockwaveBomb, targetX: number, targetY: number): boolean {
  if (bomb.x === targetX && bomb.y === targetY) return true;
  for (const direction of DIRECTIONS) {
    for (let distance = 1; distance <= bomb.blastRange; distance += 1) {
      const x = bomb.x + direction.x * distance;
      const y = bomb.y + direction.y * distance;
      const tile = tileAt(state, x, y);
      if (tile === null || tile === "wall") break;
      if (x === targetX && y === targetY) return true;
      if (tile === "block") break;
    }
  }
  return false;
}

function isCellThreatened(state: StrategicShockwaveState, x: number, y: number, nowMs: number): boolean {
  return state.bombs.some((bomb) => bomb.explodeAt - nowMs <= 1_600 && bomb.explodeAt >= nowMs && blastReachesCell(state, bomb, x, y));
}

function hasClearLineToPlayer(state: StrategicShockwaveState, from: StrategicShockwavePlayer, target: StrategicShockwavePlayer): boolean {
  if (Math.floor(from.x) === Math.floor(target.x)) {
    const distance = Math.abs(Math.floor(from.y) - Math.floor(target.y));
    if (distance > from.blastRange) return false;
  } else if (Math.floor(from.y) === Math.floor(target.y)) {
    const distance = Math.abs(Math.floor(from.x) - Math.floor(target.x));
    if (distance > from.blastRange) return false;
  } else {
    return false;
  }
  return !state.bombs.some((bomb) => {
    if (bomb.x === Math.floor(from.x) && bomb.y === Math.floor(from.y)) return false;
    if (bomb.x === Math.floor(target.x) && bomb.y === Math.floor(target.y)) return false;
    if (Math.floor(from.x) === Math.floor(target.x)) {
      return bomb.x === Math.floor(from.x) && bomb.y > Math.min(from.y, target.y) && bomb.y < Math.max(from.y, target.y);
    }
    return bomb.y === Math.floor(from.y) && bomb.x > Math.min(from.x, target.x) && bomb.x < Math.max(from.x, target.x);
  }) && (() => {
    const fromX = Math.floor(from.x); const fromY = Math.floor(from.y);
    const targetX = Math.floor(target.x); const targetY = Math.floor(target.y);
    if (fromX === targetX) {
      for (let y = Math.min(fromY, targetY) + 1; y < Math.max(fromY, targetY); y += 1) if (tileAt(state, fromX, y) !== "floor") return false;
      return true;
    }
    for (let x = Math.min(fromX, targetX) + 1; x < Math.max(fromX, targetX); x += 1) if (tileAt(state, x, fromY) !== "floor") return false;
    return true;
  })();
}

function thinkForBots(state: StrategicShockwaveState, nowMs: number, events: GameEvent[]): boolean {
  let changed = false;
  for (const bot of state.players) {
    if (!bot.isBot || !bot.alive || nowMs - bot.lastBotThinkAt < 260) continue;
    bot.lastBotThinkAt = nowMs;
    changed = true;

    const enemies = state.players.filter((player) => player.alive && player.userId !== bot.userId);
    const nearest = enemies.sort((left, right) => {
      const leftDistance = Math.abs(left.x - bot.x) + Math.abs(left.y - bot.y);
      const rightDistance = Math.abs(right.x - bot.x) + Math.abs(right.y - bot.y);
      return leftDistance - rightDistance;
    })[0];
    if (nearest && hasClearLineToPlayer(state, bot, nearest) && Math.abs(nearest.x - bot.x) + Math.abs(nearest.y - bot.y) <= bot.blastRange + 0.5) {
      makeBomb(state, bot, nowMs, events);
    }

    let best: ShockwaveCell = { x: 0, y: 0 };
    let bestScore = -Infinity;
    for (const direction of BOT_DIRECTIONS) {
      const testX = bot.x + direction.x * 0.65;
      const testY = bot.y + direction.y * 0.65;
      if (!canOccupy(state, bot.userId, testX, testY)) continue;
      const cellX = Math.floor(testX); const cellY = Math.floor(testY);
      const dangerPenalty = isCellThreatened(state, cellX, cellY, nowMs) ? 100 : 0;
      const nearestDistance = nearest ? Math.abs(nearest.x - testX) + Math.abs(nearest.y - testY) : 10;
      let openNeighbors = 0;
      for (const candidate of DIRECTIONS) if (tileAt(state, cellX + candidate.x, cellY + candidate.y) === "floor") openNeighbors += 1;
      const score = -dangerPenalty - nearestDistance * 0.25 + openNeighbors * 0.18 + nextRandomValue(state) * 0.2;
      if (score > bestScore) { bestScore = score; best = direction; }
    }
    bot.inputX = best.x;
    bot.inputY = best.y;
    bot.inputUpdatedAt = nowMs;
  }
  return changed;
}

function collectPowerUps(state: StrategicShockwaveState, nowMs: number, events: GameEvent[]): boolean {
  let changed = false;
  for (const player of state.players) {
    if (!player.alive) continue;
    const playerX = Math.floor(player.x); const playerY = Math.floor(player.y);
    const item = state.powerUps.find((powerUp) => powerUp.x === playerX && powerUp.y === playerY);
    if (!item) continue;
    state.powerUps = state.powerUps.filter((powerUp) => powerUp.id !== item.id);
    if (item.kind === "bomb") player.bombsCapacity = Math.min(4, player.bombsCapacity + 1);
    if (item.kind === "flame") player.blastRange = Math.min(6, player.blastRange + 1);
    if (item.kind === "speed") player.speed = Math.min(5.5, Number((player.speed + 0.35).toFixed(2)));
    events.push(event(state, "powerup_collected", `${player.displayName} collected a ${item.kind} upgrade.`, nowMs, { userId: player.userId, kind: item.kind }));
    changed = true;
  }
  return changed;
}

function resolveExplosions(state: StrategicShockwaveState, nowMs: number, events: GameEvent[]): boolean {
  const due = state.bombs.filter((bomb) => bomb.explodeAt <= nowMs);
  if (due.length === 0) return false;
  const queue = [...due];
  const queuedIds = new Set(queue.map((bomb) => bomb.id));
  const blastOwners = new Map<string, string>();
  let changed = false;

  while (queue.length > 0) {
    const bomb = queue.shift();
    if (!bomb || !state.bombs.some((candidate) => candidate.id === bomb.id)) continue;
    state.bombs = state.bombs.filter((candidate) => candidate.id !== bomb.id);
    const cells: ShockwaveCell[] = [{ x: bomb.x, y: bomb.y }];
    blastOwners.set(`${bomb.x},${bomb.y}`, bomb.ownerId);

    for (const direction of DIRECTIONS) {
      for (let distance = 1; distance <= bomb.blastRange; distance += 1) {
        const x = bomb.x + direction.x * distance;
        const y = bomb.y + direction.y * distance;
        const tile = tileAt(state, x, y);
        if (tile === null || tile === "wall") break;
        const key = `${x},${y}`;
        if (!blastOwners.has(key)) blastOwners.set(key, bomb.ownerId);
        cells.push({ x, y });

        const chainBomb = state.bombs.find((candidate) => candidate.x === x && candidate.y === y);
        if (chainBomb && !queuedIds.has(chainBomb.id)) { queue.push(chainBomb); queuedIds.add(chainBomb.id); }

        if (tile === "block") {
          const row = state.board[y];
          if (row) row[x] = "floor";
          if (nextRandomValue(state) < 0.22 && !state.powerUps.some((item) => item.x === x && item.y === y)) {
            const kinds: ShockwavePowerUpKind[] = ["bomb", "flame", "speed"];
            const kind = kinds[Math.floor(nextRandomValue(state) * kinds.length)] ?? "bomb";
            state.powerUps.push({ id: `powerup-${state.nextPowerUpId++}`, x, y, kind });
          }
          break;
        }
      }
    }

    state.explosions.push({ id: `explosion-${state.nextExplosionId++}`, ownerId: bomb.ownerId, cells, expiresAt: nowMs + SHOCKWAVE_FLAME_MS });
    const owner = state.players.find((player) => player.userId === bomb.ownerId);
    events.push(event(state, "bomb_exploded", `${owner?.displayName ?? "A bomb"} detonated a bomb!`, nowMs, { bombId: bomb.id, ownerId: bomb.ownerId, cells }));
    changed = true;
  }

  for (const player of state.players) {
    if (!player.alive || player.invulnerableUntil > nowMs) continue;
    const x = Math.floor(player.x); const y = Math.floor(player.y);
    const hit = blastOwners.get(`${x},${y}`);
    if (!hit) continue;
    player.alive = false;
    player.deaths += 1;
    player.inputX = 0;
    player.inputY = 0;
    if (hit !== player.userId) {
      const killer = state.players.find((candidate) => candidate.userId === hit);
      if (killer) killer.kills += 1;
    }
    events.push(event(state, "player_eliminated", `${player.displayName} was blown up!`, nowMs, { userId: player.userId, killerId: hit }));
    changed = true;
  }
  return changed;
}

function chooseWinner(state: StrategicShockwaveState): string | null {
  const alive = state.players.filter((player) => player.alive);
  if (alive.length === 1) return alive[0]?.userId ?? null;
  if (alive.length === 0) return null;
  const maxKills = Math.max(...alive.map((player) => player.kills));
  const leaders = alive.filter((player) => player.kills === maxKills);
  return leaders.length === 1 ? leaders[0]?.userId ?? null : null;
}

function finishGame(state: StrategicShockwaveState, nowMs: number, events: GameEvent[], reason: "last_player" | "time_limit"): void {
  if (state.phase === "finished") return;
  state.phase = "finished";
  state.finishedAt = nowMs;
  state.winnerUserId = chooseWinner(state);
  const winner = state.players.find((player) => player.userId === state.winnerUserId);
  events.push(event(state, "game_finished", winner ? `${winner.displayName} wins Strategic Shockwave!` : "Strategic Shockwave ended in a draw.", nowMs, { winnerUserId: state.winnerUserId, reason }));
}

function tickState(params: { state: StrategicShockwaveState; now: string }): { state: StrategicShockwaveState; events: GameEvent[] } | null {
  if (params.state.phase !== "playing") return null;
  const nowMs = Date.parse(params.now);
  if (!Number.isFinite(nowMs)) return null;
  const state = cloneState(params.state);
  const events: GameEvent[] = [];
  let changed = false;

  const activeExplosions = state.explosions.filter((explosion) => explosion.expiresAt > nowMs);
  if (activeExplosions.length !== state.explosions.length) {
    state.explosions = activeExplosions;
    changed = true;
  }

  changed = thinkForBots(state, nowMs, events) || changed;
  const dtMs = Math.max(0, Math.min(MAX_TICK_MS, nowMs - state.lastTickAt));
  const dt = dtMs / 1_000;
  if (dt > 0) {
    for (const player of state.players) {
      if (!player.alive) continue;
      if (nowMs - player.inputUpdatedAt > INPUT_LEASE_MS) {
        if (player.inputX !== 0 || player.inputY !== 0) changed = true;
        player.inputX = 0;
        player.inputY = 0;
        continue;
      }
      if (player.inputX === 0 && player.inputY === 0) continue;
      const length = Math.hypot(player.inputX, player.inputY) || 1;
      const dx = (player.inputX / length) * player.speed * dt;
      const dy = (player.inputY / length) * player.speed * dt;
      const nextX = player.x + dx;
      const nextY = player.y + dy;
      if (Math.abs(dx) > 0 && canOccupy(state, player.userId, nextX, player.y)) { player.x = nextX; changed = true; }
      if (Math.abs(dy) > 0 && canOccupy(state, player.userId, player.x, nextY)) { player.y = nextY; changed = true; }
    }
  }
  state.lastTickAt = nowMs;

  for (const bomb of state.bombs) {
    if (!bomb.ownerCanLeave) continue;
    const owner = state.players.find((player) => player.userId === bomb.ownerId);
    if (!owner || Math.floor(owner.x - PLAYER_RADIUS) > bomb.x || Math.floor(owner.x + PLAYER_RADIUS) < bomb.x || Math.floor(owner.y - PLAYER_RADIUS) > bomb.y || Math.floor(owner.y + PLAYER_RADIUS) < bomb.y) {
      bomb.ownerCanLeave = false;
      changed = true;
    }
  }

  changed = collectPowerUps(state, nowMs, events) || changed;
  changed = resolveExplosions(state, nowMs, events) || changed;

  // A player who walks into an active flame after it was created is also eliminated.
  for (const player of state.players) {
    if (!player.alive || player.invulnerableUntil > nowMs) continue;
    const x = Math.floor(player.x); const y = Math.floor(player.y);
    const flame = state.explosions.find((explosion) => explosion.cells.some((cell) => cell.x === x && cell.y === y));
    if (!flame) continue;
    player.alive = false;
    player.deaths += 1;
    player.inputX = 0; player.inputY = 0;
    if (flame.ownerId !== player.userId) {
      const killer = state.players.find((candidate) => candidate.userId === flame.ownerId);
      if (killer) killer.kills += 1;
    }
    events.push(event(state, "player_eliminated", `${player.displayName} was caught in an explosion!`, nowMs, { userId: player.userId, killerId: flame.ownerId }));
    changed = true;
  }

  const aliveCount = state.players.filter((player) => player.alive).length;
  if (aliveCount <= 1) {
    finishGame(state, nowMs, events, "last_player");
    changed = true;
  } else if (nowMs >= state.deadlineAt) {
    finishGame(state, nowMs, events, "time_limit");
    changed = true;
  }

  return changed ? { state, events } : null;
}

export function createInitialStrategicShockwaveState(params: {
  players: GamePlayer[];
  settings: StrategicShockwaveSettings;
  seed: string;
  now: string;
}): StrategicShockwaveState {
  const nowMs = Date.parse(params.now);
  let rngState = hashSeed(params.seed);
  const spawnOrder = shuffleWithState(SPAWN_CELLS, rngState);
  rngState = spawnOrder.rngState;
  const spawnCells = spawnOrder.values;
  const protectedCells = new Set<string>();
  for (const spawn of SPAWN_CELLS) {
    for (let y = spawn.y - 1; y <= spawn.y + 1; y += 1) {
      for (let x = spawn.x - 1; x <= spawn.x + 1; x += 1) protectedCells.add(`${x},${y}`);
    }
  }

  const board: ShockwaveTile[][] = [];
  for (let y = 0; y < SHOCKWAVE_HEIGHT; y += 1) {
    const row: ShockwaveTile[] = [];
    for (let x = 0; x < SHOCKWAVE_WIDTH; x += 1) {
      if (x === 0 || y === 0 || x === SHOCKWAVE_WIDTH - 1 || y === SHOCKWAVE_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0)) {
        row.push("wall");
      } else if (!protectedCells.has(`${x},${y}`) && nextRandom(rngState).value < 0.57) {
        const next = nextRandom(rngState);
        rngState = next.state;
        row.push("block");
      } else {
        const next = nextRandom(rngState);
        rngState = next.state;
        row.push("floor");
      }
    }
    board.push(row);
  }
  for (const spawn of SPAWN_CELLS) {
    for (let y = spawn.y - 1; y <= spawn.y + 1; y += 1) {
      for (let x = spawn.x - 1; x <= spawn.x + 1; x += 1) {
        const row = board[y];
        if (row && x > 0 && y > 0 && x < SHOCKWAVE_WIDTH - 1 && y < SHOCKWAVE_HEIGHT - 1) row[x] = "floor";
      }
    }
  }

  const players: StrategicShockwavePlayer[] = params.players.slice(0, SHOCKWAVE_MAX_PLAYERS).map((player, index) => {
    const spawn = spawnCells[index] ?? SPAWN_CELLS[index] ?? { x: 1, y: 1 };
    return {
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      seat: player.seat,
      isBot: Boolean(player.isBot),
      x: spawn.x + 0.5,
      y: spawn.y + 0.5,
      inputX: 0,
      inputY: 0,
      inputUpdatedAt: nowMs,
      lastBotThinkAt: nowMs - 500,
      alive: true,
      kills: 0,
      deaths: 0,
      bombsCapacity: 1,
      blastRange: 2,
      speed: 3.2,
      invulnerableUntil: nowMs + 1_200
    };
  });

  return {
    phase: "playing",
    width: SHOCKWAVE_WIDTH,
    height: SHOCKWAVE_HEIGHT,
    settings: params.settings,
    board,
    players,
    bombs: [],
    explosions: [],
    powerUps: [],
    startedAt: nowMs,
    deadlineAt: nowMs + params.settings.roundSeconds * 1_000,
    finishedAt: null,
    winnerUserId: null,
    pausedAt: null,
    rngState,
    nextBombId: 1,
    nextExplosionId: 1,
    nextPowerUpId: 1,
    nextEventId: 1,
    lastTickAt: nowMs
  };
}

export function getPublicStrategicShockwaveState(state: StrategicShockwaveState): PublicStrategicShockwaveState {
  return {
    phase: state.phase,
    width: state.width,
    height: state.height,
    board: state.board.map((row) => [...row]),
    players: state.players.map((player) => ({
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      seat: player.seat,
      isBot: player.isBot,
      x: player.x,
      y: player.y,
      alive: player.alive,
      kills: player.kills,
      bombsCapacity: player.bombsCapacity,
      bombsAvailable: Math.max(0, player.bombsCapacity - bombCountFor(state, player.userId)),
      blastRange: player.blastRange,
      speed: player.speed,
      invulnerableUntil: player.invulnerableUntil
    })),
    bombs: state.bombs.map((bomb) => ({ ...bomb })),
    explosions: state.explosions.map((explosion) => ({ ...explosion, cells: explosion.cells.map((cell) => ({ ...cell })) })),
    powerUps: state.powerUps.map((powerUp) => ({ ...powerUp })),
    startedAt: state.startedAt,
    deadlineAt: state.deadlineAt,
    finishedAt: state.finishedAt,
    winnerUserId: state.winnerUserId
  };
}

function validateAction(params: { state: StrategicShockwaveState; playerId: string; action: StrategicShockwaveAction }): ValidationResult {
  if (params.state.phase !== "playing") return { ok: false, code: "GAME_FINISHED", message: "This round has finished." };
  const player = params.state.players.find((candidate) => candidate.userId === params.playerId);
  if (!player) return { ok: false, code: "PLAYER_NOT_FOUND", message: "Player is not part of this round." };
  if (!player.alive) return { ok: false, code: "PLAYER_ELIMINATED", message: "You have been eliminated." };
  if (params.action.type === "place_bomb") {
    if (bombCountFor(params.state, player.userId) >= player.bombsCapacity) return { ok: false, code: "BOMB_LIMIT", message: "All your bombs are already on the field." };
    const x = Math.floor(player.x); const y = Math.floor(player.y);
    if (tileAt(params.state, x, y) !== "floor" || isBombAt(params.state, x, y)) return { ok: false, code: "CELL_BLOCKED", message: "You cannot place a bomb here." };
  }
  return { ok: true };
}

function applyAction(params: { state: StrategicShockwaveState; playerId: string; action: StrategicShockwaveAction; now: string }): { state: StrategicShockwaveState; events: GameEvent[] } {
  const state = cloneState(params.state);
  const player = state.players.find((candidate) => candidate.userId === params.playerId);
  if (!player) return { state, events: [] };
  const nowMs = Date.parse(params.now);
  const events: GameEvent[] = [];
  if (params.action.type === "set_input") {
    player.inputX = params.action.x;
    player.inputY = params.action.y;
    player.inputUpdatedAt = nowMs;
  } else if (params.action.type === "place_bomb") {
    makeBomb(state, player, nowMs, events);
  }
  return { state, events };
}

function resultsFor(state: StrategicShockwaveState): GameResults {
  const ranked = state.players.slice().sort((left, right) => {
    if (left.alive !== right.alive) return left.alive ? -1 : 1;
    if (left.kills !== right.kills) return right.kills - left.kills;
    if (left.deaths !== right.deaths) return left.deaths - right.deaths;
    return left.seat - right.seat;
  });
  return {
    winnerUserId: state.winnerUserId,
    placements: ranked.map((player, index) => ({
      userId: player.userId,
      placement: index + 1,
      score: player.kills * 100 + (player.alive ? 25 : 0),
      result: state.winnerUserId === player.userId ? "WIN" : state.winnerUserId === null && player.alive ? "DRAW" : "LOSS"
    })),
    scoreByUserId: Object.fromEntries(ranked.map((player) => [player.userId, player.kills * 100 + (player.alive ? 25 : 0)]))
  };
}

function legalActions(state: StrategicShockwaveState, playerId: string): StrategicShockwaveAction[] {
  const player = state.players.find((candidate) => candidate.userId === playerId);
  if (!player || !player.alive || state.phase !== "playing") return [];
  const actions: StrategicShockwaveAction[] = [
    { type: "set_input", x: 0, y: 0 },
    { type: "set_input", x: 0, y: -1 },
    { type: "set_input", x: 0, y: 1 },
    { type: "set_input", x: -1, y: 0 },
    { type: "set_input", x: 1, y: 0 }
  ];
  if (bombCountFor(state, playerId) < player.bombsCapacity && tileAt(state, Math.floor(player.x), Math.floor(player.y)) === "floor" && !isBombAt(state, Math.floor(player.x), Math.floor(player.y))) {
    actions.push({ type: "place_bomb" });
  }
  return actions;
}

function pauseState(params: { state: StrategicShockwaveState; now: string }): StrategicShockwaveState {
  const state = cloneState(params.state);
  state.pausedAt = Date.parse(params.now);
  for (const player of state.players) {
    player.inputX = 0;
    player.inputY = 0;
    player.inputUpdatedAt = state.pausedAt;
  }
  state.lastTickAt = state.pausedAt;
  return state;
}

function resumeState(params: { state: StrategicShockwaveState; now: string }): StrategicShockwaveState {
  const state = cloneState(params.state);
  if (state.pausedAt === null) return state;
  const nowMs = Date.parse(params.now);
  const pausedDuration = Math.max(0, nowMs - state.pausedAt);
  state.deadlineAt += pausedDuration;
  for (const bomb of state.bombs) bomb.explodeAt += pausedDuration;
  for (const explosion of state.explosions) explosion.expiresAt += pausedDuration;
  for (const player of state.players) {
    player.invulnerableUntil += pausedDuration;
    player.inputUpdatedAt += pausedDuration;
    player.lastBotThinkAt += pausedDuration;
  }
  state.lastTickAt = nowMs;
  state.pausedAt = null;
  return state;
}

function getResults(state: StrategicShockwaveState): GameResults { return resultsFor(state); }
function getTurnInfo(_state: StrategicShockwaveState): GameTurnInfo { return { currentPlayerId: null, turnStartedAt: null, turnSeconds: null }; }

export const strategicShockwaveModule: GameModule<StrategicShockwaveState, StrategicShockwaveAction, StrategicShockwaveSettings> & {
  tick: (params: { state: StrategicShockwaveState; now: string }) => { state: StrategicShockwaveState; events: GameEvent[] } | null;
  shouldPersistAction: (action: StrategicShockwaveAction) => boolean;
} = {
  id: "strategic-shockwave",
  displayName: "Strategic Shockwave",
  version: STRATEGIC_SHOCKWAVE_VERSION,
  minPlayers: SHOCKWAVE_MIN_PLAYERS,
  maxPlayers: SHOCKWAVE_MAX_PLAYERS,
  defaultSettings: DEFAULT_STRATEGIC_SHOCKWAVE_SETTINGS,
  settingsSchema: strategicShockwaveSettingsSchema,
  actionSchema: strategicShockwaveActionSchema,
  createInitialState: createInitialStrategicShockwaveState,
  getPublicState: ({ state }) => getPublicStrategicShockwaveState(state),
  getLegalActions: ({ state, playerId }) => legalActions(state, playerId),
  validateAction: validateAction,
  applyAction: applyAction,
  getTurnInfo,
  getTimeoutAction: () => null,
  tick: tickState,
  shouldPersistAction: (action) => action.type !== "set_input",
  onPause: pauseState,
  onResume: resumeState,
  isGameOver: (state) => state.phase === "finished",
  getResults
};
