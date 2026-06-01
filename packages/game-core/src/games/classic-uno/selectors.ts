import type { ClassicUnoState, UnoAction } from "./types";
import { findUnoPlayer, isCardPlayable } from "./rules";

export function getLegalClassicUnoActions(params: {
  state: ClassicUnoState;
  playerId: string;
}): UnoAction[] {
  const { state, playerId } = params;
  const player = findUnoPlayer(state, playerId);
  if (!player || state.phase !== "playing") {
    return [];
  }

  const actions: UnoAction[] = [];

  if (player.hand.length <= 2 && !player.unoCalled) {
    actions.push({ type: "call_uno" });
  }

  if (state.currentPlayerId !== playerId) {
    return actions;
  }

  let playableActionCount = 0;
  for (const card of player.hand) {
    if (isCardPlayable(state, card) && (state.lastDrawnCardId === null || state.lastDrawnCardId === card.id)) {
      playableActionCount += 1;
      if (card.color === "wild") {
        actions.push({ type: "play_card", cardId: card.id, declaredColor: "red" });
      } else {
        actions.push({ type: "play_card", cardId: card.id });
      }
    }
  }

  if (state.pendingPenalty) {
    if (state.pendingPenalty.targetPlayerId === playerId) {
      actions.push({ type: "draw_card" });
    }
  } else if (state.lastDrawnCardId !== null) {
    actions.push({ type: "pass_turn" });
  } else if (playableActionCount === 0 || state.settings.allowDrawingWhenPlayable) {
    actions.push({ type: "draw_card" });
  }

  return actions;
}
