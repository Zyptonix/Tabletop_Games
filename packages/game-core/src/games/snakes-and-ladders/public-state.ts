import type { PublicSnakesAndLaddersState, SnakesAndLaddersState } from "./types";

export function getSnakesAndLaddersPublicState(params: {
  state: SnakesAndLaddersState;
  viewerId: string;
}): PublicSnakesAndLaddersState {
  const { state } = params;
  const turnDurationMs = state.settings.turnSeconds ? state.settings.turnSeconds * 1000 : null;
  const turnExpiresAt = state.turnStartedAt && turnDurationMs
    ? new Date(new Date(state.turnStartedAt).getTime() + turnDurationMs).toISOString()
    : null;

  return {
    gameId: "snakes-and-ladders",
    phase: state.phase,
    players: state.players.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      seat: p.seat,
      isBot: p.isBot,
      isCurrentTurn: p.userId === state.currentPlayerId,
      piece: p.piece,
      position: p.position,
      enteredBoard: p.enteredBoard,
      lastRoll: p.lastRoll ?? null,
      lastRollResult: p.lastRollResult ?? null
    })),
    currentPlayerId: state.currentPlayerId,
    diceRoll: state.diceRoll,
    hasRolled: state.hasRolled,
    board: state.board,
    lastMove: state.lastMove,
    winnerUserId: state.winnerUserId,
    results: state.results,
    actionNumber: state.actionNumber,
    activityLog: state.activityLog.slice(-25),
    turnStartedAt: state.turnStartedAt,
    turnDurationMs,
    turnExpiresAt
  };
}
