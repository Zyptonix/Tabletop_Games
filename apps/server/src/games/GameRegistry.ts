import {
  classicUnoModule,
  noMercyModule,
  strategicShockwaveModule,
  twentyNineModule,
  werewolfModule,
  type ClassicUnoSettings,
  type ClassicUnoState,
  type NoMercyAction,
  type NoMercySettings,
  type NoMercyState,
  type StrategicShockwaveAction,
  type StrategicShockwaveSettings,
  type StrategicShockwaveState,
  type TwentyNineAction,
  type TwentyNineSettings,
  type TwentyNineState,
  type UnoAction,
  type WerewolfAction,
  type WerewolfSettings,
  type WerewolfState,
  connectFourModule,
  reversiModule,
  type GridGameAction,
  type GridGameSettings,
  type GridGameState,
  chessModule,
  battleshipModule,
  ludoModule,
  barricadesModule,
  monopolyPrototypeModule,
  riskModule,
  worldConquestModule,
  codenamesPrototypeModule,
  pokerModule,
  type PrototypeGameState,
  type PrototypeAction,
  type PrototypeSettings
} from "@tabletop/game-core";
import type { GameId } from "@tabletop/shared";
import type { GameModule, RegisteredGameSummary } from "@tabletop/game-core";

type AnyGameModule = GameModule<unknown, unknown, unknown>;

const modules = new Map<GameId, AnyGameModule>([
  [
    "classic-uno",
    classicUnoModule as GameModule<ClassicUnoState, UnoAction, ClassicUnoSettings> as AnyGameModule
  ],
  [
    "uno-no-mercy",
    noMercyModule as GameModule<NoMercyState, NoMercyAction, NoMercySettings> as AnyGameModule
  ],
  [
    "mafia-werewolf",
    werewolfModule as GameModule<WerewolfState, WerewolfAction, WerewolfSettings> as AnyGameModule
  ],
  [
    "strategic-shockwave",
    strategicShockwaveModule as GameModule<StrategicShockwaveState, StrategicShockwaveAction, StrategicShockwaveSettings> as AnyGameModule
  ],
  [
    "twenty-nine",
    twentyNineModule as GameModule<TwentyNineState, TwentyNineAction, TwentyNineSettings> as AnyGameModule
  ],
  [
    "connect-four",
    connectFourModule as GameModule<GridGameState, GridGameAction, GridGameSettings> as AnyGameModule
  ],
  [
    "reversi",
    reversiModule as GameModule<GridGameState, GridGameAction, GridGameSettings> as AnyGameModule
  ],
  ["chess", chessModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["battleship", battleshipModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["ludo", ludoModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["barricades", barricadesModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["monopoly", monopolyPrototypeModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["risk", riskModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["world-conquest", worldConquestModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["codenames", codenamesPrototypeModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule],
  ["poker", pokerModule as GameModule<PrototypeGameState, PrototypeAction, PrototypeSettings> as AnyGameModule]
]);

export class GameRegistry {
  get(gameId: GameId): AnyGameModule | null {
    return modules.get(gameId) ?? null;
  }

  list(): RegisteredGameSummary[] {
    return [...modules.values()].map((module) => ({
      id: module.id,
      displayName: module.displayName,
      minPlayers: module.minPlayers,
      maxPlayers: module.maxPlayers
    }));
  }
}

export const gameRegistry = new GameRegistry();