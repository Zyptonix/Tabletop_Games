import { finish } from "../shared/utils";
import { nextCodenamesOperative, endCodenamesTeamTurn, nextPlayerOnTeam } from "./rules";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceCodenamesAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "give_clue" && state.gameId === "codenames"){const team = state.codenamesTeamByPlayer[playerId];
    const clue = action.clue.trim();
    const normalized = clue.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!team || team !== state.codenamesRoundTeam || playerId !== state.codenamesSpymasterByTeam[team] || state.codenamesClue !== null || !clue || clue.length > 30 || /\s/.test(clue) || state.wordCards.some((card) => card.word.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)) return {accepted:false,message:""};
    state.codenamesClue = clue;
    state.codenamesClueNumber = action.number;
    state.codenamesGuessesRemaining = action.number === 0 ? state.wordCards.filter((card) => !card.revealed).length : action.number + 1;
    const operativeId = nextCodenamesOperative(state, team);
    if (!operativeId) {
      message = `🕵️ ${player.displayName} gave ${clue} (${action.number}), but the team has no operative to guess.`;
      endCodenamesTeamTurn(state);
    } else {
      state.currentPlayerId = operativeId;
      message = `🕵️ ${player.displayName} gives ${team.toUpperCase()} the clue “${clue}” (${action.number}). Operatives may make ${state.codenamesGuessesRemaining} guess${state.codenamesGuessesRemaining === 1 ? "" : "es"}.`;
    }} else if(action.type === "end_codenames_turn" && state.gameId === "codenames"){const team = state.codenamesTeamByPlayer[playerId];
    if (!team || team !== state.codenamesRoundTeam || state.currentPlayerId !== playerId || playerId === state.codenamesSpymasterByTeam[team] || state.codenamesClue === null) return {accepted:false,message:""};
    endCodenamesTeamTurn(state);
    message = `➡️ ${player.displayName} ended the ${team.toUpperCase()} guessing turn. ${state.codenamesRoundTeam.toUpperCase()} is up next.`;} else if(action.type === "reveal_word" && state.gameId === "codenames"){const team = state.codenamesTeamByPlayer[playerId];
    const card = state.wordCards[action.index];
    if (!team || team !== state.codenamesRoundTeam || state.currentPlayerId !== playerId || playerId === state.codenamesSpymasterByTeam[team] || state.codenamesClue === null || state.codenamesGuessesRemaining <= 0 || !card || card.revealed) return {accepted:false,message:""};
    card.revealed = true;
    const redRemaining = state.wordCards.filter((item) => item.role === "red" && !item.revealed).length;
    const blueRemaining = state.wordCards.filter((item) => item.role === "blue" && !item.revealed).length;
    if (card.role === "assassin") {
      const winnerTeam = team === "red" ? "blue" : "red";
      const winnerId = nextPlayerOnTeam(state, winnerTeam);
      finish(state, winnerId, now);
      message = `☠️ ${player.displayName} revealed the assassin. ${winnerTeam.toUpperCase()} wins!`;
    } else if (redRemaining === 0) {
      finish(state, nextPlayerOnTeam(state, "red"), now);
      message = `🏆 ${player.displayName} revealed the final red agent. RED wins!`;
    } else if (blueRemaining === 0) {
      finish(state, nextPlayerOnTeam(state, "blue"), now);
      message = `🏆 ${player.displayName} revealed the final blue agent. BLUE wins!`;
    } else if (card.role === team) {
      state.codenamesGuessesRemaining = Math.max(0, state.codenamesGuessesRemaining - 1);
      if (state.codenamesGuessesRemaining === 0) {
        endCodenamesTeamTurn(state);
        message = `✅ ${player.displayName} found a ${team.toUpperCase()} agent. The clue's guess budget is used; ${state.codenamesRoundTeam.toUpperCase()} is up next.`;
      } else {
        state.currentPlayerId = nextCodenamesOperative(state, team, playerId) ?? playerId;
        message = `✅ ${player.displayName} found a ${team.toUpperCase()} agent. ${state.codenamesGuessesRemaining} guess${state.codenamesGuessesRemaining === 1 ? "" : "es"} remain.`;
      }
    } else {
      const revealedRole = card.role === "neutral" ? "a bystander" : "an opposing agent";
      endCodenamesTeamTurn(state);
      message = `🟨 ${player.displayName} revealed ${revealedRole}. The guessing turn ends; ${state.codenamesRoundTeam.toUpperCase()} is up next.`;
    }} else return {accepted:false,message:""};return {accepted:true,message};}
