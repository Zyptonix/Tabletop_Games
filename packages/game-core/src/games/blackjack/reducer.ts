import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
import { shuffle } from "../shared/utils";
import { cardRank, createBlackjackShoe, evaluateBlackjackHand } from "./deck";
import { MIN_BET, STARTING_CHIPS } from "./setup";

function drawCard(state: BoardGameState): string {
  let deck = state.blackjackDeck ?? [];
  if (deck.length < 30) {
    const freshShoe = createBlackjackShoe(4);
    const shuffled = shuffle(freshShoe, state.rngState);
    state.rngState = shuffled.rngState;
    deck = [...deck, ...shuffled.items];
  }
  const card = deck.pop() ?? "10♠";
  state.blackjackDeck = deck;
  return card;
}

function advanceToNextPlayerOrDealer(state: BoardGameState, now: string) {
  const players = state.players;
  let pIdx = state.blackjackActivePlayerIndex ?? 0;
  let hIdx = (state.blackjackActiveHandIndex ?? 0) + 1;

  const currentP = players[pIdx];
  const currentHands = currentP ? (state.blackjackPlayerHands?.[currentP.userId] ?? []) : [];

  if (hIdx < currentHands.length) {
    state.blackjackActiveHandIndex = hIdx;
    return;
  }

  // Next player with an active bet
  pIdx += 1;
  hIdx = 0;
  while (pIdx < players.length) {
    const p = players[pIdx]!;
    const pBets = state.blackjackBets?.[p.userId] ?? [];
    if (pBets.some((b) => b > 0)) {
      break;
    }
    pIdx += 1;
  }

  if (pIdx < players.length) {
    state.blackjackActivePlayerIndex = pIdx;
    state.blackjackActiveHandIndex = 0;
    state.currentPlayerId = players[pIdx]?.userId ?? null;
    return;
  }

  // All players have completed their turns -> Dealer's Turn
  executeDealerTurnAndPayouts(state, now);
}

function executeDealerTurnAndPayouts(state: BoardGameState, now: string) {
  state.blackjackPhase = "dealer_turn";
  state.blackjackDealerHoleHidden = false;
  state.currentPlayerId = null;

  // Check if all player hands busted
  const allBusted = state.players.every((p) => {
    const hands = state.blackjackPlayerHands?.[p.userId] ?? [];
    return hands.every((h) => evaluateBlackjackHand(h).isBust);
  });

  let dealerHand = state.blackjackDealerHand ?? [];
  let dEval = evaluateBlackjackHand(dealerHand);

  // Dealer only needs to hit if at least one player hand is still active (not busted)
  if (!allBusted) {
    while (dEval.total < 17) {
      const newCard = drawCard(state);
      dealerHand = [...dealerHand, newCard];
      dEval = evaluateBlackjackHand(dealerHand);
    }
  }
  state.blackjackDealerHand = dealerHand;

  // Determine payouts and results
  const results: Record<
    string,
    Array<{ payout: number; result: "win" | "loss" | "push" | "blackjack" | "bust"; message: string }>
  > = {};

  for (const player of state.players) {
    const hands = state.blackjackPlayerHands?.[player.userId] ?? [];
    const bets = state.blackjackBets?.[player.userId] ?? [];
    const playerResults: Array<{ payout: number; result: "win" | "loss" | "push" | "blackjack" | "bust"; message: string }> = [];

    for (let i = 0; i < hands.length; i++) {
      const hand = hands[i] ?? [];
      const bet = bets[i] ?? 0;
      if (bet === 0) continue;

      const pEval = evaluateBlackjackHand(hand);
      let payout = 0;
      let result: "win" | "loss" | "push" | "blackjack" | "bust" = "loss";
      let msg = "";

      if (pEval.isBust) {
        result = "bust";
        payout = 0;
        msg = `Bust with ${pEval.total}. Lost $${bet}.`;
      } else if (pEval.isBlackjack) {
        if (dEval.isBlackjack) {
          result = "push";
          payout = bet;
          msg = `Both have Blackjack! Push (+$${bet}).`;
        } else {
          result = "blackjack";
          payout = Math.floor(bet * 2.5); // 3:2 payout (original bet + 1.5x)
          msg = `Natural Blackjack! Won $${Math.floor(bet * 1.5)}!`;
        }
      } else if (dEval.isBust) {
        result = "win";
        payout = bet * 2;
        msg = `Dealer busts with ${dEval.total}! Won $${bet}!`;
      } else if (pEval.total > dEval.total) {
        result = "win";
        payout = bet * 2;
        msg = `${pEval.total} beats dealer's ${dEval.total}! Won $${bet}!`;
      } else if (pEval.total === dEval.total) {
        result = "push";
        payout = bet;
        msg = `Push at ${pEval.total}. Returned $${bet}.`;
      } else {
        result = "loss";
        payout = 0;
        msg = `Dealer's ${dEval.total} beats ${pEval.total}. Lost $${bet}.`;
      }

      state.blackjackChips![player.userId] = (state.blackjackChips![player.userId] ?? 0) + payout;
      playerResults.push({ payout, result, message: msg });
    }

    results[player.userId] = playerResults;
  }

  state.blackjackRoundResults = results;
  state.blackjackPhase = "round_end";
  state.blackjackLastAction = dEval.isBust
    ? `Dealer busted with ${dEval.total}! Round ended.`
    : `Dealer stands with ${dEval.total}. Round ended.`;
}

