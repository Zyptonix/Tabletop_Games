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
  snakesAndLaddersModule,
  ludoModule,
  barricadesModule,
  monopolyModule,
  riskModule,
  worldConquestModule,
  codenamesModule,
  pokerModule,
  blackjackModule,
  type BoardGameState,
  type BoardGameAction,
  type BoardGameSettings
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
  ["chess", chessModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["battleship", battleshipModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["snakes-and-ladders", snakesAndLaddersModule as AnyGameModule],
  ["barricades", barricadesModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["monopoly", monopolyModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["risk", riskModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["world-conquest", worldConquestModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["codenames", codenamesModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["poker", pokerModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule],
  ["blackjack", blackjackModule as GameModule<BoardGameState, BoardGameAction, BoardGameSettings> as AnyGameModule]
]);

const ALIASES: Record<string, GameId> = {
  ludo: "snakes-and-ladders"
};

export class GameRegistry {
  get(gameId: GameId): AnyGameModule | null {
    const canonicalId = ALIASES[gameId as string] ?? gameId;
    return modules.get(canonicalId) ?? null;
  }

  list(): RegisteredGameSummary[] {
    const seen = new Set<string>();
    const list: RegisteredGameSummary[] = [];

    for (const module of modules.values()) {
      if (seen.has(module.id)) continue;
      seen.add(module.id);
      list.push({
        id: module.id,
        displayName: module.displayName,
        minPlayers: module.minPlayers,
        maxPlayers: module.maxPlayers
      });
    }

    return list;
  }
}

export const gameRegistry = new GameRegistry();
