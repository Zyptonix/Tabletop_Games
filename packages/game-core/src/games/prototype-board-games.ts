// TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES
/* TABLETOP ARENA FULL PATCH V4 */
/* TABLETOP GAME ENGINE CONTINUATION V3 */
/* TABLETOP GAME ENGINE HARDENING V2 */
import { z } from "zod";
import type { GameModule } from "../engine/GameModule";
import type { GameEvent, GamePlayer, GameResults, GameTurnInfo, ValidationResult } from "../engine/GameTypes";
import type { GameId } from "@tabletop/shared";

/**
 * Early-access engines for the requested tabletop games.
 * These provide real room integration, server-side action validation, turn
 * state, events, and playable first-pass mechanics. Every game deliberately
 * advertises its prototype status in the client until its full rulebook lands.
 */
export type PrototypeGameId =
  | "chess"
  | "battleship"
  | "ludo"
  | "barricades"
  | "monopoly"
  | "risk"
  | "world-conquest"
  | "codenames"
  | "poker";

type PokerStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
type Team = "red" | "blue" | "neutral" | "assassin";

export interface PrototypeSettings {
  turnSeconds: number | null;
}

export type PrototypeAction =
  | { type: "move_piece"; from: number; to: number;promotion?: "q" | "r" | "b" | "n" | undefined; }
  | { type: "claim_chess_draw" }
  | { type: "fire"; x: number; y: number }
  | { type: "roll_dice" }
  | { type: "move_token"; tokenIndex: number }
  | { type: "move_pawn"; x: number; y: number }
  | { type: "place_wall"; x: number; y: number; orientation: "h" | "v" }
  | { type: "buy_property" }
  | { type: "end_turn" }
  | { type: "claim_territory"; territoryId: string }
  | { type: "reinforce_territory"; territoryId: string }
  | { type: "attack_territory"; fromId: string; toId: string }
  | { type: "reveal_word"; index: number }
  | { type: "give_clue"; clue: string; number: number }
  | { type: "end_codenames_turn" }
  | { type: "poker_action"; choice: "fold" | "check" | "call" | "raise" | "all_in" };

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  playerId: string | null;
  createdAt: string;
}
interface Wall { x: number; y: number; orientation: "h" | "v"; playerId: string }
interface Shot { shooterId: string; targetId: string; x: number; y: number; hit: boolean; sunk: boolean }
interface Territory { id: string; label: string; x: number; y: number; neighbors: string[] }
interface WordCard { word: string; role: Team; revealed: boolean }

export interface PrototypeGameState {
  gameId: PrototypeGameId;
  version: string;
  settings: PrototypeSettings;
  phase: "playing" | "finished";
  players: GamePlayer[];
  currentPlayerId: string | null;
  winnerUserId: string | null;
  chessCastlingRights: string;
  chessEnPassantTarget: number | null;
  chessHalfmoveClock: number;
  chessPositionHistory: string[];
  turnNumber: number;
  actionNumber: number;
  startedAt: string;
  updatedAt: string;
  turnStartedAt: string;
  activityLog: ActivityItem[];
  rngState: number;
  board: Array<Array<string | null>>;
  pawns: Record<string, { x: number; y: number }>;
  walls: Wall[];
  wallsRemaining: Record<string, number>;
  ludoTokens: Record<string, number[]>;
  ludoConsecutiveSixes: Record<string, number>;
  diceRoll: number | null;
  hasRolled: boolean;
  money: Record<string, number>;
  positions: Record<string, number>;
  properties: Array<{ id: string; label: string; cost: number; rent: number; ownerId: string | null }>;
  territories: Territory[];
  territoryOwners: Record<string, string | null>;
  territoryTroops: Record<string, number>;
  reinforcedThisTurn: boolean;
  shipCellsByPlayer: Record<string, string[]>;
  shipGroupsByPlayer: Record<string, string[][]>;
  shots: Shot[];
  wordCards: WordCard[];
  codenamesTeamByPlayer: Record<string, "red" | "blue">;
  codenamesSpymasterByTeam: Record<"red" | "blue", string>;
  codenamesRoundTeam: "red" | "blue";
  codenamesClue: string | null;
  codenamesClueNumber: number | null;
  codenamesGuessesRemaining: number;
  pokerCardsByPlayer: Record<string, string[]>;
  pokerDeck: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerActed: string[];
  pokerBetToCall: number;
  pokerPot: number;
  pokerContributions: Record<string, number>;
  pokerButtonSeat: number;
  pokerHandNumber: number;
  pokerStreet: PokerStreet;
  pokerLastAction: string;
}

export interface PublicPrototypeGameState {
  gameId: PrototypeGameId;
  phase: "playing" | "finished";
  players: Array<{
    userId: string;
    displayName: string;
    seat: number;
    isBot: boolean;
    isCurrentTurn: boolean;
    money: number | null;
    position: number | null;
    tokens: number[] | null;
    stack: number | null;
    folded: boolean;
    bet: number;
    team: "red" | "blue" | null;
    isSpymaster: boolean;
  }>;
  currentPlayerId: string | null;
  winnerUserId: string | null;
  turnNumber: number;
  actionNumber: number;
  updatedAt: string;
  board: Array<Array<string | null>>;
  pawns: Record<string, { x: number; y: number }>;
  walls: Wall[];
  wallsRemaining: Record<string, number>;
  ludoTokens: Record<string, number[]>;
  diceRoll: number | null;
  hasRolled: boolean;
  money: Record<string, number>;
  positions: Record<string, number>;
  properties: Array<{ id: string; label: string; cost: number; rent: number; ownerId: string | null }>;
  territories: Territory[];
  territoryOwners: Record<string, string | null>;
  territoryTroops: Record<string, number>;
  reinforcedThisTurn: boolean;
  ownShipCells: string[];
  shots: Shot[];
  wordCards: Array<{ word: string; revealed: boolean; revealedRole: Team | null; keyRole: Team | null }>;
  isCodenamesSpymaster: boolean;
  codenamesCurrentTeam: "red" | "blue";
  codenamesClue: string | null;
  codenamesClueNumber: number | null;
  codenamesGuessesRemaining: number;
  myPokerCards: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerBetToCall: number;
  pokerPot: number;
  pokerStreet: PokerStreet;
  pokerButtonSeat: number;
  pokerHandNumber: number;
  pokerLastAction: string;
  activityLog: ActivityItem[];
  prototypeNotice: string;
}

const settingsSchema = z.object({ turnSeconds: z.number().int().min(0).max(600).nullable().default(null) });
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("move_piece"), from: z.number().int().min(0).max(63), to: z.number().int().min(0).max(63), promotion: z.enum(["q", "r", "b", "n"]).optional() }),
  z.object({ type: z.literal("claim_chess_draw") }),
  z.object({ type: z.literal("fire"), x: z.number().int().min(0).max(9), y: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal("roll_dice") }),
  z.object({ type: z.literal("move_token"), tokenIndex: z.number().int().min(0).max(3) }),
  z.object({ type: z.literal("move_pawn"), x: z.number().int().min(0).max(8), y: z.number().int().min(0).max(8) }),
  z.object({ type: z.literal("place_wall"), x: z.number().int().min(0).max(7), y: z.number().int().min(0).max(7), orientation: z.enum(["h", "v"]) }),
  z.object({ type: z.literal("buy_property") }),
  z.object({ type: z.literal("end_turn") }),
  z.object({ type: z.literal("claim_territory"), territoryId: z.string().min(1).max(40) }),
  z.object({ type: z.literal("reinforce_territory"), territoryId: z.string().min(1).max(40) }),
  z.object({ type: z.literal("attack_territory"), fromId: z.string().min(1).max(40), toId: z.string().min(1).max(40) }),
  z.object({ type: z.literal("reveal_word"), index: z.number().int().min(0).max(24) }),
  z.object({ type: z.literal("give_clue"), clue: z.string().trim().min(1).max(30), number: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal("end_codenames_turn") }),
  z.object({ type: z.literal("poker_action"), choice: z.enum(["fold", "check", "call", "raise", "all_in"]) })
]);

const DEFAULT_SETTINGS: PrototypeSettings = { turnSeconds: null };
const SPECS: Record<PrototypeGameId, { title: string; min: number; max: number; notice: string }> = {
  chess: { title: "Chess", min: 2, max: 2, notice: "Legal moves, check/checkmate, castling, en passant, selectable promotion, repetition and move-count draw rules are enforced by the server." },
  battleship: { title: "Battleships", min: 2, max: 2, notice: "Early access · alternating target shots, hits and fleet elimination work. Fleet placement and all ship-sinking details are coming next." },
  ludo: { title: "Ludo", min: 2, max: 4, notice: "Early access · dice, four tokens per player and a shared progress track work. Exact safe squares, captures and home lanes are in progress." },
  barricades: { title: "Barricades", min: 2, max: 4, notice: "Early access · pawn moves, wall placement and reaching the opposite edge work. Full path-preservation checks and 4-player balance are in progress." },
  monopoly: { title: "Property Tycoon", min: 2, max: 6, notice: "Early access · dice movement, buying properties, rent and passing Start are implemented. Auctions, jail, mortgages, trades and bankruptcy rules are next." },
  risk: { title: "Risk", min: 2, max: 6, notice: "Early access · territory claims, reinforcements and simplified dice attacks work on a compact map. Full Risk setup, cards and battle dice are in progress." },
  "world-conquest": { title: "World Conquest", min: 2, max: 10, notice: "Early access · a larger original territory map supports claims, reinforcements and simplified attacks. Full strategic phases and balance are in progress." },
  codenames: { title: "Codenames", min: 4, max: 10, notice: "Team Codenames · spymaster-only key, clue numbers, operative guesses, turn passing and assassin/team victory are enforced. Standard team play requires 4–10 players." },
  poker: { title: "Poker · Texas Hold'em", min: 2, max: 6, notice: "Server-side Hold’em hand ranking, all-in side pots, split pots and rotating multi-hand tournament sessions are implemented. The configured table uses fixed $10/$20 blinds and fixed $20 raises." }
};

