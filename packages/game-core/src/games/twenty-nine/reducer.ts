import { createGameEvent } from "../../engine/GameEvents";
import type { GamePlayer, GameResults, TimeoutReason } from "../../engine/GameTypes";
import { cardStrength, teamCardPoints } from "./deck";
import { createTwentyNineDeal, orderAfterDealer } from "./setup";
import { getLegalTwentyNineActions } from "./selectors";
import { getTwentyNineResults } from "./scoring";
import type {
  TwentyNineAction,
  TwentyNineCard,
  TwentyNineCompletedTrick,
  TwentyNineHandResult,
  TwentyNinePlayedCard,
  TwentyNineSettings,
  TwentyNineState,
  TwentyNineTeam
} from "./types";

function playerById(state: TwentyNineState, playerId: string) {
  return state.players.find((player) => player.userId === playerId);
}

function teamById(state: TwentyNineState, playerId: string): TwentyNineTeam {
  return playerById(state, playerId)?.team ?? 0;
}

function cloneState(state: TwentyNineState): TwentyNineState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    passedPlayerIds: [...state.passedPlayerIds],
    bidHistory: [...state.bidHistory],
    doubleResponderIds: [...state.doubleResponderIds],
    doubleRespondedPlayerIds: [...state.doubleRespondedPlayerIds],
    currentTrick: [...state.currentTrick],
    completedTricks: [...state.completedTricks],
    capturedPointsByTeam: { ...state.capturedPointsByTeam },
    tricksWonByTeam: { ...state.tricksWonByTeam },
    teamGamePoints: { ...state.teamGamePoints },
    handHistory: [...state.handHistory]
  };
}

function withActionMeta(previous: TwentyNineState, next: TwentyNineState, now: string): TwentyNineState {
  return { ...next, actionNumber: previous.actionNumber + 1, updatedAt: now };
}

function nextDealerId(state: TwentyNineState): string {
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const index = ordered.findIndex((player) => player.userId === state.dealerPlayerId);
  return ordered[(index + 1) % ordered.length]?.userId ?? ordered[0]?.userId ?? state.dealerPlayerId;
}

function nextInOrder(state: TwentyNineState, playerId: string, eligible: (candidateId: string) => boolean): string | null {
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const sequence = orderAfterDealer(ordered, playerId);
  return sequence.find((player) => eligible(player.userId))?.userId ?? null;
}

/** The Bangladesh auction alternates between one active representative per team.
 * If that representative passes, their partner takes over for the team. */
function activeAuctionPlayerForTeam(state: TwentyNineState, team: TwentyNineTeam): string | null {
  const firstBidder = playerById(state, state.firstBidderId);
  if (!firstBidder) return null;
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const secondBidder = orderAfterDealer(ordered, state.firstBidderId)[0];
  const initialRepresentative = firstBidder.team === team ? firstBidder : secondBidder;
  if (initialRepresentative && initialRepresentative.team === team && !state.passedPlayerIds.includes(initialRepresentative.userId)) {
    return initialRepresentative.userId;
  }
  return state.players.find((candidate) => candidate.team === team &&
    candidate.userId !== initialRepresentative?.userId &&
    !state.passedPlayerIds.includes(candidate.userId))?.userId ?? null;
}

function availablePartner(state: TwentyNineState, playerId: string): TwentyNineState["players"][number] | undefined {
  const actor = playerById(state, playerId);
  if (!actor) return undefined;
  return state.players.find((candidate) => candidate.team === actor.team &&
    candidate.userId !== playerId &&
    !state.passedPlayerIds.includes(candidate.userId));
}

function nextAuctionPlayerAfterBid(state: TwentyNineState, playerId: string): string | null {
  const actor = playerById(state, playerId);
  if (!actor) return null;
  const otherTeam = (actor.team === 0 ? 1 : 0) as TwentyNineTeam;
  return activeAuctionPlayerForTeam(state, otherTeam) ?? availablePartner(state, playerId)?.userId ?? null;
}

function appendEvent(events: ReturnType<typeof createGameEvent>[], type: string, message: string, payload?: unknown): void {
  events.push(createGameEvent(type, { message, ...(payload === undefined ? {} : { payload }) }));
}

