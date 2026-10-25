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
  | { type: "move_piece"; from: number; to: number }
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
  shots: Shot[];
  wordCards: WordCard[];
  codenamesTeamByPlayer: Record<string, "red" | "blue">;
  pokerCardsByPlayer: Record<string, string[]>;
  pokerDeck: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerActed: string[];
  pokerBetToCall: number;
  pokerPot: number;
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
  wordCards: Array<{ word: string; revealed: boolean; revealedRole: Team | null }>;
  myPokerCards: string[];
  communityCards: string[];
  pokerStacks: Record<string, number>;
  pokerBets: Record<string, number>;
  pokerFolded: string[];
  pokerBetToCall: number;
  pokerPot: number;
  pokerStreet: PokerStreet;
  pokerLastAction: string;
  activityLog: ActivityItem[];
  prototypeNotice: string;
}

const settingsSchema = z.object({ turnSeconds: z.number().int().min(0).max(600).nullable().default(null) });
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("move_piece"), from: z.number().int().min(0).max(63), to: z.number().int().min(0).max(63) }),
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
  z.object({ type: z.literal("poker_action"), choice: z.enum(["fold", "check", "call", "raise", "all_in"]) })
]);

const DEFAULT_SETTINGS: PrototypeSettings = { turnSeconds: null };
const SPECS: Record<PrototypeGameId, { title: string; min: number; max: number; notice: string }> = {
  chess: { title: "Chess", min: 2, max: 2, notice: "Early access · legal piece geometry and captures are implemented; check, castling, en passant and full tournament rules are still in progress." },
  battleship: { title: "Battleships", min: 2, max: 2, notice: "Early access · alternating target shots, hits and fleet elimination work. Fleet placement and all ship-sinking details are coming next." },
  ludo: { title: "Ludo", min: 2, max: 4, notice: "Early access · dice, four tokens per player and a shared progress track work. Exact safe squares, captures and home lanes are in progress." },
  barricades: { title: "Barricades", min: 2, max: 4, notice: "Early access · pawn moves, wall placement and reaching the opposite edge work. Full path-preservation checks and 4-player balance are in progress." },
  monopoly: { title: "Property Tycoon", min: 2, max: 6, notice: "Early access · dice movement, buying properties, rent and passing Start are implemented. Auctions, jail, mortgages, trades and bankruptcy rules are next." },
  risk: { title: "Risk", min: 2, max: 6, notice: "Early access · territory claims, reinforcements and simplified dice attacks work on a compact map. Full Risk setup, cards and battle dice are in progress." },
  "world-conquest": { title: "World Conquest", min: 2, max: 10, notice: "Early access · a larger original territory map supports claims, reinforcements and simplified attacks. Full strategic phases and balance are in progress." },
  codenames: { title: "Codenames", min: 2, max: 10, notice: "Early access · the word grid, hidden team key, reveals and basic team scoring are wired. Spymaster clue-giving, clue limits and full round scoring are next." },
  poker: { title: "Poker · Texas Hold'em", min: 2, max: 6, notice: "Early access · private hole cards, community cards, blinds and simplified betting are implemented. Full hand-ranking evaluation, side pots, rebuys and tournament rules are in progress." }
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
function makeResults(state: PrototypeGameState): GameResults {
  const winnerId = state.winnerUserId;
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
  const directions: Record<string, Array<[number, number]>> = {
    n: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
    k: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    r: [[-1, 0], [0, -1], [0, 1], [1, 0]],
  };
  for (let from = 0; from < 64; from += 1) {
    const fr = Math.floor(from / 8); const fc = from % 8;
    const piece = board[fr]?.[fc] ?? null;
    if (!playerOwnsChessPiece(state, playerId, piece)) continue;
    const kind = piece!.toLowerCase();
    const tryMove = (r: number, c: number): boolean => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r]?.[c] ?? null;
      if (target && (playerOwnsChessPiece(state, playerId, target) || target.toLowerCase() === "k")) return false;
      output.push({ type: "move_piece", from, to: r * 8 + c });
      return !target;
    };
    if (kind === "p") {
      const dir: number = player.seat % 2 === 0 ? -1 : 1;
      const one = fr + dir;
      if (one >= 0 && one <= 7 && !(board[one]?.[fc])) {
        output.push({ type: "move_piece", from, to: one * 8 + fc });
        const startRow = player.seat % 2 === 0 ? 6 : 1;
        const two = fr + dir * 2;
        if (fr === startRow && !(board[two]?.[fc])) output.push({ type: "move_piece", from, to: two * 8 + fc });
      }
      for (const dc of [-1, 1]) {
        const c = fc + dc; const r = fr + dir;
        const target = board[r]?.[c] ?? null;
        if (r >= 0 && r <= 7 && c >= 0 && c <= 7 && target && !playerOwnsChessPiece(state, playerId, target)) output.push({ type: "move_piece", from, to: r * 8 + c });
      }
      continue;
    }
    const dirs = kind === "q" ? [...directions.b!, ...directions.r!] : directions[kind];
    if (!dirs) continue;
    const slides = ["b", "r", "q"].includes(kind);
    for (const [dr, dc] of dirs) {
      for (let step = 1; step <= (slides ? 7 : 1); step += 1) {
        const keepGoing = tryMove(fr + dr * step, fc + dc * step);
        if (!keepGoing) break;
      }
    }
  }
  return output;
}

