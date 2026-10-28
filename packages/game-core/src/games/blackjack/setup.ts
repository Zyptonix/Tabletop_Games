import type { GamePlayer } from "../../engine/GameTypes";
import type { BoardGameState } from "../shared/types";
import { shuffle } from "../shared/utils";
import { createBlackjackShoe } from "./deck";

export const STARTING_CHIPS = 1000;
export const MIN_BET = 10;
export const MAX_BET = 500;

export function setupBlackjack(state: BoardGameState, players: GamePlayer[], rngState: number): number {
  const shoe = createBlackjackShoe(4);
  const shuffled = shuffle(shoe, rngState);

  state.blackjackDeck = shuffled.items;
  state.blackjackDealerHand = [];
  state.blackjackDealerHoleHidden = true;
  state.blackjackPlayerHands = Object.fromEntries(players.map((p) => [p.userId, [[]]]));
  state.blackjackBets = Object.fromEntries(players.map((p) => [p.userId, [0]]));
  state.blackjackChips = Object.fromEntries(players.map((p) => [p.userId, STARTING_CHIPS]));
  state.blackjackPhase = "betting";
  state.blackjackActivePlayerIndex = 0;
  state.blackjackActiveHandIndex = 0;
  state.blackjackReadyPlayers = [];
  state.blackjackRoundResults = {};
  state.blackjackRoundNumber = 1;
  state.blackjackLastAction = "Place your bets to start the hand.";

  // First player to act in betting
  state.currentPlayerId = players[0]?.userId ?? null;

  return shuffled.rngState;
}
