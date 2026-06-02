import type { GameResults } from "../../engine/GameTypes";
import type { RngState } from "../../engine/rng";

export const NO_MERCY_COLORS = ["red", "yellow", "green", "blue"] as const;
export type NoMercyColor = (typeof NO_MERCY_COLORS)[number];
export type NoMercyDeclaredColor = NoMercyColor;
export type NoMercyCardColor = NoMercyColor | "wild";

export type NoMercyNumberValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type NoMercyActionValue = "skip" | "reverse" | "draw_two" | "draw_four" | "comeback" | "discard_all";
export type NoMercyWildValue =
  | "wild"
  | "wild_draw_four"
  | "wild_draw_four_reverse"
  | "wild_draw_six"
  | "wild_draw_ten"
  | "roulette";
export type NoMercyCardValue = NoMercyNumberValue | NoMercyActionValue | NoMercyWildValue;

export interface NoMercyCard {
  id: string;
  assetKey: string;
  color: NoMercyCardColor;
  value: NoMercyCardValue;
  points: number;
  drawAmount?: number | undefined;
  stackPower?: number | undefined;
}

export interface NoMercyPlayerState {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  hand: NoMercyCard[];
  unoCalled: boolean;
  eliminated: boolean;
}

export interface NoMercyPendingPenalty {
  amount: number;
  source: NoMercyCardValue;
  requiredResponseMinPower: number;
  targetPlayerId: string;
}

export interface NoMercyPendingRoulette {
  targetPlayerId: string;
  playedByPlayerId: string;
  chosenColor?: NoMercyDeclaredColor | undefined;
  revealedCards: NoMercyCard[];
}

export interface NoMercySettings {
  cardsPerPlayer: number;
  turnSeconds: number | null;
  eliminationHandSize: number;
  allowDrawingWhenPlayable: boolean;
  mustCallUno: boolean;
}

export interface NoMercyState {
  gameId: "uno-no-mercy";
  version: string;
  settings: NoMercySettings;
  phase: "playing" | "finished";
  players: NoMercyPlayerState[];
  turnOrder: string[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  currentColor: NoMercyDeclaredColor;
  drawPile: NoMercyCard[];
  discardPile: NoMercyCard[];
  mercyPile: NoMercyCard[];
  pendingPenalty: NoMercyPendingPenalty | null;
  pendingRoulette: NoMercyPendingRoulette | null;
  lastDrawnCardId: string | null;
  actionNumber: number;
  rngState: RngState;
  startedAt: string;
  updatedAt: string;
  turnStartedAt: string;
  winnerUserId: string | null;
  results: GameResults | null;
}

export type NoMercyAction =
  | { type: "play_card"; cardId: string; declaredColor?: NoMercyDeclaredColor | undefined; targetPlayerId?: string | undefined }
  | { type: "draw_card" }
  | { type: "resolve_roulette"; chosenColor: NoMercyDeclaredColor };

export interface PublicNoMercyPlayer {
  userId: string;
  displayName: string;
  seat: number;
  handCount: number;
  hand?: NoMercyCard[] | undefined;
  unoCalled: boolean;
  eliminated: boolean;
  isCurrentTurn: boolean;
}

export interface PublicNoMercyState {
  gameId: "uno-no-mercy";
  phase: "playing" | "finished";
  players: PublicNoMercyPlayer[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  currentColor: NoMercyDeclaredColor;
  topDiscard: NoMercyCard;
  drawPileCount: number;
  discardPileCount: number;
  mercyPileCount: number;
  pendingPenalty: NoMercyPendingPenalty | null;
  pendingRoulette: NoMercyPendingRoulette | null;
  lastDrawnCardId: string | null;
  actionNumber: number;
  winnerUserId: string | null;
  results: GameResults | null;
  turnStartedAt: string | null;
  turnDurationMs: number | null;
  turnExpiresAt: string | null;
}