const BATTLESHIP_LENGTHS = [5, 4, 3, 3, 2];
function fleetForSeat(seat: number): string[] {
  // Prototype fleets are generated deterministically and kept private per viewer.
  const cells: string[] = [];
  const yOffset = seat % 2 === 0 ? 0 : 1;
  BATTLESHIP_LENGTHS.forEach((length, index) => {
    const y = (index * 2 + yOffset) % 10;
    const reverse = seat % 4 >= 2;
    for (let x = 0; x < length; x += 1) cells.push(coordsKey(reverse ? 9 - x : x, y));
  });
  return cells;
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
    gameId, version: "0.1.0-prototype", settings: params.settings, phase: "playing", players,
    currentPlayerId: firstId, winnerUserId: null, turnNumber: 1, actionNumber: 0,
    startedAt: params.now, updatedAt: params.now, turnStartedAt: params.now, activityLog: [], rngState,
    board: Array.from({ length: gameId === "chess" ? 8 : gameId === "battleship" ? 10 : gameId === "barricades" ? 9 : 5 }, () => Array.from({ length: gameId === "chess" ? 8 : gameId === "battleship" ? 10 : gameId === "barricades" ? 9 : 5 }, () => null)),
    pawns: {}, walls: [], wallsRemaining: {}, ludoTokens: {}, diceRoll: null, hasRolled: false,
    money: {}, positions: {}, properties: makeProperties(), territories: gameId === "world-conquest" ? WORLD_TERRITORIES : RISK_TERRITORIES,
    territoryOwners: {}, territoryTroops: {}, reinforcedThisTurn: false,
    shipCellsByPlayer: {}, shots: [], wordCards: [], codenamesTeamByPlayer: {},
    pokerCardsByPlayer: {}, pokerDeck: [], communityCards: [], pokerStacks: {}, pokerBets: {}, pokerFolded: [], pokerActed: [], pokerBetToCall: 0, pokerPot: 0, pokerStreet: "preflop", pokerLastAction: "Deal in",
  };
  const line = (s: string) => s.split("");
  if (gameId === "chess") {
    state.board = [line("rnbqkbnr"), line("pppppppp"), ...Array.from({ length: 4 }, () => Array<string | null>(8).fill(null)), line("PPPPPPPP"), line("RNBQKBNR")];
  }
  if (gameId === "battleship") {
    for (const player of players) state.shipCellsByPlayer[player.userId] = fleetForSeat(player.seat);
  }
  if (gameId === "ludo") for (const player of players) state.ludoTokens[player.userId] = [-1, -1, -1, -1];
  if (gameId === "barricades") {
    players.forEach((player, index) => {
      const starts = players.length > 2 ? [{ x: 4, y: 0 }, { x: 4, y: 8 }, { x: 0, y: 4 }, { x: 8, y: 4 }] : [{ x: 4, y: 0 }, { x: 4, y: 8 }];
      state.pawns[player.userId] = starts[index] ?? { x: 4, y: 0 };
      state.wallsRemaining[player.userId] = 10;
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
    const roles: Team[] = [...Array<Team>(9).fill("red"), ...Array<Team>(8).fill("blue"), ...Array<Team>(7).fill("neutral"), "assassin"];
    const shuffledRoles = shuffle(roles, rngState); rngState = shuffledRoles.rngState;
    state.wordCards = shuffled.items.map((word, index) => ({ word, role: shuffledRoles.items[index] ?? "neutral", revealed: false }));
    players.forEach((player) => { state.codenamesTeamByPlayer[player.userId] = player.seat % 2 === 0 ? "red" : "blue"; });
  }
  if (gameId === "poker") {
    const shuffled = shuffle(freshDeck(), rngState); rngState = shuffled.rngState;
    state.pokerDeck = shuffled.items;
    for (const player of players) {
      state.pokerCardsByPlayer[player.userId] = [state.pokerDeck.shift() ?? "A♠", state.pokerDeck.shift() ?? "K♣"];
      state.pokerStacks[player.userId] = 1000;
      state.pokerBets[player.userId] = 0;
    }
    // Heads-up/small-table blinds are simplified but visible and consistent.
    for (let index = 0; index < Math.min(2, players.length); index += 1) {
      const player = players[index]!;
      const blind = index === 0 ? 10 : 20;
      const paid = Math.min(blind, state.pokerStacks[player.userId] ?? 0);
      state.pokerStacks[player.userId] = (state.pokerStacks[player.userId] ?? 0) - paid;
      state.pokerBets[player.userId] = paid;
      state.pokerPot += paid;
    }
    state.pokerBetToCall = 20;
    state.pokerLastAction = "Small blind 10 · Big blind 20";
    state.currentPlayerId = players[0]?.userId ?? null;
  }
  state.rngState = rngState;
  state.activityLog.push(makeActivity(state, "game_started", `🟢 ${SPECS[gameId].title} table started.`, null, params.now));
  return state;
}

function currentPlayer(state: PrototypeGameState, playerId: string): boolean { return state.phase === "playing" && state.currentPlayerId === playerId; }
function hasShot(state: PrototypeGameState, shooterId: string, x: number, y: number): boolean { return state.shots.some((shot) => shot.shooterId === shooterId && shot.x === x && shot.y === y); }
function wallsBlockMove(state: PrototypeGameState, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  return state.walls.some((wall) => wall.orientation === "h"
    ? from.x === to.x && Math.min(from.y, to.y) === wall.y && to.x >= wall.x && to.x <= wall.x + 1
    : from.y === to.y && Math.min(from.x, to.x) === wall.x && to.y >= wall.y && to.y <= wall.y + 1);
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
  const fromRow = Math.floor(action.from / 8);
  const fromColumn = action.from % 8;
  const toRow = Math.floor(action.to / 8);
  const toColumn = action.to % 8;
  const piece = board[fromRow]?.[fromColumn] ?? null;
  if (!piece) return null;
  if (board[toRow]?.[toColumn]?.toLowerCase() === "k") return null;
  board[fromRow]![fromColumn] = null;
  board[toRow]![toColumn] = piece;
  if (piece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    board[toRow]![toColumn] = piece === piece.toUpperCase() ? "Q" : "q";
  }
  return board;
}

function chessActions(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  return chessPseudoMoves(state, playerId).filter((action) => {
    const board = chessBoardAfterMove(state, action);
    return board !== null && !chessKingInCheck(state, playerId, board);
  });
}
function actionsFor(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  if (!currentPlayer(state, playerId)) return [];
  if (state.gameId === "chess") return chessActions(state, playerId);
  if (state.gameId === "battleship") {
    const target = nextPlayerId(state, playerId);
    if (!target || target === playerId) return [];
    return Array.from({ length: 100 }, (_, index) => ({ type: "fire", x: index % 10, y: Math.floor(index / 10) } as PrototypeAction)).filter((action) => action.type === "fire" && !hasShot(state, playerId, action.x, action.y));
  }
  if (state.gameId === "ludo") {
    if (!state.hasRolled) return [{ type: "roll_dice" }];
    const tokens = state.ludoTokens[playerId] ?? [];
    const moves = tokens.map((position, tokenIndex) => ({ position, tokenIndex })).filter(({ position }) => position < 57 && (position >= 0 || state.diceRoll === 6)).map(({ tokenIndex }) => ({ type: "move_token", tokenIndex } as PrototypeAction));
    return moves.length ? moves : [{ type: "end_turn" }];
  }
  if (state.gameId === "barricades") {
    const pawn = state.pawns[playerId];
    if (!pawn) return [];
    const moves: PrototypeAction[] = [];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as Array<[number, number]>) {
      const x = pawn.x + dx; const y = pawn.y + dy;
      if (x < 0 || x > 8 || y < 0 || y > 8 || wallsBlockMove(state, pawn, { x, y })) continue;
      if (Object.entries(state.pawns).some(([otherId, location]) => otherId !== playerId && location.x === x && location.y === y)) continue;
      moves.push({ type: "move_pawn", x, y });
    }
    if ((state.wallsRemaining[playerId] ?? 0) > 0) {
      for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) for (const orientation of ["h", "v"] as const) {
        if (!state.walls.some((wall) => wall.x === x && wall.y === y && wall.orientation === orientation)) moves.push({ type: "place_wall", x, y, orientation });
      }
    }
    return [...moves, { type: "end_turn" }];
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
  if (state.gameId === "codenames") return state.wordCards.map((card, index) => ({ card, index })).filter(({ card }) => !card.revealed).map(({ index }) => ({ type: "reveal_word", index }));
  if (state.gameId === "poker") {
    const paid = state.pokerBets[playerId] ?? 0;
    const stack = state.pokerStacks[playerId] ?? 0;
    const owes = state.pokerBetToCall - paid;
    const actions: PrototypeAction[] = [{ type: "poker_action", choice: "fold" }];
    if (owes <= 0) actions.push({ type: "poker_action", choice: "check" });
    if (owes > 0 && stack > 0) actions.push({ type: "poker_action", choice: "call" });
    if (stack > Math.max(owes, 0) + 10) actions.push({ type: "poker_action", choice: "raise" });
    if (stack > 0) actions.push({ type: "poker_action", choice: "all_in" });
    return actions;
  }
  return [];
}