function nextDeal(state: TwentyNineState, now: string, lastHandResult: TwentyNineHandResult): TwentyNineState {
  const basePlayers: GamePlayer[] = state.players.map((player) => ({
    userId: player.userId,
    username: player.username,
    displayName: player.displayName,
    seat: player.seat
  }));
  const next = createTwentyNineDeal({
    players: basePlayers,
    settings: state.settings,
    seed: `${state.rngState}:${state.handNumber}:${state.actionNumber}:${now}:${lastHandResult.cancelled ? "cancel" : "hand"}`,
    now,
    dealerPlayerId: nextDealerId(state)
  });
  return {
    ...next,
    handNumber: state.handNumber + 1,
    actionNumber: state.actionNumber,
    teamGamePoints: { ...state.teamGamePoints },
    handHistory: [...state.handHistory, lastHandResult].slice(-24),
    lastHandResult,
    winnerTeam: null,
    results: null
  };
}

function cancelledResult(state: TwentyNineState, reason: string): TwentyNineHandResult {
  return {
    handNumber: state.handNumber,
    dealerPlayerId: state.dealerPlayerId,
    declarerId: state.declarerId ?? state.highestBidderId ?? state.firstBidderId,
    declarerTeam: teamById(state, state.declarerId ?? state.highestBidderId ?? state.firstBidderId),
    bid: state.currentBid ?? 0,
    contractTarget: state.contractTarget ?? state.currentBid ?? 0,
    multiplier: state.multiplier,
    teamPoints: { "0": state.capturedPointsByTeam["0"], "1": state.capturedPointsByTeam["1"] },
    succeeded: false,
    scoreChange: 0,
    pairTeam: state.pairDeclaredTeam,
    cancelled: true,
    reason
  };
}

function cancelAndRedeal(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[], reason: string): TwentyNineState {
  appendEvent(events, "twenty-nine:deal_cancelled", `Deal cancelled: ${reason}. Dealer moves on.`, { reason, nextDealerPlayerId: nextDealerId(state) });
  return nextDeal(state, now, cancelledResult(state, reason));
}

function startTrumpChoice(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[]): TwentyNineState {
  if (!state.highestBidderId || state.currentBid === null) {
    return cancelAndRedeal(state, now, events, "No player bid");
  }
  const declarer = playerById(state, state.highestBidderId);
  if (!declarer) return cancelAndRedeal(state, now, events, "Declarer was unavailable");
  appendEvent(events, "twenty-nine:auction_won", `${declarer.displayName} won the auction with ${state.currentBid}.`, {
    declarerId: declarer.userId, bid: state.currentBid, team: declarer.team
  });
  return {
    ...state,
    phase: "trump",
    declarerId: declarer.userId,
    currentPlayerId: declarer.userId,
    contractTarget: state.currentBid,
    turnStartedAt: now,
    selectedTrumpMode: null,
    trumpSuit: null,
    trumpRevealed: false,
    trumpRevealTrickNumber: null,
    seventhCard: null,
    seventhCardOwnerId: null,
    multiplier: 1,
    doubleByPlayerId: null,
    doubleResponderIds: [],
    doubleRespondedPlayerIds: [],
    pairDeclaredTeam: null,
    currentTrick: [],
    completedTricks: [],
    capturedPointsByTeam: { "0": 0, "1": 0 },
    tricksWonByTeam: { "0": 0, "1": 0 }
  };
}

