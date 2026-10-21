# Strategic Shockwave

Strategic Shockwave is a real-time, grid-based arena game inspired by classic bomb-and-block games. It supports 2-10 players and plugs into the existing room/lobby/socket flow.

## Controls

- **WASD / Arrow keys:** Move.
- **Space:** Place a bomb.
- **Plant Bomb button:** Mouse/touch alternative to Space.

## Rules

- Bombs detonate after approximately 1.9 seconds.
- Flames travel in four directions, stop at solid walls, and destroy the first soft block they hit.
- Bombs can trigger one another in chain reactions.
- Players start with one bomb at a time and blast range 2.
- Hidden power-ups can appear inside destroyed blocks: extra bomb capacity, extra flame range, or faster movement.
- The last surviving player wins. If time runs out, surviving players are ranked by knockouts; a tie can end in a draw.
- The host can fill the room with bots for a quick solo test; the module has simple server-side bot movement.

## Implementation notes

The game engine is server-authoritative. Clients submit movement inputs and bomb-placement requests; the server owns movement, collisions, bomb fuses, chain reactions, block destruction, pickups, eliminations and results. Real-time modules can provide the optional `GameModule.tick()` callback. The room timer runs it at a fixed 50 ms interval and does not write database snapshots for every movement input or frame.

## Verification

After applying the overlay, run from the repository root:

```bash
pnpm --filter @tabletop/game-core test
pnpm --filter @tabletop/game-core typecheck
pnpm --filter @tabletop/server typecheck
pnpm --filter @tabletop/web typecheck
```

This initial implementation uses canvas primitives rather than downloaded art assets, so it works offline on the LAN without adding a new runtime dependency.
