import { monopolyActionSchema, getMonopolyLegalActions } from "./actions";
import { setupMonopoly } from "./setup";
import { reduceMonopolyAction } from "./reducer";
import { getMonopolyPublicState } from "./public-state";
import { getMonopolyResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const monopolyModule = createBoardGameModule({ id: "monopoly", displayName: "Property Tycoon", minPlayers: 2, maxPlayers: 6, notice: "Movement, purchases, rent and turns are handled server-side; this is a simplified ruleset.", actionSchema: monopolyActionSchema, setup: setupMonopoly, legalActions: getMonopolyLegalActions, reduceAction: reduceMonopolyAction, publicState: getMonopolyPublicState, results: getMonopolyResults });
export * from "./types";
