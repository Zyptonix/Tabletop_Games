import {
  classicUnoModule,
  noMercyModule,
  werewolfModule,
  type ClassicUnoSettings,
  type ClassicUnoState,
  type NoMercyAction,
  type NoMercySettings,
  type NoMercyState,
  type UnoAction,
  type WerewolfAction,
  type WerewolfSettings,
  type WerewolfState
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
  ]
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