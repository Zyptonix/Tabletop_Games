import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { finish, shuffle } from "../shared/utils";
import { freshDeck, RANKS } from "./deck";
export type PokerHandValue = number[];

export function pokerCardValue(card: string): { rank: number; suit: string } {
  const suit = card.slice(-1);
  const rankText = card.slice(0, -1);
  const rankIndex = RANKS.indexOf(rankText);
  return { rank: rankIndex >= 0 ? rankIndex + 2 : 0, suit };
}

export function pokerStraightHigh(ranks: number[]): number {
  const distinct = new Set(ranks);
  if (distinct.has(14)) distinct.add(1); // A-2-3-4-5 wheel straight.
  for (let high = 14; high >= 5; high -= 1) {
    if ([0, 1, 2, 3, 4].every((offset) => distinct.has(high - offset))) return high;
  }
  return 0;
}

export function evaluateFiveCardPokerHand(cards: string[]): PokerHandValue {
  const parsed = cards.map(pokerCardValue);
  const ranks = parsed.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = parsed.every((card) => card.suit === parsed[0]?.suit);
  const straightHigh = pokerStraightHigh(ranks);
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0]?.[1] === 4) return [7, groups[0][0], groups.find((group) => group[1] === 1)?.[0] ?? 0];
  const trips = groups.filter((group) => group[1] === 3).map((group) => group[0]);
  const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]);
  if (trips.length && (pairs.length || trips.length > 1)) return [6, trips[0] ?? 0, Math.max(pairs[0] ?? 0, trips[1] ?? 0)];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (trips.length) return [3, trips[0] ?? 0, ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  if (pairs.length >= 2) {
    const highPair = Math.max(pairs[0] ?? 0, pairs[1] ?? 0);
    const lowPair = Math.min(pairs[0] ?? 0, pairs[1] ?? 0);
    const kicker = groups.find((group) => group[1] === 1)?.[0] ?? 0;
    return [2, highPair, lowPair, kicker];
  }
  if (pairs.length === 1) return [1, pairs[0] ?? 0, ...groups.filter((group) => group[1] === 1).map((group) => group[0])];
  return [0, ...ranks];
}

export function comparePokerHandValues(left: PokerHandValue, right: PokerHandValue): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function bestPokerHandValue(cards: string[]): PokerHandValue {
  if (cards.length < 5) return evaluateFiveCardPokerHand(cards.concat(Array.from({ length: 5 - cards.length }, () => "2♣")));
  let best: PokerHandValue = [-1];
  const chosen: string[] = [];
  const visit = (start: number) => {
    if (chosen.length === 5) {
      const value = evaluateFiveCardPokerHand(chosen);
      if (comparePokerHandValues(value, best) > 0) best = value;
      return;
    }
    const needed = 5 - chosen.length;
    for (let index = start; index <= cards.length - needed; index += 1) {
      chosen.push(cards[index]!);
      visit(index + 1);
      chosen.pop();
    }
  };
  visit(0);
  return best;
}

export function evaluateTexasHoldemHand(cards: string[]): PokerHandValue {
  return bestPokerHandValue(cards);
}

export function nextPokerActor(state: BoardGameState, fromId: string | null = state.currentPlayerId): string | null {
  if (!state.players.length) return null;
  const startIndex = state.players.findIndex((player) => player.userId === fromId);
  const index = startIndex < 0 ? -1 : startIndex;
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(index + offset + state.players.length) % state.players.length];
    if (!player || state.pokerFolded.includes(player.userId)) continue;
    if ((state.pokerStacks[player.userId] ?? 0) <= 0) continue;
    return player.userId;
  }
  return null;
}

