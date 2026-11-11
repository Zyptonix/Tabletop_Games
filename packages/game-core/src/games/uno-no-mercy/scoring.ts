import type { GameResults } from "../../engine/GameTypes";
import type { NoMercyCard, NoMercyState } from "./types";

function scoreCard(card: NoMercyCard): number {
  if (!card) return 0;
  if (typeof card.points === "number" && !Number.isNaN(card.points) && card.points >= 0) {
    return card.points;
  }
  if (card.value === "wild_draw_ten") return 80;
  if (card.value === "wild_draw_four_reverse" || card.value === "wild_draw_six") return 60;
  if (card.value === "wild" || card.value === "roulette") return 50;
  if (card.value === "draw_four") return 40;
  if (card.value === "comeback" || card.value === "discard_all") return 30;
  if (card.value === "skip" || card.value === "reverse" || card.value === "draw_two") return 20;
  const num = Number.parseInt(String(card.value), 10);
  return Number.isNaN(num) ? 0 : num;
}

export function scoreCards(cards: NoMercyCard[]): number {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((total, card) => total + scoreCard(card), 0);
}

export function getNoMercyResults(state: NoMercyState): GameResults {
  const winnerUserId = state.winnerUserId;
  const eliminatedIds = state.eliminatedPlayerIds ?? [];

  const activePlayers = state.players.filter((player) => !player.eliminated);
  const eliminatedPlayers = state.players.filter((player) => Boolean(player.eliminated));

  const wonByElimination = Boolean(winnerUserId && activePlayers.length <= 1);
  const orderedPlayers: typeof state.players = [];

  const winner = state.players.find((p) => p.userId === winnerUserId);
  if (winner) {
    orderedPlayers.push(winner);
  }

  if (wonByElimination) {
    // Reverse order of elimination: second-to-last eliminated gets 2nd place, etc.
    const sortedEliminated = eliminatedPlayers.slice().sort((a, b) => {
      const idxA = eliminatedIds.indexOf(a.userId);
      const idxB = eliminatedIds.indexOf(b.userId);
      if (idxA !== -1 && idxB !== -1) {
        return idxB - idxA;
      }
      return (b.eliminatedAtActionNumber ?? 0) - (a.eliminatedAtActionNumber ?? 0);
    });
    for (const player of sortedEliminated) {
      if (player.userId !== winnerUserId && !orderedPlayers.some((p) => p.userId === player.userId)) {
        orderedPlayers.push(player);
      }
    }
  } else {
    // Active players ordered by lowest points in hand
    const remainingActive = activePlayers
      .filter((p) => p.userId !== winnerUserId)
      .slice()
      .sort((a, b) => scoreCards(a.hand) - scoreCards(b.hand));
    orderedPlayers.push(...remainingActive);

    // Eliminated players ordered by survival duration (last out placed ahead of earlier out)
    const sortedEliminated = eliminatedPlayers
      .filter((p) => p.userId !== winnerUserId)
      .slice()
      .sort((a, b) => {
        const idxA = eliminatedIds.indexOf(a.userId);
        const idxB = eliminatedIds.indexOf(b.userId);
        if (idxA !== -1 && idxB !== -1) {
          return idxB - idxA;
        }
        return (b.eliminatedAtActionNumber ?? 0) - (a.eliminatedAtActionNumber ?? 0);
      });
    orderedPlayers.push(...sortedEliminated);
  }

  // Any remaining unranked players
  for (const player of state.players) {
    if (!orderedPlayers.some((p) => p.userId === player.userId)) {
      orderedPlayers.push(player);
    }
  }

  const mercyPileScore = scoreCards(state.mercyPile ?? []);
  const remainingHandsScore = state.players
    .filter((player) => player.userId !== winnerUserId)
    .reduce((total, player) => total + scoreCards(player.hand), 0);

  const scoreByUserId: Record<string, number> = {};

  for (const player of state.players) {
    if (player.userId === winnerUserId) {
      // Winner gets base 100 + huge bonus 250 + opponent hand points + mercy pile points
      scoreByUserId[player.userId] = 100 + 250 + remainingHandsScore + mercyPileScore;
    } else if (!player.eliminated) {
      // Players in play get base 50 + points in hand
      scoreByUserId[player.userId] = 50 + scoreCards(player.hand);
    } else {
      // Eliminated players get base 25 + points on how long they survived
      const elimIndex = eliminatedIds.indexOf(player.userId);
      const survivalRank = elimIndex !== -1 ? elimIndex + 1 : 1;
      scoreByUserId[player.userId] = 25 + survivalRank * 20;
    }
  }

  const placements = orderedPlayers.map((player, index) => ({
    userId: player.userId,
    placement: index + 1,
    score: scoreByUserId[player.userId] ?? 25,
    result: player.userId === winnerUserId ? ("WIN" as const) : ("LOSS" as const)
  }));

  return {
    winnerUserId,
    placements,
    scoreByUserId
  };
}
