export const GAME_IDS = [
  "classic-uno",
  "uno-flip",
  "uno-no-mercy",
  "mafia-werewolf",
  "strategic-shockwave",
  "monopoly",
  "codenames",
  "scribble",
  "spades",
  "polashi",
  "twenty-nine"
] as const;

export type GameId = (typeof GAME_IDS)[number];

export const GAME_LABELS: Record<GameId, string> = {
  "classic-uno": "Classic UNO",
  "uno-flip": "UNO Flip",
  "uno-no-mercy": "UNO No Mercy",
  "mafia-werewolf": "Mafia/Werewolf",
  "strategic-shockwave": "Bomber Tag",
  monopoly: "Monopoly",
  codenames: "Codenames",
  scribble: "Scribble",
  spades: "Spades",
  polashi: "Polashi",
  "twenty-nine": "29 (Bangladesh)"
};
