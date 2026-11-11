import type { GamePlayer, GameResults } from "../../engine/GameTypes";

export const SNAKES_AND_LADDERS_MAX_PLAYERS = 15;
export const SNAKES_AND_LADDERS_MIN_PLAYERS = 2;
export const SNAKES_AND_LADDERS_VERSION = "1.0.0";

export const SNAKES_AND_LADDERS_PIECES = [
  { id: "horse", name: "Royal Steed", emoji: "🐴" },
  { id: "cart", name: "Chariot Cart", emoji: "🛒" },
  { id: "rocket", name: "Cosmic Rocket", emoji: "🚀" },
  { id: "racecar", name: "Super Racer", emoji: "🏎️" },
  { id: "ship", name: "Pirate Galleon", emoji: "⛵" },
  { id: "crown", name: "Imperial Crown", emoji: "👑" },
  { id: "dragon", name: "Emerald Dragon", emoji: "🐉" },
  { id: "turtle", name: "Turbo Turtle", emoji: "🐢" },
  { id: "tophat", name: "Gentleman's Hat", emoji: "🎩" },
  { id: "cat", name: "Lucky Cat", emoji: "🐱" },
  { id: "shoe", name: "Golden Sneaker", emoji: "👟" },
  { id: "ufo", name: "Alien UFO", emoji: "🛸" },
  { id: "gem", name: "Magic Crystal", emoji: "💎" },
  { id: "lion", name: "Golden Lion", emoji: "🦁" },
  { id: "fox", name: "Phantom Fox", emoji: "🦊" }
] as const;

export type SnakesAndLaddersPieceId = (typeof SNAKES_AND_LADDERS_PIECES)[number]["id"];

export interface Ladder {
  id: string;
  from: number; // Ladder bottom (foot)
  to: number;   // Ladder top
}

export interface Snake {
  id: string;
  from: number; // Snake head (mouth)
  to: number;   // Snake tail
  controlPoints?: Array<{ x: number; y: number }>;
}

export type BoardPresetId = "classic" | "jungle" | "dunes" | "chaos";

export interface SnakesAndLaddersBoard {
  presetId: BoardPresetId;
  name: string;
  ladders: Ladder[];
  snakes: Snake[];
}

export interface SnakesAndLaddersPlayer {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  isBot: boolean;
  piece: SnakesAndLaddersPieceId;
  position: number; // 0 = Home (off-board), 1 to 100 = On Board
  enteredBoard: boolean;
  consecutiveSixes: number;
}

export interface SnakesAndLaddersSettings {
  boardPreset: BoardPresetId;
  turnSeconds: number | null;
  exactRollToWin: boolean;
  rollOneToEnter: boolean;
  playerPieces?: Record<string, SnakesAndLaddersPieceId>;
}

export interface SnakesAndLaddersActivityItem {
  id: string;
  type: string;
  message: string;
  playerId: string | null;
  createdAt: string;
}

export interface SnakesAndLaddersMoveEvent {
  playerId: string;
  from: number;
  to: number;
  rolled: number;
  ladder?: Ladder | undefined;
  snake?: Snake | undefined;
  bounced?: boolean | undefined;
  entered?: boolean | undefined;
}

export interface SnakesAndLaddersState {
  gameId: "snakes-and-ladders";
  version: string;
  settings: SnakesAndLaddersSettings;
  phase: "playing" | "finished";
  players: SnakesAndLaddersPlayer[];
  turnOrder: string[];
  currentPlayerId: string | null;
  diceRoll: number | null;
  hasRolled: boolean;
  board: SnakesAndLaddersBoard;
  lastMove: SnakesAndLaddersMoveEvent | null;
  winnerUserId: string | null;
  results: GameResults | null;
  activityLog: SnakesAndLaddersActivityItem[];
  actionNumber: number;
  rngState: number;
  turnStartedAt: string;
  startedAt: string;
  updatedAt: string;
}

export type SnakesAndLaddersAction =
  | { type: "roll_dice" }
  | { type: "select_piece"; piece: SnakesAndLaddersPieceId }
  | { type: "end_turn" };

export interface PublicSnakesAndLaddersPlayer {
  userId: string;
  displayName: string;
  seat: number;
  isBot: boolean;
  isCurrentTurn: boolean;
  piece: SnakesAndLaddersPieceId;
  position: number;
  enteredBoard: boolean;
}

export interface PublicSnakesAndLaddersState {
  gameId: "snakes-and-ladders";
  phase: "playing" | "finished";
  players: PublicSnakesAndLaddersPlayer[];
  currentPlayerId: string | null;
  diceRoll: number | null;
  hasRolled: boolean;
  board: SnakesAndLaddersBoard;
  lastMove: SnakesAndLaddersMoveEvent | null;
  winnerUserId: string | null;
  results: GameResults | null;
  actionNumber: number;
  activityLog: SnakesAndLaddersActivityItem[];
  turnStartedAt: string | null;
  turnDurationMs: number | null;
  turnExpiresAt: string | null;
}
