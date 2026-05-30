import type { NoMercyAction, NoMercyDeclaredColor, NoMercyState } from "./types";
import {
  cardRequiresDeclaredColor,
  findNoMercyPlayer,
  getActivePlayers,
  hasPlayableCard,
  isCardPlayable
} from "./rules";
import { NO_MERCY_COLORS } from "./types";

const declaredColors: NoMercyDeclaredColor[] = [...NO_MERCY_COLORS];

export function getLegalNoMercyActions(params: { state: NoMercyState; playerId: string }): NoMercyAction[] {
  const { state, playerId } = params;
  const player = findNoMercyPlayer(state, playerId);
  if (!player || player.eliminated || state.phase !== "playing") {
    return [];
  }

  const actions: NoMercyAction[] = [];

  if (player.hand.length <= 2) {
    actions.push({ type: "call_uno" });
  }

  if (state.currentPlayerId !== playerId) {
    return actions;
  }

  if (state.pendingPenalty) {
    if (state.pendingPenalty.targetPlayerId === playerId) {
      actions.push({ type: "draw_card" });
    }
  } else if (state.lastDrawnCardId === null) {
    if (state.settings.allowDrawingWhenPlayable || !hasPlayableCard(state, player)) {
      actions.push({ type: "draw_card" });
    }
  } else {
    actions.push({ type: "pass_turn" });
  }

  const activeTargets = getActivePlayers(state).filter((target) => target.userId !== playerId);

  for (const card of player.hand) {
    if (state.lastDrawnCardId !== null && card.id !== state.lastDrawnCardId) {
      continue;
    }
    if (!isCardPlayable(state, card)) {
      continue;
    }

    if (cardRequiresDeclaredColor(card)) {
      for (const declaredColor of declaredColors) {
        actions.push({ type: "play_card", cardId: card.id, declaredColor });
      }
      continue;
    }

    if (card.value === "7" && activeTargets.length > 0) {
      for (const target of activeTargets) {
        actions.push({ type: "play_card", cardId: card.id, targetPlayerId: target.userId });
      }
      continue;
    }

    actions.push({ type: "play_card", cardId: card.id });
  }

  return actions;
}
