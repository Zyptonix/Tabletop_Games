import { prisma } from "@tabletop/db";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  coins: number;
  totalGamesPlayed: number;
  totalWins: number;
  losses: number;
  winRate: number;
  gameId?: string;
  gamesPlayed?: number;
  wins?: number;
  totalScore?: number;
  bestScore?: number;
  rating?: number;
}

export class LeaderboardService {
  async getGlobalXp(limit = 50): Promise<LeaderboardEntry[]> {
    const profiles = await prisma.profile.findMany({
      orderBy: [{ xp: "desc" }, { totalWins: "desc" }, { totalGamesPlayed: "desc" }],
      take: limit,
      include: {
        user: true
      }
    });

    return profiles.map((profile, index) => {
      const wins = profile.totalWins ?? 0;
      const played = profile.totalGamesPlayed ?? 0;
      const losses = Math.max(0, played - wins);
      const winRate = played > 0 ? wins / played : 0;

      return {
        rank: index + 1,
        userId: profile.userId,
        username: profile.user.username,
        displayName: profile.displayName || profile.user.username,
        avatarUrl: profile.avatarUrl,
        xp: profile.xp ?? 0,
        level: profile.level ?? 1,
        coins: profile.coins ?? 0,
        totalGamesPlayed: played,
        totalWins: wins,
        losses,
        winRate,
        gamesPlayed: played,
        wins
      };
    });
  }

  async getGameWins(gameId: string, limit = 50): Promise<LeaderboardEntry[]> {
    const stats = await prisma.playerGameStats.findMany({
      where: { gameId },
      orderBy: [{ wins: "desc" }, { rating: "desc" }, { totalScore: "desc" }],
      take: limit,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    return stats.map((stat, index) => {
      const played = stat.gamesPlayed ?? 0;
      const wins = stat.wins ?? 0;
      const losses = stat.losses ?? Math.max(0, played - wins);
      const winRate = played > 0 ? wins / played : 0;

      return {
        rank: index + 1,
        userId: stat.userId,
        username: stat.user.username,
        displayName: stat.user.profile?.displayName || stat.user.username,
        avatarUrl: stat.user.profile?.avatarUrl ?? null,
        level: stat.user.profile?.level ?? 1,
        xp: stat.user.profile?.xp ?? 0,
        coins: stat.user.profile?.coins ?? 0,
        totalGamesPlayed: stat.user.profile?.totalGamesPlayed ?? played,
        totalWins: stat.user.profile?.totalWins ?? wins,
        gameId: stat.gameId,
        gamesPlayed: played,
        wins,
        losses,
        winRate,
        totalScore: stat.totalScore ?? 0,
        bestScore: stat.bestScore ?? 0,
        rating: stat.rating ?? 1000
      };
    });
  }

  async getSummary(limit = 50): Promise<{
    global: LeaderboardEntry[];
    games: Record<string, LeaderboardEntry[]>;
    stats: {
      totalMatches: number;
      totalPlayers: number;
      totalGamesPlayed: number;
    };
  }> {
    const [global, allStats, totalMatches, totalPlayers] = await Promise.all([
      this.getGlobalXp(limit),
      prisma.playerGameStats.findMany({
        orderBy: [{ wins: "desc" }, { rating: "desc" }, { totalScore: "desc" }],
        take: 300,
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      }),
      prisma.match.count().catch(() => 0),
      prisma.user.count().catch(() => 0)
    ]);

    const games: Record<string, LeaderboardEntry[]> = {};
    for (const stat of allStats) {
      if (!games[stat.gameId]) {
        games[stat.gameId] = [];
      }
      if (games[stat.gameId]!.length < limit) {
        const played = stat.gamesPlayed ?? 0;
        const wins = stat.wins ?? 0;
        const losses = stat.losses ?? Math.max(0, played - wins);
        const winRate = played > 0 ? wins / played : 0;

        games[stat.gameId]!.push({
          rank: games[stat.gameId]!.length + 1,
          userId: stat.userId,
          username: stat.user.username,
          displayName: stat.user.profile?.displayName || stat.user.username,
          avatarUrl: stat.user.profile?.avatarUrl ?? null,
          level: stat.user.profile?.level ?? 1,
          xp: stat.user.profile?.xp ?? 0,
          coins: stat.user.profile?.coins ?? 0,
          totalGamesPlayed: stat.user.profile?.totalGamesPlayed ?? played,
          totalWins: stat.user.profile?.totalWins ?? wins,
          gameId: stat.gameId,
          gamesPlayed: played,
          wins,
          losses,
          winRate,
          totalScore: stat.totalScore ?? 0,
          bestScore: stat.bestScore ?? 0,
          rating: stat.rating ?? 1000
        });
      }
    }

    const totalGamesPlayed = global.reduce((acc, p) => acc + p.totalGamesPlayed, 0);

    return {
      global,
      games,
      stats: {
        totalMatches,
        totalPlayers,
        totalGamesPlayed
      }
    };
  }
}

