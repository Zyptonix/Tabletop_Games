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
  // Main menu: promote games only after they're verified and ready for regular play.
  "uno-no-mercy": "complete",

  // Existing / worked-on Tabletop Arena games awaiting main-menu approval.
  "classic-uno": "complete",
  "battleship": "complete",
  "twenty-nine": "complete",
  "mafia-werewolf": "complete",
  "connect-four": "complete",
  "chess": "complete",
  reversi: "complete",
  poker: "prototype",
  barricades: "prototype",

  // Other catalog entries / planned experiments from the project.
  "uno-flip": "prototype",
  monopoly: "prototype",
  codenames: "prototype",
  scribble: "prototype",
  spades: "prototype",
  polashi: "prototype",
  "strategic-shockwave": "complete",
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
