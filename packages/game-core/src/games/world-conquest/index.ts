import { worldconquestActionSchema, getWorldConquestLegalActions } from "./actions";
import { setupWorldConquest } from "./setup";
import { reduceWorldConquestAction } from "./reducer";
import { getWorldConquestPublicState } from "./public-state";
import { getWorldConquestResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const worldConquestModule = createBoardGameModule({ id: "world-conquest", displayName: "World Conquest", minPlayers: 2, maxPlayers: 10, notice: "Territory claims, reinforcements and simplified attacks are handled server-side.", actionSchema: worldconquestActionSchema, setup: setupWorldConquest, legalActions: getWorldConquestLegalActions, reduceAction: reduceWorldConquestAction, publicState: getWorldConquestPublicState, results: getWorldConquestResults });
export * from "./types";