function beginContractAfterTrump(state: TwentyNineState, mode: "suit" | "seventh", suit: TwentyNineState["trumpSuit"], now: string, events: ReturnType<typeof createGameEvent>[]): TwentyNineState {
  const declarer = state.declarerId ? playerById(state, state.declarerId) : undefined;
  if (!declarer) return state;
  const responders = orderAfterDealer(state.players.slice().sort((a, b) => a.seat - b.seat), declarer.userId)
    .filter((player) => player.team !== declarer.team)
    .map((player) => player.userId);
  const next: TwentyNineState = {
    ...state,
    selectedTrumpMode: mode,
    trumpSuit: suit,
    trumpRevealed: false,
    trumpRevealTrickNumber: null,
    seventhCard: null,
    seventhCardOwnerId: mode === "seventh" ? declarer.userId : null,
    phase: "doubling",
    currentPlayerId: responders[0] ?? declarer.userId,
    doubleResponderIds: responders,
    doubleRespondedPlayerIds: [],
    turnStartedAt: now
  };
  // Never publish the selected suit in a room-wide event: opponents must not
  // learn the hidden trump before a reveal action.
  appendEvent(events, "twenty-nine:trump_selected", mode === "seventh" ? `${declarer.displayName} called the seventh card for trump.` : `${declarer.displayName} selected a hidden trump suit.`, { declarerId: declarer.userId, mode });
  return next;
}

function completeFinalDeal(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[]): TwentyNineState {
  const next = cloneState(state);
  const declarerId = next.declarerId;
  if (!declarerId) return cancelAndRedeal(next, now, events, "No declarer was selected");
  const orderedPlayers = next.players.slice().sort((a, b) => a.seat - b.seat);
  const dealOrder = orderAfterDealer(orderedPlayers, next.dealerPlayerId);
  const secondRound = new Map<string, TwentyNineCard[]>(orderedPlayers.map((player) => [player.userId, []]));
  for (let pass = 0; pass < 4; pass += 1) {
    for (const player of dealOrder) {
      const card = next.drawPile.shift();
      if (!card) return cancelAndRedeal(next, now, events, "The remaining deck was incomplete");
      player.hand.push(card);
      secondRound.get(player.userId)?.push(card);
    }
  }

  if (next.selectedTrumpMode === "seventh") {
    const seventh = secondRound.get(declarerId)?.[2];
    const declarer = next.players.find((player) => player.userId === declarerId);
    if (!seventh || !declarer) return cancelAndRedeal(next, now, events, "The seventh trump card was unavailable");
    declarer.hand = declarer.hand.filter((card) => card.id !== seventh.id);
    next.seventhCard = seventh;
    next.seventhCardOwnerId = declarerId;
    next.trumpSuit = seventh.suit;

    const declarerHasPointTrump = declarer.hand.some((card) => card.suit === seventh.suit && card.points > 0);
    const opposingTeam = (declarer.team === 0 ? 1 : 0) as TwentyNineTeam;
    const opponentTrumpCards = next.players
      .filter((player) => player.team === opposingTeam)
      .flatMap((player) => player.hand)
      .filter((card) => card.suit === seventh.suit);
    const opponentsHaveOnlySevenOrNone = opponentTrumpCards.length === 0 ||
      (opponentTrumpCards.length === 1 && opponentTrumpCards[0]?.rank === "7");
    if (!declarerHasPointTrump || opponentsHaveOnlySevenOrNone) {
      return cancelAndRedeal(next, now, events, !declarerHasPointTrump
        ? "Declarer had no scoring trump apart from the seventh card"
        : "Opponents held no trump, or only the seven of trump");
    }
  }

  next.drawPile = [];
  next.phase = "playing";
  next.currentTrick = [];
  next.completedTricks = [];
  next.capturedPointsByTeam = { "0": 0, "1": 0 };
  next.tricksWonByTeam = { "0": 0, "1": 0 };
  next.pairDeclaredTeam = null;
  next.singleHandPlayerId = null;
  next.trumpRevealed = false;
  next.trumpRevealTrickNumber = null;
  next.currentPlayerId = orderAfterDealer(orderedPlayers, next.dealerPlayerId)[0]?.userId ?? null;
  next.turnStartedAt = now;
  appendEvent(events, "twenty-nine:deal_complete", "Eight cards dealt. The first trick begins.", {
    declarerId,
    bid: next.currentBid,
    trumpMode: next.selectedTrumpMode,
    multiplier: next.multiplier
  });
  return next;
}

