import { battleshipActionSchema, getBattleshipLegalActions, validateBattleshipAction } from "./actions";
import { setupBattleship } from "./setup";
import { reduceBattleshipAction } from "./reducer";
import { getBattleshipPublicState } from "./public-state";
import { getBattleshipResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";

export const battleshipModule = createBoardGameModule({
  id: "battleship",
  displayName: "Battleships",
  minPlayers: 2,
  maxPlayers: 2,
  notice: "Alternating target shots, hits and fleet elimination are handled server-side.",
  actionSchema: battleshipActionSchema,
  setup: setupBattleship,
  legalActions: getBattleshipLegalActions,
  validateAction: validateBattleshipAction,
  reduceAction: reduceBattleshipAction,
  publicState: getBattleshipPublicState,
  results: getBattleshipResults,
});

export * from "./types";
export * from "./actions";
export * from "./rules";
export * from "./setup";
