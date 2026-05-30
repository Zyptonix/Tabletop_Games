import type { CardColor, CardTheme } from "./cardTypes";

export const cardThemeOptions = [
  { id: "classic", label: "Classic" },
  { id: "no_mercy", label: "No Mercy" }
] as const;

export const CARD_THEME_CONFIG: Record<CardTheme, { label: string; cardRoot: string; backKey: string }> = {
  classic: {
    label: "Classic",
    cardRoot: "/assets/uno/cards/classic",
    backKey: "back_cover"
  },
  no_mercy: {
    label: "No Mercy",
    cardRoot: "/assets/uno/cards/no_mercy",
    backKey: "no_mercy_back"
  },
  minimal: {
    label: "Minimal",
    cardRoot: "/assets/uno/cards/minimal",
    backKey: "minimal-back"
  }
};

export const CARD_COLOR_ACCENTS: Record<CardColor, string> = {
  red: "#ff3b30",
  yellow: "#ffc928",
  green: "#1ed760",
  blue: "#2d8cff",
  wild: "#f8fafc"
};