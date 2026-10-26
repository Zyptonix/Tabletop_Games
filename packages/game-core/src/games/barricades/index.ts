import { barricadesActionSchema, getBarricadesLegalActions } from "./actions";
import { setupBarricades } from "./setup";
import { reduceBarricadesAction } from "./reducer";
import { getBarricadesPublicState } from "./public-state";
import { getBarricadesResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const barricadesModule = createBoardGameModule({ id: "barricades", displayName: "Barricades", minPlayers: 2, maxPlayers: 4, notice: "Pawn movement, wall placement and route checks are handled server-side.", actionSchema: barricadesActionSchema, setup: setupBarricades, legalActions: getBarricadesLegalActions, reduceAction: reduceBarricadesAction, publicState: getBarricadesPublicState, results: getBarricadesResults });
export * from "./types";
