import { prisma } from "@tabletop/db";

export class LeaderboardService {
  async getGlobalXp(limit = 25) {
    const profiles = await prisma.profile.findMany({
      orderBy: [{ xp: "desc" }, { totalWins: "desc" }],
      take: limit,
      include: {
        user: true
      }
    });

    return profiles.map((profile) => ({
      userId: profile.userId,
      username: profile.user.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      xp: profile.xp,
      level: profile.level,
      coins: profile.coins,
      totalGamesPlayed: profile.totalGamesPlayed,
      totalWins: profile.totalWins
    }));
  }

  async getGameWins(gameId: string, limit = 25) {
    const stats = await prisma.playerGameStats.findMany({
      where: { gameId },
      orderBy: [{ wins: "desc" }, { rating: "desc" }],
      take: limit,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    return stats.map((stat) => ({
      userId: stat.userId,
      username: stat.user.username,
      displayName: stat.user.profile?.displayName ?? stat.user.username,
      gameId: stat.gameId,
      gamesPlayed: stat.gamesPlayed,
      wins: stat.wins,
      losses: stat.losses,
      winRate: stat.gamesPlayed === 0 ? 0 : stat.wins / stat.gamesPlayed,
      totalScore: stat.totalScore,
      bestScore: stat.bestScore,
      rating: stat.rating
    }));
  }
}
