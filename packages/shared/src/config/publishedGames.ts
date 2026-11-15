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
  "uno-no-mercy"
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
    if (raw === "*" || raw === "all") {
      return true;
    }
    const allowed = raw.split(",").map((s) => s.trim().toLowerCase());
    return allowed.includes(gameId.toLowerCase());
  }

  // If in production mode, default strictly to the published games list
  if (isProduction) {
    return PUBLISHED_GAMES.includes(gameId.toLowerCase());
  }

  // In local development / LAN servers, allow all games by default
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