function exposeTrump(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[], requestedBy: string): TwentyNineState {
  if (state.trumpRevealed || !state.trumpSuit) return state;
  const next = cloneState(state);
  next.trumpRevealed = true;
  next.trumpRevealTrickNumber = next.completedTricks.length;
  if (next.seventhCard && next.seventhCardOwnerId) {
    const owner = playerById(next, next.seventhCardOwnerId);
    if (owner && !owner.hand.some((card) => card.id === next.seventhCard?.id)) owner.hand.push(next.seventhCard);
    next.seventhCard = null;
  }
  const requester = playerById(next, requestedBy)?.displayName ?? "A player";
  const declarer = next.declarerId ? playerById(next, next.declarerId)?.displayName ?? "The declarer" : "The declarer";
  appendEvent(events, "twenty-nine:trump_revealed", `${requester} asked to see trump. ${declarer} revealed ${next.trumpSuit}.`, {
    requestedBy,
    declarerId: next.declarerId,
    trumpSuit: next.trumpSuit,
    trickNumber: next.completedTricks.length + 1
  });
  next.turnStartedAt = now;
  return next;
}

function findTrickWinner(state: TwentyNineState, cards: TwentyNinePlayedCard[]): TwentyNinePlayedCard {
  const first = cards[0];
  if (!first) throw new Error("Cannot determine a winner for an empty trick.");
  const trumpCards = state.trumpRevealed && state.trumpSuit
    ? cards.filter((entry) => entry.card.suit === state.trumpSuit)
    : [];
  const eligible = trumpCards.length > 0 ? trumpCards : cards.filter((entry) => entry.card.suit === first.card.suit);
  return eligible.reduce((best, entry) => cardStrength(entry.card.rank) > cardStrength(best.card.rank) ? entry : best, eligible[0] ?? first);
}

function currentHandResult(state: TwentyNineState, succeeded: boolean, scoreChange: number): TwentyNineHandResult {
  const declarerId = state.declarerId ?? state.highestBidderId ?? state.firstBidderId;
  return {
    handNumber: state.handNumber,
    dealerPlayerId: state.dealerPlayerId,
    declarerId,
    declarerTeam: teamById(state, declarerId),
    bid: state.currentBid ?? 0,
    contractTarget: state.contractTarget ?? state.currentBid ?? 0,
    multiplier: state.multiplier,
    teamPoints: { "0": state.capturedPointsByTeam["0"], "1": state.capturedPointsByTeam["1"] },
    succeeded,
    scoreChange,
    pairTeam: state.pairDeclaredTeam
  };
}

function advanceAfterScoredHand(
  previous: TwentyNineState,
  next: TwentyNineState,
  handResult: TwentyNineHandResult,
  now: string,
  events: ReturnType<typeof createGameEvent>[]
): TwentyNineState {
  const scores = next.teamGamePoints;
  let winnerTeam: TwentyNineTeam | null = null;
  if (scores["0"] >= 6) winnerTeam = 0;
  else if (scores["1"] >= 6) winnerTeam = 1;
  else if (scores["0"] <= -6) winnerTeam = 1;
  else if (scores["1"] <= -6) winnerTeam = 0;

  if (winnerTeam !== null) {
    const finalState: TwentyNineState = {
      ...next,
      phase: "finished",
      currentPlayerId: null,
      winnerTeam,
      turnStartedAt: now,
      handHistory: [...previous.handHistory, handResult].slice(-24)
    };
    finalState.results = getTwentyNineResults(finalState);
    const winners = finalState.players.filter((candidate) => candidate.team === winnerTeam).map((candidate) => candidate.displayName);
    appendEvent(events, "twenty-nine:game_over", `Match over. Team ${winnerTeam + 1} (${winners.join(" & ")}) wins.`, {
      winnerTeam,
      teamGamePoints: scores,
      results: finalState.results
    });
    return finalState;
  }

  return nextDeal(next, now, handResult);
}