function hashSeed(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) value = Math.imul(value ^ seed.charCodeAt(index), 16777619);
  return value >>> 0 || 1;
}
function random(state: PrototypeGameState, max: number): number {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return Math.floor((state.rngState / 0x1_0000_0000) * max);
}
function shuffle<T>(items: T[], rngState: number): { items: T[]; rngState: number } {
  const result = items.slice();
  let state = rngState >>> 0 || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((state / 0x1_0000_0000) * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return { items: result, rngState: state };
}
function makeActivity(state: PrototypeGameState, type: string, message: string, playerId: string | null, now: string): ActivityItem {
  return { id: `proto-${state.gameId}-${state.actionNumber}-${state.activityLog.length}`, type, message, playerId, createdAt: now };
}
function nextPlayerId(state: PrototypeGameState, fromId: string | null = state.currentPlayerId): string | null {
  if (!state.players.length) return null;
  const index = state.players.findIndex((player) => player.userId === fromId);
  return state.players[(index + 1 + state.players.length) % state.players.length]?.userId ?? state.players[0]?.userId ?? null;
}
function nextPlayerOnTeam(state: PrototypeGameState, team: "red" | "blue"): string | null {
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
}
function scoreForPlayer(state: PrototypeGameState, player: GamePlayer): number {
  const userId = player.userId;
  if (state.gameId === "chess") return userId === state.winnerUserId ? 1 : 0;
  if (state.gameId === "battleship") {
    const hits = state.shots.filter((shot) => shot.shooterId === userId && shot.hit).length;
    const received = state.shots.filter((shot) => shot.targetId === userId && shot.hit).length;
    return hits * 100 - received * 25;
  }
  if (state.gameId === "ludo") return (state.ludoTokens[userId] ?? []).reduce((sum, progress) => sum + (progress >= 57 ? 100 : Math.max(0, progress)), 0);
  if (state.gameId === "barricades") {
    const position = state.pawns[userId];
    if (!position) return 0;
    const index = state.players.findIndex((candidate) => candidate.userId === userId);
    const distance = state.players.length <= 2 || index < 2 ? (index % 2 === 0 ? 8 - position.y : position.y) : (index === 2 ? 8 - position.x : position.x);
    return 100 - distance;
  }
  if (state.gameId === "monopoly") {
    const propertyValue = state.properties.filter((property) => property.ownerId === userId).reduce((sum, property) => sum + property.cost, 0);
    return (state.money[userId] ?? 0) + propertyValue;
  }
  if (state.gameId === "risk" || state.gameId === "world-conquest") {
    const owned = state.territories.filter((territory) => state.territoryOwners[territory.id] === userId);
    return owned.length * 100 + owned.reduce((sum, territory) => sum + (state.territoryTroops[territory.id] ?? 0), 0);
  }
  if (state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[userId] ?? "neutral";
    return state.wordCards.filter((card) => card.revealed && card.role === team).length;
  }
  if (state.gameId === "poker") return (state.pokerStacks[userId] ?? 0) - 1000;
  return userId === state.winnerUserId ? 1 : 0;
}

function makeResults(state: PrototypeGameState): GameResults {
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
}
function finish(state: PrototypeGameState, winnerId: string | null, now: string): void {
  state.phase = "finished";
  state.winnerUserId = winnerId;
  state.currentPlayerId = null;
  state.updatedAt = now;
  state.turnStartedAt = now;
}
function coordsKey(x: number, y: number): string { return `${x},${y}`; }
function playerOwnsChessPiece(state: PrototypeGameState, playerId: string, piece: string | null): boolean {
  const player = state.players.find((item) => item.userId === playerId);
  return Boolean(player && piece && (player.seat % 2 === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase()));
}
function chessPseudoMoves(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  const output: PrototypeAction[] = [];
  const player = state.players.find((candidate) => candidate.userId === playerId);
  if (!player) return output;
  const board = state.board;
  const isWhite = player.seat % 2 === 0;
  const own = (piece: string | null) => playerOwnsChessPiece(state, playerId, piece);
  const push = (from: number, to: number) => {
    const row = Math.floor(to / 8);
    const piece = board[Math.floor(from / 8)]?.[from % 8] ?? null;
    if (piece?.toLowerCase() === "p" && (row === 0 || row === 7)) {
      for (const promotion of ["q", "r", "b", "n"] as const) output.push({ type: "move_piece", from, to, promotion });
    } else output.push({ type: "move_piece", from, to });
  };
  const directions: Record<string, Array<[number, number]>> = {
    n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    b: [[-1,-1],[-1,1],[1,-1],[1,1]],
    r: [[-1,0],[0,-1],[0,1],[1,0]]
  };
  for (let from = 0; from < 64; from += 1) {
    const fr = Math.floor(from / 8), fc = from % 8;
    const piece = board[fr]?.[fc] ?? null;
    if (!own(piece)) continue;
    const kind = piece!.toLowerCase();
    const tryMove = (r: number, c: number): boolean => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r]?.[c] ?? null;
      if (target && (own(target) || target.toLowerCase() === "k")) return false;
      push(from, r * 8 + c);
      return !target;
    };
    if (kind === "p") {
      const dir = isWhite ? -1 : 1;
      const one = fr + dir;
      if (one >= 0 && one <= 7 && !board[one]?.[fc]) {
        push(from, one * 8 + fc);
        const startRow = isWhite ? 6 : 1;
        const two = fr + dir * 2;
        if (fr === startRow && !board[two]?.[fc]) push(from, two * 8 + fc);
      }
      for (const dc of [-1, 1]) {
        const r = fr + dir, c = fc + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const target = board[r]?.[c] ?? null;
        const to = r * 8 + c;
        if (target && !own(target) && target.toLowerCase() !== "k") push(from, to);
        else if (!target && state.chessEnPassantTarget === to) {
          const passedPawn = board[fr]?.[c] ?? null;
          if (passedPawn?.toLowerCase() === "p" && !own(passedPawn)) push(from, to);
        }
      }
      continue;
    }
    const dirs = kind === "q" ? [...directions.b!, ...directions.r!] : directions[kind];
    if (!dirs) continue;
    const slides = ["b", "r", "q"].includes(kind);
    for (const [dr, dc] of dirs) {
      for (let step = 1; step <= (slides ? 7 : 1); step += 1) {
        if (!tryMove(fr + dr * step, fc + dc * step)) break;
      }
    }
    if (kind === "k") {
      const homeRow = isWhite ? 7 : 0;
      const home = homeRow * 8 + 4;
      const enemy = state.players.find((candidate) => candidate.userId !== playerId);
      const rights = state.chessCastlingRights ?? "KQkq";
      const kingSide = isWhite ? "K" : "k";
      const queenSide = isWhite ? "Q" : "q";
      const rook = isWhite ? "R" : "r";
      if (from === home && enemy && !chessKingInCheck(state, playerId)) {
        if (rights.includes(kingSide) && board[homeRow]?.[7] === rook && !board[homeRow]?.[5] && !board[homeRow]?.[6]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 5) && !chessSquareAttacked(state, enemy.userId, homeRow, 6)) {
          output.push({ type: "move_piece", from, to: home + 2 });
        }
        if (rights.includes(queenSide) && board[homeRow]?.[0] === rook && !board[homeRow]?.[1] && !board[homeRow]?.[2] && !board[homeRow]?.[3]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 3) && !chessSquareAttacked(state, enemy.userId, homeRow, 2)) {
          output.push({ type: "move_piece", from, to: home - 2 });
        }
      }
    }
  }
  return output;
}

const BATTLESHIP_LENGTHS = [5, 4, 3, 3, 2];
function fleetForSeat(seat: number, seed: number): { cells: string[]; ships: string[][]; rngState: number } {
  // Seeded, independently generated ship placements. The exact fleet stays private
  // in the server state; clients receive only their own cells and public shot history.
  let localRng = (seed ^ Math.imul(seat + 1, 0x9e3779b1)) >>> 0 || 1;
  const occupied = new Set<string>();
  const ships: string[][] = [];
  const nextInt = (max: number) => {
    localRng = (Math.imul(localRng, 1664525) + 1013904223) >>> 0;
    return Math.floor((localRng / 0x1_0000_0000) * max);
  };
  const canPlace = (x: number, y: number, length: number, horizontal: boolean) => {
    const cells: string[] = [];
    for (let step = 0; step < length; step += 1) {
      const cellX = x + (horizontal ? step : 0);
      const cellY = y + (horizontal ? 0 : step);
      if (cellX < 0 || cellX >= 10 || cellY < 0 || cellY >= 10) return null;
      const key = coordsKey(cellX, cellY);
      if (occupied.has(key)) return null;
      cells.push(key);
    }
    return cells;
  };
  for (const length of BATTLESHIP_LENGTHS) {
    let placed: string[] | null = null;
    for (let attempt = 0; attempt < 500 && !placed; attempt += 1) {
      placed = canPlace(nextInt(10), nextInt(10), length, nextInt(2) === 0);
    }
    if (!placed) {
      // Deterministic exhaustive fallback, so a seeded board never depends on a retry luck.
      for (let y = 0; y < 10 && !placed; y += 1) {
        for (let x = 0; x < 10 && !placed; x += 1) {
          for (const horizontal of [true, false]) {
            placed = canPlace(x, y, length, horizontal);
            if (placed) break;
          }
        }
      }
    }
    if (!placed) throw new Error("Could not generate a valid Battleships fleet.");
    ships.push(placed);
    placed.forEach((cell) => occupied.add(cell));
  }
  return { cells: ships.flat(), ships, rngState: localRng };
}

