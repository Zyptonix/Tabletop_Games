import type { ClassicUnoState, PublicClassicUnoState } from "./types";
import { getTopDiscard } from "./rules";

export function getPublicClassicUnoState(params: {
  state: ClassicUnoState;
  viewerId: string;
}): PublicClassicUnoState {
  const { state, viewerId } = params;
  
  const turnDurationMs = state.settings.turnSeconds ? state.settings.turnSeconds * 1000 : null;
  const turnExpiresAt = state.turnStartedAt && turnDurationMs 
    ? new Date(new Date(state.turnStartedAt).getTime() + turnDurationMs).toISOString()
    : null;

  return {
    gameId: "classic-uno",
    phase: state.phase,
    players: state.players.map((player) => {
      const publicPlayer = {
        userId: player.userId,
        displayName: player.displayName,
        seat: player.seat,
        handCount: player.hand.length,
        unoCalled: player.unoCalled,
        isCurrentTurn: player.userId === state.currentPlayerId
      };

      if (player.userId === viewerId) {
        return {
          ...publicPlayer,
          hand: player.hand
        };
      }

      return publicPlayer;
    }),
    currentPlayerId: state.currentPlayerId,
    direction: state.direction,
    currentColor: state.currentColor,
    topDiscard: getTopDiscard(state),
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    lastDrawnCardId: state.lastDrawnCardId,
    actionNumber: state.actionNumber,
    winnerUserId: state.winnerUserId,
    results: state.results,
    turnStartedAt: state.turnStartedAt,
    turnDurationMs,
    turnExpiresAt
  };
}
