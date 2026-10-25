#!/usr/bin/env python3
"""Tabletop Arena V5 continuation: server-enforced Codenames clue/guess rules.

Builds the already-guarded V2+V3+V4 stack in memory, then layers on:
- explicit Red/Blue spymasters and minimum 4-player standard team play,
- private spymaster key visibility (never sent to operatives),
- clue validation and clue-number guess budgets,
- turn passing on wrong-color/neutral guesses, assassin loss, and team completion,
- an actionable clue/guess UI and rules-focused regression tests.

Nothing is written unless the complete composite patch passes all source guards.
"""
from __future__ import annotations
import argparse
import importlib.util
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

EXPECTED_BRANCH = "feat/board-games-pc-first-v1"
BASE_COMMIT = "19aead093be3c8e1d758413d70b4909977285462"
MARKER = "TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES"

class PatchError(RuntimeError):
    pass

def load_v4():
    path = Path(__file__).with_name("apply_pc_first_full_patch_v4.py")
    if not path.is_file():
        raise PatchError("Missing bundled apply_pc_first_full_patch_v4.py; keep patch components together.")
    spec = importlib.util.spec_from_file_location("_tabletop_pc_first_v4", path)
    if spec is None or spec.loader is None:
        raise PatchError("Could not load the bundled V4 patch component.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module

V4 = load_v4()

def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise PatchError(f"{label}: expected one source anchor, found {count}; no files changed.")
    return src.replace(old, new, 1)

def replace_region(src: str, start: str, end: str, new: str, label: str) -> str:
    a = src.find(start)
    if a < 0:
        raise PatchError(f"{label}: start anchor not found; no files changed.")
    b = src.find(end, a + len(start))
    if b < 0:
        raise PatchError(f"{label}: end anchor not found; no files changed.")
    if src.find(start, a + len(start), b) >= 0:
        raise PatchError(f"{label}: ambiguous source region; no files changed.")
    return src[:a] + new + src[b:]


def patch_engine(src: str) -> str:
    if MARKER in src:
        raise PatchError("V5 Codenames rules appear to be installed already.")
    src = f"// {MARKER}\n" + src
    src = replace_once(src,
        '  state.pokerContributions ??= {};\n  const { playerId, action, now } = params;',
        '  state.pokerContributions ??= {};\n  normalizeCodenamesSnapshot(state);\n  const { playerId, action, now } = params;',
        "normalize persisted Codenames snapshots")

    src = replace_once(src,
        '  | { type: "reveal_word"; index: number }\n  | { type: "poker_action"; choice: "fold" | "check" | "call" | "raise" | "all_in" };',
        '  | { type: "reveal_word"; index: number }\n  | { type: "give_clue"; clue: string; number: number }\n  | { type: "end_codenames_turn" }\n  | { type: "poker_action"; choice: "fold" | "check" | "call" | "raise" | "all_in" };',
        "Codenames clue and end-turn actions")

    src = replace_once(src,
        '  codenamesTeamByPlayer: Record<string, "red" | "blue">;\n  pokerCardsByPlayer: Record<string, string[]>;',
        '  codenamesTeamByPlayer: Record<string, "red" | "blue">;\n  codenamesSpymasterByTeam: Record<"red" | "blue", string>;\n  codenamesRoundTeam: "red" | "blue";\n  codenamesClue: string | null;\n  codenamesClueNumber: number | null;\n  codenamesGuessesRemaining: number;\n  pokerCardsByPlayer: Record<string, string[]>;',
        "Codenames hidden-key, clue and turn state")

    src = replace_once(src,
        '    team: "red" | "blue" | null;\n  }>;',
        '    team: "red" | "blue" | null;\n    isSpymaster: boolean;\n  }>;',
        "Expose only the non-secret spymaster identity")
    src = replace_once(src,
        '  wordCards: Array<{ word: string; revealed: boolean; revealedRole: Team | null }>;',
        '  wordCards: Array<{ word: string; revealed: boolean; revealedRole: Team | null; keyRole: Team | null }>;\n  isCodenamesSpymaster: boolean;\n  codenamesCurrentTeam: "red" | "blue";\n  codenamesClue: string | null;\n  codenamesClueNumber: number | null;\n  codenamesGuessesRemaining: number;',
        "Viewer-specific Codenames key and turn presentation")

    src = replace_once(src,
        '  z.object({ type: z.literal("reveal_word"), index: z.number().int().min(0).max(24) }),\n  z.object({ type: z.literal("poker_action"), choice: z.enum(["fold", "check", "call", "raise", "all_in"]) })',
        '  z.object({ type: z.literal("reveal_word"), index: z.number().int().min(0).max(24) }),\n  z.object({ type: z.literal("give_clue"), clue: z.string().trim().min(1).max(30), number: z.number().int().min(0).max(9) }),\n  z.object({ type: z.literal("end_codenames_turn") }),\n  z.object({ type: z.literal("poker_action"), choice: z.enum(["fold", "check", "call", "raise", "all_in"]) })',
        "Validate clue input and turn-ending action shape")

    old_spec = '  codenames: { title: "Codenames", min: 2, max: 10, notice: "Early access · the word grid, hidden team key, reveals and basic team scoring are wired. Spymaster clue-giving, clue limits and full round scoring are next." },'
    new_spec = '  codenames: { title: "Codenames", min: 4, max: 10, notice: "Team Codenames · spymaster-only key, clue numbers, operative guesses, turn passing and assassin/team victory are enforced. Standard team play requires 4–10 players." },'
    src = replace_once(src, old_spec, new_spec, "require enough players for standard team Codenames")

    init_old = '    shipCellsByPlayer: {}, shipGroupsByPlayer: {}, shots: [], wordCards: [], codenamesTeamByPlayer: {},'
    init_new = '    shipCellsByPlayer: {}, shipGroupsByPlayer: {}, shots: [], wordCards: [], codenamesTeamByPlayer: {}, codenamesSpymasterByTeam: { red: "", blue: "" }, codenamesRoundTeam: "red", codenamesClue: null, codenamesClueNumber: null, codenamesGuessesRemaining: 0,'
    src = replace_once(src, init_old, init_new, "initialize new Codenames round state")

    src = replace_region(src,
        '  if (gameId === "codenames") {',
        '  if (gameId === "poker") {',
        '''  if (gameId === "codenames") {
    const shuffled = shuffle(WORDS, rngState); rngState = shuffled.rngState;
    // Standard team setup: 9 red agents, 8 blue agents, 7 bystanders and 1 assassin.
    const roles: Team[] = [...Array<Team>(9).fill("red"), ...Array<Team>(8).fill("blue"), ...Array<Team>(7).fill("neutral"), "assassin"];
    const shuffledRoles = shuffle(roles, rngState); rngState = shuffledRoles.rngState;
    state.wordCards = shuffled.items.map((word, index) => ({ word, role: shuffledRoles.items[index] ?? "neutral", revealed: false }));
    const bySeat = players.slice().sort((a, b) => a.seat - b.seat);
    bySeat.forEach((player) => { state.codenamesTeamByPlayer[player.userId] = player.seat % 2 === 0 ? "red" : "blue"; });
    for (const team of ["red", "blue"] as const) {
      state.codenamesSpymasterByTeam[team] = bySeat.find((player) => state.codenamesTeamByPlayer[player.userId] === team)?.userId ?? "";
    }
    state.codenamesRoundTeam = "red";
    state.currentPlayerId = state.codenamesSpymasterByTeam.red || firstId;
  }
''',
        "assign one spymaster per team and start the red clue phase")

    src = replace_region(src,
        'function makeResults(state: PrototypeGameState): GameResults {',
        '\nfunction finish(state: PrototypeGameState, winnerId: string | null, now: string): void {',
        """function makeResults(state: PrototypeGameState): GameResults {
  const winnerId = state.winnerUserId;
  if (state.gameId === "codenames" && winnerId) {
    const winningTeam = state.codenamesTeamByPlayer[winnerId];
    const winningPlayers = state.players.filter((player) => state.codenamesTeamByPlayer[player.userId] === winningTeam).sort((a, b) => a.seat - b.seat);
    const losingPlayers = state.players.filter((player) => state.codenamesTeamByPlayer[player.userId] !== winningTeam).sort((a, b) => a.seat - b.seat);
    const orderedTeamPlayers = [...winningPlayers, ...losingPlayers];
    return {
      winnerUserId: winnerId,
      placements: orderedTeamPlayers.map((player) => {
        const won = state.codenamesTeamByPlayer[player.userId] === winningTeam;
        return { userId: player.userId, placement: won ? 1 : 2, score: won ? 1 : 0, result: won ? ("WIN" as const) : ("LOSS" as const) };
      }),
      scoreByUserId: Object.fromEntries(orderedTeamPlayers.map((player) => [player.userId, state.codenamesTeamByPlayer[player.userId] === winningTeam ? 1 : 0]))
    };
  }
  const ordered = state.players.slice().sort((a, b) => Number(b.userId === winnerId) - Number(a.userId === winnerId) || a.seat - b.seat);
  return {
    winnerUserId: winnerId,
    placements: ordered.map((player, index) => ({ userId: player.userId, placement: index + 1, score: player.userId === winnerId ? 1 : 0, result: player.userId === winnerId ? "WIN" : winnerId ? "LOSS" : "DRAW" })),
    scoreByUserId: Object.fromEntries(ordered.map((player) => [player.userId, player.userId === winnerId ? 1 : 0]))
  };
}""",
        "award Codenames victory and score to the whole winning team")

    src = replace_once(src,
        'function nextPlayerOnTeam(state: PrototypeGameState, team: "red" | "blue"): string | null {\n  return state.players.find((player) => state.codenamesTeamByPlayer[player.userId] === team)?.userId ?? null;\n}',
        '''function nextPlayerOnTeam(state: PrototypeGameState, team: "red" | "blue"): string | null {
  return state.players.find((player) => state.codenamesTeamByPlayer[player.userId] === team)?.userId ?? null;
}
function normalizeCodenamesSnapshot(state: PrototypeGameState): void {
  if (state.gameId !== "codenames") return;
  const snapshotFields = state as unknown as Record<string, unknown>;
  const needsTeamPhaseMigration = !snapshotFields.codenamesSpymasterByTeam || !snapshotFields.codenamesRoundTeam || !("codenamesClue" in snapshotFields) || !("codenamesClueNumber" in snapshotFields) || !("codenamesGuessesRemaining" in snapshotFields);
  state.codenamesTeamByPlayer ??= Object.fromEntries(state.players.map((player) => [player.userId, player.seat % 2 === 0 ? "red" : "blue"])) as Record<string, "red" | "blue">;
  state.codenamesSpymasterByTeam ??= {
    red: state.players.slice().sort((a, b) => a.seat - b.seat).find((player) => state.codenamesTeamByPlayer[player.userId] === "red")?.userId ?? "",
    blue: state.players.slice().sort((a, b) => a.seat - b.seat).find((player) => state.codenamesTeamByPlayer[player.userId] === "blue")?.userId ?? ""
  };
  state.codenamesRoundTeam ??= state.codenamesTeamByPlayer[state.currentPlayerId ?? ""] ?? "red";
  state.codenamesClue ??= null;
  state.codenamesClueNumber ??= null;
  state.codenamesGuessesRemaining ??= 0;
  // An old snapshot has no explicit clue/operative phase. Resume it at the
  // current team's spymaster rather than leaving a former operative stranded.
  if (needsTeamPhaseMigration && state.codenamesClue === null) {
    const currentTeam = state.codenamesTeamByPlayer[state.currentPlayerId ?? ""];
    if (currentTeam) state.codenamesRoundTeam = currentTeam;
    const spymasterId = state.codenamesSpymasterByTeam[state.codenamesRoundTeam] || nextPlayerOnTeam(state, state.codenamesRoundTeam);
    if (spymasterId) state.currentPlayerId = spymasterId;
  }
}
function nextCodenamesOperative(state: PrototypeGameState, team: "red" | "blue", fromId: string | null = null): string | null {
  const spymasterId = state.codenamesSpymasterByTeam[team];
  const operatives = state.players.filter((player) => state.codenamesTeamByPlayer[player.userId] === team && player.userId !== spymasterId).slice().sort((a, b) => a.seat - b.seat);
  if (!operatives.length) return null;
  const index = operatives.findIndex((player) => player.userId === fromId);
  return operatives[(index + 1 + operatives.length) % operatives.length]?.userId ?? operatives[0]?.userId ?? null;
}
function endCodenamesTeamTurn(state: PrototypeGameState): void {
  const nextTeam: "red" | "blue" = state.codenamesRoundTeam === "red" ? "blue" : "red";
  state.codenamesRoundTeam = nextTeam;
  state.codenamesClue = null;
  state.codenamesClueNumber = null;
  state.codenamesGuessesRemaining = 0;
  state.currentPlayerId = state.codenamesSpymasterByTeam[nextTeam] || nextPlayerOnTeam(state, nextTeam);
}''',
        "Codenames operative rotation and team turn transition")

    src = replace_once(src,
        '  if (state.gameId === "codenames") return state.wordCards.map((card, index) => ({ card, index })).filter(({ card }) => !card.revealed).map(({ index }) => ({ type: "reveal_word", index }));',
        '''  if (state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    if (!team || team !== state.codenamesRoundTeam) return [];
    const spymasterId = state.codenamesSpymasterByTeam[team];
    if (state.codenamesClue === null) {
      return playerId === spymasterId ? [{ type: "give_clue", clue: "", number: 1 }] : [];
    }
    if (playerId === spymasterId) return [];
    return [
      ...state.wordCards.map((card, index) => ({ card, index })).filter(({ card }) => !card.revealed).map(({ index }) => ({ type: "reveal_word", index } as PrototypeAction)),
      { type: "end_codenames_turn" } as PrototypeAction
    ];
  }''',
        "enforce spymaster-clue then operative-guess phases")

    src = replace_once(src,
        '  const legal = actionsFor(state, playerId);\n  const stableAction = (candidate: PrototypeAction) => JSON.stringify(Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right)));\n  const allowed = legal.some((candidate) => stableAction(candidate) === stableAction(action));\n  if (allowed) return { ok: true };',
        '''  const legal = actionsFor(state, playerId);
  if (action.type === "give_clue" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    const clue = action.clue.trim();
    const normalized = clue.toLowerCase().replace(/[^a-z0-9]/g, "");
    const clashesWithBoard = state.wordCards.some((card) => card.word.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized);
    if (!legal.some((candidate) => candidate.type === "give_clue") || team !== state.codenamesRoundTeam || playerId !== state.codenamesSpymasterByTeam[team ?? "red"] || state.codenamesClue !== null) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Only the active team's spymaster may give a clue." };
    }
    if (!clue || clue.length > 30 || /\\s/.test(clue) || !Number.isInteger(action.number) || action.number < 0 || action.number > 9 || clashesWithBoard) {
      return { ok: false, code: "INVALID_CLUE", message: "Use one 1–30 character word, choose a number from 0 to 9, and do not repeat a word on the grid." };
    }
    return { ok: true };
  }
  const stableAction = (candidate: PrototypeAction) => JSON.stringify(Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right)));
  const allowed = legal.some((candidate) => stableAction(candidate) === stableAction(action));
  if (allowed) return { ok: true };''',
        "validate clue payloads beyond the action-schema shape")

    src = replace_region(src,
        '  } else if (action.type === "reveal_word" && state.gameId === "codenames") {',
        '  } else if (action.type === "poker_action" && state.gameId === "poker") {',
        '''  } else if (action.type === "give_clue" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    const clue = action.clue.trim();
    const normalized = clue.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!team || team !== state.codenamesRoundTeam || playerId !== state.codenamesSpymasterByTeam[team] || state.codenamesClue !== null || !clue || clue.length > 30 || /\\s/.test(clue) || state.wordCards.some((card) => card.word.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)) return { state: params.state, events: [] };
    state.codenamesClue = clue;
    state.codenamesClueNumber = action.number;
    state.codenamesGuessesRemaining = action.number === 0 ? state.wordCards.filter((card) => !card.revealed).length : action.number + 1;
    const operativeId = nextCodenamesOperative(state, team);
    if (!operativeId) {
      message = `🕵️ ${player.displayName} gave ${clue} (${action.number}), but the team has no operative to guess.`;
      endCodenamesTeamTurn(state);
    } else {
      state.currentPlayerId = operativeId;
      message = `🕵️ ${player.displayName} gives ${team.toUpperCase()} the clue “${clue}” (${action.number}). Operatives may make ${state.codenamesGuessesRemaining} guess${state.codenamesGuessesRemaining === 1 ? "" : "es"}.`;
    }
  } else if (action.type === "end_codenames_turn" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    if (!team || team !== state.codenamesRoundTeam || state.currentPlayerId !== playerId || playerId === state.codenamesSpymasterByTeam[team] || state.codenamesClue === null) return { state: params.state, events: [] };
    endCodenamesTeamTurn(state);
    message = `➡️ ${player.displayName} ended the ${team.toUpperCase()} guessing turn. ${state.codenamesRoundTeam.toUpperCase()} is up next.`;
  } else if (action.type === "reveal_word" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    const card = state.wordCards[action.index];
    if (!team || team !== state.codenamesRoundTeam || state.currentPlayerId !== playerId || playerId === state.codenamesSpymasterByTeam[team] || state.codenamesClue === null || state.codenamesGuessesRemaining <= 0 || !card || card.revealed) return { state: params.state, events: [] };
    card.revealed = true;
    const redRemaining = state.wordCards.filter((item) => item.role === "red" && !item.revealed).length;
    const blueRemaining = state.wordCards.filter((item) => item.role === "blue" && !item.revealed).length;
    if (card.role === "assassin") {
      const winnerTeam = team === "red" ? "blue" : "red";
      const winnerId = nextPlayerOnTeam(state, winnerTeam);
      finish(state, winnerId, now);
      message = `☠️ ${player.displayName} revealed the assassin. ${winnerTeam.toUpperCase()} wins!`;
    } else if (redRemaining === 0) {
      finish(state, nextPlayerOnTeam(state, "red"), now);
      message = `🏆 ${player.displayName} revealed the final red agent. RED wins!`;
    } else if (blueRemaining === 0) {
      finish(state, nextPlayerOnTeam(state, "blue"), now);
      message = `🏆 ${player.displayName} revealed the final blue agent. BLUE wins!`;
    } else if (card.role === team) {
      state.codenamesGuessesRemaining = Math.max(0, state.codenamesGuessesRemaining - 1);
      if (state.codenamesGuessesRemaining === 0) {
        endCodenamesTeamTurn(state);
        message = `✅ ${player.displayName} found a ${team.toUpperCase()} agent. The clue's guess budget is used; ${state.codenamesRoundTeam.toUpperCase()} is up next.`;
      } else {
        state.currentPlayerId = nextCodenamesOperative(state, team, playerId) ?? playerId;
        message = `✅ ${player.displayName} found a ${team.toUpperCase()} agent. ${state.codenamesGuessesRemaining} guess${state.codenamesGuessesRemaining === 1 ? "" : "es"} remain.`;
      }
    } else {
      const revealedRole = card.role === "neutral" ? "a bystander" : "an opposing agent";
      endCodenamesTeamTurn(state);
      message = `🟨 ${player.displayName} revealed ${revealedRole}. The guessing turn ends; ${state.codenamesRoundTeam.toUpperCase()} is up next.`;
    }
''',
        "implement clue-giving, operative guesses, turn passes and team victory")

    # Insert the spymaster flag without changing other game-specific player fields.
    src = replace_once(src,
        '      team: state.codenamesTeamByPlayer[player.userId] ?? null\n    })),',
        '      team: state.codenamesTeamByPlayer[player.userId] ?? null,\n      isSpymaster: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[player.userId] ?? "red"] === player.userId\n    })),',
        "publish each player's spymaster marker")
    src = replace_once(src,
        '    wordCards: state.wordCards.map((card) => ({ word: card.word, revealed: card.revealed, revealedRole: card.revealed ? card.role : null })),',
        '    wordCards: state.wordCards.map((card) => ({ word: card.word, revealed: card.revealed, revealedRole: card.revealed ? card.role : null, keyRole: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[viewerId] ?? "red"] === viewerId ? card.role : null })),\n    isCodenamesSpymaster: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[viewerId] ?? "red"] === viewerId,\n    codenamesCurrentTeam: state.codenamesRoundTeam, codenamesClue: state.codenamesClue, codenamesClueNumber: state.codenamesClueNumber, codenamesGuessesRemaining: state.codenamesGuessesRemaining,',
        "hide unrevealed key roles from operatives while allowing spymaster key view")

    src = replace_once(src,
        '    getPublicState: ({ state, viewerId }) => publicState(state, viewerId),\n    getLegalActions: ({ state, playerId }) => actionsFor(state, playerId),',
        '    getPublicState: ({ state, viewerId }) => { normalizeCodenamesSnapshot(state); return publicState(state, viewerId); },\n    getLegalActions: ({ state, playerId }) => { normalizeCodenamesSnapshot(state); return actionsFor(state, playerId); },',
        "normalize old Codenames snapshots before public reads and legal action selection")

    # Source-level guard: hidden key roles must not be exposed to non-spymasters.
    public_block = src[src.find("function publicState("):src.find("function createModule(")]
    if 'keyRole: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[viewerId] ?? "red"] === viewerId ? card.role : null' not in public_block:
        raise PatchError("Codenames hidden-key visibility guard failed; no files changed.")
    return src.rstrip() + "\n"


def patch_ui(src: str) -> str:
    if MARKER in src:
        raise PatchError("V5 Codenames UI appears to be installed already.")
    src = f"// {MARKER}\n" + src
    src = replace_once(src,
        '  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);',
        '  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);\n  const [codenamesClueText, setCodenamesClueText] = useState("");\n  const [codenamesClueNumber, setCodenamesClueNumber] = useState(1);',
        "add local Codenames clue-form state")

    src = replace_region(src,
        '  function renderCodenames() {',
        '  function renderPoker() {',
        r'''  function renderCodenames() {
    const revealedCounts = state.wordCards.reduce((counts, card) => {
      if (card.revealed && card.revealedRole) counts[card.revealedRole] = (counts[card.revealedRole] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const team = state.codenamesCurrentTeam;
    const teamName = team === "red" ? "RED" : "BLUE";
    return <div className="mx-auto w-full max-w-[1000px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-black">🕵️ Codenames</h2><p className="text-sm text-white/50">Spymaster gives one clue and a number; operatives find matching agents without touching the assassin.</p></div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-black text-rose-200">🔴 {revealedCounts.red ?? 0}/9</span><span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black text-sky-200">🔵 {revealedCounts.blue ?? 0}/8</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${team === "red" ? "border-rose-200/25 bg-rose-300/10 text-rose-100" : "border-sky-200/25 bg-sky-300/10 text-sky-100"}`}>{teamName} TEAM TURN</span></div>
      </div>
      <section className="mb-3 rounded-2xl border border-white/10 bg-[#0b131c] p-3 sm:p-4">
        {state.codenamesClue ? <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Current clue · {teamName}</p><p className="text-xl font-black text-amber-100">{state.codenamesClue} <span className="text-sm text-white/55">({state.codenamesClueNumber === 0 ? "unlimited" : state.codenamesClueNumber})</span></p></div><div className="rounded-xl border border-amber-200/20 bg-amber-200/[.06] px-3 py-2 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-amber-100/45">Guesses remaining</p><p className="text-xl font-black text-amber-100">{state.codenamesGuessesRemaining}</p></div></div> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white/60">Waiting for the {teamName.toLowerCase()} spymaster to give a clue.</p><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/40">Clue phase</span></div>}
        {state.isCodenamesSpymaster ? <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-100/55">🔑 You are the spymaster — unrevealed cards show the secret key only on your screen.</p> : <p className="mt-2 text-[10px] text-white/35">Operatives cannot see the key. A correct guess keeps your turn until the clue budget is used; a bystander or opposing agent ends it.</p>}
      </section>
      {hasAction(legalActions, "give_clue") ? <section className="mb-3 grid gap-2 rounded-2xl border border-amber-200/15 bg-amber-300/[.04] p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">One-word clue
          <input value={codenamesClueText} onChange={(event) => setCodenamesClueText(event.target.value)} maxLength={30} placeholder="e.g. Tropical" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-200/50" />
        </label>
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">Number
          <select value={codenamesClueNumber} onChange={(event) => setCodenamesClueNumber(Number(event.target.value))} className="h-11 rounded-xl border border-white/10 bg-[#111a24] px-3 text-sm font-black text-white outline-none focus:border-amber-200/50">{Array.from({ length: 10 }, (_, number) => <option key={number} value={number}>{number === 0 ? "0 · Unlimited" : number}</option>)}</select>
        </label>
        <button type="button" onClick={() => { onAction("give_clue", { clue: codenamesClueText.trim(), number: codenamesClueNumber }); setCodenamesClueText(""); }} disabled={!codenamesClueText.trim() || /\s/.test(codenamesClueText.trim()) || state.wordCards.some((card) => card.word.toLowerCase() === codenamesClueText.trim().toLowerCase())} className="min-h-11 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">Give clue</button>
      </section> : null}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">{state.wordCards.map((card, index) => {
        const role = card.revealedRole ?? (state.isCodenamesSpymaster ? card.keyRole : null);
        const cardStyle = role === "red" ? "border-rose-300/40 bg-rose-500/25 text-rose-100" : role === "blue" ? "border-sky-300/40 bg-sky-500/25 text-sky-100" : role === "assassin" ? "border-black bg-black text-white" : role === "neutral" ? "border-amber-100/20 bg-[#d8d1bc] text-[#343124]" : "border-amber-100/25 bg-gradient-to-br from-[#f6e8c3] to-[#d7c59d] text-[#463d2a] hover:from-white hover:to-[#ead8af]";
        return <button key={card.word} type="button" aria-label={`Codenames word ${card.word}${card.revealed ? `, revealed ${card.revealedRole}` : ""}`} onClick={() => onAction("reveal_word", { index })} disabled={!isMyTurn || state.isCodenamesSpymaster || !state.codenamesClue || card.revealed || !hasAction(legalActions, "reveal_word", (action) => action.index === index)} className={`flex aspect-[1.3/1] flex-col items-center justify-center rounded-xl border px-1 text-center font-black shadow-[0_4px_14px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 disabled:cursor-default ${cardStyle}`}><span className="text-[clamp(.55rem,1.3vw,.9rem)] tracking-wide sm:text-sm">{card.word}</span>{card.revealed && card.revealedRole ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-70">{card.revealedRole === "assassin" ? "☠ assassin" : card.revealedRole}</span> : state.isCodenamesSpymaster && role ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-60">{role === "assassin" ? "☠ assassin" : role}</span> : null}</button>;
      })}</div>
      {hasAction(legalActions, "end_codenames_turn") ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"><p className="mr-auto text-xs text-white/45">You can pass once you are satisfied with your guesses.</p><button type="button" onClick={() => onAction("end_codenames_turn")} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black text-white/80 hover:bg-white/5">End guessing turn</button></div> : null}
      <p className="mt-3 text-[10px] leading-relaxed text-white/30">Rules: 4–10 players, alternating teams by seat. A clue number N permits up to N+1 guesses; 0 allows continuing until a wrong card is revealed. A neutral or opposing agent passes the turn, an assassin loses immediately, and revealing every agent on a team's key wins the match. The spymaster key stays private.</p>
    </div>;
  }

''',
        "replace prototype word-reveal grid with clue and operative workflow")

    # Sidebar makes the designated spymaster clear to everyone without leaking the key.
    src = replace_once(src,
        '{player.team === "red" ? "🔴 Red" : "🔵 Blue"}</strong> : null}',
        '{player.team === "red" ? "🔴 Red" : "🔵 Blue"}{player.isSpymaster ? " · Spy" : ""}</strong> : null}',
        "label spymaster in the player list")
    return src.rstrip() + "\n"


def patch_tests(src: str) -> str:
    if MARKER in src:
        raise PatchError("V5 Codenames regression tests appear to be installed already.")
    old_hidden_test = r'''  it("does not leak the hidden Codenames key before cards are revealed", () => {
    const state = start(codenamesPrototypeModule);
    const view = codenamesPrototypeModule.getPublicState({ state, viewerId: "p1" }) as { wordCards: Array<{ revealedRole: string | null }> };
    expect(view.wordCards).toHaveLength(25);
    expect(view.wordCards.every((card) => card.revealedRole === null)).toBe(true);
  });'''
    new_hidden_test = r'''  it("does not leak the hidden Codenames key to an operative", () => {
    const operativePlayers: GamePlayer[] = [
      { userId: "p1", username: "p1", displayName: "Red Spy", seat: 0 },
      { userId: "p2", username: "p2", displayName: "Blue Spy", seat: 1 },
      { userId: "p3", username: "p3", displayName: "Red Operative", seat: 2 },
      { userId: "p4", username: "p4", displayName: "Blue Operative", seat: 3 }
    ];
    const state = codenamesPrototypeModule.createInitialState({ players: operativePlayers, settings: { turnSeconds: null } as never, seed: "hidden-key-test", now: "2026-10-25T00:00:00.000Z" }) as PrototypeGameState;
    const view = codenamesPrototypeModule.getPublicState({ state, viewerId: "p3" }) as { wordCards: Array<{ revealedRole: string | null; keyRole: string | null }> };
    expect(view.wordCards).toHaveLength(25);
    expect(view.wordCards.every((card) => card.revealedRole === null && card.keyRole === null)).toBe(true);
  });'''
    src = replace_once(src, old_hidden_test, new_hidden_test, "strengthen the original Codenames hidden-key regression")
    return src.rstrip() + r'''

// TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES

describe("Codenames team and clue rules v5", () => {
  const fourPlayers: GamePlayer[] = [
    { userId: "p1", username: "p1", displayName: "Red Spy", seat: 0 },
    { userId: "p2", username: "p2", displayName: "Blue Spy", seat: 1 },
    { userId: "p3", username: "p3", displayName: "Red Operative", seat: 2 },
    { userId: "p4", username: "p4", displayName: "Blue Operative", seat: 3 }
  ];
  const startTeamGame = () => codenamesPrototypeModule.createInitialState({
    players: fourPlayers,
    settings: { turnSeconds: null } as never,
    seed: "codenames-v5-regression",
    now: "2026-10-26T00:00:00.000Z"
  }) as PrototypeGameState;

  it("shows the full hidden key only to that team's spymaster", () => {
    const state = startTeamGame();
    const spy = codenamesPrototypeModule.getPublicState({ state, viewerId: "p1" }) as {
      isCodenamesSpymaster: boolean;
      wordCards: Array<{ revealedRole: string | null; keyRole: string | null }>;
    };
    const operative = codenamesPrototypeModule.getPublicState({ state, viewerId: "p3" }) as {
      isCodenamesSpymaster: boolean;
      wordCards: Array<{ revealedRole: string | null; keyRole: string | null }>;
    };
    expect(spy.isCodenamesSpymaster).toBe(true);
    expect(spy.wordCards.every((card) => card.keyRole !== null)).toBe(true);
    expect(spy.wordCards.every((card) => card.revealedRole === null)).toBe(true);
    expect(operative.isCodenamesSpymaster).toBe(false);
    expect(operative.wordCards.every((card) => card.keyRole === null && card.revealedRole === null)).toBe(true);
  });

  it("accepts one-word clues from the active spymaster and moves to an operative", () => {
    const state = startTeamGame();
    const clue = { type: "give_clue" as const, clue: "Tropical", number: 2 };
    expect(codenamesPrototypeModule.validateAction({ state, playerId: "p1", action: clue }).ok).toBe(true);
    expect(codenamesPrototypeModule.validateAction({ state, playerId: "p3", action: clue }).ok).toBe(false);
    const result = codenamesPrototypeModule.applyAction({ state, playerId: "p1", action: clue, now: "2026-10-26T00:01:00.000Z" });
    const next = result.state as PrototypeGameState;
    expect(next.currentPlayerId).toBe("p3");
    expect(next.codenamesClue).toBe("Tropical");
    expect(next.codenamesClueNumber).toBe(2);
    expect(next.codenamesGuessesRemaining).toBe(3);
  });

  it("rejects a clue that repeats a visible grid word", () => {
    const state = startTeamGame();
    const boardWord = state.wordCards[0]!.word.toLowerCase();
    expect(codenamesPrototypeModule.validateAction({ state, playerId: "p1", action: { type: "give_clue", clue: boardWord, number: 1 } }).ok).toBe(false);
  });

  it("allows a correct guess to continue until the clue budget is consumed", () => {
    const initial = startTeamGame();
    const afterClue = codenamesPrototypeModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 1 }, now: "2026-10-26T00:01:00.000Z" }).state as PrototypeGameState;
    const correctIndex = afterClue.wordCards.findIndex((card) => card.role === "red");
    const afterGuess = codenamesPrototypeModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: correctIndex }, now: "2026-10-26T00:02:00.000Z" }).state as PrototypeGameState;
    expect(afterGuess.phase).toBe("playing");
    expect(afterGuess.codenamesGuessesRemaining).toBe(1);
    expect(afterGuess.currentPlayerId).toBe("p3");
  });

  it("awards the completed match to every player on the winning team", () => {
    const state = startTeamGame();
    state.phase = "finished";
    state.winnerUserId = "p2";
    const results = codenamesPrototypeModule.getResults(state);
    expect(results.scoreByUserId).toEqual({ p2: 1, p4: 1, p1: 0, p3: 0 });
    expect(results.placements.filter((placement) => placement.result === "WIN").map((placement) => placement.userId).sort()).toEqual(["p2", "p4"]);
  });

  it("ends immediately when an operative reveals the assassin", () => {
    const initial = startTeamGame();
    const afterClue = codenamesPrototypeModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 1 }, now: "2026-10-26T00:01:00.000Z" }).state as PrototypeGameState;
    const assassinIndex = afterClue.wordCards.findIndex((card) => card.role === "assassin");
    const afterGuess = codenamesPrototypeModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: assassinIndex }, now: "2026-10-26T00:02:00.000Z" }).state as PrototypeGameState;
    expect(afterGuess.phase).toBe("finished");
    expect(afterGuess.winnerUserId).toBe("p2");
  });

  it("passes the turn after a neutral guess and resets the clue phase", () => {
    const initial = startTeamGame();
    const afterClue = codenamesPrototypeModule.applyAction({ state: initial, playerId: "p1", action: { type: "give_clue", clue: "Tropical", number: 2 }, now: "2026-10-26T00:01:00.000Z" }).state as PrototypeGameState;
    const neutralIndex = afterClue.wordCards.findIndex((card) => card.role === "neutral");
    const afterGuess = codenamesPrototypeModule.applyAction({ state: afterClue, playerId: "p3", action: { type: "reveal_word", index: neutralIndex }, now: "2026-10-26T00:02:00.000Z" }).state as PrototypeGameState;
    expect(afterGuess.phase).toBe("playing");
    expect(afterGuess.codenamesRoundTeam).toBe("blue");
    expect(afterGuess.currentPlayerId).toBe("p2");
    expect(afterGuess.codenamesClue).toBeNull();
    expect(afterGuess.codenamesGuessesRemaining).toBe(0);
  });
});
'''


def build_edits(root: Path) -> dict[str, str]:
    if not (root / ".git").exists() or not (root / "package.json").is_file():
        raise PatchError("Run from the Tabletop_Games repository root.")
    branch = V4.V3.run_git(root, "branch", "--show-current").stdout.strip()
    if branch != EXPECTED_BRANCH:
        raise PatchError(f"Expected branch {EXPECTED_BRANCH}, found {branch or '<detached HEAD>'}; no files changed.")
    if V4.V3.run_git(root, "merge-base", "--is-ancestor", BASE_COMMIT, "HEAD", check=False).returncode:
        raise PatchError(f"Base commit {BASE_COMMIT[:12]} is not an ancestor of HEAD; no files changed.")

    engine_path = "packages/game-core/src/games/prototype-board-games.ts"
    ui_path = "apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx"
    tests_path = "packages/game-core/src/__tests__/prototype-board-games.test.ts"
    v4_engine = (root / engine_path).read_text(encoding="utf-8")
    v4_ui = (root / ui_path).read_text(encoding="utf-8")
    v4_tests = (root / tests_path).read_text(encoding="utf-8")
    # Support either a V2-only checkout (compose V3/V4 first) or a checkout where
    # V4 has already been applied. A partial V4 install is rejected, never guessed.
    v4_markers = [V4.MARKER in v4_engine, V4.MARKER in v4_ui, V4.MARKER in v4_tests]
    if all(v4_markers):
        edits = {engine_path: v4_engine, ui_path: v4_ui, tests_path: v4_tests}
    elif any(v4_markers):
        raise PatchError("V4 markers appear in only part of the engine/UI/tests; restore or finish V4 before applying V5. No files changed.")
    else:
        # V4 runs its own source guards, composes V2+V3+V4 in memory, and returns
        # the whole patch map. V5 layers on top without writing partial transformations.
        edits = V4.build_edits(root)
    edits[engine_path] = patch_engine(edits[engine_path])
    edits[ui_path] = patch_ui(edits[ui_path])
    edits[tests_path] = patch_tests(edits[tests_path])

    engine = edits[engine_path]
    ui = edits[ui_path]
    tests = edits[tests_path]
    for marker, source, label in [
        ("INVALID_CLUE", engine, "server clue validation"),
        ("codenamesSpymasterByTeam", engine, "private spymaster assignment"),
        ("keyRole: state.codenamesSpymasterByTeam", engine, "hidden key visibility"),
        ("Give clue", ui, "clue entry UI"),
        ("end_codenames_turn", ui, "pass-turn UI"),
        ("Codenames team and clue rules v5", tests, "Codenames regression tests")
    ]:
        if marker not in source:
            raise PatchError(f"Composite patch verification failed: missing {label}; no files changed.")
    return edits


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate the full composite V2+V3+V4+V5 patch without writing files.")
    args = parser.parse_args()
    root = Path.cwd().resolve()
    try:
        edits = build_edits(root)
        print(f"Validated composite V2+V3+V4+V5 patch ({len(edits)} files) for {EXPECTED_BRANCH} at base {BASE_COMMIT[:12]}:")
        for rel, content in sorted(edits.items()):
            print(f"  UPDATE {rel} ({len(content.encode('utf-8')):,} bytes)")
        if args.dry_run:
            print("DRY RUN OK. No files changed.")
            return 0
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = root / ".tmp" / f"pc-first-full-patch-v5-backup-{stamp}"
        for rel in edits:
            dest = backup / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if (root / rel).exists():
                shutil.copy2(root / rel, dest)
        for rel, content in edits.items():
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8", newline="\n")
        print(f"\nPatch applied. Original files are backed up at {backup.relative_to(root)}")
        print("Run the bundled validation commands next; TypeScript and browser tests must pass before LAN play.")
        return 0
    except (PatchError, OSError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}\nNo files changed.", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
