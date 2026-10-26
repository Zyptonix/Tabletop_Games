import { ludoActionSchema, getLudoLegalActions } from "./actions";
import { setupLudo } from "./setup";
import { reduceLudoAction } from "./reducer";
import { getLudoPublicState } from "./public-state";
import { getLudoResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const ludoModule = createBoardGameModule({ id: "ludo", displayName: "Ludo", minPlayers: 2, maxPlayers: 4, notice: "Dice, token movement, captures and finish checks are handled server-side.", actionSchema: ludoActionSchema, setup: setupLudo, legalActions: getLudoLegalActions, reduceAction: reduceLudoAction, publicState: getLudoPublicState, results: getLudoResults });
export * from "./types";
