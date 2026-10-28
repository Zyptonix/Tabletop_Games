import type { PublicBoardGameState } from "@tabletop/game-core";
import type { AnyAction } from "./types";
export const GAME_META: Record<string, { title: string; icon: string; accent: string; description: string }> = {
  chess: { title: "Chess", icon: "♟️", accent: "#a5b4fc", description: "Classic strategy" },
  battleship: { title: "Battleships", icon: "🚢", accent: "#38bdf8", description: "Naval tactics" },
  ludo: { title: "Ludo", icon: "🎲", accent: "#fbbf24", description: "Race to home" },
  barricades: { title: "Barricades", icon: "🧱", accent: "#fb923c", description: "Block and outmaneuver" },
  monopoly: { title: "Property Tycoon", icon: "🏠", accent: "#4ade80", description: "Buy, build and collect" },
  risk: { title: "Risk", icon: "🌍", accent: "#fb7185", description: "Territory strategy" },
  "world-conquest": { title: "World Conquest", icon: "🗺️", accent: "#f472b6", description: "Larger conquest map" },
  codenames: { title: "Codenames", icon: "🕵️", accent: "#facc15", description: "Team word deduction" },
  poker: { title: "Poker · Texas Hold'em", icon: "🃏", accent: "#c4b5fd", description: "Cards, blinds and betting" },
  blackjack: { title: "Blackjack · 21", icon: "🎰", accent: "#34d399", description: "Vegas table, 3:2 payouts" }
};
export const PLAYER_COLORS = ["#38bdf8", "#fb7185", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6", "#a3e635", "#94a3b8"];
export const owns = (state: PublicBoardGameState, userId: string) => state.currentPlayerId === userId && state.phase === "playing";
export function isAction(value: unknown): value is AnyAction { return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"; }
export function hasAction(actions: unknown[], type: string, match: (action: AnyAction) => boolean = () => true) { return actions.some((value) => isAction(value) && value.type === type && match(value)); }
export function money(value: number | null | undefined) { return `$${(value ?? 0).toLocaleString("en-US")}`; }
