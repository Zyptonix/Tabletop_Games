export const GAME_IDS = [
  "classic-uno",
  "uno-flip",
  "uno-no-mercy",
  "mafia-werewolf",
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
  "mafia-werewolf": "Mafia/Werewolf",
  monopoly: "Monopoly",
  codenames: "Codenames",
  scribble: "Scribble",
  spades: "Spades",
  polashi: "Polashi"
};
