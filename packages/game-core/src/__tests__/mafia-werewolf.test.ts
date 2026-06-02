import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEREWOLF_SETTINGS,
  advanceWerewolfPhase,
  applyWerewolfAction,
  createInitialWerewolfState,
  getLegalWerewolfActions,
  getPublicWerewolfState,
  validateWerewolfAction,
  type WerewolfState
} from "../games/mafia-werewolf";

const players = [
  { userId: "p1", username: "p1", displayName: "Player 1", seat: 0 },
  { userId: "p2", username: "p2", displayName: "Player 2", seat: 1 },
  { userId: "p3", username: "p3", displayName: "Player 3", seat: 2 },
  { userId: "p4", username: "p4", displayName: "Player 4", seat: 3 },
  { userId: "p5", username: "p5", displayName: "Player 5", seat: 4 }
];

function baseState(): WerewolfState {
  return createInitialWerewolfState({
    players,
    settings: DEFAULT_WEREWOLF_SETTINGS,
    seed: "werewolf-test",
    now: "2026-01-01T00:00:00.000Z"
  });
}

function forceRoles(state: WerewolfState): WerewolfState {
  return {
    ...state,
    players: state.players.map((player, index) => {
      const role = index === 0 ? "werewolf" : index === 1 ? "seer" : index === 2 ? "doctor" : "villager";
      const team = role === "werewolf" ? "werewolf" : "village";
      return { ...player, role, team };
    })
  };
}

describe("mafia/werewolf", () => {
  it("creates a valid five-player minimum setup", () => {
    const state = baseState();
    expect(state.players).toHaveLength(5);
    expect(state.players.filter((player) => player.role === "werewolf")).toHaveLength(1);
    expect(state.players.filter((player) => player.role === "seer")).toHaveLength(1);
    expect(state.players.filter((player) => player.role === "doctor")).toHaveLength(1);
    expect(state.phase).toBe("role_reveal");
  });

  it("redacts roles except own role and werewolf teammates", () => {
    const state = forceRoles(baseState());
    const villagerView = getPublicWerewolfState({ state, viewerId: "p4" });
    expect(villagerView.players.find((player) => player.userId === "p1")?.role).toBeUndefined();
    expect(villagerView.myRole).toBe("villager");

    const wolfView = getPublicWerewolfState({ state, viewerId: "p1" });
    expect(wolfView.players.find((player) => player.userId === "p1")?.role).toBe("werewolf");
  });

  it("doctor save blocks the werewolf kill", () => {
    let state = forceRoles(baseState());
    state = advanceWerewolfPhase({ state, now: "2026-01-01T00:00:12.000Z" }).state;

    state = applyWerewolfAction({ state, playerId: "p1", action: { type: "night_werewolf_target", targetPlayerId: "p4" }, now: "2026-01-01T00:00:13.000Z" }).state;
    state = applyWerewolfAction({ state, playerId: "p3", action: { type: "night_doctor_save", targetPlayerId: "p4" }, now: "2026-01-01T00:00:14.000Z" }).state;

    const resolved = advanceWerewolfPhase({ state, now: "2026-01-01T00:00:57.000Z" }).state;
    expect(resolved.phase).toBe("night_result");
    expect(resolved.players.find((player) => player.userId === "p4")?.alive).toBe(true);
    expect(resolved.lastSavedPlayerId).toBe("p4");
  });

  it("seer receives a private result", () => {
    let state = forceRoles(baseState());
    state = advanceWerewolfPhase({ state, now: "2026-01-01T00:00:12.000Z" }).state;
    const result = applyWerewolfAction({ state, playerId: "p2", action: { type: "night_seer_check", targetPlayerId: "p1" }, now: "2026-01-01T00:00:13.000Z" });
    const resolved = advanceWerewolfPhase({ state: result.state, now: "2026-01-01T00:00:58.000Z" });
    expect(resolved.state.seerResults.at(-1)?.result).toBe("werewolf");
    expect(getPublicWerewolfState({ state: resolved.state, viewerId: "p2" }).seerResults).toHaveLength(1);
    expect(getPublicWerewolfState({ state: resolved.state, viewerId: "p4" }).seerResults).toHaveLength(0);
  });

  it("voting eliminates highest target and dead players cannot act", () => {
    let state = forceRoles(baseState());
    state = { ...state, phase: "voting" };
    state = applyWerewolfAction({ state, playerId: "p1", action: { type: "cast_vote", targetPlayerId: "p4" }, now: "2026-01-01T00:01:00.000Z" }).state;
    state = applyWerewolfAction({ state, playerId: "p2", action: { type: "cast_vote", targetPlayerId: "p4" }, now: "2026-01-01T00:01:01.000Z" }).state;
    const resolved = advanceWerewolfPhase({ state, now: "2026-01-01T00:01:45.000Z" }).state;
    expect(resolved.players.find((player) => player.userId === "p4")?.alive).toBe(false);
    expect(validateWerewolfAction({ state: resolved, playerId: "p4", action: { type: "cast_vote", targetPlayerId: "p1" } }).ok).toBe(false);
  });

  it("exposes legal night actions by role", () => {
    let state = forceRoles(baseState());
    state = advanceWerewolfPhase({ state, now: "2026-01-01T00:00:12.000Z" }).state;
    expect(getLegalWerewolfActions({ state, playerId: "p1" }).some((action) => action.type === "night_werewolf_target")).toBe(true);
    expect(getLegalWerewolfActions({ state, playerId: "p2" }).some((action) => action.type === "night_seer_check")).toBe(true);
    expect(getLegalWerewolfActions({ state, playerId: "p3" }).some((action) => action.type === "night_doctor_save")).toBe(true);
    expect(getLegalWerewolfActions({ state, playerId: "p4" }).filter((action) => action.type !== "advance_phase")).toHaveLength(0);
  });
});
