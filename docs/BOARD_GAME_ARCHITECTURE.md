# Board-game module architecture

The nine board/card games previously dispatched through a shared prototype engine now have dedicated backend folders under `packages/game-core/src/games/` and dedicated web table components under `apps/web/src/features/games/`.

Each backend module has `types.ts`, `actions.ts`, `setup.ts`, `rules.ts`, `reducer.ts`, `public-state.ts`, `scoring.ts`, and `index.ts`. Reusable state contracts, deterministic RNG/activity helpers, standard results, and public-state scaffolding live under `games/shared/`.

The server registry and room-page dispatcher import the per-game modules/components directly. The former shared engine, its combined test file, and its former UI folder are removed. Existing UNO, No Mercy, Werewolf, Twenty-Nine, Strategic Shockwave, Connect Four, and Reversi modules remain in place.

**Rule completeness remains an independent release gate.** Several games still implement simplified rule sets; modularization does not claim to have completed Monopoly auctions/jail/bankruptcy, full Risk phases/cards, or other missing mechanics. Run the game-core tests, server typecheck, and web typecheck before merging this refactor.
