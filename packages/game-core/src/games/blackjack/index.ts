import { createBoardGameModule } from "../shared/runtime";
import { blackjackActionSchema, getBlackjackLegalActions } from "./actions";
import { setupBlackjack } from "./setup";
import { reduceBlackjackAction } from "./reducer";
import { getBlackjackPublicState } from "./public-state";
import { getBlackjackResults } from "./scoring";

export * from "./deck";
export * from "./actions";

export const blackjackModule = createBoardGameModule({
  id: "blackjack",
  displayName: "Blackjack · 21",
  minPlayers: 1,
  maxPlayers: 5,
  notice: "Standard Vegas Blackjack: Dealer hits soft 16, stands on 17. Blackjack pays 3:2.",
  actionSchema: blackjackActionSchema,
  setup: setupBlackjack,
  legalActions: getBlackjackLegalActions,
  reduceAction: reduceBlackjackAction,
  publicState: getBlackjackPublicState,
  results: getBlackjackResults
});

