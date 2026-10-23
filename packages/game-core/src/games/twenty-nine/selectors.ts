import type { TwentyNineAction, TwentyNinePlayerState, TwentyNineState, TwentyNineTeam } from "./types";
import { TWENTY_NINE_MAX_BID, TWENTY_NINE_MIN_BID } from "./constants";

function player(state: TwentyNineState, playerId: string): TwentyNinePlayerState | undefined {
  return state.players.find((item) => item.userId === playerId);
}

function teamOf(state: TwentyNineState, playerId: string): TwentyNineTeam | null {
  return player(state, playerId)?.team ?? null;
}

function canDeclarePair(state: TwentyNineState, playerId: string): boolean {
  const actor = player(state, playerId);
  if (!actor || state.phase !== "playing" || !state.trumpRevealed || !state.trumpSuit || state.pairDeclaredTeam !== null || state.singleHandPlayerId) return false;
  if (state.trumpRevealTrickNumber === null || state.completedTricks.length <= state.trumpRevealTrickNumber) return false;
  return actor.hand.some((card) => card.suit === state.trumpSuit && card.rank === "K") &&
    actor.hand.some((card) => card.suit === state.trumpSuit && card.rank === "Q");
}

function canDeclareSingleHand(state: TwentyNineState): boolean {
  return state.settings.allowSingleHand &&
    state.phase === "playing" &&
    state.singleHandPlayerId === null &&
    state.currentTrick.length === 0 &&
    state.completedTricks.length === 0;
}

export function getLegalTwentyNineActions(params: { state: TwentyNineState; playerId: string }): TwentyNineAction[] {
  const { state, playerId } = params;
  const actor = player(state, playerId);
  if (!actor || state.phase === "finished") return [];

  const pairAction: TwentyNineAction[] = canDeclarePair(state, playerId) ? [{ type: "declare_pair" }] : [];
  const singleHandAction: TwentyNineAction[] = canDeclareSingleHand(state) ? [{ type: "declare_single_hand" }] : [];

  if (state.singleHandPlayerId) {
    const solo = player(state, state.singleHandPlayerId);
    if (!solo || (actor.userId !== solo.userId && actor.team === solo.team)) return [];
    if (playerId !== state.currentPlayerId || state.phase !== "playing") return [];
    const ledSuit = state.currentTrick[0]?.card.suit;
    const following = ledSuit ? actor.hand.filter((card) => card.suit === ledSuit) : [];
    const playable = ledSuit && following.length > 0 ? following : actor.hand;
    return playable.map((card) => ({ type: "play_card", cardId: card.id }));
  }

  if (playerId !== state.currentPlayerId) return [...pairAction, ...singleHandAction];

  if (state.phase === "bidding") {
    if (state.passedPlayerIds.includes(playerId)) return pairAction;
    const firstBid = state.currentBid === null ? TWENTY_NINE_MIN_BID : state.currentBid + 1;
    const bids: TwentyNineAction[] = [];
    for (let value = firstBid; value <= TWENTY_NINE_MAX_BID; value += 1) bids.push({ type: "bid", value });
    if (
      state.currentBid !== null &&
      !state.lastBidWasDitto &&
      state.highestBidderId !== null &&
      teamOf(state, playerId) === teamOf(state, state.firstBidderId) &&
      teamOf(state, playerId) !== teamOf(state, state.highestBidderId)
    ) bids.push({ type: "ditto" });
    bids.push({ type: "pass_bid" });
    return [...pairAction, ...bids];
  }

  if (state.phase === "trump") {
    if (playerId !== state.declarerId) return pairAction;
    return [
      { type: "choose_trump_suit", suit: "spades" },
      { type: "choose_trump_suit", suit: "hearts" },
      { type: "choose_trump_suit", suit: "diamonds" },
      { type: "choose_trump_suit", suit: "clubs" },
      ...(state.settings.allowSeventhCard ? [{ type: "choose_seventh_trump" as const }] : [])
    ];
  }

  if (state.phase === "doubling") {
    if (state.doubleByPlayerId) {
      if (playerId !== state.declarerId) return pairAction;
      return [{ type: "continue_contract" }, { type: "redouble" }];
    }
    if (!state.doubleResponderIds.includes(playerId) || state.doubleRespondedPlayerIds.includes(playerId)) return pairAction;
    return [{ type: "pass_double" }, { type: "double" }];
  }

  if (state.phase !== "playing") return pairAction;

  const ledSuit = state.currentTrick[0]?.card.suit;
  if (ledSuit) {
    const following = actor.hand.filter((card) => card.suit === ledSuit);
    if (following.length > 0) {
      return [...pairAction, ...singleHandAction, ...following.map((card) => ({ type: "play_card" as const, cardId: card.id }))];
    }

    if (!state.trumpRevealed) {
      // Special seventh-card exception: it may be used on the final trick when it
      // is the declarer's only remaining card. Playing it exposes the hidden suit.
      const canPlaySeventhLast = state.completedTricks.length === 7 && playerId === state.seventhCardOwnerId &&
        state.seventhCard !== null && actor.hand.length === 0;
      if (canPlaySeventhLast) return [...pairAction, ...singleHandAction, { type: "play_card", cardId: state.seventhCard!.id }, { type: "reveal_trump" }];
      return [...pairAction, ...singleHandAction, { type: "reveal_trump" }];
    }
    // Once trump is exposed, a player void in the led suit may discard any card.
  }

  const actions: TwentyNineAction[] = [...pairAction, ...singleHandAction];
  for (const card of actor.hand) actions.push({ type: "play_card", cardId: card.id });
  if (state.completedTricks.length === 7 && playerId === state.seventhCardOwnerId && state.seventhCard && actor.hand.length === 0) {
    actions.push({ type: "play_card", cardId: state.seventhCard.id });
  }
  return actions;
}

export function twentyNineTeamOfPlayer(state: TwentyNineState, playerId: string): TwentyNineTeam | null {
  return teamOf(state, playerId);
}
