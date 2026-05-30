export const GAME_IDS = [
  "classic-uno",
  "uno-flip",
  "uno-no-mercy",
  "monopoly",
  "codenames",
  "scribble",
  "spades",
  "polashi"
] as const;

export type GameId = (typeof GAME_IDS)[number];

export const GAME_LABELS: Record<GameId, string> = {
  "classic-uno": "Classic UNO",
  "uno-flip": "UNO Flip",
  "uno-no-mercy": "UNO No Mercy",
  monopoly: "Monopoly",
  codenames: "Codenames",
  scribble: "Scribble",
  spades: "Spades",
  polashi: "Polashi"
};