export function reduceBlackjackAction(
  state: BoardGameState,
  playerId: string,
  action: BoardGameAction,
  now: string
): BoardGameReduction {
  const player = state.players.find((p) => p.userId === playerId);
  if (!player || action.type !== "blackjack_action" || state.gameId !== "blackjack") {
    return { accepted: false, message: "" };
  }

  const phase = state.blackjackPhase ?? "betting";
  let message = "";

  // -------------------------------------------------------------
  // PHASE: BETTING
  // -------------------------------------------------------------
  if (phase === "betting") {
    if (action.choice === "bet") {
      const amount = action.amount ?? 25;
      const chips = state.blackjackChips?.[playerId] ?? 0;
      if (chips < amount) {
        return { accepted: false, message: "Not enough chips to place this bet." };
      }
      state.blackjackChips![playerId] = chips - amount;
      const curBets = state.blackjackBets?.[playerId] ?? [0];
      curBets[0] = (curBets[0] ?? 0) + amount;
      state.blackjackBets![playerId] = curBets;
      message = `💰 ${player.displayName} bet $${curBets[0]}.`;
    } else if (action.choice === "clear_bet") {
      const curBets = state.blackjackBets?.[playerId] ?? [0];
      const returnAmount = curBets.reduce((a, b) => a + b, 0);
      state.blackjackChips![playerId] = (state.blackjackChips![playerId] ?? 0) + returnAmount;
      state.blackjackBets![playerId] = [0];
      state.blackjackReadyPlayers = (state.blackjackReadyPlayers ?? []).filter((id) => id !== playerId);
      message = `🪙 ${player.displayName} cleared bet.`;
    } else if (action.choice === "deal") {
      const curBets = state.blackjackBets?.[playerId] ?? [0];
      const totalBet = curBets.reduce((a, b) => a + b, 0);
      if (totalBet < MIN_BET) {
        return { accepted: false, message: `Minimum bet is $${MIN_BET}.` };
      }
      state.blackjackReadyPlayers = [...new Set([...(state.blackjackReadyPlayers ?? []), playerId])];
      message = `✨ ${player.displayName} is ready to deal ($${totalBet}).`;

      // Auto-bet for bots that haven't bet yet
      for (const p of state.players) {
        if (p.isBot && !(state.blackjackReadyPlayers ?? []).includes(p.userId)) {
          const botChips = state.blackjackChips?.[p.userId] ?? 0;
          const botBet = Math.min(25, botChips);
          if (botBet >= MIN_BET) {
            state.blackjackChips![p.userId] = botChips - botBet;
            state.blackjackBets![p.userId] = [botBet];
            state.blackjackReadyPlayers.push(p.userId);
          }
        }
      }

      // Check if all players with chips are ready (or if host clicks deal with everyone who bet)
      const playersEligible = state.players.filter((p) => (state.blackjackChips?.[p.userId] ?? 0) > 0 || (state.blackjackBets?.[p.userId]?.[0] ?? 0) > 0);
      const allReady = playersEligible.every((p) => (state.blackjackReadyPlayers ?? []).includes(p.userId));

      if (allReady) {
        // DEAL INITIAL CARDS
        state.blackjackPhase = "player_turns";
        state.blackjackDealerHand = [drawCard(state), drawCard(state)];
        state.blackjackDealerHoleHidden = true;

        for (const p of state.players) {
          const pBet = (state.blackjackBets?.[p.userId] ?? [0])[0] ?? 0;
          if (pBet > 0) {
            state.blackjackPlayerHands![p.userId] = [[drawCard(state), drawCard(state)]];
          } else {
            state.blackjackPlayerHands![p.userId] = [[]];
          }
        }

        // Set starting player
        let firstIdx = 0;
        while (firstIdx < state.players.length) {
          const p = state.players[firstIdx]!;
          if ((state.blackjackBets?.[p.userId]?.[0] ?? 0) > 0) break;
          firstIdx += 1;
        }

        state.blackjackActivePlayerIndex = firstIdx;
        state.blackjackActiveHandIndex = 0;
        state.currentPlayerId = state.players[firstIdx]?.userId ?? null;
        message = `🃏 Cards dealt! Dealer shows ${state.blackjackDealerHand[0]}.`;

        // Check if first player has Blackjack
        const firstP = state.players[firstIdx];
        if (firstP) {
          const firstH = state.blackjackPlayerHands?.[firstP.userId]?.[0] ?? [];
          if (evaluateBlackjackHand(firstH).isBlackjack) {
            advanceToNextPlayerOrDealer(state, now);
          }
        }
      }
    } else {
      return { accepted: false, message: "Invalid action for betting phase." };
    }

    state.blackjackLastAction = message;
    return { accepted: true, message };
  }

  // -------------------------------------------------------------
  // PHASE: PLAYER TURNS
  // -------------------------------------------------------------
  if (phase === "player_turns") {
    if (state.currentPlayerId !== playerId) {
      return { accepted: false, message: "It is not your turn." };
    }

    const hands = state.blackjackPlayerHands?.[playerId] ?? [[]];
    const handIndex = state.blackjackActiveHandIndex ?? 0;
    const hand = hands[handIndex] ?? [];
    const playerBets = state.blackjackBets?.[playerId] ?? [0];
    const currentBet = playerBets[handIndex] ?? 0;

    if (action.choice === "hit") {
      const card = drawCard(state);
      hand.push(card);
      hands[handIndex] = hand;
      state.blackjackPlayerHands![playerId] = hands;

      const evalRes = evaluateBlackjackHand(hand);
      if (evalRes.isBust) {
        message = `💥 ${player.displayName} busted with ${evalRes.total} (${hand.join(", ")}).`;
        advanceToNextPlayerOrDealer(state, now);
      } else if (evalRes.total === 21) {
        message = `🔥 ${player.displayName} hit 21! (${hand.join(", ")}).`;
        advanceToNextPlayerOrDealer(state, now);
      } else {
        message = `🃏 ${player.displayName} hits: ${card} (Total: ${evalRes.displayValue}).`;
      }
    } else if (action.choice === "stand") {
      const evalRes = evaluateBlackjackHand(hand);
      message = `✋ ${player.displayName} stands with ${evalRes.displayValue}.`;
      advanceToNextPlayerOrDealer(state, now);
    } else if (action.choice === "double") {
      const chips = state.blackjackChips?.[playerId] ?? 0;
      if (chips < currentBet || hand.length !== 2) {
        return { accepted: false, message: "Cannot double down." };
      }
      state.blackjackChips![playerId] = chips - currentBet;
      playerBets[handIndex] = currentBet * 2;
      state.blackjackBets![playerId] = playerBets;

      const card = drawCard(state);
      hand.push(card);
      hands[handIndex] = hand;
      state.blackjackPlayerHands![playerId] = hands;

      const evalRes = evaluateBlackjackHand(hand);
      message = `⚡ ${player.displayName} doubles down to $${currentBet * 2}: got ${card} (Total: ${evalRes.displayValue}).`;
      advanceToNextPlayerOrDealer(state, now);
    } else if (action.choice === "split") {
      const chips = state.blackjackChips?.[playerId] ?? 0;
      if (
        hand.length !== 2 ||
        cardRank(hand[0]!) !== cardRank(hand[1]!) ||
        chips < currentBet ||
        hands.length >= 4
      ) {
        return { accepted: false, message: "Cannot split this hand." };
      }

      state.blackjackChips![playerId] = chips - currentBet;
      const card1 = hand[0]!;
      const card2 = hand[1]!;

      // Two hands: each gets one of the split cards plus a new card
      const handA = [card1, drawCard(state)];
      const handB = [card2, drawCard(state)];

      hands.splice(handIndex, 1, handA, handB);
      playerBets.splice(handIndex, 1, currentBet, currentBet);

      state.blackjackPlayerHands![playerId] = hands;
      state.blackjackBets![playerId] = playerBets;

      message = `✌️ ${player.displayName} splits pair of ${cardRank(card1)}s into 2 hands!`;
    } else {
      return { accepted: false, message: "Invalid action." };
    }

    state.blackjackLastAction = message;
    return { accepted: true, message };
  }

  // -------------------------------------------------------------
  // PHASE: ROUND END -> NEXT ROUND
  // -------------------------------------------------------------
  if (phase === "round_end") {
    if (action.choice === "next_round") {
      // Clear hands and reset bets
      state.blackjackDealerHand = [];
      state.blackjackDealerHoleHidden = true;
      state.blackjackPlayerHands = Object.fromEntries(state.players.map((p) => [p.userId, [[]]]));
      state.blackjackBets = Object.fromEntries(state.players.map((p) => [p.userId, [0]]));
      state.blackjackReadyPlayers = [];
      state.blackjackRoundResults = {};
      state.blackjackRoundNumber = (state.blackjackRoundNumber ?? 1) + 1;
      state.blackjackPhase = "betting";
      state.currentPlayerId = state.players[0]?.userId ?? null;

      // Reload chips for broke players so game never stalls
      for (const p of state.players) {
        if ((state.blackjackChips?.[p.userId] ?? 0) < MIN_BET) {
          state.blackjackChips![p.userId] = Math.floor(STARTING_CHIPS / 2);
        }
      }

      message = `🎲 Round ${state.blackjackRoundNumber} started. Place your bets!`;
      state.blackjackLastAction = message;
      return { accepted: true, message };
    }
  }

  return { accepted: false, message: "Action not accepted in current phase." };
}

