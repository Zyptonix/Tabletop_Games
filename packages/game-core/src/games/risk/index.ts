import { riskActionSchema, getRiskLegalActions } from "./actions";
import { setupRisk } from "./setup";
import { reduceRiskAction } from "./reducer";
import { getRiskPublicState } from "./public-state";
import { getRiskResults } from "./scoring";
import { createBoardGameModule } from "../shared/runtime";
export const riskModule = createBoardGameModule({ id: "risk", displayName: "Risk", minPlayers: 2, maxPlayers: 6, notice: "Territory claims, reinforcements and simplified dice attacks are handled server-side.", actionSchema: riskActionSchema, setup: setupRisk, legalActions: getRiskLegalActions, reduceAction: reduceRiskAction, publicState: getRiskPublicState, results: getRiskResults });
export * from "./types";
