import { finish, nextPlayerId, random } from "../shared/utils";
import { ludoGlobalTrackPosition, LUDO_SAFE_TRACK_POSITIONS } from "./rules";
import type { BoardGameAction, BoardGameState } from "../shared/types";
import type { BoardGameReduction } from "../shared/runtime";
export function reduceLudoAction(state:BoardGameState,playerId:string,action:BoardGameAction,now:string):BoardGameReduction{const player=state.players.find(p=>p.userId===playerId);if(!player)return {accepted:false,message:""};let message="";if(action.type === "roll_dice" && state.gameId === "ludo"){const roll = random(state, 6) + 1;
    state.diceRoll = roll;
    state.hasRolled = true;
    state.ludoConsecutiveSixes ??= {};
    state.ludoConsecutiveSixes[playerId] = roll === 6 ? (state.ludoConsecutiveSixes[playerId] ?? 0) + 1 : 0;
    if (roll === 6 && (state.ludoConsecutiveSixes[playerId] ?? 0) >= 3) {
      state.ludoConsecutiveSixes[playerId] = 0;
      state.diceRoll = null;
      state.hasRolled = false;
      state.currentPlayerId = nextPlayerId(state, playerId);
      state.turnNumber += 1;
      message = `🎲 ${player.displayName} rolled a third consecutive six and forfeited the turn.`;
    } else {
      message = `🎲 ${player.displayName} rolled ${roll}.`;
    }} else if(action.type === "move_token" && state.gameId === "ludo"){const tokens = state.ludoTokens[playerId] ?? [-1, -1, -1, -1];
    const current = tokens[action.tokenIndex] ?? -1;
    const dice = state.diceRoll;
    if (dice === null || (current < 0 && dice !== 6) || (current >= 0 && current + dice > 57)) return {accepted:false,message:""};
    const nextProgress = current < 0 ? 0 : current + dice;
    tokens[action.tokenIndex] = nextProgress;
    let capturedCount = 0;
    const movingTrackPosition = ludoGlobalTrackPosition(player, nextProgress);
    if (movingTrackPosition !== null && !LUDO_SAFE_TRACK_POSITIONS.has(movingTrackPosition)) {
      for (const opponent of state.players) {
        if (opponent.userId === playerId) continue;
        const opponentTokens = state.ludoTokens[opponent.userId] ?? [];
        for (let index = 0; index < opponentTokens.length; index += 1) {
          const opponentProgress = opponentTokens[index] ?? -1;
          if (ludoGlobalTrackPosition(opponent, opponentProgress) === movingTrackPosition) {
            opponentTokens[index] = -1;
            capturedCount += 1;
          }
        }
      }
    }
    state.ludoTokens[playerId] = tokens;
    state.diceRoll = null;
    state.hasRolled = false;
    message = `🎲 ${player.displayName} moved token ${action.tokenIndex + 1} by ${dice}${capturedCount ? ` and captured ${capturedCount} opposing token${capturedCount === 1 ? "" : "s"}` : ""}.`;
    if (tokens.every((position) => position === 57)) {
      finish(state, playerId, now);
      message += " 🏆 All four tokens reached home!";
    } else if (dice !== 6 && capturedCount === 0 && nextProgress !== 57) {
      state.currentPlayerId = nextPlayerId(state, playerId);
    }} else return {accepted:false,message:""};return {accepted:true,message};}
