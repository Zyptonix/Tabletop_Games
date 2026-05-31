import type { ValidationResult } from "../../engine/GameTypes";
import type { NoMercyAction, NoMercySettings, NoMercyState } from "./types";
import {
  cardRequiresDeclaredColor,
  findNoMercyPlayer,
  getActivePlayers,
  hasPlayableCard,
  isCardPlayable
} from "./rules";

export function validateNoMercyAction(params: {
  state: NoMercyState;
  settings: NoMercySettings;
  playerId: string;
  action: NoMercyAction;
}): ValidationResult {
  const { state, settings, playerId, action } = params;
  const player = findNoMercyPlayer(state, playerId);

  if (!player) {
    return { ok: false, code: "PLAYER_NOT_IN_GAME", message: "You are not seated in this game." };
  }

  if (player.eliminated) {
    return { ok: false, code: "PLAYER_ELIMINATED", message: "You have been eliminated from this round." };
  }

  if (state.phase !== "playing") {
    return { ok: false, code: "GAME_FINISHED", message: "This game has already finished." };
  }

  if (action.type === "call_uno") {
    if (player.hand.length > 2) {
      return { ok: false, code: "INVALID_ACTION", message: "UNO can only be called near one card." };
    }
    return { ok: true };
  }

  if (state.currentPlayerId !== playerId) {
    return { ok: false, code: "NOT_YOUR_TURN", message: "It is not your turn." };
  }

  if (state.pendingRoulette) {
    if (state.pendingRoulette.targetPlayerId !== playerId) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Roulette is aimed at another player." };
    }

    if (!state.pendingRoulette.chosenColor) {
      if (action.type !== "resolve_roulette") {
        return { ok: false, code: "ILLEGAL_ACTION", message: "Choose a roulette color first." };
      }
      return { ok: true };
    }

    if (action.type !== "draw_card") {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Draw roulette cards until the chosen color appears." };
    }

    return { ok: true };
  }

  if (action.type === "resolve_roulette") {
    return { ok: false, code: "ILLEGAL_ACTION", message: "There is no roulette to resolve." };
  }

  if (action.type === "draw_card") {
    if (state.pendingPenalty) {
      if (state.pendingPenalty.targetPlayerId !== playerId) {
        return { ok: false, code: "ILLEGAL_ACTION", message: "The draw penalty is aimed at another player." };
      }
      return { ok: true };
    }
    if (!settings.allowDrawingWhenPlayable && hasPlayableCard(state, player)) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "You have a playable card." };
    }
    if (state.lastDrawnCardId !== null) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Play or pass after drawing." };
    }
    return { ok: true };
  }

  if (action.type === "pass_turn") {
    if (state.pendingPenalty) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Resolve the draw penalty first." };
    }
    if (state.lastDrawnCardId === null) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "You can pass only after drawing a card." };
    }
    return { ok: true };
  }

  const card = player.hand.find((item) => item.id === action.cardId);
  if (!card) {
    return { ok: false, code: "INVALID_CARD", message: "That card is not in your hand." };
  }

  if (state.lastDrawnCardId !== null && card.id !== state.lastDrawnCardId) {
    return { ok: false, code: "ILLEGAL_ACTION", message: "After drawing, play the drawn card or pass." };
  }

  if (!isCardPlayable(state, card)) {
    return { ok: false, code: "ILLEGAL_ACTION", message: "That card cannot be played here." };
  }

  if (cardRequiresDeclaredColor(card) && !action.declaredColor) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Choose a color for that wild card." };
  }

  if (!cardRequiresDeclaredColor(card) && action.declaredColor) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "This card does not choose a color now." };
  }

  const targetablePlayers = getActivePlayers(state).filter((target) => target.userId !== playerId);
  if (card.value === "7" && targetablePlayers.length > 0) {
    if (!action.targetPlayerId) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "Choose a player to swap hands with." };
    }
    if (!targetablePlayers.some((target) => target.userId === action.targetPlayerId)) {
      return { ok: false, code: "INVALID_TARGET", message: "Choose an active opponent." };
    }
  }

  if (card.value !== "7" && action.targetPlayerId) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "This card does not target a player." };
  }

  return { ok: true };
}
