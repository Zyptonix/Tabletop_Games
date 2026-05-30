# Architecture

## Boundaries

`packages/game-core` contains pure game engines. A game module validates and applies actions, returns events, and exposes public/private state selectors. It does not import React, Socket.IO, Express, or Prisma.

`apps/server` owns identity, rooms, sockets, snapshots, timers, chat, and stats. It is server-authoritative: clients send intents, the server validates and applies them.

`apps/web` renders state and sends intents. It never calculates winners, XP, hidden cards, or legal outcomes.

`packages/shared` defines payload schemas, error codes, room types, and Socket.IO event contracts.

`packages/db` defines PostgreSQL persistence through Prisma.

## Realtime Flow

1. Client emits `game:action` with `actionId`, `roomId`, `type`, and `payload`.
2. Socket handler validates the envelope with Zod.
3. `RoomManager` checks duplicate action IDs per room/user.
4. The room action queue processes the action sequentially.
5. The game module parses and validates the game-specific action.
6. The module applies the action to in-memory state.
7. Server emits filtered state to each player.
8. Snapshot save runs asynchronously.
9. If the game ends, server calculates results and updates XP/stats in a DB transaction.

## Room Lifecycle

Rooms move through:

- `lobby`
- `in_game`
- `paused`
- `finished`
- `abandoned`

The host controls lobby start and pause/resume. If the host disconnects, effective host controls temporarily move to the next connected player by seat order. The original host recovers controls after reconnect.

## Why In Memory

Active game state lives in memory for speed. PostgreSQL stores durable metadata, snapshots, results, stats, profiles, and leaderboards. The database is not used as the realtime game engine.
