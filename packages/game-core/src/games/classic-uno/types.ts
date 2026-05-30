import type { GameResults } from "../../engine/GameTypes";
import type { RngState } from "../../engine/rng";

export const UNO_COLORS = ["red", "yellow", "green", "blue"] as const;
export type UnoColor = (typeof UNO_COLORS)[number];
export type UnoDeclaredColor = UnoColor;
export type UnoCardColor = UnoColor | "wild";

export type UnoNumberValue = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type UnoActionValue = "skip" | "reverse" | "draw_two";
export type UnoWildValue = "wild" | "wild_draw_four";
export type UnoCardValue = UnoNumberValue | UnoActionValue | UnoWildValue;

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  value: UnoCardValue;
  points: number;
}

export interface UnoPlayerState {
  userId: string;
  username: string;
  displayName: string;
  seat: number;
  hand: UnoCard[];
  unoCalled: boolean;
}

export interface ClassicUnoSettings {
  cardsPerPlayer: number;
  turnSeconds: number | null;
  allowDrawingWhenPlayable: boolean;
  timeoutBehavior: "draw_then_pass" | "skip";
  mustCallUno: boolean;
}

export interface ClassicUnoState {
  gameId: "classic-uno";
  version: string;
  settings: ClassicUnoSettings;
  phase: "playing" | "finished";
  players: UnoPlayerState[];
  turnOrder: string[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  currentColor: UnoDeclaredColor;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  lastDrawnCardId: string | null;
  actionNumber: number;
  rngState: RngState;
  startedAt: string;
  updatedAt: string;
  turnStartedAt: string;
  winnerUserId: string | null;
  results: GameResults | null;
}

export type UnoAction =
  | {
      type: "play_card";
      cardId: string;
      declaredColor?: UnoDeclaredColor | undefined;
    }
  | {
      type: "draw_card";
    }
  | {
      type: "pass_turn";
    }
  | {
      type: "call_uno";
    };

export interface PublicUnoPlayer {
  userId: string;
  displayName: string;
  seat: number;
  handCount: number;
  hand?: UnoCard[];
  unoCalled: boolean;
  isCurrentTurn: boolean;
}

export interface PublicClassicUnoState {
  gameId: "classic-uno";
  phase: "playing" | "finished";
  players: PublicUnoPlayer[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  currentColor: UnoDeclaredColor;
  topDiscard: UnoCard;
  drawPileCount: number;
  discardPileCount: number;
  lastDrawnCardId: string | null;
  actionNumber: number;
  winnerUserId: string | null;
  results: GameResults | null;
}
