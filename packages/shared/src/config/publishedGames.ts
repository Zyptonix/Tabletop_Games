/**
 * Tabletop Arena - Published Games Configuration
 *
 * Edit this list to publish or unpublish games on live deployments (Vercel / Render).
 *
 * Behavior:
 * - When running in production (or when DEPLOYED_GAMES is set in .env),
 *   ONLY the games listed in `PUBLISHED_GAMES` (or in DEPLOYED_GAMES) will be enabled,
 *   visible on the public portal, and joinable.
 * - When running locally on LAN (without DEPLOYED_GAMES set), ALL implemented games
 *   remain accessible for testing.
 */
export const PUBLISHED_GAMES: readonly string[] = [
  "classic-uno",
  "uno-no-mercy",
  "twenty-nine",
  "snakes-and-ladders",
  "battleship",
  "chess",
  "poker",
  "blackjack",
  "mafia-werewolf",
  "strategic-shockwave",
  "connect-four",
  "reversi",
  "monopoly",
  "barricades",
  "risk",
  "world-conquest",
  "codenames"
];

/**
 * Checks whether a game is permitted to be played in the current environment.
 */
export function isGamePublished(
  gameId: string,
  deployedGamesEnv?: string | null,
  isProduction: boolean = false
): boolean {
  if (deployedGamesEnv && deployedGamesEnv.trim().length > 0) {
    const raw = deployedGamesEnv.trim().toLowerCase();
    // Support wildcards and automatically promote legacy 2-game limit to full roster
    if (raw === "*" || raw === "all" || raw === "classic-uno,uno-no-mercy") {
      return true;
    }
    const allowed = raw.split(",").map((s) => s.trim().toLowerCase());
    return allowed.includes(gameId.toLowerCase());
  }

  // All games permitted by default (full catalog active on LAN and web)
  return true;
}

/**
 * Filter a list of games by their published status.
 */
export function filterPublishedGames<T extends { id: string }>(
  games: readonly T[],
  deployedGamesEnv?: string | null,
  isProduction: boolean = false
): T[] {
  return games.filter((game) => isGamePublished(game.id, deployedGamesEnv, isProduction));
}
