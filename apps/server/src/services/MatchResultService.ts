import { prisma } from "@tabletop/db";
import type { GameResults } from "@tabletop/game-core";
import { levelFromXp } from "../utils/http";

function xpForPlacement(params: { placement: number; playerCount: number; result: "WIN" | "LOSS" | "DRAW" }): number {
  let xp = 50;
  if (params.result === "WIN") {
    xp += 100;
  }
  if (params.placement === 2) {
    xp += 60;
  }
  if (params.placement === 3) {
    xp += 30;
  }
  if (params.playerCount >= 4) {
    xp += 25;
  }
  if (params.playerCount >= 8) {
    xp += 50;
  }
  return xp;
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
    const playerCount = params.results.placements.length;

    await prisma.$transaction(async (transaction) => {
      await transaction.match.update({
        where: { id: params.matchId },
        data: {
          endedAt: params.endedAt,
          winnerUserId: params.results.winnerUserId,
          durationSeconds
        }
      });

      for (const placement of params.results.placements) {
        const xpEarned = xpForPlacement({
          placement: placement.placement,
          playerCount,
          result: placement.result
        });

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
          coins: { increment: Math.floor(xpEarned / 10) },
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
          bestScore: Math.max(existingStats?.bestScore ?? 0, placement.score)
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
            bestScore: placement.score
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
