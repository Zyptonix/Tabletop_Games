import type { GamePlayer } from "../../engine/GameTypes";
import { hashSeed, shuffleWithState } from "../../engine/rng";
import { TWENTY_NINE_DEFAULT_SETTINGS, TWENTY_NINE_VERSION } from "./constants";
import { createTwentyNineDeck } from "./deck";
import type { TwentyNineCard, TwentyNinePlayerState, TwentyNineSettings, TwentyNineState, TwentyNineTeam } from "./types";

function teamForIndex(index: number): TwentyNineTeam {
  return index % 2 === 0 ? 0 : 1;
}

function hasScoringCard(cards: TwentyNineCard[]): boolean {
  return cards.some((card) => card.points > 0);
}

export function createTwentyNineDeal(params: {
  players: GamePlayer[];
  settings: TwentyNineSettings;
  seed: string;
  now: string;
  dealerPlayerId?: string;
}): TwentyNineState {
  const sorted = params.players.slice().sort((a, b) => a.seat - b.seat);
  if (sorted.length !== 4) throw new Error("Twenty-Nine requires exactly four players.");

  let rngState = hashSeed(params.seed);
  let dealerIndex = Math.max(0, sorted.findIndex((player) => player.userId === params.dealerPlayerId));
  let selectedPlayers: TwentyNinePlayerState[] = [];
  let drawPile: TwentyNineCard[] = [];
  let valid = false;

  // Bangladesh rule: if either of the first two players to speak has no scoring
  // card in the first packet, cancel and deal again with the next dealer.
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const shuffled = shuffleWithState(createTwentyNineDeck(), rngState);
    rngState = shuffled.rngState;
    const deck = [...shuffled.values];
    const dealer = sorted[dealerIndex];
    if (!dealer) throw new Error("Twenty-Nine dealer could not be selected.");
    const speakingOrder = orderAfterDealer(sorted, dealer.userId);
    const hands = new Map<string, TwentyNineCard[]>(sorted.map((p) => [p.userId, []]));
    for (let pass = 0; pass < 4; pass += 1) {
      for (const player of speakingOrder) {
        const card = deck.shift();
        if (card) hands.get(player.userId)?.push(card);
      }
    }
    const firstTwo = speakingOrder.slice(0, 2);
    if (firstTwo.every((p) => hasScoringCard(hands.get(p.userId) ?? []))) {
      selectedPlayers = sorted.map((p, index) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        seat: p.seat,
        team: teamForIndex(index),
        hand: hands.get(p.userId) ?? [],
        tricksWon: 0
      }));
      drawPile = deck;
      valid = true;
      break;
    }
    dealerIndex = (dealerIndex + 1) % sorted.length;
  }

  if (!valid) {
    // A deterministic safety net for pathological test seeds; the next normal
    // action can still cancel/redeal and no card is lost.
    const shuffled = shuffleWithState(createTwentyNineDeck(), rngState);
    rngState = shuffled.rngState;
    drawPile = [...shuffled.values];
    const dealer = sorted[dealerIndex];
    if (!dealer) throw new Error("Twenty-Nine dealer could not be selected.");
    const speakingOrder = orderAfterDealer(sorted, dealer.userId);
    const hands = new Map<string, TwentyNineCard[]>(sorted.map((p) => [p.userId, []]));
    for (let pass = 0; pass < 4; pass += 1) for (const player of speakingOrder) {
      const card = drawPile.shift();
      if (card) hands.get(player.userId)?.push(card);
    }
    selectedPlayers = sorted.map((p, index) => ({
      userId: p.userId, username: p.username, displayName: p.displayName, seat: p.seat,
      team: teamForIndex(index), hand: hands.get(p.userId) ?? [], tricksWon: 0
    }));
  }

  const dealer = sorted[dealerIndex];
  if (!dealer) throw new Error("Twenty-Nine dealer could not be selected.");
  const firstBidder = orderAfterDealer(sorted, dealer.userId)[0];
  if (!firstBidder) throw new Error("Twenty-Nine first bidder could not be selected.");
  const settings = { ...TWENTY_NINE_DEFAULT_SETTINGS, ...params.settings };

  return {
    gameId: "twenty-nine",
    version: TWENTY_NINE_VERSION,
    settings,
    phase: "bidding",
    players: selectedPlayers,
    dealerPlayerId: dealer.userId,
    currentPlayerId: firstBidder.userId,
    drawPile,
    rngState,
    handNumber: 1,
    actionNumber: 0,
    startedAt: params.now,
    updatedAt: params.now,
    turnStartedAt: params.now,
    currentBid: null,
    highestBidderId: null,
    passedPlayerIds: [],
    firstBidderId: firstBidder.userId,
    lastBidWasDitto: false,
    bidHistory: [],
    declarerId: null,
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
    contractTarget: null,
    pairDeclaredTeam: null,
    singleHandPlayerId: null,
    currentTrick: [],
    completedTricks: [],
    capturedPointsByTeam: { "0": 0, "1": 0 },
    tricksWonByTeam: { "0": 0, "1": 0 },
    teamGamePoints: { "0": 0, "1": 0 },
    lastHandResult: null,
    handHistory: [],
    winnerTeam: null,
    results: null
  };
}

export function orderAfterDealer<T extends { userId: string }>(players: T[], dealerPlayerId: string): T[] {
  const dealerIndex = players.findIndex((player) => player.userId === dealerPlayerId);
  if (dealerIndex < 0) return [...players];
  return Array.from({ length: players.length }, (_, index) => players[(dealerIndex + 1 + index) % players.length]).filter((p): p is T => Boolean(p));
}