function finishSingleHand(
  state: TwentyNineState,
  now: string,
  events: ReturnType<typeof createGameEvent>[],
  succeeded: boolean
): TwentyNineState {
  const callerId = state.singleHandPlayerId;
  const caller = callerId ? playerById(state, callerId) : undefined;
  if (!caller) return state;
  const scoreChange = succeeded ? 3 : -3;
  const nextScores = { ...state.teamGamePoints };
  nextScores[String(caller.team) as "0" | "1"] += scoreChange;
  const handResult: TwentyNineHandResult = {
    handNumber: state.handNumber,
    dealerPlayerId: state.dealerPlayerId,
    declarerId: caller.userId,
    declarerTeam: caller.team,
    bid: state.currentBid ?? 0,
    contractTarget: 8,
    multiplier: 1,
    teamPoints: { "0": state.capturedPointsByTeam["0"], "1": state.capturedPointsByTeam["1"] },
    succeeded,
    scoreChange,
    pairTeam: null
  };
  const next: TwentyNineState = {
    ...state,
    teamGamePoints: nextScores,
    lastHandResult: handResult,
    handHistory: state.handHistory
  };
  appendEvent(events, "twenty-nine:single_hand_scored", succeeded
    ? `${caller.displayName} won all eight tricks alone. Team ${caller.team + 1} gains +3 game points.`
    : `${caller.displayName} lost a trick during Single Hand. Team ${caller.team + 1} loses 3 game points.`,
  { playerId: caller.userId, team: caller.team, succeeded, scoreChange, teamGamePoints: nextScores, tricksPlayed: state.completedTricks.length });
  return advanceAfterScoredHand(state, next, handResult, now, events);
}

function finishOrDealNext(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[]): TwentyNineState {
  if (state.completedTricks.length !== 8) return state;
  if (!state.trumpRevealed) return cancelAndRedeal(state, now, events, "Trump was never revealed");

  const declarerId = state.declarerId;
  const declarerTeam = declarerId ? teamById(state, declarerId) : 0;
  const target = state.contractTarget ?? state.currentBid ?? 16;
  const madeContract = state.capturedPointsByTeam[String(declarerTeam) as "0" | "1"] >= target;
  const scoreChange = (madeContract ? 1 : -1) * state.multiplier;
  const nextScores = { ...state.teamGamePoints };
  nextScores[String(declarerTeam) as "0" | "1"] += scoreChange;
  const handResult = currentHandResult(state, madeContract, scoreChange);
  const next = {
    ...state,
    teamGamePoints: nextScores,
    lastHandResult: handResult,
    handHistory: state.handHistory
  };
  const declarerName = declarerId ? playerById(next, declarerId)?.displayName ?? "The declarer" : "The declarer";
  appendEvent(events, "twenty-nine:hand_scored", madeContract
    ? `${declarerName}'s team made ${target} with ${next.capturedPointsByTeam[String(declarerTeam) as "0" | "1"]} points. ${scoreChange > 0 ? "+" : ""}${scoreChange} game point${Math.abs(scoreChange) === 1 ? "" : "s"}.`
    : `${declarerName}'s team missed ${target}, taking ${next.capturedPointsByTeam[String(declarerTeam) as "0" | "1"]}. ${scoreChange} game point${Math.abs(scoreChange) === 1 ? "" : "s"}.`,
  { handResult, teamGamePoints: nextScores });

  return advanceAfterScoredHand(state, next, handResult, now, events);
}

function settleTrick(state: TwentyNineState, now: string, events: ReturnType<typeof createGameEvent>[]): TwentyNineState {
  const expectedCards = state.singleHandPlayerId ? 3 : 4;
  if (state.currentTrick.length !== expectedCards) return state;
  const next = cloneState(state);
  const winner = findTrickWinner(next, next.currentTrick);
  const first = next.currentTrick[0];
  if (!first) return next;
  const cardsInTrick = next.currentTrick.map((entry) => entry.card);
  const points = teamCardPoints(cardsInTrick);
  const trickNumber = next.completedTricks.length + 1;
  const winnerTeam = teamById(next, winner.playerId);
  const completed: TwentyNineCompletedTrick = {
    number: trickNumber,
    cards: next.currentTrick,
    winnerPlayerId: winner.playerId,
    winnerTeam,
    ledSuit: first.card.suit,
    points,
    trumpWasRevealed: next.trumpRevealed
  };
  next.completedTricks.push(completed);
  next.capturedPointsByTeam[String(winnerTeam) as "0" | "1"] += points;
  next.tricksWonByTeam[String(winnerTeam) as "0" | "1"] += 1;
  const winnerPlayer = playerById(next, winner.playerId);
  if (winnerPlayer) winnerPlayer.tricksWon += 1;
  next.currentTrick = [];
  next.currentPlayerId = winner.playerId;
  next.turnStartedAt = now;
  appendEvent(events, "twenty-nine:trick_won", `${winnerPlayer?.displayName ?? "A player"} won trick ${trickNumber} for Team ${winnerTeam + 1} (+${points} points).`, {
    trickNumber,
    winnerPlayerId: winner.playerId,
    winnerTeam,
    cards: completed.cards,
    points,
    totals: next.capturedPointsByTeam
  });
  if (next.singleHandPlayerId) {
    if (winner.playerId !== next.singleHandPlayerId) return finishSingleHand(next, now, events, false);
    if (next.completedTricks.length === 8) return finishSingleHand(next, now, events, true);
    return next;
  }
  return finishOrDealNext(next, now, events);
}