function validateAction(params: { state: PrototypeGameState; playerId: string; action: PrototypeAction }): ValidationResult {
  const { state, playerId, action } = params;
  const legal = actionsFor(state, playerId);
  const stableAction = (candidate: PrototypeAction) => JSON.stringify(Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right)));
  const allowed = legal.some((candidate) => stableAction(candidate) === stableAction(action));
  if (allowed) return { ok: true };
  return { ok: false, code: "ILLEGAL_ACTION", message: "That action is not legal for the current turn or prototype state." };
}

function advancePokerStreet(state: PrototypeGameState, now: string): void {
  const active = state.players.filter((player) => !state.pokerFolded.includes(player.userId));
  if (active.length <= 1) {
    const winner = active[0];
    if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
    finish(state, winner?.userId ?? null, now);
    state.pokerLastAction = winner ? `${winner.displayName} wins the pot by fold.` : "Hand ended.";
    return;
  }
  const currentStreet = state.pokerStreet;
  if (currentStreet === "preflop") {
    state.communityCards.push(state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "flop";
  } else if (currentStreet === "flop") {
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "turn";
  } else if (currentStreet === "turn") {
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "river";
  } else {
    const handRank = (userId: string): number => {
      const cards = [...(state.pokerCardsByPlayer[userId] ?? []), ...state.communityCards];
      return Math.max(0, ...cards.map((card) => Math.max(0, RANKS.indexOf(card.replace(/[♠♥♦♣]/g, "")))));
    };
    const winner = active.slice().sort((a, b) => handRank(b.userId) - handRank(a.userId))[0];
    if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
    finish(state, winner?.userId ?? null, now);
    state.pokerStreet = "showdown";
    state.pokerLastAction = winner ? `${winner.displayName} wins (prototype high-card showdown).` : "Showdown ended in a draw.";
    return;
  }
  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerBetToCall = 0;
  state.pokerActed = [];
  state.currentPlayerId = active[0]?.userId ?? state.currentPlayerId;
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = `Cards dealt: ${state.pokerStreet}.`;
}

function applyAction(params: { state: PrototypeGameState; playerId: string; action: PrototypeAction; now: string }): { state: PrototypeGameState; events: GameEvent[] } {
  const state = JSON.parse(JSON.stringify(params.state)) as PrototypeGameState;
  const { playerId, action, now } = params;
  const player = state.players.find((item) => item.userId === playerId);
  if (!player) return { state, events: [] };
  const events: GameEvent[] = [];
  let message = "";
  const title = SPECS[state.gameId].title;

  if (action.type === "move_piece" && state.gameId === "chess") {
    const fromRow = Math.floor(action.from / 8); const fromCol = action.from % 8;
    const toRow = Math.floor(action.to / 8); const toCol = action.to % 8;
    const piece = state.board[fromRow]?.[fromCol] ?? null;
    const captured = state.board[toRow]?.[toCol] ?? null;
    if (!playerOwnsChessPiece(state, playerId, piece)) return { state: params.state, events: [] };
    state.board[fromRow]![fromCol] = null;
    state.board[toRow]![toCol] = piece;
    if (piece?.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) state.board[toRow]![toCol] = player.seat % 2 === 0 ? "Q" : "q";
    state.currentPlayerId = nextPlayerId(state, playerId);
    const opponentId = state.currentPlayerId;
    const destination = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    if (opponentId) {
      const replies = chessActions(state, opponentId);
      const checked = chessKingInCheck(state, opponentId);
      if (replies.length === 0 && checked) {
        finish(state, playerId, now);
        message = `♟️ ${player.displayName} delivered checkmate on ${destination} and wins!`;
      } else if (replies.length === 0) {
        finish(state, null, now);
        message = `🤝 Stalemate after ${player.displayName}'s move to ${destination}. The game is a draw.`;
      } else {
        message = `♟️ ${player.displayName} moved ${piece} from ${String.fromCharCode(97 + fromCol)}${8 - fromRow} to ${destination}${captured ? " and captured a piece" : ""}${checked ? " — CHECK!" : ""}.`;
      }
    } else {
      message = `♟️ ${player.displayName} moved ${piece} to ${destination}.`;
    }
  } else if (action.type === "fire" && state.gameId === "battleship") {
    const targetId = nextPlayerId(state, playerId);
    if (!targetId || targetId === playerId) return { state: params.state, events: [] };
    const hit = (state.shipCellsByPlayer[targetId] ?? []).includes(coordsKey(action.x, action.y));
    const shot: Shot = { shooterId: playerId, targetId, x: action.x, y: action.y, hit, sunk: false };
    state.shots.push(shot);
    const hits = state.shots.filter((item) => item.targetId === targetId && item.hit).length;
    const sunk = hits >= (state.shipCellsByPlayer[targetId] ?? []).length;
    shot.sunk = sunk;
    message = `${hit ? "💥 HIT" : "🌊 Splash"}! ${player.displayName} fired at ${String.fromCharCode(65 + action.x)}${action.y + 1}${sunk ? " — fleet destroyed!" : ""}`;
    if (sunk) finish(state, playerId, now);
    else state.currentPlayerId = targetId;
  } else if (action.type === "roll_dice" && state.gameId === "ludo") {
    state.diceRoll = random(state, 6) + 1; state.hasRolled = true;
    message = `🎲 ${player.displayName} rolled ${state.diceRoll}.`;
  } else if (action.type === "move_token" && state.gameId === "ludo") {
    const tokens = state.ludoTokens[playerId] ?? [-1, -1, -1, -1];
    const current = tokens[action.tokenIndex] ?? -1; const dice = state.diceRoll ?? 1;
    tokens[action.tokenIndex] = current < 0 ? 0 : Math.min(57, current + dice);
    state.ludoTokens[playerId] = tokens;
    message = `🔴 ${player.displayName} moved token ${action.tokenIndex + 1} by ${dice}.`;
    state.diceRoll = null; state.hasRolled = false;
    if (tokens.every((position) => position >= 57)) { finish(state, playerId, now); message += " 🏆 All tokens home!"; }
    else if (dice !== 6) state.currentPlayerId = nextPlayerId(state, playerId);
  } else if (action.type === "move_pawn" && state.gameId === "barricades") {
    const pawn = state.pawns[playerId]!; state.pawns[playerId] = { x: action.x, y: action.y };
    message = `🧱 ${player.displayName} moved to ${action.x + 1}, ${action.y + 1}.`;
    const playerIndex = state.players.findIndex((item) => item.userId === playerId);
    const targetY = playerIndex % 2 === 0 ? 8 : 0;
    const won = state.players.length <= 2 ? pawn && (playerIndex % 2 === 0 ? action.y === 8 : action.y === 0) : (playerIndex === 0 && action.y === 8) || (playerIndex === 1 && action.y === 0) || (playerIndex === 2 && action.x === 8) || (playerIndex === 3 && action.x === 0);
    if (won) { finish(state, playerId, now); message += " 🏆 Reached the goal!"; }
    else state.currentPlayerId = nextPlayerId(state, playerId);
    void targetY;
  } else if (action.type === "place_wall" && state.gameId === "barricades") {
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
    const attackRoll = random(state, 6) + 1; const defendRoll = random(state, 6) + 1;
    const from = state.territories.find((territory) => territory.id === action.fromId);
    const to = state.territories.find((territory) => territory.id === action.toId);
    if (!from || !to || state.territoryOwners[from.id] !== playerId || !from.neighbors.includes(to.id) || !state.territoryOwners[to.id] || state.territoryOwners[to.id] === playerId) return { state: params.state, events: [] };
    state.territoryTroops[from.id] = Math.max(1, (state.territoryTroops[from.id] ?? 1) - 1);
    if (attackRoll >= defendRoll) {
      const oldOwner = state.territoryOwners[to.id];
      state.territoryOwners[to.id] = playerId; state.territoryTroops[to.id] = 1;
      message = `⚔️ ${player.displayName} captured ${to.label} (${attackRoll} vs ${defendRoll}).`;
      if (oldOwner && !state.territories.some((territory) => state.territoryOwners[territory.id] === oldOwner)) {
        const winner = state.players.find((item) => item.userId === playerId);
        if (winner) message += ` ${winner.displayName} eliminated an opponent!`;
      }
    } else message = `🛡️ ${to.label} held (${attackRoll} vs ${defendRoll}).`;
  } else if (action.type === "reveal_word" && state.gameId === "codenames") {
    const card = state.wordCards[action.index];
    if (!card || card.revealed) return { state: params.state, events: [] };
    card.revealed = true;
    const team = state.codenamesTeamByPlayer[playerId] ?? "red";
    message = `🕵️ ${player.displayName} revealed “${card.word}” — ${card.role === "assassin" ? "ASSASSIN" : card.role.toUpperCase()}.`;
    const redRemaining = state.wordCards.filter((item) => item.role === "red" && !item.revealed).length;
    const blueRemaining = state.wordCards.filter((item) => item.role === "blue" && !item.revealed).length;
    if (card.role === "assassin") {
      const opponentTeam = team === "red" ? "blue" : "red";
      finish(state, nextPlayerOnTeam(state, opponentTeam), now);
    } else if (card.role === team) {
      if (redRemaining === 0 || blueRemaining === 0) finish(state, nextPlayerOnTeam(state, team), now);
    } else {
      const opponentTeam = team === "red" ? "blue" : "red";
      state.currentPlayerId = nextPlayerOnTeam(state, opponentTeam) ?? nextPlayerId(state, playerId);
    }
  } else if (action.type === "poker_action" && state.gameId === "poker") {
    const paid = state.pokerBets[playerId] ?? 0; const stack = state.pokerStacks[playerId] ?? 0;
    const owes = Math.max(0, state.pokerBetToCall - paid); let chips = 0;
    if (action.choice === "fold") {
      state.pokerFolded.push(playerId); message = `🃏 ${player.displayName} folded.`;
    } else if (action.choice === "check") {
      message = `🃏 ${player.displayName} checked.`;
    } else if (action.choice === "call") {
      chips = Math.min(owes, stack); message = `🃏 ${player.displayName} called $${chips}.`;
    } else if (action.choice === "raise") {
      chips = Math.min(stack, owes + 20); state.pokerBetToCall = paid + chips; message = `🃏 ${player.displayName} raised the bet to $${state.pokerBetToCall}.`;
      state.pokerActed = [];
    } else {
      chips = stack; state.pokerBetToCall = Math.max(state.pokerBetToCall, paid + chips); message = `🃏 ${player.displayName} went all-in for $${chips}.`;
    }
    if (chips > 0) {
      state.pokerStacks[playerId] = stack - chips; state.pokerBets[playerId] = paid + chips; state.pokerPot += chips;
    }
    state.pokerActed = [...new Set([...state.pokerActed, playerId])];
    state.pokerLastAction = message;
    const active = state.players.filter((item) => !state.pokerFolded.includes(item.userId));
    const everyoneActed = active.every((item) => state.pokerActed.includes(item.userId));
    const allMatched = active.every((item) => (state.pokerBets[item.userId] ?? 0) === state.pokerBetToCall || (state.pokerStacks[item.userId] ?? 0) === 0);
    if (active.length <= 1) {
      const winner = active[0]; if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
      finish(state, winner?.userId ?? null, now); state.pokerLastAction = winner ? `${winner.displayName} wins the pot by fold.` : "Hand ended.";
    } else if (everyoneActed && allMatched) advancePokerStreet(state, now);
    else state.currentPlayerId = nextPlayerId(state, playerId);
  } else if (action.type === "end_turn") {
    state.currentPlayerId = nextPlayerId(state, playerId); state.turnNumber += 1; state.hasRolled = false; state.diceRoll = null; state.reinforcedThisTurn = false;
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
      team: state.codenamesTeamByPlayer[player.userId] ?? null
    })),
    currentPlayerId: state.currentPlayerId, winnerUserId: state.winnerUserId, turnNumber: state.turnNumber, actionNumber: state.actionNumber, updatedAt: state.updatedAt,
    board: state.board.map((row) => row.slice()), pawns: { ...state.pawns }, walls: state.walls.map((wall) => ({ ...wall })), wallsRemaining: { ...state.wallsRemaining },
    ludoTokens: Object.fromEntries(Object.entries(state.ludoTokens).map(([key, tokens]) => [key, tokens.slice()])), diceRoll: state.diceRoll, hasRolled: state.hasRolled,
    money: { ...state.money }, positions: { ...state.positions }, properties: state.properties.map((property) => ({ ...property })),
    territories: state.territories.map((territory) => ({ ...territory, neighbors: territory.neighbors.slice() })), territoryOwners: { ...state.territoryOwners }, territoryTroops: { ...state.territoryTroops }, reinforcedThisTurn: state.reinforcedThisTurn,
    ownShipCells: (state.shipCellsByPlayer[viewerId] ?? []).slice(), shots: state.shots.map((shot) => ({ ...shot })),
    wordCards: state.wordCards.map((card) => ({ word: card.word, revealed: card.revealed, revealedRole: card.revealed ? card.role : null })),
    myPokerCards: (state.pokerCardsByPlayer[viewerId] ?? []).slice(), communityCards: state.communityCards.slice(), pokerStacks: { ...state.pokerStacks }, pokerBets: { ...state.pokerBets }, pokerFolded: state.pokerFolded.slice(), pokerBetToCall: state.pokerBetToCall, pokerPot: state.pokerPot, pokerStreet: state.pokerStreet, pokerLastAction: state.pokerLastAction,
    activityLog: state.activityLog.slice(-30), prototypeNotice: SPECS[state.gameId].notice
  };
}

function createModule(gameId: PrototypeGameId): GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> {
  const spec = SPECS[gameId];
  return {
    id: gameId as GameId,
    displayName: spec.title,
    version: "0.1.0-prototype",
    minPlayers: spec.min,
    maxPlayers: spec.max,
    defaultSettings: DEFAULT_SETTINGS,
    settingsSchema,
    actionSchema,
    createInitialState: (params) => createInitialState(params, gameId),
    getPublicState: ({ state, viewerId }) => publicState(state, viewerId),
    getLegalActions: ({ state, playerId }) => actionsFor(state, playerId),
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