const PROPERTY_NAMES = ["Start", "Old Kent Road", "Community Chest", "Whitechapel Road", "Income Tax", "King's Cross", "The Angel Islington", "Chance", "Euston Road", "Pentonville Road", "Jail / Just Visiting", "Pall Mall", "Electric Company", "Whitehall", "Northumberland Avenue", "Marylebone Station", "Bow Street", "Community Chest", "Marlborough Street", "Vine Street", "Free Parking", "Strand", "Chance", "Fleet Street", "Trafalgar Square", "Fenchurch Street", "Leicester Square", "Coventry Street", "Water Works", "Piccadilly", "Go To Jail", "Regent Street", "Oxford Street", "Community Chest", "Bond Street", "Liverpool Street Station", "Chance", "Park Lane", "Luxury Tax", "Mayfair"];
const PROPERTY_COSTS: Record<number, number> = { 1: 60, 3: 60, 5: 200, 6: 100, 8: 100, 9: 120, 11: 140, 12: 150, 13: 140, 14: 160, 15: 200, 16: 180, 18: 180, 19: 200, 21: 220, 23: 220, 24: 240, 25: 200, 26: 260, 27: 260, 28: 150, 29: 280, 31: 300, 32: 300, 34: 320, 35: 200, 37: 350, 39: 400 };
function makeProperties(): PrototypeGameState["properties"] {
  return PROPERTY_NAMES.map((label, index) => {
    const cost = PROPERTY_COSTS[index] ?? 0;
    return { id: `property-${index}`, label, cost, rent: cost ? Math.max(10, Math.round(cost * 0.12)) : 0, ownerId: null };
  });
}
const RISK_TERRITORIES: Territory[] = [
  { id: "alaska", label: "Alaska", x: 0, y: 0, neighbors: ["kamchatka", "alberta", "northwest"] },
  { id: "northwest", label: "Northwest", x: 1, y: 0, neighbors: ["alaska", "alberta", "greenland", "ontario"] },
  { id: "greenland", label: "Greenland", x: 3, y: 0, neighbors: ["northwest", "ontario", "quebec", "iceland"] },
  { id: "alberta", label: "Alberta", x: 1, y: 1, neighbors: ["alaska", "northwest", "ontario", "western-us"] },
  { id: "ontario", label: "Ontario", x: 2, y: 1, neighbors: ["northwest", "greenland", "alberta", "quebec", "western-us", "eastern-us"] },
  { id: "quebec", label: "Quebec", x: 3, y: 1, neighbors: ["greenland", "ontario", "eastern-us"] },
  { id: "western-us", label: "Western US", x: 1, y: 2, neighbors: ["alberta", "ontario", "eastern-us", "central-america"] },
  { id: "eastern-us", label: "Eastern US", x: 2, y: 2, neighbors: ["ontario", "quebec", "western-us", "central-america"] },
  { id: "central-america", label: "Central America", x: 1, y: 3, neighbors: ["western-us", "eastern-us", "venezuela"] },
  { id: "venezuela", label: "Venezuela", x: 2, y: 4, neighbors: ["central-america", "peru", "brazil"] },
  { id: "peru", label: "Peru", x: 2, y: 5, neighbors: ["venezuela", "brazil", "argentina"] },
  { id: "brazil", label: "Brazil", x: 3, y: 5, neighbors: ["venezuela", "peru", "argentina", "north-africa"] },
  { id: "argentina", label: "Argentina", x: 2, y: 6, neighbors: ["peru", "brazil"] },
  { id: "iceland", label: "Iceland", x: 4, y: 1, neighbors: ["greenland", "great-britain", "scandinavia"] },
  { id: "great-britain", label: "Great Britain", x: 4, y: 2, neighbors: ["iceland", "scandinavia", "western-europe", "northern-europe"] },
  { id: "scandinavia", label: "Scandinavia", x: 5, y: 1, neighbors: ["iceland", "great-britain", "northern-europe", "russia"] },
  { id: "western-europe", label: "Western Europe", x: 4, y: 3, neighbors: ["great-britain", "northern-europe", "southern-europe", "north-africa"] },
  { id: "northern-europe", label: "Northern Europe", x: 5, y: 3, neighbors: ["great-britain", "scandinavia", "western-europe", "southern-europe", "russia"] },
  { id: "southern-europe", label: "Southern Europe", x: 5, y: 4, neighbors: ["western-europe", "northern-europe", "russia", "middle-east", "egypt", "north-africa"] },
  { id: "north-africa", label: "North Africa", x: 4, y: 5, neighbors: ["brazil", "western-europe", "southern-europe", "egypt", "east-africa", "congo"] },
  { id: "egypt", label: "Egypt", x: 5, y: 5, neighbors: ["southern-europe", "north-africa", "east-africa", "middle-east"] },
  { id: "east-africa", label: "East Africa", x: 6, y: 5, neighbors: ["north-africa", "egypt", "congo", "south-africa", "madagascar", "middle-east"] },
  { id: "congo", label: "Congo", x: 5, y: 6, neighbors: ["north-africa", "east-africa", "south-africa"] },
  { id: "south-africa", label: "South Africa", x: 5, y: 7, neighbors: ["congo", "east-africa", "madagascar"] },
  { id: "madagascar", label: "Madagascar", x: 6, y: 7, neighbors: ["south-africa", "east-africa"] },
  { id: "russia", label: "Russia", x: 6, y: 2, neighbors: ["scandinavia", "northern-europe", "southern-europe", "middle-east", "afghanistan", "ural", "siberia", "china"] },
  { id: "ural", label: "Ural", x: 7, y: 2, neighbors: ["russia", "siberia", "afghanistan", "china"] },
  { id: "siberia", label: "Siberia", x: 8, y: 1, neighbors: ["russia", "ural", "yakutsk", "irkutsk", "mongolia", "china"] },
  { id: "yakutsk", label: "Yakutsk", x: 9, y: 0, neighbors: ["siberia", "irkutsk", "kamchatka"] },
  { id: "irkutsk", label: "Irkutsk", x: 9, y: 1, neighbors: ["siberia", "yakutsk", "mongolia", "kamchatka"] },
  { id: "kamchatka", label: "Kamchatka", x: 10, y: 0, neighbors: ["yakutsk", "irkutsk", "alaska", "japan", "mongolia"] },
  { id: "afghanistan", label: "Afghanistan", x: 7, y: 3, neighbors: ["russia", "ural", "middle-east", "india", "china"] },
  { id: "middle-east", label: "Middle East", x: 6, y: 4, neighbors: ["southern-europe", "egypt", "east-africa", "russia", "afghanistan", "india"] },
  { id: "india", label: "India", x: 7, y: 4, neighbors: ["middle-east", "afghanistan", "china", "siam"] },
  { id: "china", label: "China", x: 8, y: 4, neighbors: ["russia", "ural", "siberia", "afghanistan", "india", "siam", "mongolia"] },
  { id: "mongolia", label: "Mongolia", x: 9, y: 3, neighbors: ["siberia", "irkutsk", "kamchatka", "china", "japan"] },
  { id: "japan", label: "Japan", x: 10, y: 3, neighbors: ["kamchatka", "mongolia"] },
  { id: "siam", label: "Siam", x: 8, y: 5, neighbors: ["india", "china", "indonesia"] },
  { id: "indonesia", label: "Indonesia", x: 8, y: 6, neighbors: ["siam", "new-guinea", "western-australia"] },
  { id: "new-guinea", label: "New Guinea", x: 9, y: 6, neighbors: ["indonesia", "western-australia", "eastern-australia"] },
  { id: "western-australia", label: "Western Australia", x: 8, y: 7, neighbors: ["indonesia", "new-guinea", "eastern-australia"] },
  { id: "eastern-australia", label: "Eastern Australia", x: 9, y: 7, neighbors: ["new-guinea", "western-australia"] }
];
const WORLD_TERRITORIES: Territory[] = RISK_TERRITORIES.map((territory, index) => ({
  ...territory,
  id: `world-${territory.id}`,
  label: territory.label,
  x: territory.x + (index % 3 === 0 ? 0.2 : 0),
  neighbors: territory.neighbors.map((neighbor) => `world-${neighbor}`)
}));
const WORDS = ["ORBIT", "RIVER", "CROWN", "MANGO", "FALCON", "SHADOW", "TRAIN", "GLASS", "CLOUD", "ANCHOR", "PIANO", "FOREST", "COMET", "BRIDGE", "PAPER", "CASTLE", "PEPPER", "LASER", "TIGER", "CLOCK", "MOON", "SPRING", "PILOT", "BUTTON", "WHALE"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
function freshDeck(): string[] { return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`)); }

function createInitialState(params: { players: GamePlayer[]; settings: PrototypeSettings; seed: string; now: string }, gameId: PrototypeGameId): PrototypeGameState {
  let rngState = hashSeed(params.seed);
  const players = params.players.slice(0, SPECS[gameId].max);
  const firstId = players[0]?.userId ?? null;
  const state: PrototypeGameState = {
    gameId, version: "0.3.0-chess-rules", settings: params.settings, phase: "playing", players,
    currentPlayerId: firstId, winnerUserId: null, chessCastlingRights: "KQkq", chessEnPassantTarget: null, chessHalfmoveClock: 0, chessPositionHistory: [], turnNumber: 1, actionNumber: 0,
    startedAt: params.now, updatedAt: params.now, turnStartedAt: params.now, activityLog: [], rngState,
    board: Array.from({ length: gameId === "chess" ? 8 : gameId === "battleship" ? 10 : gameId === "barricades" ? 9 : 5 }, () => Array.from({ length: gameId === "chess" ? 8 : gameId === "battleship" ? 10 : gameId === "barricades" ? 9 : 5 }, () => null)),
    pawns: {}, walls: [], wallsRemaining: {}, ludoTokens: {}, ludoConsecutiveSixes: {}, diceRoll: null, hasRolled: false,
    money: {}, positions: {}, properties: makeProperties(), territories: gameId === "world-conquest" ? WORLD_TERRITORIES : RISK_TERRITORIES,
    territoryOwners: {}, territoryTroops: {}, reinforcedThisTurn: false,
    shipCellsByPlayer: {}, shipGroupsByPlayer: {}, shots: [], wordCards: [], codenamesTeamByPlayer: {}, codenamesSpymasterByTeam: { red: "", blue: "" }, codenamesRoundTeam: "red", codenamesClue: null, codenamesClueNumber: null, codenamesGuessesRemaining: 0,
    pokerCardsByPlayer: {}, pokerDeck: [], communityCards: [], pokerStacks: {}, pokerBets: {}, pokerContributions: {}, pokerButtonSeat: players[0]?.seat ?? 0, pokerHandNumber: 1, pokerFolded: [], pokerActed: [], pokerBetToCall: 0, pokerPot: 0, pokerStreet: "preflop", pokerLastAction: "Deal in",
  };
  const line = (s: string) => s.split("");
  if (gameId === "chess") {
    state.board = [line("rnbqkbnr"), line("pppppppp"), ...Array.from({ length: 4 }, () => Array<string | null>(8).fill(null)), line("PPPPPPPP"), line("RNBQKBNR")];
  }
  if (gameId === "battleship") {
    for (const player of players) {
      const fleet = fleetForSeat(player.seat, rngState);
      state.shipCellsByPlayer[player.userId] = fleet.cells;
      state.shipGroupsByPlayer[player.userId] = fleet.ships;
      rngState = fleet.rngState;
    }
    state.rngState = rngState;
  }
  if (gameId === "ludo") for (const player of players) state.ludoTokens[player.userId] = [-1, -1, -1, -1];
  if (gameId === "barricades") {
    players.forEach((player, index) => {
      const starts = players.length > 2 ? [{ x: 4, y: 0 }, { x: 4, y: 8 }, { x: 0, y: 4 }, { x: 8, y: 4 }] : [{ x: 4, y: 0 }, { x: 4, y: 8 }];
      state.pawns[player.userId] = starts[index] ?? { x: 4, y: 0 };
      state.wallsRemaining[player.userId] = players.length > 2 ? 5 : 10;
    });
  }
  if (gameId === "monopoly") {
    for (const player of players) { state.money[player.userId] = 1500; state.positions[player.userId] = 0; }
  }
  if (gameId === "risk" || gameId === "world-conquest") {
    for (const territory of state.territories) { state.territoryOwners[territory.id] = null; state.territoryTroops[territory.id] = 0; }
  }
  if (gameId === "codenames") {
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
  if (gameId === "poker") {
    const shuffled = shuffle(freshDeck(), rngState); rngState = shuffled.rngState;
    state.pokerDeck = shuffled.items;
    for (const player of players) {
      state.pokerCardsByPlayer[player.userId] = [state.pokerDeck.shift() ?? "A♠", state.pokerDeck.shift() ?? "K♣"];
      state.pokerStacks[player.userId] = 1000;
      state.pokerBets[player.userId] = 0;
    }
    // Seat zero is the dealer button. Heads-up: button posts the small blind
    // and acts first preflop; three-plus players post blinds in seats 1 and 2.
    state.pokerButtonSeat = players[0]?.seat ?? 0;
    const smallBlindIndex = players.length <= 2 ? 0 : 1;
    const bigBlindIndex = players.length <= 2 ? 1 : 2;
    for (const [blindIndex, playerIndex] of [[0, smallBlindIndex], [1, bigBlindIndex]] as const) {
      const player = players[playerIndex];
      if (!player) continue;
      const blind = blindIndex === 0 ? 10 : 20;
      const paid = Math.min(blind, state.pokerStacks[player.userId] ?? 0);
      state.pokerStacks[player.userId] = (state.pokerStacks[player.userId] ?? 0) - paid;
      state.pokerBets[player.userId] = paid;
      state.pokerContributions[player.userId] = paid;
      state.pokerPot += paid;
    }
    state.pokerBetToCall = Math.max(0, ...Object.values(state.pokerBets));
    state.pokerLastAction = "Small blind 10 · Big blind 20";
    const firstToActIndex = players.length <= 2 ? 0 : 3 % players.length;
    state.currentPlayerId = players[firstToActIndex]?.userId ?? null;
  }
  state.rngState = rngState;
  if (gameId === "chess") state.chessPositionHistory = [chessPositionKey(state)];
  state.activityLog.push(makeActivity(state, "game_started", `🟢 ${SPECS[gameId].title} table started.`, null, params.now));
  return state;
}

function currentPlayer(state: PrototypeGameState, playerId: string): boolean { return state.phase === "playing" && state.currentPlayerId === playerId; }
function hasShot(state: PrototypeGameState, shooterId: string, x: number, y: number): boolean { return state.shots.some((shot) => shot.shooterId === shooterId && shot.x === x && shot.y === y); }
function wallsBlockMove(state: PrototypeGameState, from: { x: number; y: number }, to: { x: number; y: number }, walls: Wall[] = state.walls): boolean {
  return walls.some((wall) => wall.orientation === "h"
    ? from.x === to.x && Math.min(from.y, to.y) === wall.y && to.x >= wall.x && to.x <= wall.x + 1
    : from.y === to.y && Math.min(from.x, to.x) === wall.x && to.y >= wall.y && to.y <= wall.y + 1);
}

function barricadesGoalReached(state: PrototypeGameState, playerId: string, position: { x: number; y: number }): boolean {
  const index = state.players.findIndex((player) => player.userId === playerId);
  if (index < 0) return false;
  if (state.players.length <= 2) return index % 2 === 0 ? position.y === 8 : position.y === 0;
  if (index === 0) return position.y === 8;
  if (index === 1) return position.y === 0;
  if (index === 2) return position.x === 8;
  if (index === 3) return position.x === 0;
  return false;
}

function barricadesCanReachGoal(state: PrototypeGameState, playerId: string, walls: Wall[]): boolean {
  const start = state.pawns[playerId];
  if (!start) return false;
  const queue: Array<{ x: number; y: number }> = [start];
  const seen = new Set<string>([coordsKey(start.x, start.y)]);
  const steps: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    if (barricadesGoalReached(state, playerId, current)) return true;
    for (const [dx, dy] of steps) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.x > 8 || next.y < 0 || next.y > 8) continue;
      const key = coordsKey(next.x, next.y);
      if (seen.has(key) || wallsBlockMove(state, current, next, walls)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

function barricadesWallsOverlap(left: Wall, right: Wall): boolean {
  if (left.orientation !== right.orientation) return left.x === right.x && left.y === right.y;
  if (left.orientation === "h") {
    return left.y === right.y && Math.max(left.x, right.x) < Math.min(left.x + 1, right.x + 1);
  }
  return left.x === right.x && Math.max(left.y, right.y) < Math.min(left.y + 1, right.y + 1);
}

function barricadesWallAllowed(state: PrototypeGameState, x: number, y: number, orientation: "h" | "v", playerId: string): boolean {
  if (x < 0 || x > 7 || y < 0 || y > 7 || (state.wallsRemaining[playerId] ?? 0) <= 0) return false;
  const candidate: Wall = { x, y, orientation, playerId };
  if (state.walls.some((wall) => barricadesWallsOverlap(wall, candidate))) return false;
  const proposedWalls = [...state.walls, candidate];
  return state.players.every((player) => barricadesCanReachGoal(state, player.userId, proposedWalls));
}

function barricadesPawnDestinations(state: PrototypeGameState, playerId: string): Array<{ x: number; y: number }> {
  const pawn = state.pawns[playerId];
  if (!pawn) return [];
  const steps: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const destinations: Array<{ x: number; y: number }> = [];
  const occupied = (position: { x: number; y: number }) => Object.entries(state.pawns).some(([otherId, location]) => otherId !== playerId && location.x === position.x && location.y === position.y);
  const inBounds = (position: { x: number; y: number }) => position.x >= 0 && position.x <= 8 && position.y >= 0 && position.y <= 8;
  for (const [dx, dy] of steps) {
    const adjacent = { x: pawn.x + dx, y: pawn.y + dy };
    if (!inBounds(adjacent) || wallsBlockMove(state, pawn, adjacent) ) continue;
    if (!occupied(adjacent)) {
      destinations.push(adjacent);
      continue;
    }
    const beyond = { x: adjacent.x + dx, y: adjacent.y + dy };
    if (inBounds(beyond) && !occupied(beyond) && !wallsBlockMove(state, adjacent, beyond)) {
      destinations.push(beyond);
      continue;
    }
    // If an opponent blocks a straight jump (board edge, a wall, or another pawn),
    // diagonal sidesteps around that opponent are legal only when the edge is open.
    const perpendicular: Array<[number, number]> = dx === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
    for (const [sideX, sideY] of perpendicular) {
      const diagonal = { x: adjacent.x + sideX, y: adjacent.y + sideY };
      if (inBounds(diagonal) && !occupied(diagonal) && !wallsBlockMove(state, adjacent, diagonal)) destinations.push(diagonal);
    }
  }
  return destinations.filter((position, index, all) => all.findIndex((item) => item.x === position.x && item.y === position.y) === index);
}

const LUDO_START_BY_SEAT = [0, 13, 26, 39] as const;
const LUDO_SAFE_TRACK_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
function ludoGlobalTrackPosition(player: GamePlayer, progress: number): number | null {
  if (progress < 0 || progress >= 52) return null;
  return ((LUDO_START_BY_SEAT[player.seat % 4] ?? 0) + progress) % 52;
}


// TABLETOP GAME LOGIC PHASE 1: legal king-safety filtering
function chessSquareAttacked(state: PrototypeGameState, byPlayerId: string, targetRow: number, targetColumn: number, board = state.board): boolean {
  const attacker = state.players.find((player) => player.userId === byPlayerId);
  if (!attacker) return false;
  const knightOffsets: Array<[number, number]> = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const kingOffsets: Array<[number, number]> = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const rayDirections: Array<[number, number]> = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const pawnDirection = attacker.seat % 2 === 0 ? -1 : 1;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (!piece || !playerOwnsChessPiece(state, byPlayerId, piece)) continue;
      const kind = piece.toLowerCase();
      const rowDelta = targetRow - row;
      const columnDelta = targetColumn - column;
      if (kind === "p") {
        if (rowDelta === pawnDirection && Math.abs(columnDelta) === 1) return true;
        continue;
      }
      if (kind === "n") {
        if (knightOffsets.some(([dr, dc]) => row + dr === targetRow && column + dc === targetColumn)) return true;
        continue;
      }
      if (kind === "k") {
        if (kingOffsets.some(([dr, dc]) => row + dr === targetRow && column + dc === targetColumn)) return true;
        continue;
      }
      const allowedRay = kind === "q"
        ? rayDirections
        : kind === "r"
          ? rayDirections.filter(([dr, dc]) => dr === 0 || dc === 0)
          : kind === "b"
            ? rayDirections.filter(([dr, dc]) => dr !== 0 && dc !== 0)
            : [];
      for (const [dr, dc] of allowedRay) {
        let r = row + dr;
        let c = column + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (r === targetRow && c === targetColumn) return true;
          if (board[r]?.[c]) break;
          r += dr;
          c += dc;
        }
      }
    }
  }
  return false;
}

function chessKingInCheck(state: PrototypeGameState, playerId: string, board = state.board): boolean {
  let kingRow = -1;
  let kingColumn = -1;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const piece = board[row]?.[column] ?? null;
      if (piece?.toLowerCase() === "k" && playerOwnsChessPiece(state, playerId, piece)) {
        kingRow = row;
        kingColumn = column;
        break;
      }
    }
    if (kingRow >= 0) break;
  }
  if (kingRow < 0) return true;
  const opponent = state.players.find((player) => player.userId !== playerId);
  return opponent ? chessSquareAttacked(state, opponent.userId, kingRow, kingColumn, board) : false;
}

function chessBoardAfterMove(state: PrototypeGameState, action: PrototypeAction): Array<Array<string | null>> | null {
  if (action.type !== "move_piece" || !Number.isInteger(action.from) || !Number.isInteger(action.to) || action.from < 0 || action.from >= 64 || action.to < 0 || action.to >= 64) return null;
  const board = state.board.map((row) => row.slice());
  const fromRow = Math.floor(action.from / 8), fromColumn = action.from % 8;
  const toRow = Math.floor(action.to / 8), toColumn = action.to % 8;
  const piece = board[fromRow]?.[fromColumn] ?? null;
  if (!piece || board[toRow]?.[toColumn]?.toLowerCase() === "k") return null;
  const target = board[toRow]?.[toColumn] ?? null;
  // En passant captures the pawn behind the empty destination square.
  if (piece.toLowerCase() === "p" && fromColumn !== toColumn && !target && state.chessEnPassantTarget === action.to) {
    board[fromRow]![toColumn] = null;
  }
  board[fromRow]![fromColumn] = null;
  board[toRow]![toColumn] = piece;
  // Castling moves the rook as part of the same indivisible move.
  if (piece.toLowerCase() === "k" && Math.abs(toColumn - fromColumn) === 2) {
    const rookFrom = toColumn > fromColumn ? 7 : 0;
    const rookTo = toColumn > fromColumn ? 5 : 3;
    const rook = board[toRow]?.[rookFrom] ?? null;
    if (rook?.toLowerCase() !== "r") return null;
    board[toRow]![rookTo] = rook;
    board[toRow]![rookFrom] = null;
  }
  if (piece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    const promotion = action.promotion ?? "q";
    if (!( ["q", "r", "b", "n"] as string[]).includes(promotion)) return null;
    board[toRow]![toColumn] = piece === piece.toUpperCase() ? promotion.toUpperCase() : promotion.toLowerCase();
  }
  return board;
}

function chessActions(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  return chessPseudoMoves(state, playerId).filter((action) => {
    const board = chessBoardAfterMove(state, action);
    return board !== null && !chessKingInCheck(state, playerId, board);
  });
}

function chessPositionKey(state: PrototypeGameState): string {
  const active = state.players.find((player) => player.userId === state.currentPlayerId);
  const sideToMove = active && active.seat % 2 === 0 ? "w" : "b";
  let ep = "-";
  const target = state.chessEnPassantTarget ?? null;
  if (target !== null) {
    const targetRow = Math.floor(target / 8), targetColumn = target % 8;
    const pawnRow = targetRow + (sideToMove === "w" ? 1 : -1);
    const pawn = sideToMove === "w" ? "P" : "p";
    if ([-1, 1].some((delta) => state.board[pawnRow]?.[targetColumn + delta] === pawn)) ep = String(target);
  }
  return `${state.board.map((row) => row.join("")).join("/")}:${sideToMove}:${state.chessCastlingRights ?? "KQkq"}:${ep}`;
}
function chessPositionCount(state: PrototypeGameState): number {
  const key = chessPositionKey(state);
  return (state.chessPositionHistory ?? []).filter((position) => position === key).length;
}
function chessDrawClaimAvailable(state: PrototypeGameState): boolean {
  return (state.chessHalfmoveClock ?? 0) >= 100 || chessPositionCount(state) >= 3;
}
function chessInsufficientMaterial(state: PrototypeGameState): boolean {
  const pieces: Array<{kind:string; color:number}> = [];
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    const piece = state.board[row]?.[column] ?? null;
    if (!piece || piece.toLowerCase() === "k") continue;
    pieces.push({ kind: piece.toLowerCase(), color: (row + column) % 2 });
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && ["b", "n"].includes(pieces[0]!.kind)) return true;
  return pieces.every((piece) => piece.kind === "b") && new Set(pieces.map((piece) => piece.color)).size === 1;
}
function actionsFor(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  if (!currentPlayer(state, playerId)) return [];
  if (state.gameId === "chess") {
    const moves = chessActions(state, playerId);
    if (chessDrawClaimAvailable(state)) moves.push({ type: "claim_chess_draw" });
    return moves;
  }
  if (state.gameId === "battleship") {
    const target = nextPlayerId(state, playerId);
    if (!target || target === playerId) return [];
    return Array.from({ length: 100 }, (_, index) => ({ type: "fire", x: index % 10, y: Math.floor(index / 10) } as PrototypeAction)).filter((action) => action.type === "fire" && !hasShot(state, playerId, action.x, action.y));
  }
  if (state.gameId === "ludo") {
    if (!state.hasRolled || state.diceRoll === null) return [{ type: "roll_dice" }];
    const tokens = state.ludoTokens[playerId] ?? [];
    const moves = tokens
      .map((position, tokenIndex) => ({ position, tokenIndex }))
      .filter(({ position }) => position < 57 && (position >= 0 ? position + state.diceRoll! <= 57 : state.diceRoll === 6))
      .map(({ tokenIndex }) => ({ type: "move_token", tokenIndex } as PrototypeAction));
    return moves.length ? moves : [{ type: "end_turn" }];
  }
  if (state.gameId === "barricades") {
    if (!state.pawns[playerId]) return [];
    const moves: PrototypeAction[] = barricadesPawnDestinations(state, playerId).map((position) => ({ type: "move_pawn", x: position.x, y: position.y }));
    if ((state.wallsRemaining[playerId] ?? 0) > 0) {
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          for (const orientation of ["h", "v"] as const) {
            if (barricadesWallAllowed(state, x, y, orientation, playerId)) moves.push({ type: "place_wall", x, y, orientation });
          }
        }
      }
    }
    // A Quoridor-style turn must move one pawn or place one legal wall; passing is not a legal turn.
    return moves;
  }
  if (state.gameId === "monopoly") {
    if (!state.hasRolled) return [{ type: "roll_dice" }];
    const position = state.positions[playerId] ?? 0;
    const property = state.properties[position];
    const actions: PrototypeAction[] = [];
    if (property && property.cost > 0 && !property.ownerId && (state.money[playerId] ?? 0) >= property.cost) actions.push({ type: "buy_property" });
    return [...actions, { type: "end_turn" }];
  }
  if (state.gameId === "risk" || state.gameId === "world-conquest") {
    const actions: PrototypeAction[] = [];
    for (const territory of state.territories) {
      if (state.territoryOwners[territory.id] === null) actions.push({ type: "claim_territory", territoryId: territory.id });
    }
    if (!state.reinforcedThisTurn) {
      for (const territory of state.territories) if (state.territoryOwners[territory.id] === playerId) actions.push({ type: "reinforce_territory", territoryId: territory.id });
    }
    for (const territory of state.territories) {
      if (state.territoryOwners[territory.id] !== playerId || (state.territoryTroops[territory.id] ?? 0) < 2) continue;
      for (const neighborId of territory.neighbors) if (state.territoryOwners[neighborId] && state.territoryOwners[neighborId] !== playerId) actions.push({ type: "attack_territory", fromId: territory.id, toId: neighborId });
    }
    return [...actions, { type: "end_turn" }];
  }
  if (state.gameId === "codenames") {
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
  }
  if (state.gameId === "poker") {
    const paid = state.pokerBets[playerId] ?? 0;
    const stack = state.pokerStacks[playerId] ?? 0;
    const owes = state.pokerBetToCall - paid;
    const actions: PrototypeAction[] = [{ type: "poker_action", choice: "fold" }];
    if (owes <= 0) actions.push({ type: "poker_action", choice: "check" });
    if (owes > 0 && stack > 0) actions.push({ type: "poker_action", choice: "call" });
    if (stack >= Math.max(owes, 0) + 20) actions.push({ type: "poker_action", choice: "raise" });
    if (stack > 0) actions.push({ type: "poker_action", choice: "all_in" });
    return actions;
  }
  return [];
}

function validateAction(params: { state: PrototypeGameState; playerId: string; action: PrototypeAction }): ValidationResult {
  const { state, playerId, action } = params;
  const legal = actionsFor(state, playerId);
  if (action.type === "give_clue" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    const clue = action.clue.trim();
    const normalized = clue.toLowerCase().replace(/[^a-z0-9]/g, "");
    const clashesWithBoard = state.wordCards.some((card) => card.word.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized);
    if (!legal.some((candidate) => candidate.type === "give_clue") || team !== state.codenamesRoundTeam || playerId !== state.codenamesSpymasterByTeam[team ?? "red"] || state.codenamesClue !== null) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Only the active team's spymaster may give a clue." };
    }
    if (!clue || clue.length > 30 || /\s/.test(clue) || !Number.isInteger(action.number) || action.number < 0 || action.number > 9 || clashesWithBoard) {
      return { ok: false, code: "INVALID_CLUE", message: "Use one 1–30 character word, choose a number from 0 to 9, and do not repeat a word on the grid." };
    }
    return { ok: true };
  }
  const stableAction = (candidate: PrototypeAction) => JSON.stringify(Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right)));
  const allowed = legal.some((candidate) => stableAction(candidate) === stableAction(action));
  if (allowed) return { ok: true };
  return { ok: false, code: "ILLEGAL_ACTION", message: "That action is not legal for the current turn or prototype state." };
}

export type PokerHandValue = number[];

function pokerCardValue(card: string): { rank: number; suit: string } {
  const suit = card.slice(-1);
  const rankText = card.slice(0, -1);
  const rankIndex = RANKS.indexOf(rankText);
  return { rank: rankIndex >= 0 ? rankIndex + 2 : 0, suit };
}

function pokerStraightHigh(ranks: number[]): number {
  const distinct = new Set(ranks);
  if (distinct.has(14)) distinct.add(1); // A-2-3-4-5 wheel straight.
  for (let high = 14; high >= 5; high -= 1) {
    if ([0, 1, 2, 3, 4].every((offset) => distinct.has(high - offset))) return high;
  }
  return 0;
}

function evaluateFiveCardPokerHand(cards: string[]): PokerHandValue {
  const parsed = cards.map(pokerCardValue);
  const ranks = parsed.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = parsed.every((card) => card.suit === parsed[0]?.suit);
  const straightHigh = pokerStraightHigh(ranks);
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0]?.[1] === 4) return [7, groups[0][0], groups.find((group) => group[1] === 1)?.[0] ?? 0];
  const trips = groups.filter((group) => group[1] === 3).map((group) => group[0]);
  const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]);
  if (trips.length && (pairs.length || trips.length > 1)) return [6, trips[0] ?? 0, Math.max(pairs[0] ?? 0, trips[1] ?? 0)];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (trips.length) return [3, trips[0] ?? 0, ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  if (pairs.length >= 2) {
    const highPair = Math.max(pairs[0] ?? 0, pairs[1] ?? 0);
    const lowPair = Math.min(pairs[0] ?? 0, pairs[1] ?? 0);
    const kicker = groups.find((group) => group[1] === 1)?.[0] ?? 0;
    return [2, highPair, lowPair, kicker];
  }
  if (pairs.length === 1) return [1, pairs[0] ?? 0, ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  return [0, ...ranks];
}

function comparePokerHandValues(left: PokerHandValue, right: PokerHandValue): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function bestPokerHandValue(cards: string[]): PokerHandValue {
  if (cards.length < 5) return evaluateFiveCardPokerHand(cards.concat(Array.from({ length: 5 - cards.length }, () => "2♣")));
  let best: PokerHandValue = [-1];
  const chosen: string[] = [];
  const visit = (start: number) => {
    if (chosen.length === 5) {
      const value = evaluateFiveCardPokerHand(chosen);
      if (comparePokerHandValues(value, best) > 0) best = value;
      return;
    }
    const needed = 5 - chosen.length;
    for (let index = start; index <= cards.length - needed; index += 1) {
      chosen.push(cards[index]!);
      visit(index + 1);
      chosen.pop();
    }
  };
  visit(0);
  return best;
}

/** Ranking vector: category first (8=straight flush down to 0=high card), then tie-break cards. */
export function evaluateTexasHoldemHand(cards: string[]): PokerHandValue {
  return bestPokerHandValue(cards);
}

function nextPokerActor(state: PrototypeGameState, fromId: string | null = state.currentPlayerId): string | null {
  if (!state.players.length) return null;
  const startIndex = state.players.findIndex((player) => player.userId === fromId);
  const index = startIndex < 0 ? -1 : startIndex;
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(index + offset + state.players.length) % state.players.length];
    if (!player || state.pokerFolded.includes(player.userId)) continue;
    if ((state.pokerStacks[player.userId] ?? 0) <= 0) continue;
    return player.userId;
  }
  return null;
}

function startNextPokerHand(state: PrototypeGameState, now: string, previousHandNote = ""): void {
  const survivingPlayers = state.players.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  if (survivingPlayers.length <= 1) {
    const champion = survivingPlayers[0] ?? null;
    state.pokerPot = 0;
    state.pokerLastAction = champion
      ? `${previousHandNote ? `${previousHandNote} · ` : ""}${champion.displayName} wins the Poker tournament with the last remaining stack.`
      : `${previousHandNote ? `${previousHandNote} · ` : ""}Poker tournament ended without a surviving stack.`;
    finish(state, champion?.userId ?? null, now);
    return;
  }

  // Reset hand-scoped data but preserve tournament stacks and rotate the dealer
  // to the next player who still has chips. Zero-stack players are eliminated.
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const oldButtonIndex = ordered.findIndex((player) => player.seat === state.pokerButtonSeat);
  let button: GamePlayer | null = null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const candidate = ordered[(Math.max(0, oldButtonIndex) + offset) % ordered.length];
    if (candidate && (state.pokerStacks[candidate.userId] ?? 0) > 0) { button = candidate; break; }
  }
  button ??= survivingPlayers[0] ?? null;
  if (!button) {
    finish(state, null, now);
    return;
  }

  state.phase = "playing";
  state.winnerUserId = null;
  state.pokerHandNumber = (state.pokerHandNumber ?? 1) + 1;
  state.pokerButtonSeat = button.seat;
  state.pokerStreet = "preflop";
  state.pokerPot = 0;
  state.pokerBetToCall = 0;
  state.pokerFolded = state.players
    .filter((player) => (state.pokerStacks[player.userId] ?? 0) <= 0)
    .map((player) => player.userId);
  state.pokerActed = [];
  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerContributions = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.communityCards = [];
  state.pokerCardsByPlayer = {};

  const shuffled = shuffle(freshDeck(), state.rngState);
  state.pokerDeck = shuffled.items;
  state.rngState = shuffled.rngState;
  for (const player of survivingPlayers) {
    state.pokerCardsByPlayer[player.userId] = [state.pokerDeck.shift()!, state.pokerDeck.shift()!];
  }

  const active = ordered.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  const buttonIndex = active.findIndex((player) => player.userId === button!.userId);
  const smallBlindIndex = active.length <= 2 ? buttonIndex : (buttonIndex + 1) % active.length;
  const bigBlindIndex = active.length <= 2 ? (buttonIndex + 1) % active.length : (buttonIndex + 2) % active.length;
  const smallBlindPlayer = active[smallBlindIndex] ?? button;
  const bigBlindPlayer = active[bigBlindIndex] ?? active.find((player) => player.userId !== smallBlindPlayer.userId) ?? button;
  for (const [blindPlayer, nominalBlind] of [[smallBlindPlayer, 10], [bigBlindPlayer, 20]] as Array<[GamePlayer, number]>) {
    if (!blindPlayer || state.pokerFolded.includes(blindPlayer.userId)) continue;
    const paid = Math.min(nominalBlind, state.pokerStacks[blindPlayer.userId] ?? 0);
    state.pokerStacks[blindPlayer.userId] = (state.pokerStacks[blindPlayer.userId] ?? 0) - paid;
    state.pokerBets[blindPlayer.userId] = (state.pokerBets[blindPlayer.userId] ?? 0) + paid;
    state.pokerContributions[blindPlayer.userId] = (state.pokerContributions[blindPlayer.userId] ?? 0) + paid;
    state.pokerPot += paid;
  }
  state.pokerBetToCall = Math.max(0, ...Object.values(state.pokerBets));
  if (active.length <= 2) {
    state.currentPlayerId = (state.pokerStacks[button.userId] ?? 0) > 0 ? button.userId : nextPokerActor(state, button.userId);
  } else {
    state.currentPlayerId = nextPokerActor(state, bigBlindPlayer.userId);
  }
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = [previousHandNote, `Hand ${state.pokerHandNumber} begins`, `Blinds $10/$20`, `Button: ${button.displayName}`]
    .filter(Boolean).join(" · ");

  // When blind posts put every remaining player all-in, play the runout and
  // showdown automatically instead of waiting for an action that cannot happen.
  if (!state.currentPlayerId) advancePokerStreet(state, now);
}

function settlePokerShowdown(state: PrototypeGameState, now: string): void {
  const active = state.players.filter((player) => !state.pokerFolded.includes(player.userId));
  const values = new Map(active.map((player) => [player.userId, bestPokerHandValue([...(state.pokerCardsByPlayer[player.userId] ?? []), ...state.communityCards])]));
  const contributions = state.players.map((player) => ({ player, amount: Math.max(0, state.pokerContributions[player.userId] ?? 0) }));
  const levels = [...new Set(contributions.map((entry) => entry.amount).filter((amount) => amount > 0))].sort((a, b) => a - b);
  let previousLevel = 0;
  let mainPotWinners: GamePlayer[] = [];
  let distributed = 0;

  for (const level of levels) {
    const contributors = contributions.filter((entry) => entry.amount >= level);
    const potAmount = (level - previousLevel) * contributors.length;
    const eligible = contributors.map((entry) => entry.player).filter((player) => !state.pokerFolded.includes(player.userId));
    if (potAmount > 0 && eligible.length > 0) {
      let bestValue: PokerHandValue | null = null;
      let winners: GamePlayer[] = [];
      for (const player of eligible) {
        const value = values.get(player.userId) ?? [0];
        const comparison = bestValue === null ? 1 : comparePokerHandValues(value, bestValue);
        if (comparison > 0) { bestValue = value; winners = [player]; }
        else if (comparison === 0) winners.push(player);
      }
      winners.sort((a, b) => a.seat - b.seat);
      const share = Math.floor(potAmount / winners.length);
      let remainder = potAmount - share * winners.length;
      for (const winner of winners) {
        state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
      }
      if (previousLevel === 0) mainPotWinners = winners;
      distributed += potAmount;
    }
    previousLevel = level;
  }

  // Protect chip conservation if a restored/legacy snapshot has a pot that predates
  // contribution tracking. Such a residual goes to the best hand among active players.
  const residual = Math.max(0, state.pokerPot - distributed);
  if (residual > 0 && active.length > 0) {
    let winners: GamePlayer[] = [];
    let bestValue: PokerHandValue | null = null;
    for (const player of active) {
      const value = values.get(player.userId) ?? [0];
      const comparison = bestValue === null ? 1 : comparePokerHandValues(value, bestValue);
      if (comparison > 0) { bestValue = value; winners = [player]; }
      else if (comparison === 0) winners.push(player);
    }
    const share = Math.floor(residual / winners.length);
    let remainder = residual - share * winners.length;
    for (const winner of winners.sort((a, b) => a.seat - b.seat)) {
      state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
    if (mainPotWinners.length === 0) mainPotWinners = winners;
  }
  state.pokerPot = 0;
  state.pokerStreet = "showdown";
  if (mainPotWinners.length === 1) {
    const winner = mainPotWinners[0]!;
    const rankName = ["high card", "one pair", "two pair", "three of a kind", "straight", "flush", "full house", "four of a kind", "straight flush"][(values.get(winner.userId)?.[0] ?? 0)] ?? "best hand";
    state.pokerLastAction = `${winner.displayName} takes the main pot with ${rankName}; side pots are settled.`;
  } else {
    state.pokerLastAction = `Main pot split: ${mainPotWinners.map((player) => player.displayName).join(", ") || "no eligible player"}. Side pots are settled.`;
  }
  // Only the tournament end condition finalizes a match. A normal showdown pays
  // the pots and immediately starts the next hand while at least two stacks remain.
  startNextPokerHand(state, now, state.pokerLastAction);
}

function advancePokerStreet(state: PrototypeGameState, now: string): void {
  const active = state.players.filter((player) => !state.pokerFolded.includes(player.userId));
  if (active.length <= 1) {
    const winner = active[0];
    if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
    state.pokerPot = 0;
    state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";
    startNextPokerHand(state, now, state.pokerLastAction);
    return;
  }

  if (state.pokerStreet === "preflop") {
    const burn = state.pokerDeck.shift();
    void burn;
    state.communityCards.push(state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "flop";
  } else if (state.pokerStreet === "flop") {
    state.pokerDeck.shift(); // burn card
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "turn";
  } else if (state.pokerStreet === "turn") {
    state.pokerDeck.shift(); // burn card
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "river";
  } else {
    settlePokerShowdown(state, now);
    return;
  }

  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerBetToCall = 0;
  state.pokerActed = [];
  const button = state.players.find((player) => player.seat === state.pokerButtonSeat) ?? state.players[0];
  state.currentPlayerId = nextPokerActor(state, button?.userId ?? null);
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = `Cards dealt: ${state.pokerStreet}.`;

  // If every live player is all-in, run the remaining board automatically through
  // river and showdown instead of waiting for an action from a zero-chip player.
  if (!state.currentPlayerId) advancePokerStreet(state, now);
}


function applyAction(params: { state: PrototypeGameState; playerId: string; action: PrototypeAction; now: string }): { state: PrototypeGameState; events: GameEvent[] } {
  const state = JSON.parse(JSON.stringify(params.state)) as PrototypeGameState;
  // Normalize older persisted snapshots before touching fields introduced by this patch.
  state.ludoConsecutiveSixes ??= {};
  state.shipGroupsByPlayer ??= {};
  state.pokerHandNumber ??= 1;
  state.pokerButtonSeat ??= state.players[0]?.seat ?? 0;
  state.pokerContributions ??= {};
  normalizeCodenamesSnapshot(state);
  const { playerId, action, now } = params;
  const player = state.players.find((item) => item.userId === playerId);
  if (!player) return { state, events: [] };
  const events: GameEvent[] = [];
  let message = "";
  const title = SPECS[state.gameId].title;

  if (action.type === "claim_chess_draw" && state.gameId === "chess") {
    if (!chessDrawClaimAvailable(state)) return { state: params.state, events: [] };
    finish(state, null, now);
    message = `🤝 ${player.displayName} claimed a draw by ${state.chessHalfmoveClock >= 100 ? "the 50-move rule" : "threefold repetition"}.`;
  } else if (action.type === "move_piece" && state.gameId === "chess") {
    const legalMove = chessActions(state, playerId).some((candidate) => candidate.type === "move_piece" && candidate.from === action.from && candidate.to === action.to && (candidate.promotion ?? "") === (action.promotion ?? ""));
    if (!legalMove) return { state: params.state, events: [] };
    const fromRow = Math.floor(action.from / 8), fromCol = action.from % 8;
    const toRow = Math.floor(action.to / 8), toCol = action.to % 8;
    const piece = state.board[fromRow]?.[fromCol] ?? null;
    const captured = state.board[toRow]?.[toCol] ?? null;
    if (!piece || !playerOwnsChessPiece(state, playerId, piece)) return { state: params.state, events: [] };
    const epCapture = piece.toLowerCase() === "p" && fromCol !== toCol && !captured && state.chessEnPassantTarget === action.to;
    const board = chessBoardAfterMove(state, action);
    if (!board) return { state: params.state, events: [] };
    let rights = state.chessCastlingRights ?? "KQkq";
    if (piece === "K") rights = rights.replace(/[KQ]/g, "");
    if (piece === "k") rights = rights.replace(/[kq]/g, "");
    if (piece === "R" && action.from === 63) rights = rights.replace("K", "");
    if (piece === "R" && action.from === 56) rights = rights.replace("Q", "");
    if (piece === "r" && action.from === 7) rights = rights.replace("k", "");
    if (piece === "r" && action.from === 0) rights = rights.replace("q", "");
    if (captured === "R" && action.to === 63) rights = rights.replace("K", "");
    if (captured === "R" && action.to === 56) rights = rights.replace("Q", "");
    if (captured === "r" && action.to === 7) rights = rights.replace("k", "");
    if (captured === "r" && action.to === 0) rights = rights.replace("q", "");
    state.chessCastlingRights = rights;
    state.chessEnPassantTarget = piece.toLowerCase() === "p" && Math.abs(action.to - action.from) === 16 ? (action.to + action.from) / 2 : null;
    state.chessHalfmoveClock = piece.toLowerCase() === "p" || captured !== null || epCapture ? 0 : (state.chessHalfmoveClock ?? 0) + 1;
    state.board = board;
    state.currentPlayerId = nextPlayerId(state, playerId);
    state.turnNumber += 1;
    state.chessPositionHistory = [...(state.chessPositionHistory ?? []), chessPositionKey(state)].slice(-200);
    const opponentId = state.currentPlayerId;
    const destination = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const repetitionCount = chessPositionCount(state);
    if (opponentId) {
      const replies = chessActions(state, opponentId);
      const checked = chessKingInCheck(state, opponentId);
      if (replies.length === 0 && checked) {
        finish(state, playerId, now);
        message = `♟️ ${player.displayName} delivered checkmate on ${destination} and wins!`;
      } else if (replies.length === 0) {
        finish(state, null, now);
        message = `🤝 Stalemate after ${player.displayName}'s move to ${destination}. The game is a draw.`;
      } else if ((state.chessHalfmoveClock ?? 0) >= 150 || repetitionCount >= 5 || chessInsufficientMaterial(state)) {
        finish(state, null, now);
        message = `🤝 Draw after ${player.displayName}'s move (${(state.chessHalfmoveClock ?? 0) >= 150 ? "75-move rule" : repetitionCount >= 5 ? "fivefold repetition" : "insufficient material"}).`;
      } else {
        message = `♟️ ${player.displayName} moved ${piece}${action.promotion ? `=${action.promotion.toUpperCase()}` : ""} from ${String.fromCharCode(97 + fromCol)}${8 - fromRow} to ${destination}${captured || epCapture ? " and captured a piece" : ""}${checked ? " — CHECK!" : ""}${Math.abs(toCol-fromCol)===2 && piece.toLowerCase()==="k" ? " — CASTLING" : ""}.`;
      }
    } else {
      message = `♟️ ${player.displayName} moved ${piece} to ${destination}.`;
    }
  } else if (action.type === "fire" && state.gameId === "battleship") {
    const targetId = nextPlayerId(state, playerId);
    if (!targetId || targetId === playerId) return { state: params.state, events: [] };
    const targetCell = coordsKey(action.x, action.y);
    const hit = (state.shipCellsByPlayer[targetId] ?? []).includes(targetCell);
    const priorTargetShots = state.shots.filter((item) => item.targetId === targetId);
    if (priorTargetShots.some((item) => item.x === action.x && item.y === action.y)) return { state: params.state, events: [] };
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
    else state.currentPlayerId = targetId;
  } else if (action.type === "roll_dice" && state.gameId === "ludo") {
    const roll = random(state, 6) + 1;
    state.diceRoll = roll;
    state.hasRolled = true;
    state.ludoConsecutiveSixes ??= {};
    state.ludoConsecutiveSixes[playerId] = roll === 6 ? (state.ludoConsecutiveSixes[playerId] ?? 0) + 1 : 0;
    if (roll === 6 && (state.ludoConsecutiveSixes[playerId] ?? 0) >= 3) {
      state.ludoConsecutiveSixes[playerId] = 0;
      state.diceRoll = null;
      state.hasRolled = false;
      state.currentPlayerId = nextPlayerId(state, playerId);
      state.turnNumber += 1;
      message = `🎲 ${player.displayName} rolled a third consecutive six and forfeited the turn.`;
    } else {
      message = `🎲 ${player.displayName} rolled ${roll}.`;
    }
  } else if (action.type === "move_token" && state.gameId === "ludo") {
    const tokens = state.ludoTokens[playerId] ?? [-1, -1, -1, -1];
    const current = tokens[action.tokenIndex] ?? -1;
    const dice = state.diceRoll;
    if (dice === null || (current < 0 && dice !== 6) || (current >= 0 && current + dice > 57)) return { state: params.state, events: [] };
    const nextProgress = current < 0 ? 0 : current + dice;
    tokens[action.tokenIndex] = nextProgress;
    let capturedCount = 0;
    const movingTrackPosition = ludoGlobalTrackPosition(player, nextProgress);
    if (movingTrackPosition !== null && !LUDO_SAFE_TRACK_POSITIONS.has(movingTrackPosition)) {
      for (const opponent of state.players) {
        if (opponent.userId === playerId) continue;
        const opponentTokens = state.ludoTokens[opponent.userId] ?? [];
        for (let index = 0; index < opponentTokens.length; index += 1) {
          const opponentProgress = opponentTokens[index] ?? -1;
          if (ludoGlobalTrackPosition(opponent, opponentProgress) === movingTrackPosition) {
            opponentTokens[index] = -1;
            capturedCount += 1;
          }
        }
      }
    }
    state.ludoTokens[playerId] = tokens;
    state.diceRoll = null;
    state.hasRolled = false;
    message = `🎲 ${player.displayName} moved token ${action.tokenIndex + 1} by ${dice}${capturedCount ? ` and captured ${capturedCount} opposing token${capturedCount === 1 ? "" : "s"}` : ""}.`;
    if (tokens.every((position) => position === 57)) {
      finish(state, playerId, now);
      message += " 🏆 All four tokens reached home!";
    } else if (dice !== 6 && capturedCount === 0 && nextProgress !== 57) {
      state.currentPlayerId = nextPlayerId(state, playerId);
    }
  } else if (action.type === "move_pawn" && state.gameId === "barricades") {
    const destination = { x: action.x, y: action.y };
    if (!state.pawns[playerId] || !barricadesPawnDestinations(state, playerId).some((position) => position.x === destination.x && position.y === destination.y)) return { state: params.state, events: [] };
    state.pawns[playerId] = destination;
    message = `🧱 ${player.displayName} moved to ${action.x + 1}, ${action.y + 1}.`;
    if (barricadesGoalReached(state, playerId, destination)) {
      finish(state, playerId, now);
      message += " 🏆 Reached the goal!";
    } else state.currentPlayerId = nextPlayerId(state, playerId);
  } else if (action.type === "place_wall" && state.gameId === "barricades") {
    if (!barricadesWallAllowed(state, action.x, action.y, action.orientation, playerId)) return { state: params.state, events: [] };
    state.walls.push({ x: action.x, y: action.y, orientation: action.orientation, playerId });
    state.wallsRemaining[playerId] = Math.max(0, (state.wallsRemaining[playerId] ?? 1) - 1);
    state.currentPlayerId = nextPlayerId(state, playerId);
    message = `🧱 ${player.displayName} placed a ${action.orientation === "h" ? "horizontal" : "vertical"} barricade.`;
  } else if (action.type === "roll_dice" && state.gameId === "monopoly") {
    const roll = random(state, 6) + 1 + random(state, 6) + 1;
    const old = state.positions[playerId] ?? 0; const next = (old + roll) % 40;
    state.positions[playerId] = next;
    if (next < old) state.money[playerId] = (state.money[playerId] ?? 0) + 200;
    const property = state.properties[next];
    if (property?.ownerId && property.ownerId !== playerId) {
      const rent = Math.min(state.money[playerId] ?? 0, property.rent);
      state.money[playerId] = (state.money[playerId] ?? 0) - rent;
      state.money[property.ownerId] = (state.money[property.ownerId] ?? 0) + rent;
      message = `🎲 ${player.displayName} rolled ${roll}, landed on ${property.label}, and paid $${rent} rent.`;
    } else message = `🎲 ${player.displayName} rolled ${roll} and landed on ${property?.label ?? "a space"}.`;
    state.hasRolled = true;
  } else if (action.type === "buy_property" && state.gameId === "monopoly") {
    const property = state.properties[state.positions[playerId] ?? 0];
    if (property && property.cost > 0 && !property.ownerId && (state.money[playerId] ?? 0) >= property.cost) {
      property.ownerId = playerId; state.money[playerId] = (state.money[playerId] ?? 0) - property.cost;
      message = `🏠 ${player.displayName} bought ${property.label} for $${property.cost}.`;
    } else return { state: params.state, events: [] };
  } else if (action.type === "claim_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")) {
    state.territoryOwners[action.territoryId] = playerId; state.territoryTroops[action.territoryId] = 1;
    message = `🗺️ ${player.displayName} claimed ${state.territories.find((territory) => territory.id === action.territoryId)?.label ?? action.territoryId}.`;
    state.currentPlayerId = nextPlayerId(state, playerId); state.reinforcedThisTurn = false;
  } else if (action.type === "reinforce_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")) {
    state.territoryTroops[action.territoryId] = (state.territoryTroops[action.territoryId] ?? 0) + 2;
    state.reinforcedThisTurn = true;
    message = `🪖 ${player.displayName} reinforced ${state.territories.find((territory) => territory.id === action.territoryId)?.label ?? action.territoryId}.`;
  } else if (action.type === "attack_territory" && (state.gameId === "risk" || state.gameId === "world-conquest")) {
    const from = state.territories.find((territory) => territory.id === action.fromId);
    const to = state.territories.find((territory) => territory.id === action.toId);
    const sourceTroops = from ? (state.territoryTroops[from.id] ?? 0) : 0;
    const targetTroops = to ? (state.territoryTroops[to.id] ?? 0) : 0;
    if (!from || !to || state.territoryOwners[from.id] !== playerId || !from.neighbors.includes(to.id) || !state.territoryOwners[to.id] || state.territoryOwners[to.id] === playerId || sourceTroops < 2 || targetTroops < 1) return { state: params.state, events: [] };

    const attackDice = Array.from({ length: Math.min(3, sourceTroops - 1) }, () => random(state, 6) + 1).sort((a, b) => b - a);
    const defenseDice = Array.from({ length: Math.min(2, targetTroops) }, () => random(state, 6) + 1).sort((a, b) => b - a);
    let attackerLosses = 0;
    let defenderLosses = 0;
    for (let index = 0; index < Math.min(attackDice.length, defenseDice.length); index += 1) {
      // In Risk, a tied dice comparison is won by the defender.
      if (attackDice[index]! > defenseDice[index]!) defenderLosses += 1;
      else attackerLosses += 1;
    }
    state.territoryTroops[from.id] = sourceTroops - attackerLosses;
    state.territoryTroops[to.id] = targetTroops - defenderLosses;
    const oldOwner = state.territoryOwners[to.id];
    if ((state.territoryTroops[to.id] ?? 0) <= 0) {
      state.territoryOwners[to.id] = playerId;
      // Move the number of dice used in this final attack into the captured
      // territory, while leaving at least one troop behind in the source.
      const availableToMove = Math.max(1, (state.territoryTroops[from.id] ?? 1) - 1);
      const movedTroops = Math.min(attackDice.length, availableToMove);
      state.territoryTroops[from.id] = Math.max(1, (state.territoryTroops[from.id] ?? 1) - movedTroops);
      state.territoryTroops[to.id] = movedTroops;
      message = `⚔️ ${player.displayName} captured ${to.label} with ${movedTroops} troop${movedTroops === 1 ? "" : "s"}. Attack dice ${attackDice.join(",")} vs defence ${defenseDice.join(",")}.`;
      if (oldOwner && !state.territories.some((territory) => state.territoryOwners[territory.id] === oldOwner)) message += " Opponent eliminated.";
    } else {
      message = `⚔️ Battle for ${to.label}: attack dice ${attackDice.join(",")} vs defence ${defenseDice.join(",")}; losses ${attackerLosses} attacker / ${defenderLosses} defender.`;
    }
    const allClaimed = state.territories.every((territory) => state.territoryOwners[territory.id] !== null);
    const remainingOwners = new Set(state.territories.map((territory) => state.territoryOwners[territory.id]).filter((owner): owner is string => owner !== null));
    if (allClaimed && remainingOwners.size === 1 && remainingOwners.has(playerId)) {
      finish(state, playerId, now);
      message += " 🏆 All territories conquered!";
    }
  } else if (action.type === "give_clue" && state.gameId === "codenames") {
    const team = state.codenamesTeamByPlayer[playerId];
    const clue = action.clue.trim();
    const normalized = clue.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!team || team !== state.codenamesRoundTeam || playerId !== state.codenamesSpymasterByTeam[team] || state.codenamesClue !== null || !clue || clue.length > 30 || /\s/.test(clue) || state.wordCards.some((card) => card.word.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)) return { state: params.state, events: [] };
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
  } else if (action.type === "poker_action" && state.gameId === "poker") {
    const paid = state.pokerBets[playerId] ?? 0; const stack = state.pokerStacks[playerId] ?? 0;
    const owes = Math.max(0, state.pokerBetToCall - paid); let chips = 0;
    if (action.choice === "fold") {
      state.pokerFolded = [...new Set([...state.pokerFolded, playerId])]; message = `🃏 ${player.displayName} folded.`;
    } else if (action.choice === "check") {
      message = `🃏 ${player.displayName} checked.`;
    } else if (action.choice === "call") {
      chips = Math.min(owes, stack); message = `🃏 ${player.displayName} called $${chips}.`;
    } else if (action.choice === "raise") {
      chips = Math.min(stack, owes + 20); state.pokerBetToCall = paid + chips; message = `🃏 ${player.displayName} raised the bet to $${state.pokerBetToCall}.`;
      if (stack >= owes + 20) state.pokerActed = [];
    } else {
      chips = stack;
      const allInTotal = paid + chips;
      if (allInTotal > state.pokerBetToCall && allInTotal - state.pokerBetToCall >= 20) state.pokerActed = [];
      state.pokerBetToCall = Math.max(state.pokerBetToCall, allInTotal);
      message = `🃏 ${player.displayName} went all-in for $${chips}.`;
    }
    if (chips > 0) {
      state.pokerStacks[playerId] = stack - chips; state.pokerBets[playerId] = paid + chips; state.pokerContributions[playerId] = (state.pokerContributions[playerId] ?? 0) + chips; state.pokerPot += chips;
    }
    state.pokerActed = [...new Set([...state.pokerActed, playerId])];
    state.pokerLastAction = message;
    const active = state.players.filter((item) => !state.pokerFolded.includes(item.userId));
    const canStillAct = active.filter((item) => (state.pokerStacks[item.userId] ?? 0) > 0);
    const everyoneActed = canStillAct.every((item) => state.pokerActed.includes(item.userId));
    const allMatched = active.every((item) => (state.pokerBets[item.userId] ?? 0) === state.pokerBetToCall || (state.pokerStacks[item.userId] ?? 0) === 0);
    if (active.length <= 1) {
      const winner = active[0];
      if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
      state.pokerPot = 0;
      state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";
      startNextPokerHand(state, now, state.pokerLastAction);
    } else if (everyoneActed && allMatched) advancePokerStreet(state, now);
    else state.currentPlayerId = nextPokerActor(state, playerId);
  } else if (action.type === "end_turn") {
    state.currentPlayerId = nextPlayerId(state, playerId); state.turnNumber += 1; state.hasRolled = false; state.diceRoll = null; state.reinforcedThisTurn = false;
    if (state.gameId === "ludo") state.ludoConsecutiveSixes[playerId] = 0;
    if (state.gameId === "poker") return { state: params.state, events: [] };
    message = `➡️ ${player.displayName} ended the turn.`;
  } else {
    return { state: params.state, events: [] };
  }

  state.actionNumber += 1;
  state.updatedAt = now;
  state.turnStartedAt = now;
  if (message) {
    const item = makeActivity(state, "game_action", message, playerId, now);
    state.activityLog = [...state.activityLog, item].slice(-60);
    events.push({ id: item.id, type: item.type, message: item.message, payload: { playerId, gameId: title }, createdAt: now });
  }
  return { state, events };
}