export function applyTwentyNineAction(params: {
  state: TwentyNineState;
  settings: TwentyNineSettings;
  playerId: string;
  action: TwentyNineAction;
  now: string;
}): { state: TwentyNineState; events: ReturnType<typeof createGameEvent>[] } {
  const { playerId, action, now } = params;
  const previous = params.state;
  const events: ReturnType<typeof createGameEvent>[] = [];
  if (!previous.players.some((player) => player.userId === playerId) || previous.phase === "finished") {
    return { state: previous, events };
  }
  if (!getLegalTwentyNineActions({ state: previous, playerId }).some((item) => item.type === action.type &&
    Object.entries(action).every(([key, value]) => (item as unknown as Record<string, unknown>)[key] === value))) {
    return { state: previous, events };
  }

  let state = cloneState(previous);
  const actor = playerById(state, playerId);
  const actorName = actor?.displayName ?? "A player";

  if (action.type === "bid") {
    state.currentBid = action.value;
    state.highestBidderId = playerId;
    state.lastBidWasDitto = false;
    state.bidHistory.push({ playerId, kind: "bid", value: action.value });
    state.currentPlayerId = nextAuctionPlayerAfterBid(state, playerId);
    state.turnStartedAt = now;
    appendEvent(events, "twenty-nine:bid", `${actorName} bid ${action.value}.`, { playerId, value: action.value });
  } else if (action.type === "ditto") {
    state.highestBidderId = playerId;
    state.lastBidWasDitto = true;
    state.bidHistory.push({ playerId, kind: "ditto", value: state.currentBid });
    state.currentPlayerId = nextAuctionPlayerAfterBid(state, playerId);
    state.turnStartedAt = now;
    appendEvent(events, "twenty-nine:ditto", `${actorName} said Ditto at ${state.currentBid}.`, { playerId, value: state.currentBid });
  } else if (action.type === "pass_bid") {
    state.passedPlayerIds.push(playerId);
    state.bidHistory.push({ playerId, kind: "pass", value: null });
    appendEvent(events, "twenty-nine:pass_bid", `${actorName} passed on the auction.`, { playerId });
    if (state.passedPlayerIds.length >= 3) {
      if (state.highestBidderId === null) {
        state = cancelAndRedeal(state, now, events, "The first three players passed");
      } else {
        state = startTrumpChoice(state, now, events);
      }
    } else {
      const partner = availablePartner(state, playerId);
      if (partner) {
        // The partner immediately takes over this team's auction turn.
        state.currentPlayerId = partner.userId;
        appendEvent(events, "twenty-nine:partner_takeover", `${partner.displayName} took over bidding for ${actorName}'s team.`, {
          fromPlayerId: playerId, toPlayerId: partner.userId, team: partner.team, reason: "pass"
        });
      } else if (state.highestBidderId) {
        // If the other team is out, the bidder's partner still gets a chance to bid over them.
        const highestBidder = playerById(state, state.highestBidderId);
        const bidderPartner = highestBidder ? availablePartner(state, highestBidder.userId) : undefined;
        const otherTeam = actor?.team === 0 ? 1 : 0;
        state.currentPlayerId = bidderPartner?.userId ?? activeAuctionPlayerForTeam(state, otherTeam as TwentyNineTeam);
        if (bidderPartner) {
          appendEvent(events, "twenty-nine:partner_takeover", `${bidderPartner.displayName} gets a chance to bid over teammate ${highestBidder?.displayName ?? "the current bidder"}.`, {
            fromPlayerId: highestBidder?.userId, toPlayerId: bidderPartner.userId, team: bidderPartner.team, reason: "partner_challenge"
          });
        }
      } else {
        const otherTeam = actor?.team === 0 ? 1 : 0;
        state.currentPlayerId = activeAuctionPlayerForTeam(state, otherTeam as TwentyNineTeam);
      }
      state.turnStartedAt = now;
    }
  } else if (action.type === "choose_trump_suit") {
    state = beginContractAfterTrump(state, "suit", action.suit, now, events);
    if (!state.settings.allowDoubleRedouble) state = completeFinalDeal(state, now, events);
  } else if (action.type === "choose_seventh_trump") {
    state = beginContractAfterTrump(state, "seventh", null, now, events);
    if (!state.settings.allowDoubleRedouble) state = completeFinalDeal(state, now, events);
  } else if (action.type === "pass_double") {
    state.doubleRespondedPlayerIds.push(playerId);
    const nextResponder = state.doubleResponderIds.find((id) => !state.doubleRespondedPlayerIds.includes(id));
    if (nextResponder) {
      state.currentPlayerId = nextResponder;
      state.turnStartedAt = now;
    } else {
      state = completeFinalDeal(state, now, events);
    }
    appendEvent(events, "twenty-nine:pass_double", `${actorName} declined to double.`, { playerId });
  } else if (action.type === "double") {
    state.multiplier = 2;
    state.doubleByPlayerId = playerId;
    state.doubleRespondedPlayerIds = [...state.doubleRespondedPlayerIds, playerId];
    state.currentPlayerId = state.declarerId;
    state.turnStartedAt = now;
    appendEvent(events, "twenty-nine:double", `${actorName} doubled the contract.`, { playerId, multiplier: 2 });
  } else if (action.type === "redouble") {
    state.multiplier = 4;
    appendEvent(events, "twenty-nine:redouble", `${actorName} redoubled the contract.`, { playerId, multiplier: 4 });
    state = completeFinalDeal(state, now, events);
  } else if (action.type === "continue_contract") {
    appendEvent(events, "twenty-nine:contract_locked", `${actorName} locked the contract at ×${state.multiplier}.`, { multiplier: state.multiplier });
    state = completeFinalDeal(state, now, events);
  } else if (action.type === "reveal_trump") {
    state = exposeTrump(state, now, events, playerId);
  } else if (action.type === "declare_single_hand") {
    const caller = playerById(state, playerId);
    if (!caller || state.phase !== "playing" || state.currentTrick.length !== 0 || state.completedTricks.length !== 0 || state.singleHandPlayerId !== null) {
      return { state: previous, events: [] };
    }
    // In a seventh-card contract, Single Hand has no trump. Return the indicator
    // card to its original owner so all eight cards remain available in play.
    if (state.seventhCard && state.seventhCardOwnerId) {
      const owner = playerById(state, state.seventhCardOwnerId);
      if (owner && !owner.hand.some((card) => card.id === state.seventhCard?.id)) owner.hand.push(state.seventhCard);
    }
    state.singleHandPlayerId = playerId;
    state.currentPlayerId = playerId;
    state.selectedTrumpMode = null;
    state.trumpSuit = null;
    state.trumpRevealed = false;
    state.trumpRevealTrickNumber = null;
    state.seventhCard = null;
    state.seventhCardOwnerId = null;
    state.pairDeclaredTeam = null;
    state.turnStartedAt = now;
    appendEvent(events, "twenty-nine:single_hand_declared", `${actorName} declared Single Hand. They must win all eight tricks alone; there is no trump.`, {
      playerId,
      team: caller.team,
      partnerId: state.players.find((candidate) => candidate.team === caller.team && candidate.userId !== playerId)?.userId ?? null,
      targetTricks: 8,
      scoreAtStake: 3
    });
  } else if (action.type === "declare_pair") {
    if (actor && state.trumpSuit) {
      const team = actor.team;
      state.pairDeclaredTeam = team;
      const oldTarget = state.contractTarget ?? state.currentBid ?? 16;
      const declarerTeam = state.declarerId ? teamById(state, state.declarerId) : 0;
      if (team === declarerTeam) {
        state.contractTarget = oldTarget > 18 ? Math.max(16, oldTarget - 4) : oldTarget;
      } else {
        state.contractTarget = Math.min(28, oldTarget + 4);
      }
      appendEvent(events, "twenty-nine:pair", `Team ${team + 1} declared the King–Queen pair. Contract target is now ${state.contractTarget}.`, {
        playerId, team, contractTarget: state.contractTarget
      });
    }
  } else if (action.type === "play_card") {
    const liveActor = playerById(state, playerId);
    if (!liveActor) return { state: previous, events: [] };
    let card = liveActor.hand.find((item) => item.id === action.cardId);
    if (!card && state.seventhCard?.id === action.cardId && state.seventhCardOwnerId === playerId && state.completedTricks.length === 7 && liveActor.hand.length === 0) {
      state = exposeTrump(state, now, events, playerId);
      const revealedActor = playerById(state, playerId);
      card = revealedActor?.hand.find((item) => item.id === action.cardId);
    }
    if (!card) return { state: previous, events: [] };
    const currentActor = playerById(state, playerId);
    if (!currentActor) return { state: previous, events: [] };
    currentActor.hand = currentActor.hand.filter((item) => item.id !== card!.id);
    const played: TwentyNinePlayedCard = { playerId, card };
    state.currentTrick.push(played);
    appendEvent(events, "twenty-nine:card_played", `${actorName} played ${card.rank} of ${card.suit}.`, {
      playerId, card, trickNumber: state.completedTricks.length + 1, ledSuit: state.currentTrick[0]?.card.suit
    });
    const neededCards = state.singleHandPlayerId ? 3 : 4;
    if (state.currentTrick.length === neededCards) {
      state = settleTrick(state, now, events);
    } else {
      state.currentPlayerId = nextInOrder(state, playerId, (candidateId) => {
        if (!state.singleHandPlayerId) return true;
        const solo = playerById(state, state.singleHandPlayerId);
        const candidate = playerById(state, candidateId);
        if (!solo || !candidate) return false;
        return candidate.userId === solo.userId || candidate.team !== solo.team;
      });
      state.turnStartedAt = now;
    }
  }

  state = withActionMeta(previous, state, now);
  return { state, events };
}

