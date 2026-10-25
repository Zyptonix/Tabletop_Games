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
  "twenty-nine",
  "connect-four",
  "reversi",
  "chess",
  "battleship",
  "ludo",
  "barricades",
  "risk",
  "world-conquest",
  "poker"
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
  "twenty-nine": "29 (Bangladesh)",
  "connect-four": "Connect Four",
  reversi: "Reversi",
  chess: "Chess",
  battleship: "Battleships",
  ludo: "Ludo",
  barricades: "Barricades",
  risk: "Risk",
  "world-conquest": "World Conquest",
  poker: "Poker · Texas Hold'em"
};
