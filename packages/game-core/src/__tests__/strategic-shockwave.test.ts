import { describe, expect, it } from "vitest";
import {
  SHOCKWAVE_MAX_PLAYERS,
  SHOCKWAVE_BOMB_FUSE_MS,
  createInitialStrategicShockwaveState,
  getPublicStrategicShockwaveState,
  strategicShockwaveModule,
  type StrategicShockwaveState
} from "../games/strategic-shockwave";

const players = [
  { userId: "u1", username: "one", displayName: "One", seat: 0 },
  { userId: "u2", username: "two", displayName: "Two", seat: 1 }
];
const start = "2026-10-21T08:00:00.000Z";

function makeState(): StrategicShockwaveState {
  return createInitialStrategicShockwaveState({
    players,
    settings: { roundSeconds: 120 },
    seed: "shockwave-test-seed",
    now: start
  });
}

describe("Strategic Shockwave", () => {
  it("supports up to ten players and creates a board with hard borders", () => {
    expect(strategicShockwaveModule.maxPlayers).toBe(SHOCKWAVE_MAX_PLAYERS);
    const state = makeState();
    expect(state.players).toHaveLength(2);
    expect(state.board[0]?.every((tile) => tile === "wall")).toBe(true);
    expect(state.board[state.height - 1]?.every((tile) => tile === "wall")).toBe(true);
  });

  it("moves players from server-validated directional input", () => {
    const state = makeState();
    const initialX = state.players[0]!.x;
    const direction = Math.floor(initialX) >= state.width - 2 ? -1 : 1;
    const action = { type: "set_input" as const, x: direction, y: 0 };
    expect(strategicShockwaveModule.validateAction({ state, playerId: "u1", action }).ok).toBe(true);
    const applied = strategicShockwaveModule.applyAction({ state, playerId: "u1", action, now: start });
    const result = strategicShockwaveModule.tick({ state: applied.state, now: new Date(Date.parse(start) + 60).toISOString() });
    expect(result).not.toBeNull();
    expect(Math.abs(result!.state.players[0]!.x - initialX)).toBeGreaterThan(0);
  });

  it("keeps movement input transient while broadcasting gameplay actions", () => {
    const movement = { type: "set_input" as const, x: 1, y: 0 };
    const bomb = { type: "place_bomb" as const };
    expect(strategicShockwaveModule.shouldPersistAction(movement)).toBe(false);
    expect(strategicShockwaveModule.shouldBroadcastAction(movement)).toBe(false);
    expect(strategicShockwaveModule.shouldPersistAction(bomb)).toBe(true);
    expect(strategicShockwaveModule.shouldBroadcastAction(bomb)).toBe(true);
  });

  it("plants timed bombs and emits an explosion after the fuse", () => {
    const state = makeState();
    const action = { type: "place_bomb" as const };
    expect(strategicShockwaveModule.validateAction({ state, playerId: "u1", action }).ok).toBe(true);
    const placed = strategicShockwaveModule.applyAction({ state, playerId: "u1", action, now: start });
    expect(placed.state.bombs).toHaveLength(1);
    expect(placed.state.bombs[0]!.explodeAt).toBe(Date.parse(start) + SHOCKWAVE_BOMB_FUSE_MS);
    const result = strategicShockwaveModule.tick({ state: placed.state, now: new Date(Date.parse(start) + SHOCKWAVE_BOMB_FUSE_MS + 10).toISOString() });
    expect(result?.events.some((item) => item.type === "bomb_exploded")).toBe(true);
    expect(result?.state.bombs).toHaveLength(0);
    expect(result?.state.explosions.length).toBeGreaterThan(0);
  });

  it("only publishes the public state needed to render the arena", () => {
    const state = makeState();
    const publicState = getPublicStrategicShockwaveState(state);
    expect(publicState.players[0]).not.toHaveProperty("inputX");
    expect(publicState.players[0]).not.toHaveProperty("inputUpdatedAt");
    expect(publicState).not.toHaveProperty("rngState");
  });

  it("rejects bomb placement by a missing or eliminated player", () => {
    const state = makeState();
    const action = { type: "place_bomb" as const };
    expect(strategicShockwaveModule.validateAction({ state, playerId: "missing", action }).ok).toBe(false);
    state.players[0]!.alive = false;
    expect(strategicShockwaveModule.validateAction({ state, playerId: "u1", action }).ok).toBe(false);
  });
});
