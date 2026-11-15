import type { ValidationResult } from "../../engine/GameTypes";
import type { TwentyNineAction, TwentyNineSettings, TwentyNineState } from "./types";
import { getLegalTwentyNineActions } from "./selectors";

export function validateTwentyNineAction(params: {
  state: TwentyNineState;
  settings: TwentyNineSettings;
  playerId: string;
  action: TwentyNineAction;
}): ValidationResult {
  const { state, playerId, action } = params;
  if (!state.players.some((player) => player.userId === playerId)) {
    return { ok: false, code: "PLAYER_NOT_IN_GAME", message: "You are not seated at this 29 table." };
  }
  const legal = getLegalTwentyNineActions({ state, playerId });
  const matched = legal.some((item) => item.type === action.type &&
    Object.entries(action).every(([key, value]) => (item as unknown as Record<string, unknown>)[key] === value));
  if (!matched) {
    if (
      action.type === "play_card" &&
      state.trumpRevealed &&
      state.trumpRevealerPlayerId === playerId &&
      state.trumpRevealTrickNumber === state.completedTricks.length &&
      state.trumpSuit
    ) {
      const actor = state.players.find((player) => player.userId === playerId);
      const hasTrump = actor?.hand.some((card) => card.suit === state.trumpSuit);
      if (hasTrump) {
        return {
          ok: false,
          code: "MUST_PLAY_TRUMP",
          message: "You revealed trump and must play a trump card to this trick."
        };
      }
    }

    const current = state.currentPlayerId ? state.players.find((player) => player.userId === state.currentPlayerId) : null;
    return {
      ok: false,
      code: "ILLEGAL_ACTION",
      message: current ? `That action is not legal now. ${current.displayName} has the current turn.` : "That action is not legal in this phase."
    };
  }
  if (action.type === "bid" && state.currentBid !== null && action.value <= state.currentBid) {
    return { ok: false, code: "INVALID_BID", message: "Raise the current bid or use Ditto when available." };
  }
  return { ok: true };
}
