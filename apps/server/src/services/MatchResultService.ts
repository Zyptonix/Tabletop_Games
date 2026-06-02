import { prisma } from "@tabletop/db";
import type { GameResults } from "@tabletop/game-core";
import { levelFromXp } from "../utils/http";

function isBotUserId(userId: string): boolean {
  return userId.startsWith("bot:");
}

function rewardsForPlacement(params: {
  placement: number;
  playerCount: number;
  result: "WIN" | "LOSS" | "DRAW";
  score: number;
  gameId: string;
}): { xp: number; coins: number; ratingDelta: number } {
  let xp = 75;
  let coins = 12;
  let ratingDelta = -8;

  if (params.result === "WIN") {
    xp += 175;
    coins += 35;
    ratingDelta = 28;
  } else if (params.result === "DRAW") {
    xp += 40;
    coins += 8;
    ratingDelta = 0;
  }

  if (params.placement === 2) {
    xp += 85;
    coins += 18;
    ratingDelta = Math.max(ratingDelta, 12);
  }
  if (params.placement === 3) {
    xp += 45;
    coins += 10;
    ratingDelta = Math.max(ratingDelta, 4);
  }
  if (params.playerCount >= 4) {
    xp += 35;
    coins += 8;
  }
  if (params.playerCount >= 8) {
    xp += 70;
    coins += 18;
  }
  if (params.gameId === "uno-no-mercy") {
    xp += 25;
    coins += 5;
  }

  const scoreBonus = Math.min(75, Math.floor(Math.max(0, params.score) / 10));
  xp += scoreBonus;
  coins += Math.floor(scoreBonus / 5);

  return { xp, coins, ratingDelta };
}

export class MatchResultService {
  async createMatch(params: {
    roomId: string;
    gameId: string;
    gameVersion: string;
    playerCount: number;
    startedAt: Date;
  }) {
    return prisma.match.create({
      data: {
        roomId: params.roomId,
        gameId: params.gameId,
        gameVersion: params.gameVersion,
        playerCount: params.playerCount,
        startedAt: params.startedAt
      }
    });
  }

  async finalizeMatch(params: {
    matchId: string;
    roomId: string;
    gameId: string;
    results: GameResults;
    startedAt: Date;
    endedAt: Date;
  }): Promise<void> {
    const durationSeconds = Math.max(0, Math.floor((params.endedAt.getTime() - params.startedAt.getTime()) / 1000));
    const humanPlacements = params.results.placements.filter((placement) => !isBotUserId(placement.userId));
    const humanPlayerCount = Math.max(1, humanPlacements.length);
    const winnerUserId = params.results.winnerUserId && !isBotUserId(params.results.winnerUserId) ? params.results.winnerUserId : null;

    await prisma.$transaction(async (transaction) => {
      await transaction.match.update({
        where: { id: params.matchId },
        data: {
          endedAt: params.endedAt,
          winnerUserId,
          durationSeconds
        }
      });

      for (const placement of humanPlacements) {
        const rewards = rewardsForPlacement({
          placement: placement.placement,
          playerCount: humanPlayerCount,
          result: placement.result,
          score: placement.score,
          gameId: params.gameId
        });
        const xpEarned = rewards.xp;

        await transaction.matchPlayer.upsert({
          where: {
            matchId_userId: {
              matchId: params.matchId,
              userId: placement.userId
            }
          },
          update: {
            placement: placement.placement,
            score: placement.score,
            result: placement.result,
            xpEarned
          },
          create: {
            matchId: params.matchId,
            userId: placement.userId,
            placement: placement.placement,
            score: placement.score,
            result: placement.result,
            xpEarned
          }
        });

        const profile = await transaction.profile.upsert({
          where: { userId: placement.userId },
          update: {},
          create: {
            userId: placement.userId,
            displayName: "Player"
          }
        });

        const nextXp = profile.xp + xpEarned;
        const profileUpdate = {
          xp: { increment: xpEarned },
          level: levelFromXp(nextXp),
          coins: { increment: rewards.coins },
          totalGamesPlayed: { increment: 1 },
          ...(placement.result === "WIN" ? { totalWins: { increment: 1 } } : {})
        };

        await transaction.profile.update({
          where: { userId: placement.userId },
          data: profileUpdate
        });

        const existingStats = await transaction.playerGameStats.findUnique({
          where: {
            userId_gameId: {
              userId: placement.userId,
              gameId: params.gameId
            }
          }
        });

        const statsUpdate = {
          gamesPlayed: { increment: 1 },
          ...(placement.result === "WIN" ? { wins: { increment: 1 } } : {}),
          ...(placement.result === "LOSS" ? { losses: { increment: 1 } } : {}),
          totalScore: { increment: placement.score },
          bestScore: Math.max(existingStats?.bestScore ?? 0, placement.score),
          rating: { increment: rewards.ratingDelta }
        };

        await transaction.playerGameStats.upsert({
          where: {
            userId_gameId: {
              userId: placement.userId,
              gameId: params.gameId
            }
          },
          update: statsUpdate,
          create: {
            userId: placement.userId,
            gameId: params.gameId,
            gamesPlayed: 1,
            wins: placement.result === "WIN" ? 1 : 0,
            losses: placement.result === "LOSS" ? 1 : 0,
            totalScore: placement.score,
            bestScore: placement.score,
            rating: 1000 + rewards.ratingDelta
          }
        });
      }

      await transaction.room.update({
        where: { id: params.roomId },
        data: {
          status: "finished",
          endedAt: params.endedAt
        }
      });
    });
  }
}