export function applyTwentyNineTimeout(params: {
  state: TwentyNineState;
  settings: TwentyNineSettings;
  playerId: string;
  reason: TimeoutReason;
  now: string;
}): { state: TwentyNineState; events: ReturnType<typeof createGameEvent>[] } | null {
  const { state, playerId, now } = params;
  if (state.phase === "finished" || state.currentPlayerId !== playerId) return null;
  const legal = getLegalTwentyNineActions({ state, playerId });
  let action: TwentyNineAction | undefined;
  if (state.phase === "bidding") action = { type: "pass_bid" };
  else if (state.phase === "trump") {
    const player = playerById(state, playerId);
    const suitCounts = new Map<string, number>();
    for (const card of player?.hand ?? []) suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
    const suit = ([...suitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "spades") as NonNullable<TwentyNineState["trumpSuit"]>;
    action = { type: "choose_trump_suit", suit };
  } else if (state.phase === "doubling") {
    action = state.doubleByPlayerId ? { type: "continue_contract" } : { type: "pass_double" };
  } else if (state.phase === "playing") {
    action = legal.find((item) => item.type === "reveal_trump") ?? legal.find((item) => item.type === "play_card") ?? legal.find((item) => item.type === "declare_pair");
  }
  if (!action) return null;
  return applyTwentyNineAction({ state, settings: state.settings, playerId, action, now });
}