export function startNextPokerHand(state: BoardGameState, now: string, previousHandNote = ""): void {
  const survivingPlayers = state.players.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  if (survivingPlayers.length <= 1) {
    const champion = survivingPlayers[0] ?? null;
    state.pokerPot = 0;
    state.pokerLastAction = champion
      ? `${previousHandNote ? `${previousHandNote} · ` : ""}${champion.displayName} wins the Poker tournament with the last remaining stack.`
      : `${previousHandNote ? `${previousHandNote} · ` : ""}Poker tournament ended without a surviving stack.`;
    finish(state, champion?.userId ?? null, now);
    return;
  }

  // Reset hand-scoped data but preserve tournament stacks and rotate the dealer
  // to the next player who still has chips. Zero-stack players are eliminated.
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const oldButtonIndex = ordered.findIndex((player) => player.seat === state.pokerButtonSeat);
  let button: GamePlayer | null = null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const candidate = ordered[(Math.max(0, oldButtonIndex) + offset) % ordered.length];
    if (candidate && (state.pokerStacks[candidate.userId] ?? 0) > 0) { button = candidate; break; }
  }
  button ??= survivingPlayers[0] ?? null;
  if (!button) {
    finish(state, null, now);
    return;
  }

  state.phase = "playing";
  state.winnerUserId = null;
  state.pokerHandNumber = (state.pokerHandNumber ?? 1) + 1;
  state.pokerButtonSeat = button.seat;
  state.pokerStreet = "preflop";
  state.pokerPot = 0;
  state.pokerBetToCall = 0;
  state.pokerFolded = state.players
    .filter((player) => (state.pokerStacks[player.userId] ?? 0) <= 0)
    .map((player) => player.userId);
  state.pokerActed = [];
  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerContributions = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.communityCards = [];
  state.pokerCardsByPlayer = {};

  const shuffled = shuffle(freshDeck(), state.rngState);
  state.pokerDeck = shuffled.items;
  state.rngState = shuffled.rngState;
  for (const player of survivingPlayers) {
    state.pokerCardsByPlayer[player.userId] = [state.pokerDeck.shift()!, state.pokerDeck.shift()!];
  }

  const active = ordered.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  const buttonIndex = active.findIndex((player) => player.userId === button!.userId);
  const smallBlindIndex = active.length <= 2 ? buttonIndex : (buttonIndex + 1) % active.length;
  const bigBlindIndex = active.length <= 2 ? (buttonIndex + 1) % active.length : (buttonIndex + 2) % active.length;
  const smallBlindPlayer = active[smallBlindIndex] ?? button;
  const bigBlindPlayer = active[bigBlindIndex] ?? active.find((player) => player.userId !== smallBlindPlayer.userId) ?? button;
  for (const [blindPlayer, nominalBlind] of [[smallBlindPlayer, 10], [bigBlindPlayer, 20]] as Array<[GamePlayer, number]>) {
    if (!blindPlayer || state.pokerFolded.includes(blindPlayer.userId)) continue;
    const paid = Math.min(nominalBlind, state.pokerStacks[blindPlayer.userId] ?? 0);
    state.pokerStacks[blindPlayer.userId] = (state.pokerStacks[blindPlayer.userId] ?? 0) - paid;
    state.pokerBets[blindPlayer.userId] = (state.pokerBets[blindPlayer.userId] ?? 0) + paid;
    state.pokerContributions[blindPlayer.userId] = (state.pokerContributions[blindPlayer.userId] ?? 0) + paid;
    state.pokerPot += paid;
  }
  state.pokerBetToCall = Math.max(0, ...Object.values(state.pokerBets));
  if (active.length <= 2) {
    state.currentPlayerId = (state.pokerStacks[button.userId] ?? 0) > 0 ? button.userId : nextPokerActor(state, button.userId);
  } else {
    state.currentPlayerId = nextPokerActor(state, bigBlindPlayer.userId);
  }
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = [previousHandNote, `Hand ${state.pokerHandNumber} begins`, `Blinds $10/$20`, `Button: ${button.displayName}`]
    .filter(Boolean).join(" · ");

  // When blind posts put every remaining player all-in, play the runout and
  // showdown automatically instead of waiting for an action that cannot happen.
  if (!state.currentPlayerId) advancePokerStreet(state, now);
}

