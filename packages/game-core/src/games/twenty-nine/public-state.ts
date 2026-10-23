import type { PublicTwentyNinePlayer, PublicTwentyNineState, TwentyNineState } from "./types";

export function getPublicTwentyNineState(params: { state: TwentyNineState; viewerId: string }): PublicTwentyNineState {
  const { state, viewerId } = params;
  const durationMs = state.settings.turnSeconds === null ? null : state.settings.turnSeconds * 1000;
  const expiresAt = state.turnStartedAt && durationMs !== null
    ? new Date(new Date(state.turnStartedAt).getTime() + durationMs).toISOString()
    : null;

  const players: PublicTwentyNinePlayer[] = state.players.map((player) => {
    const isViewer = player.userId === viewerId;
    const holdsHiddenSeventh = state.seventhCard !== null && state.seventhCardOwnerId === player.userId && !state.trumpRevealed;
    const publicPlayer: PublicTwentyNinePlayer = {
      userId: player.userId,
      displayName: player.displayName,
      seat: player.seat,
      team: player.team,
      handCount: player.hand.length + (holdsHiddenSeventh ? 1 : 0),
      isCurrentTurn: player.userId === state.currentPlayerId,
      tricksWon: player.tricksWon
    };
    if (isViewer) publicPlayer.hand = player.hand;
    return publicPlayer;
  });

  return {
    gameId: "twenty-nine",
    phase: state.phase,
    players,
    dealerPlayerId: state.dealerPlayerId,
    currentPlayerId: state.currentPlayerId,
    handNumber: state.handNumber,
    actionNumber: state.actionNumber,
    currentBid: state.currentBid,
    highestBidderId: state.highestBidderId,
    passedPlayerIds: state.passedPlayerIds,
    bidHistory: state.bidHistory,
    declarerId: state.declarerId,
    selectedTrumpMode: state.selectedTrumpMode,
    trumpSuit: state.trumpRevealed || viewerId === state.declarerId ? state.trumpSuit : null,
    trumpRevealed: state.trumpRevealed,
    ...(viewerId === state.seventhCardOwnerId && state.seventhCard && !state.trumpRevealed
      ? { privateSeventhCard: state.seventhCard }
      : {}),
    multiplier: state.multiplier,
    doubleByPlayerId: state.doubleByPlayerId,
    contractTarget: state.contractTarget,
    pairDeclaredTeam: state.pairDeclaredTeam,
    singleHandPlayerId: state.singleHandPlayerId,
    currentTrick: state.currentTrick,
    completedTricks: state.completedTricks,
    capturedPointsByTeam: state.capturedPointsByTeam,
    tricksWonByTeam: state.tricksWonByTeam,
    teamGamePoints: state.teamGamePoints,
    lastHandResult: state.lastHandResult,
    handHistory: state.handHistory,
    settings: state.settings,
    winnerTeam: state.winnerTeam,
    results: state.results,
    turnStartedAt: state.phase === "finished" ? null : state.turnStartedAt,
    turnDurationMs: durationMs,
    turnExpiresAt: expiresAt
  };
}
