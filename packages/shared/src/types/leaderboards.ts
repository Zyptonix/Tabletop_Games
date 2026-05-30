export interface ProfileSummary {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  coins: number;
  totalGamesPlayed: number;
  totalWins: number;
}

export interface PlayerGameStatsView {
  userId: string;
  gameId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalScore: number;
  bestScore: number;
  rating: number;
}