function publicState(state: PrototypeGameState, viewerId: string): PublicPrototypeGameState {
  return {
    gameId: state.gameId, phase: state.phase,
    players: state.players.map((player) => ({
      userId: player.userId, displayName: player.displayName, seat: player.seat, isBot: Boolean(player.isBot),
      isCurrentTurn: player.userId === state.currentPlayerId, money: state.money[player.userId] ?? null,
      position: state.positions[player.userId] ?? null, tokens: state.ludoTokens[player.userId] ? [...state.ludoTokens[player.userId]!] : null,
      stack: state.pokerStacks[player.userId] ?? null, folded: state.pokerFolded.includes(player.userId), bet: state.pokerBets[player.userId] ?? 0,
      team: state.codenamesTeamByPlayer[player.userId] ?? null,
      isSpymaster: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[player.userId] ?? "red"] === player.userId
    })),
    currentPlayerId: state.currentPlayerId, winnerUserId: state.winnerUserId, turnNumber: state.turnNumber, actionNumber: state.actionNumber, updatedAt: state.updatedAt,
    board: state.board.map((row) => row.slice()), pawns: { ...state.pawns }, walls: state.walls.map((wall) => ({ ...wall })), wallsRemaining: { ...state.wallsRemaining },
    ludoTokens: Object.fromEntries(Object.entries(state.ludoTokens).map(([key, tokens]) => [key, tokens.slice()])), diceRoll: state.diceRoll, hasRolled: state.hasRolled,
    money: { ...state.money }, positions: { ...state.positions }, properties: state.properties.map((property) => ({ ...property })),
    territories: state.territories.map((territory) => ({ ...territory, neighbors: territory.neighbors.slice() })), territoryOwners: { ...state.territoryOwners }, territoryTroops: { ...state.territoryTroops }, reinforcedThisTurn: state.reinforcedThisTurn,
    ownShipCells: (state.shipCellsByPlayer[viewerId] ?? []).slice(), shots: state.shots.map((shot) => ({ ...shot })),
    wordCards: state.wordCards.map((card) => ({ word: card.word, revealed: card.revealed, revealedRole: card.revealed ? card.role : null, keyRole: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[viewerId] ?? "red"] === viewerId ? card.role : null })),
    isCodenamesSpymaster: state.codenamesSpymasterByTeam[state.codenamesTeamByPlayer[viewerId] ?? "red"] === viewerId,
    codenamesCurrentTeam: state.codenamesRoundTeam, codenamesClue: state.codenamesClue, codenamesClueNumber: state.codenamesClueNumber, codenamesGuessesRemaining: state.codenamesGuessesRemaining,
    myPokerCards: (state.pokerCardsByPlayer[viewerId] ?? []).slice(), communityCards: state.communityCards.slice(), pokerStacks: { ...state.pokerStacks }, pokerBets: { ...state.pokerBets }, pokerFolded: state.pokerFolded.slice(), pokerBetToCall: state.pokerBetToCall, pokerPot: state.pokerPot, pokerStreet: state.pokerStreet, pokerButtonSeat: state.pokerButtonSeat, pokerHandNumber: state.pokerHandNumber, pokerLastAction: state.pokerLastAction,
    activityLog: state.activityLog.slice(-30), prototypeNotice: SPECS[state.gameId].notice
  };
}

