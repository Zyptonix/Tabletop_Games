import { getTopDiscard } from "./rules";
import type { NoMercyState, PublicNoMercyState } from "./types";

/**
 * Public state is intentionally viewer-specific. A player receives their own hand,
 * while everyone else's cards stay hidden behind counts.
 */
export function getPublicNoMercyState(params: { state: NoMercyState; viewerId: string }): PublicNoMercyState {
  const { state, viewerId } = params;
  
  const turnDurationMs = state.settings.turnSeconds ? state.settings.turnSeconds * 1000 : null;
  const turnExpiresAt = state.turnStartedAt && turnDurationMs 
    ? new Date(new Date(state.turnStartedAt).getTime() + turnDurationMs).toISOString()
    : null;

  return {
    gameId: "uno-no-mercy",
    phase: state.phase,
    players: state.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      seat: player.seat,
      handCount: player.hand.length,
      hand: player.userId === viewerId ? player.hand : undefined,
      unoCalled: player.unoCalled,
      eliminated: player.eliminated,
      isCurrentTurn: player.userId === state.currentPlayerId
    })),
    currentPlayerId: state.currentPlayerId,
    direction: state.direction,
    currentColor: state.currentColor,
    topDiscard: getTopDiscard(state),
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    mercyPileCount: state.mercyPile?.length ?? 0,
    pendingPenalty: state.pendingPenalty,
    pendingRoulette: state.pendingRoulette,
    lastDrawnCardId: state.lastDrawnCardId,
    actionNumber: state.actionNumber,
    winnerUserId: state.winnerUserId,
    results: state.results,
    turnStartedAt: state.turnStartedAt,
    turnDurationMs,
    turnExpiresAt
  };
}
