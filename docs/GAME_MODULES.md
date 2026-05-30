# Game Modules

Every game implements `GameModule<State, Action, Settings>`.

The module owns:

- initial state creation
- settings schema
- action schema
- legal action selection
- action validation
- reducer/application of actions
- event generation
- public/private state filtering
- timeout action choice
- result calculation

The module does not own:

- sockets
- authentication
- database writes
- React rendering
- room codes
- reconnect identity

## Adding A Game

1. Create `packages/game-core/src/games/my-game`.
2. Add `types.ts`, `actions.ts`, `setup.ts`, `rules.ts`, `reducer.ts`, `public-state.ts`, `scoring.ts`, `index.ts`.
3. Export a `GameModule`.
4. Register it in `apps/server/src/games/GameRegistry.ts`.
5. Add a frontend feature folder under `apps/web/src/features/games/my-game`.
6. Render it from `apps/web/src/app/rooms/[code]/page.tsx`.

## Public State

Each viewer must receive only what they are allowed to know.

Classic UNO:

- viewer receives their own hand
- other players expose card counts only
- everyone sees top discard, current color, direction, and turn

Future private-role games must follow the same rule. For example, Polashi must not broadcast every role; Codenames must not send the key grid to normal players.
