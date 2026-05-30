import type { ValidationResult } from "../../engine/GameTypes";
import type { ClassicUnoSettings } from "./types";
import type { ClassicUnoState, UnoAction } from "./types";
import {
  cardRequiresDeclaredColor,
  findUnoPlayer,
  hasPlayableCard,
  isCardPlayable
} from "./rules";

export function validateClassicUnoAction(params: {
  state: ClassicUnoState;
  settings: ClassicUnoSettings;
  playerId: string;
  action: UnoAction;
}): ValidationResult {
  const { state, settings, playerId, action } = params;
  const player = findUnoPlayer(state, playerId);

  if (!player) {
    return { ok: false, code: "PLAYER_NOT_IN_GAME", message: "You are not seated in this game." };
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

  if (action.type === "draw_card") {
    if (!settings.allowDrawingWhenPlayable && hasPlayableCard(state, player)) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "You have a playable card." };
    }
    if (state.lastDrawnCardId !== null) {
      return { ok: false, code: "ILLEGAL_ACTION", message: "Play or pass after drawing." };
    }
    return { ok: true };
  }

  if (action.type === "pass_turn") {
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
    return {
      ok: false,
      code: "ILLEGAL_ACTION",
      message: "After drawing, you may only play the drawn card or pass."
    };
  }

  if (!isCardPlayable(state, card)) {
    return { ok: false, code: "ILLEGAL_ACTION", message: "That card cannot be played here." };
  }

  if (cardRequiresDeclaredColor(card) && !action.declaredColor) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Choose a color for that wild card." };
  }

  return { ok: true };
}