function createModule(gameId: PrototypeGameId): GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> {
  const spec = SPECS[gameId];
  return {
    id: gameId as GameId,
    displayName: spec.title,
    version: "0.3.0-chess-rules",
    minPlayers: spec.min,
    maxPlayers: spec.max,
    defaultSettings: DEFAULT_SETTINGS,
    settingsSchema,
    actionSchema,
    createInitialState: (params) => createInitialState(params, gameId),
    getPublicState: ({ state, viewerId }) => { normalizeCodenamesSnapshot(state); return publicState(state, viewerId); },
    getLegalActions: ({ state, playerId }) => { normalizeCodenamesSnapshot(state); return actionsFor(state, playerId); },
    validateAction,
    applyAction,
    getTurnInfo: (state): GameTurnInfo => ({ currentPlayerId: state.currentPlayerId, turnStartedAt: state.phase === "playing" ? state.turnStartedAt : null, turnSeconds: state.settings.turnSeconds }),
    getTimeoutAction: () => null,
    isGameOver: (state) => state.phase === "finished",
    getResults: (state) => makeResults(state)
  };
}

export const chessModule = createModule("chess");
export const battleshipModule = createModule("battleship");
export const ludoModule = createModule("ludo");
export const barricadesModule = createModule("barricades");
export const monopolyPrototypeModule = createModule("monopoly");
export const riskModule = createModule("risk");
export const worldConquestModule = createModule("world-conquest");
export const codenamesPrototypeModule = createModule("codenames");
export const pokerModule = createModule("poker");

export const PROTOTYPE_GAME_IDS: PrototypeGameId[] = ["chess", "battleship", "ludo", "barricades", "monopoly", "risk", "world-conquest", "codenames", "poker"];
