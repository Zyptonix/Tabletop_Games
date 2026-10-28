/**
 * Tabletop Arena game lifecycle configuration.
 *
 * "complete"  -> show the game in the main Games collection.
 * "prototype" -> show the game only under the collapsed Test Games section.
 *
 * IMPORTANT: keys must exactly match IDs returned by api.games() / the server
 * game registry. Listing a planned game here classifies it, but does not register
 * or implement it. Unrecognized/new IDs default to "prototype".
 */
export type GameStatus = "complete" | "prototype";

export const GAME_STATUS: Record<string, GameStatus> = {
  // Officially Completed Games (Verified & Ready for regular play in Main Collection)
  "uno-no-mercy": "complete",
  "classic-uno": "complete",
  "battleship": "complete",
  "mafia-werewolf": "complete",
  "twenty-nine": "complete",
  "29": "complete",
  "reversi": "complete",
  "strategic-shockwave": "complete",
  "bomber-tag": "complete",
  "chess": "complete",
  "connect-four": "complete",
  "poker": "complete",
  "blackjack": "complete",

  // Prototyping Games (Test Games & Prototypes in development)
  barricades: "prototype",
  "uno-flip": "prototype",
  monopoly: "prototype",
  codenames: "prototype",
  scribble: "prototype",
  spades: "prototype",
  polashi: "prototype",
};

export const DEFAULT_GAME_STATUS: GameStatus = "prototype";

export function getGameStatus(gameId: string): GameStatus {
  return GAME_STATUS[gameId] ?? DEFAULT_GAME_STATUS;
}

export function isCompletedGame(gameId: string): boolean {
  return getGameStatus(gameId) === "complete";
}

export function isPrototypeGame(gameId: string): boolean {
  return getGameStatus(gameId) === "prototype";
}

export function getCompletedGames<T extends { id: string }>(games: readonly T[]): T[] {
  return games.filter((game) => isCompletedGame(game.id));
}

export function getPrototypeGames<T extends { id: string }>(games: readonly T[]): T[] {
  return games.filter((game) => isPrototypeGame(game.id));
}
