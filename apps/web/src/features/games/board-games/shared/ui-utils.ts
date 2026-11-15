import type { PublicBoardGameState } from "@tabletop/game-core";
import type { AnyAction } from "./types";
export const GAME_META: Record<string, { title: string; icon: string; accent: string; description: string }> = {
  chess: { title: "Chess", icon: "♟️", accent: "#a5b4fc", description: "Classic strategy" },
  battleship: { title: "Battleships", icon: "🚢", accent: "#38bdf8", description: "Naval tactics" },
  "snakes-and-ladders": { title: "Snakes and Ladders", icon: "🐍", accent: "#10b981", description: "Race to 100 with 3D ladders & snakes" },
  ludo: { title: "Snakes and Ladders", icon: "🐍", accent: "#10b981", description: "Race to 100 with 3D ladders & snakes" },
  barricades: { title: "Barricades", icon: "🧱", accent: "#fb923c", description: "Block and outmaneuver" },
  monopoly: { title: "Property Tycoon", icon: "🏠", accent: "#4ade80", description: "Buy, build and collect" },
  risk: { title: "Risk", icon: "🌍", accent: "#fb7185", description: "Territory strategy" },
  "world-conquest": { title: "World Conquest", icon: "🗺️", accent: "#f472b6", description: "Larger conquest map" },
  codenames: { title: "Codenames", icon: "🕵️", accent: "#facc15", description: "Team word deduction" },
  poker: { title: "Poker · Texas Hold'em", icon: "🃏", accent: "#c4b5fd", description: "Cards, blinds and betting" },
  blackjack: { title: "Blackjack · 21", icon: "🎰", accent: "#34d399", description: "Vegas table, 3:2 payouts" }
};
export const PLAYER_COLORS = [
  "#38bdf8", // Sky Blue
  "#fb7185", // Rose
  "#facc15", // Amber Yellow
  "#4ade80", // Lime Green
  "#c084fc", // Lavender Purple
  "#fb923c", // Bright Orange
  "#2dd4bf", // Teal
  "#f472b6", // Hot Pink
  "#a3e635", // Chartreuse
  "#e879f9", // Fuchsia
  "#06b6d4", // Cyan
  "#f59e0b", // Golden Honey
  "#60a5fa", // Cornflower
  "#ec4899", // Magenta
  "#34d399"  // Emerald
];
export const owns = (state: PublicBoardGameState, userId: string) => state.currentPlayerId === userId && state.phase === "playing";
export function isAction(value: unknown): value is AnyAction { return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"; }
export function hasAction(actions: unknown[], type: string, match: (action: AnyAction) => boolean = () => true) { return actions.some((value) => isAction(value) && value.type === type && match(value)); }
export function money(value: number | null | undefined) { return `$${(value ?? 0).toLocaleString("en-US")}`; }
