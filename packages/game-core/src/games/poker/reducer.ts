import { finish } from "../shared/utils";
import { advancePokerStreet, startNextPokerHand, nextPokerActor } from "./rules";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reducePokerAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "poker_action" && state.gameId === "poker"){const paid = state.pokerBets[playerId] ?? 0; const stack = state.pokerStacks[playerId] ?? 0;
    const owes = Math.max(0, state.pokerBetToCall - paid); let chips = 0;
    if (action.choice === "fold") {
      state.pokerFolded = [...new Set([...state.pokerFolded, playerId])]; message = `🃏 ${player.displayName} folded.`;
    } else if (action.choice === "check") {
      message = `🃏 ${player.displayName} checked.`;
    } else if (action.choice === "call") {
      chips = Math.min(owes, stack); message = `🃏 ${player.displayName} called $${chips}.`;
    } else if (action.choice === "raise") {
      const raiseAmt = typeof action.amount === "number" && action.amount > 0 ? action.amount : 20;
      chips = Math.min(stack, owes + raiseAmt);
      state.pokerBetToCall = paid + chips;
      message = `🃏 ${player.displayName} raised to $${state.pokerBetToCall} (+$${raiseAmt}).`;
      if (stack >= owes + raiseAmt) state.pokerActed = [];
    } else {
      chips = stack;
      const allInTotal = paid + chips;
      if (allInTotal > state.pokerBetToCall && allInTotal - state.pokerBetToCall >= 20) state.pokerActed = [];
      state.pokerBetToCall = Math.max(state.pokerBetToCall, allInTotal);
      message = `🃏 ${player.displayName} went all-in for $${chips}.`;
    }
    if (chips > 0) {
      state.pokerStacks[playerId] = stack - chips; state.pokerBets[playerId] = paid + chips; state.pokerContributions[playerId] = (state.pokerContributions[playerId] ?? 0) + chips; state.pokerPot += chips;
    }
    state.pokerActed = [...new Set([...state.pokerActed, playerId])];
    state.pokerLastAction = message;
    const active = state.players.filter((item) => !state.pokerFolded.includes(item.userId));
    const canStillAct = active.filter((item) => (state.pokerStacks[item.userId] ?? 0) > 0);
    const everyoneActed = canStillAct.every((item) => state.pokerActed.includes(item.userId));
    const allMatched = active.every((item) => (state.pokerBets[item.userId] ?? 0) === state.pokerBetToCall || (state.pokerStacks[item.userId] ?? 0) === 0);
    if (active.length <= 1) {
      const winner = active[0];
      const winningPot = state.pokerPot;
      if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;
      state.pokerPot = 0;
      state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";
      if (winner) {
        state.pokerLastHandResult = {
          handNumber: state.pokerHandNumber,
          winnerUserIds: [winner.userId],
          winnerNames: [winner.displayName],
          potWon: winningPot,
          handName: "Opponents Folded",
          byFold: true,
          isSplit: false,
          summary: `${winner.displayName} won $${winningPot} because every opponent folded.`
        };
      }
      startNextPokerHand(state, now, state.pokerLastAction);
    } else if (everyoneActed && allMatched) advancePokerStreet(state, now);
    else state.currentPlayerId = nextPokerActor(state, playerId);} else return {accepted:false,message:""};return {accepted:true,message};}
