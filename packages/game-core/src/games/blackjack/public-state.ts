import type { BoardGameState, PublicBoardGameState } from "../shared/types";
import { publicBoardGameBase } from "../shared/public-state";
import { evaluateBlackjackHand } from "./deck";

export function getBlackjackPublicState(state: BoardGameState, viewerId: string): PublicBoardGameState {
  const base = publicBoardGameBase(
    state,
    "Standard Vegas Blackjack: Dealer hits soft 16, stands on 17. Blackjack pays 3:2."
  );

  const rawDealerHand = state.blackjackDealerHand ?? [];
  const holeHidden = state.blackjackDealerHoleHidden ?? false;

  const sanitizedDealerHand = holeHidden
    ? rawDealerHand.length > 0
      ? [rawDealerHand[0]!, "hidden"]
      : []
    : [...rawDealerHand];

  const visibleDealerCards = holeHidden && rawDealerHand.length > 0 ? [rawDealerHand[0]!] : rawDealerHand;
  const dealerScore = evaluateBlackjackHand(visibleDealerCards).total;

  return {
    ...base,
    blackjackDealerHand: sanitizedDealerHand,
    blackjackDealerHoleHidden: holeHidden,
    blackjackDealerScore: dealerScore,
    blackjackPlayerHands: state.blackjackPlayerHands
      ? JSON.parse(JSON.stringify(state.blackjackPlayerHands))
      : undefined,
    blackjackBets: state.blackjackBets ? { ...state.blackjackBets } : undefined,
    blackjackChips: state.blackjackChips ? { ...state.blackjackChips } : undefined,
    blackjackPhase: state.blackjackPhase,
    blackjackActiveHandIndex: state.blackjackActiveHandIndex,
    blackjackReadyPlayers: state.blackjackReadyPlayers ? [...state.blackjackReadyPlayers] : undefined,
    blackjackRoundResults: state.blackjackRoundResults
      ? JSON.parse(JSON.stringify(state.blackjackRoundResults))
      : undefined,
    blackjackRoundNumber: state.blackjackRoundNumber,
    blackjackLastAction: state.blackjackLastAction ?? "Place your bets."
  };
}