export function settlePokerShowdown(state: BoardGameState, now: string): void {
  const active = state.players.filter((player) => !state.pokerFolded.includes(player.userId));
  const values = new Map(active.map((player) => [player.userId, bestPokerHandValue([...(state.pokerCardsByPlayer[player.userId] ?? []), ...state.communityCards])]));
  const contributions = state.players.map((player) => ({ player, amount: Math.max(0, state.pokerContributions[player.userId] ?? 0) }));
  const levels = [...new Set(contributions.map((entry) => entry.amount).filter((amount) => amount > 0))].sort((a, b) => a - b);
  let previousLevel = 0;
  let mainPotWinners: GamePlayer[] = [];
  let distributed = 0;

  for (const level of levels) {
    const contributors = contributions.filter((entry) => entry.amount >= level);
    const potAmount = (level - previousLevel) * contributors.length;
    const eligible = contributors.map((entry) => entry.player).filter((player) => !state.pokerFolded.includes(player.userId));
    if (potAmount > 0 && eligible.length > 0) {
      let bestValue: PokerHandValue | null = null;
      let winners: GamePlayer[] = [];
      for (const player of eligible) {
        const value = values.get(player.userId) ?? [0];
        const comparison = bestValue === null ? 1 : comparePokerHandValues(value, bestValue);
        if (comparison > 0) { bestValue = value; winners = [player]; }
        else if (comparison === 0) winners.push(player);
      }
      winners.sort((a, b) => a.seat - b.seat);
      const share = Math.floor(potAmount / winners.length);
      let remainder = potAmount - share * winners.length;
      for (const winner of winners) {
        state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
      }
      if (previousLevel === 0) mainPotWinners = winners;
      distributed += potAmount;
    }
    previousLevel = level;
  }

  // Protect chip conservation if a restored/legacy snapshot has a pot that predates
  // contribution tracking. Such a residual goes to the best hand among active players.
  const residual = Math.max(0, state.pokerPot - distributed);
  if (residual > 0 && active.length > 0) {
    let winners: GamePlayer[] = [];
    let bestValue: PokerHandValue | null = null;
    for (const player of active) {
      const value = values.get(player.userId) ?? [0];
      const comparison = bestValue === null ? 1 : comparePokerHandValues(value, bestValue);
      if (comparison > 0) { bestValue = value; winners = [player]; }
      else if (comparison === 0) winners.push(player);
    }
    const share = Math.floor(residual / winners.length);
    let remainder = residual - share * winners.length;
    for (const winner of winners.sort((a, b) => a.seat - b.seat)) {
      state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
    if (mainPotWinners.length === 0) mainPotWinners = winners;
  }
  state.pokerPot = 0;
  state.pokerStreet = "showdown";
  if (mainPotWinners.length === 1) {
    const winner = mainPotWinners[0]!;
    const rankName = ["high card", "one pair", "two pair", "three of a kind", "straight", "flush", "full house", "four of a kind", "straight flush"][(values.get(winner.userId)?.[0] ?? 0)] ?? "best hand";
    state.pokerLastAction = `${winner.displayName} takes the main pot with ${rankName}; side pots are settled.`;
  } else {
    state.pokerLastAction = `Main pot split: ${mainPotWinners.map((player) => player.displayName).join(", ") || "no eligible player"}. Side pots are settled.`;
  }
  // Only the tournament end condition finalizes a match. A normal showdown pays
  // the pots and immediately starts the next hand while at least two stacks remain.
  startNextPokerHand(state, now, state.pokerLastAction);
}

export function advancePokerStreet(state: BoardGameState, now: string): void {
  const active = state.players.filter((player) => !state.pokerFolded.includes(player.userId));
  if (active.length <= 1) {
    const winner = active[0];
    if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
    state.pokerPot = 0;
    state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";
    startNextPokerHand(state, now, state.pokerLastAction);
    return;
  }

  if (state.pokerStreet === "preflop") {
    const burn = state.pokerDeck.shift();
    void burn;
    state.communityCards.push(state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?", state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "flop";
  } else if (state.pokerStreet === "flop") {
    state.pokerDeck.shift(); // burn card
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "turn";
  } else if (state.pokerStreet === "turn") {
    state.pokerDeck.shift(); // burn card
    state.communityCards.push(state.pokerDeck.shift() ?? "?");
    state.pokerStreet = "river";
  } else {
    settlePokerShowdown(state, now);
    return;
  }

  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerBetToCall = 0;
  state.pokerActed = [];
  const button = state.players.find((player) => player.seat === state.pokerButtonSeat) ?? state.players[0];
  state.currentPlayerId = nextPokerActor(state, button?.userId ?? null);
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = `Cards dealt: ${state.pokerStreet}.`;

  // If every live player is all-in, run the remaining board automatically through
  // river and showdown instead of waiting for an action from a zero-chip player.
  if (!state.currentPlayerId) advancePokerStreet(state, now);
}
