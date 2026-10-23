import type { GameResults } from "../../engine/GameTypes";
import type { RngState } from "../../engine/rng";

export const TWENTY_NINE_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type TwentyNineSuit = (typeof TWENTY_NINE_SUITS)[number];
export const TWENTY_NINE_RANKS = ["7", "8", "Q", "K", "10", "A", "9", "J"] as const;
export type TwentyNineRank = (typeof TWENTY_NINE_RANKS)[number];
export type TwentyNineTeam = 0 | 1;
export type TwentyNinePhase = "bidding" | "trump" | "doubling" | "playing" | "finished";

export interface TwentyNineCard {
  id: string;
  suit: TwentyNineSuit;
  rank: TwentyNineRank;
  points: number;
}

export interface TwentyNineSettings {
  turnSeconds: number | null;
  allowSeventhCard: boolean;
  allowDoubleRedouble: boolean;
  allowSingleHand: boolean;
}

export interface TwentyNinePlayerState {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  team: TwentyNineTeam;
  hand: TwentyNineCard[];
  tricksWon: number;
}

export interface TwentyNineBidEntry {
  playerId: string;
  kind: "bid" | "ditto" | "pass";
  value: number | null;
}

export interface TwentyNinePlayedCard {
  playerId: string;
  card: TwentyNineCard;
}

export interface TwentyNineCompletedTrick {
  number: number;
  cards: TwentyNinePlayedCard[];
  winnerPlayerId: string;
  winnerTeam: TwentyNineTeam;
  ledSuit: TwentyNineSuit;
  points: number;
  trumpWasRevealed: boolean;
}

export interface TwentyNineHandResult {
  handNumber: number;
  dealerPlayerId: string;
  declarerId: string;
  declarerTeam: TwentyNineTeam;
  bid: number;
  contractTarget: number;
  multiplier: 1 | 2 | 4;
  teamPoints: Record<"0" | "1", number>;
  succeeded: boolean;
  scoreChange: number;
  pairTeam: TwentyNineTeam | null;
  cancelled?: boolean;
  reason?: string;
}

export interface TwentyNineState {
  gameId: "twenty-nine";
  version: string;
  settings: TwentyNineSettings;
  phase: TwentyNinePhase;
  players: TwentyNinePlayerState[];
  dealerPlayerId: string;
  currentPlayerId: string | null;
  drawPile: TwentyNineCard[];
  rngState: RngState;
  handNumber: number;
  actionNumber: number;
  startedAt: string;
  updatedAt: string;
  turnStartedAt: string;

  currentBid: number | null;
  highestBidderId: string | null;
  passedPlayerIds: string[];
  firstBidderId: string;
  lastBidWasDitto: boolean;
  bidHistory: TwentyNineBidEntry[];

  declarerId: string | null;
  selectedTrumpMode: "suit" | "seventh" | null;
  trumpSuit: TwentyNineSuit | null;
  trumpRevealed: boolean;
  trumpRevealTrickNumber: number | null;
  seventhCard: TwentyNineCard | null;
  seventhCardOwnerId: string | null;

  multiplier: 1 | 2 | 4;
  doubleByPlayerId: string | null;
  doubleResponderIds: string[];
  doubleRespondedPlayerIds: string[];
  contractTarget: number | null;
  pairDeclaredTeam: TwentyNineTeam | null;
  singleHandPlayerId: string | null;

  currentTrick: TwentyNinePlayedCard[];
  completedTricks: TwentyNineCompletedTrick[];
  capturedPointsByTeam: Record<"0" | "1", number>;
  tricksWonByTeam: Record<"0" | "1", number>;
  teamGamePoints: Record<"0" | "1", number>;
  lastHandResult: TwentyNineHandResult | null;
  handHistory: TwentyNineHandResult[];
  winnerTeam: TwentyNineTeam | null;
  results: GameResults | null;
}

export interface PublicTwentyNinePlayer {
  userId: string;
  displayName: string;
  seat: number;
  team: TwentyNineTeam;
  handCount: number;
  hand?: TwentyNineCard[];
  isCurrentTurn: boolean;
  tricksWon: number;
  connected?: boolean;
}

export interface PublicTwentyNineState {
  gameId: "twenty-nine";
  phase: TwentyNinePhase;
  players: PublicTwentyNinePlayer[];
  dealerPlayerId: string;
  currentPlayerId: string | null;
  handNumber: number;
  actionNumber: number;
  currentBid: number | null;
  highestBidderId: string | null;
  passedPlayerIds: string[];
  bidHistory: TwentyNineBidEntry[];
  declarerId: string | null;
  selectedTrumpMode: "suit" | "seventh" | null;
  trumpSuit: TwentyNineSuit | null;
  trumpRevealed: boolean;
  privateSeventhCard?: TwentyNineCard | null;
  multiplier: 1 | 2 | 4;
  doubleByPlayerId: string | null;
  contractTarget: number | null;
  pairDeclaredTeam: TwentyNineTeam | null;
  singleHandPlayerId: string | null;
  currentTrick: TwentyNinePlayedCard[];
  completedTricks: TwentyNineCompletedTrick[];
  capturedPointsByTeam: Record<"0" | "1", number>;
  tricksWonByTeam: Record<"0" | "1", number>;
  teamGamePoints: Record<"0" | "1", number>;
  lastHandResult: TwentyNineHandResult | null;
  handHistory: TwentyNineHandResult[];
  settings: TwentyNineSettings;
  winnerTeam: TwentyNineTeam | null;
  results: GameResults | null;
  turnStartedAt: string | null;
  turnDurationMs: number | null;
  turnExpiresAt: string | null;
}

export type TwentyNineAction =
  | { type: "bid"; value: number }
  | { type: "ditto" }
  | { type: "pass_bid" }
  | { type: "choose_trump_suit"; suit: TwentyNineSuit }
  | { type: "choose_seventh_trump" }
  | { type: "pass_double" }
  | { type: "double" }
  | { type: "redouble" }
  | { type: "continue_contract" }
  | { type: "reveal_trump" }
  | { type: "declare_pair" }
  | { type: "declare_single_hand" }
  | { type: "play_card"; cardId: string };
