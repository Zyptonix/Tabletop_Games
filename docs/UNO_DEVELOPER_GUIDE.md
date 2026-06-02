# UNO Developer Guide

This guide is the practical map for editing Classic UNO and UNO No Mercy in this project. It explains where the backend rules live, where the realtime room server touches those rules, where the frontend renders the table, and where the card images are resolved.

The most important rule: React displays state and sends intents. The server owns the game. If a rule changes who can play a card, what a card does, who wins, what gets hidden, or what XP/results are awarded, change the backend game module first.

## Mental Model

The app is split into four layers:

1. `packages/game-core`
   Pure TypeScript game engines. This is where Classic UNO and No Mercy rules live. No React, no Socket.IO, no Prisma.

2. `apps/server`
   Express and Socket.IO runtime. It authenticates users, owns rooms, queues actions, calls game modules, broadcasts private filtered state, saves snapshots, and finalizes matches.

3. `apps/web`
   Next.js frontend. It logs users in, joins rooms, receives filtered game state, renders cards/table/chat, and sends player intent actions.

4. `apps/web/public/assets/uno`
   Card art. The UI resolves card objects into image files here.

The realtime gameplay path is:

1. Player clicks a card or button in the web UI.
2. `useRoomSocket.sendAction()` emits `game:action` with an `actionId`, `roomId`, action type, and payload.
3. `apps/server/src/socket/index.ts` validates the socket envelope with Zod.
4. `RoomManager.handleGameAction()` processes the action sequentially in that room's `ActionQueue`.
5. The selected `GameModule` validates the payload and applies the action to in-memory state.
6. The server immediately emits a filtered `game:state` to each player.
7. The server saves a room snapshot asynchronously.
8. If the game is over, the server finalizes match results and stats.

## Game Module Contract

File: `packages/game-core/src/engine/GameModule.ts`

Every game plugs into the room server through this interface:

- `id`
  Stable game id from `@tabletop/shared`.

- `displayName`
  Human-facing name used in room/game lists.

- `version`
  Game rules version saved with matches.

- `minPlayers` and `maxPlayers`
  Used by room creation/start validation.

- `defaultSettings`
  Server defaults for a room.

- `settingsSchema`
  Zod schema for room settings.

- `actionSchema`
  Zod schema for game actions after the socket envelope is unpacked.

- `createInitialState()`
  Builds the full hidden game state when host starts the room.

- `getPublicState()`
  Filters hidden state per viewer. This is the privacy wall.

- `getLegalActions()`
  Returns what the player is allowed to do right now. The UI uses this for highlights/buttons, but the backend still validates again.

- `validateAction()`
  Server authority check for turn, card legality, target legality, color choice, phase, and mode-specific rules.

- `applyAction()`
  Pure reducer. Takes a valid action and returns the next state plus animation/log events.

- `getTurnInfo()`
  Gives the room timer current player, turn start time, and turn seconds.

- `getTimeoutAction()`
  Lets the reusable timer ask the game what to do when time expires.

- `isGameOver()`
  Used by the room server to finish rooms.

- `getResults()`
  Server-calculated placements and scores. The client never submits winners.

## Game Registration

File: `apps/server/src/games/GameRegistry.ts`

This registry is how the server knows which games exist. Classic UNO and No Mercy modules are registered here. If you add another UNO-like game later, create a new `GameModule` and register it here.

Do not import UI files into this registry. It should only know about backend game modules.

## Classic UNO Backend

Folder: `packages/game-core/src/games/classic-uno`

Classic UNO is intentionally split into small files so rules stay editable.

### `types.ts`

Defines all Classic UNO shapes:

- `UNO_COLORS`
  The playable declared colors: red, yellow, green, blue.

- `UnoCard`
  A single card in hidden state. Important fields:
  - `id`: unique card instance id.
  - `color`: red/yellow/green/blue/wild.
  - `value`: number, skip, reverse, draw_two, wild, or wild_draw_four.
  - `points`: score value.

- `UnoPlayerState`
  Hidden per-player data, including full `hand`.

- `ClassicUnoSettings`
  Room settings for cards per player, timer, timeout behavior, and UNO call behavior.

- `ClassicUnoState`
  Full private game state. This includes all hands, draw pile, discard pile, current turn, direction, action number, and results.

- `PublicClassicUnoState`
  Filtered state sent to one viewer. Own hand is included. Other hands are hidden behind `handCount`.

Change this file when you add or remove fields from Classic UNO state.

### `actions.ts`

Defines Zod schemas:

- `classicUnoSettingsSchema`
  Validates room settings before a room starts.

- `unoActionSchema`
  Validates actions after Socket.IO unpacking. Current action types:
  - `play_card` with `cardId` and optional `declaredColor`.
  - `draw_card`.
  - `pass_turn`.
  - `call_uno`.

If the frontend sends a payload that does not match this schema, the server returns `INVALID_PAYLOAD`.

### `constants.ts`

Holds Classic UNO defaults:

- `CLASSIC_UNO_VERSION`
- `DEFAULT_CLASSIC_UNO_SETTINGS`
- `UNO_MIN_PLAYERS`
- `UNO_MAX_PLAYERS`

Change default timer length, cards per player, or max player count here first.

### `setup.ts`

Builds the initial Classic UNO game.

- `numberCardPoints(value)`
  Converts number card values into scoring points.

- `createClassicUnoDeck()`
  Creates the full Classic UNO deck. Edit card counts here.

- `findStartingDiscard(drawPile)`
  Chooses a safe first discard. It avoids starting on wild/action cards where possible.

- `createInitialClassicUnoState(params)`
  Shuffles, deals hands, creates draw/discard piles, sets turn order, and returns the first full state.

If a new game starts with wrong hands, wrong first card, or wrong deck counts, start here.

### `rules.ts`

Reusable Classic UNO rule helpers.

- `getTopDiscard(state)`
  Returns the visible top discard card.

- `findUnoPlayer(state, playerId)`
  Looks up a player in hidden state.

- `isWild(card)`
  True for wild cards.

- `isCardPlayable(state, card)`
  Core card matching rule. It checks wild cards, current color, top discard color, and top discard value.

- `hasPlayableCard(state, player)`
  Used by validation and legal action generation.

- `nextPlayerId(state, steps)`
  Finds the next player by turn order and direction.

- `advanceTurn(state, { steps, now })`
  Moves the turn pointer and resets `turnStartedAt`.

- `refillDrawPileIfNeeded(state)`
  Moves discard cards back into draw pile when the draw pile runs low, keeping the top discard visible.

- `drawCards(state, playerId, count)`
  Draws one or more cards into a player's hand and returns drawn cards for events.

- `cardRequiresDeclaredColor(card)`
  True when a card needs color choice.

- `resolveDeclaredColor(card, declaredColor)`
  Converts wild color choice into `currentColor`.

- `cardLabel(card)`
  Friendly text for events.

Change legality helpers here when matching rules change. Do not put these checks in React.

### `validation.ts`

Function: `validateClassicUnoAction(params)`

This is the hard backend permission check. It verifies:

- Game is still playing.
- Player exists.
- Player is current player when required.
- Played card exists in that player's hand.
- Played card is legal under `isCardPlayable`.
- Wilds have a declared color.
- Draw/pass/call UNO are only available at legal times.

If a user clicks a highlighted card but gets `ILLEGAL_ACTION`, inspect this file and `rules.ts`.

### `selectors.ts`

Function: `getLegalClassicUnoActions(params)`

This powers UI highlights. It returns all actions a player can take right now:

- Playable cards.
- Color-expanded wild play actions.
- Draw action if drawing is allowed.
- Pass after drawing.
- Call UNO.

The client uses this list, but it is not trusted. `validation.ts` is still the authority.

### `reducer.ts`

Applies valid Classic UNO actions.

- `clonePlayers(state)`
  Creates a copy before mutation-style updates.

- `finishIfWinner(state, playerId, now)`
  Checks if a player has empty hand and writes finished state/results.

- `applyCardEffect(params)`
  Applies skip, reverse, draw two, wild draw four, and normal turn advancement.

- `applyClassicUnoAction(params)`
  Main reducer entry. It handles:
  - `play_card`
  - `draw_card`
  - `pass_turn`
  - `call_uno`
  It increments `actionNumber`, updates `updatedAt`, and emits `GameEvent`s.

If a card is legal but its effect is wrong, this is usually the file to edit.

### `public-state.ts`

Function: `getPublicClassicUnoState({ state, viewerId })`

This hides other players' hands. It sends:

- Own full hand to the viewer.
- Other players' `handCount`.
- Turn, direction, current color, top discard, draw pile count, action number, winner/results.

If hidden cards leak, fix this file before touching UI.

### `scoring.ts`

- `scoreHand(hand)`
  Calculates points left in a hand.

- `getClassicUnoResults(state)`
  Builds server-side placements and score map.

Change final score values here.

### `index.ts`

Exports `classicUnoModule`.

- `getTurnInfo(state)`
  Feeds the reusable room timer.

- `getTimeoutAction(params)`
  Decides what automatic action happens when a turn timer expires.

- `classicUnoModule`
  Connects all Classic UNO pieces to the generic `GameModule` contract.

## UNO No Mercy Backend

Folder: `packages/game-core/src/games/uno-no-mercy`

No Mercy is a separate module, not a pile of `if (noMercy)` checks inside Classic UNO. Keep it that way.

### `types.ts`

Defines No Mercy-only data:

- `NO_MERCY_COLORS`
  Declared colors.

- `NoMercyCard`
  Includes Classic card fields plus:
  - `drawAmount`: draw penalty size.
  - `stackPower`: used by penalty stacking.
  - `assetKey`: card asset identity.

- `NoMercyPlayerState`
  Adds `eliminated` so eliminated players can stay seated as observers.

- `NoMercyPendingPenalty`
  Tracks stacked draw pressure:
  - `amount`
  - `source`
  - `requiredResponseMinPower`
  - `targetPlayerId`

- `NoMercySettings`
  Includes `eliminationHandSize`, currently defaulting to 25.

- `NoMercyState`
  Full hidden state with `pendingPenalty`, eliminated players, draw/discard piles, current turn, and results.

- `PublicNoMercyState`
  Filtered state sent to a viewer. Own hand only.

Add No Mercy state fields here first.

### `actions.ts`

Defines:

- `noMercySettingsSchema`
  Cards per player, timer, elimination hand size, and draw behavior. No Mercy keeps the legacy `mustCallUno` setting field for compatibility, but the rules ignore UNO calls.

- `noMercyActionSchema`
  Current actions:
  - `play_card` with `cardId`, optional `declaredColor`, optional `targetPlayerId`.
  - `draw_card`.
  - `resolve_roulette` with `chosenColor`.

  No Mercy intentionally does not expose `pass_turn` or `call_uno`. Players draw one card at a time until a playable card appears; once a playable card is drawn, they must play that drawn card or let the server timer skip them.

No Mercy uses `targetPlayerId` for 7 swap. If the UI forgets it, validation rejects the action.

### `constants.ts`

Holds No Mercy module version, player limits, and default settings.

Change default elimination limit or timer here if you want a different default for new rooms.

### `deck.ts`

Builds the No Mercy deck.

- `numberCardPoints(value)`
  Scoring helper for numbers.

- `makeCard(params)`
  Creates a `NoMercyCard` with id, asset key, points, draw amount, and stack power.

- `createNoMercyDeck()`
  Defines all No Mercy cards and counts. This is where you add/remove cards from the physical deck.

- `findStartingDiscard(drawPile)`
  Picks a safe starting discard.

- `createInitialNoMercyState(params)`
  Shuffles, deals, creates draw/discard piles, sets the first turn, and initializes `pendingPenalty` to null.

Card count bug? Start in `createNoMercyDeck()`.

### `rules.ts`

Reusable No Mercy rule helpers.

- `getTopDiscard(state)`
  Returns top discard.

- `findNoMercyPlayer(state, playerId)`
  Looks up hidden player state.

- `getActivePlayers(state)`
  Filters out eliminated players.

- `isWild(card)`
  True for wild cards.

- `cardRequiresDeclaredColor(card)`
  True for wild color-choice cards.

- `isDrawPenaltyCard(card)`
  True for +2, colored +4, wild +4, wild +6, wild +10, and related draw cards.

- `getDrawPenaltyAmount(card)`
  Reads draw penalty amount.

- `getStackPower(card)`
  Reads stack power for penalty stacking.

- `isColoredDrawFour(card)`
  True only for red/yellow/green/blue +4 cards. These are not wild.

- `canStackDrawCard({ card, state })`
  Decides whether a draw card can answer the current pending penalty.

- `isCardPlayable(state, card)`
  Core No Mercy playability. It considers current color, top discard, wilds, colored +4 restrictions, and pending penalty stack rules.

- `hasPlayableCard(state, player)`
  Used by legal actions and validation.

- `nextActivePlayerId(state, steps, fromPlayerId)`
  Skips eliminated players while following direction.

- `advanceTurn(state, { steps, now, fromPlayerId })`
  Moves the turn to the next active player.

- `refillDrawPileIfNeeded(state)`
  Recycles discard pile into draw pile while preserving the top discard.

- `drawCards(state, playerId, count)`
  Draws from the pile into a player's hand.

- `resolveDeclaredColor(card, declaredColor)`
  Applies color choice rules.

- `cardLabel(card)`
  Event-friendly label.

If the question is "should this card be playable?", edit this file and then update `selectors.ts` if the legal action list also needs a new payload shape.

### `validation.ts`

Function: `validateNoMercyAction(params)`

This is the backend gatekeeper. It checks:

- Game phase is playing.
- Player exists and is not eliminated.
- Turn ownership.
- Played card exists in player's hand.
- Played card passes `isCardPlayable`.
- Wild cards have a valid `declaredColor`.
- 7 swap has a valid active `targetPlayerId`.
- Pending penalty targets only respond or draw as allowed.
- Normal draws are one-card-at-a-time: draw again if the card is not playable; play the drawn card if it is playable.

If No Mercy says `ILLEGAL_ACTION`, inspect this file first, then `rules.ts`.

### `selectors.ts`

Function: `getLegalNoMercyActions(params)`

This creates the UI-friendly legal action list:

- Normal playable card actions.
- Wild actions expanded once per declared color.
- 7 swap actions expanded once per legal target player.
- Draw actions when allowed. No Mercy never emits Pass or UNO Call actions.

If playable highlights are wrong but backend validation is right, fix this file.

### `reducer.ts`

This is where No Mercy actually changes the state.

- `cloneState(state)`
  Copies arrays before modifying them.

- `withActionMeta(state, previousState, now)`
  Updates `actionNumber`, timestamps, and shared action metadata.

- `finishGame(state, winnerUserId, now)`
  Writes finished phase, winner, and results.

- `finishIfResolved(state, preferredWinnerId, now)`
  Detects empty-hand win or last-active-player win after eliminations.

- `pushGameOverEvent(state, events)`
  Adds a game over event for animations/logs.

- `eliminateOverLimit(params)`
  Eliminates players at or above `eliminationHandSize`.

- `swapHands(params)`
  Implements 7 swap.

- `passHands(state, events)`
  Implements 0 pass in the current direction.

- `discardAllMatchingColor(params)`
  Implements discard all for the matching color.

- `drawUntilColor(params)`
  Implements roulette: draw until the chosen color appears.

- `applyDrawPenaltyCard(params)`
  Adds draw amount to `pendingPenalty` and points the penalty at the affected next player.

- `applyCardEffect(params)`
  Applies all No Mercy card effects:
  - 0 pass.
  - 7 swap.
  - skip.
  - reverse.
  - +2.
  - colored +4.
  - wild +4.
  - wild +4 reverse.
  - +6.
  - +10.
  - roulette.
  - comeback/skip all.
  - discard all.

- `resolvePendingPenalty(params)`
  Makes the target player draw the stacked amount if they cannot or do not stack.

- `applyNoMercyAction(params)`
  Main reducer entry. It handles `play_card`, `draw_card`, and `resolve_roulette`. No Mercy has no Pass or UNO Call actions.

If a No Mercy card is accepted but the effect is wrong, edit `applyCardEffect()` or the helper it calls.

### `public-state.ts`

Function: `getPublicNoMercyState({ state, viewerId })`

This is the privacy filter. It sends:

- Own hand to the viewer.
- Other players' card counts only.
- Eliminated flags.
- Current color, direction, top discard, pending penalty, action number, winner/results.

After 7 swap or 0 pass, every player receives only their own new hand because this function is called once per player in the socket emitter.

### `scoring.ts`

- `scoreCards(cards)`
  Sums card point values.

- `getNoMercyResults(state)`
  Server-calculated placements and scores.

### `index.ts`

Exports `noMercyModule`.

- `getTurnInfo(state)`
  Feeds the room timer.

- `getTimeoutAction(params)`
  No Mercy timeout behavior.

- `noMercyModule`
  Connects all No Mercy pieces to the `GameModule` interface.

## Server Room Runtime

Folder: `apps/server/src/rooms`

### `RoomManager.ts`

This is the core room orchestrator. It does not contain card rules. It calls the selected game module.

Key helpers:

- `generateRoomCode()`
  Creates private join codes.

- `assertGameId(value)`
  Rejects unsupported game ids.

- `asSettings(value)`
  Keeps settings as a safe object.

- `isObjectRecord(value)`
  Runtime object guard.

- `roomActionKey(roomId, userId)`
  Namespace for duplicate action tracking.

Main methods:

- `listGames()`
  Returns registered games for create-room UI.

- `listActiveRooms()`
  Admin/debug summary of active rooms.

- `getRoom(roomId)`
  Lookup by id.

- `getRoomByCode(code)`
  Lookup by join code.

- `getRoomForUser(userId)`
  Finds the active room containing a user. This is reconnect-critical.

- `createRoom(params)`
  Creates DB room metadata, builds runtime room state, seats the host, and saves a snapshot.

- `joinRoom(params)`
  Adds a new lobby player or reconnects an existing seated player. It does not remove players during disconnects.

- `attachSocket(user, socketId)`
  Reattaches a new socket to the permanent `userId`. This is used on connect and `auth:resume`.

- `detachSocket(userId, socketId)`
  Removes only the socket id. If no sockets remain, the player is marked disconnected but stays seated.

- `setReady(roomId, userId, ready)`
  Lobby ready state.

- `startRoom(roomId, userId)`
  Host-only start. Builds game state through `module.createInitialState()`, creates a match row, marks room in-game, and snapshots.

- `pauseRoom(roomId, userId, admin)`
  Host/admin pause.

- `resumeRoom(roomId, userId, admin)`
  Host/admin resume.

- `kickPlayer(roomId, hostUserId, targetUserId)`
  Lobby-only kick.

- `transferHost(roomId, hostUserId, targetUserId)`
  Host transfer.

- `endRoom(roomId, userId, admin)`
  Ends a broken or abandoned room.

- `handleGameAction({ userId, envelope })`
  The most important runtime method:
  1. Requires active room and game state.
  2. Rejects paused/non-active rooms.
  3. Rejects duplicate `actionId` for this room/user.
  4. Parses payload with the game module's `actionSchema`.
  5. Calls `module.validateAction()`.
  6. Calls `module.applyAction()`.
  7. Updates in-memory state immediately.
  8. Saves snapshot in the background.
  9. Finalizes match if `module.isGameOver()` is true.

- `applyTimeout(roomId)`
  Lets `RoomTimers` apply the current game module's timeout action.

- `forceSnapshot(roomId, userId, admin)`
  Manual/admin snapshot.

- `addChatMessage(roomId, user, body)`
  Validates membership, rate limits, and stores chat in runtime state.

- `getRoomStateView(room)`
  Public room/lobby view. Includes connected/disconnected state but no hidden game state.

- `getPrivateGamePayload(room, userId)`
  Calls `module.getPublicState()` and `module.getLegalActions()` for one viewer.

- `getTimerView(roomId)`
  Calculates current timer display.

- `restoreActiveRooms()`
  Loads unfinished rooms from DB snapshots on server startup and marks seats as recoverable.

Private methods:

- `requireModule(gameId)`
  Finds a registered game module.

- `restoreGameState(serializable, stateJson)`
  Converts JSON snapshot state into runtime state.

- `requireRoom(roomId)`
  Throws if room does not exist.

- `requirePlayer(room, userId)`
  Throws if user is not seated.

- `requireHost(room, userId)`
  Checks effective host controls.

- `getEffectiveHostUserId(room)`
  Gives temporary host control to next connected player if original host is disconnected.

- `addSystemMessage(room, body)`
  Adds server/system chat text.

- `pushChat(room, message)`
  Stores chat message and returns a view object.

- `saveSnapshot(room)`
  Persists latest runtime state through `SnapshotService`.

- `extractActionNumber(state, fallback)`
  Reads state action number after reducers run.

### `RoomTimers.ts`

Reusable server-controlled turn timers.

This class periodically emits timer views. When a deadline expires, it calls `RoomManager.applyTimeout()`, then emits the resulting state. It does not know UNO rules.

Timer behavior is configured by each game module through `getTurnInfo()` and `getTimeoutAction()`.

### `RoomSnapshots.ts`

Function: `serializeRoomRuntime(room)`

Converts runtime room data into JSON-safe data for snapshot persistence. Sets and queues are runtime-only and are not stored directly.

### `RoomTypes.ts`

Room runtime interfaces:

- `RoomPlayerRuntime`
  Permanent user data, seat, ready, connected flag, temporary host flag, and active socket ids.

- `RoomChatMessage`
  Chat/system message shape.

- `RoomRuntime`
  In-memory room state used by the server.

- `SerializableRoomState`
  Snapshot-safe version.

- `RoomBroadcasts`
  Callback shape used by timers/socket code.

## Socket.IO Flow

File: `apps/server/src/socket/index.ts`

Main pieces:

- `socketError(error)`
  Normalizes thrown errors into `{ code, message, details }`.

- `authenticateSocket(socket, next)`
  Reads the session cookie, loads the user, and stores `socket.data.user`.

- `createSocketServer(httpServer, manager)`
  Creates the Socket.IO server, registers middleware and event handlers.

- `emitRoom(room, events)`
  Broadcasts room state to the whole room, then sends each connected socket that player's private game state. This is where hidden hand safety is enforced by calling `manager.getPrivateGamePayload(room, player.userId)` once per player.

- `emitError(socket, channel, error)`
  Sends clean room/game/server errors.

Important event handlers:

- `auth:resume`
  Reattaches user by permanent `userId`.

- `room:create`
  Validates create payload, creates runtime room, joins Socket.IO room.

- `room:join`
  Validates join code, joins/rejoins room.

- `room:ready`
  Updates ready state.

- `room:start`
  Starts the selected module.

- `room:pause` and `room:resume`
  Host controls.

- `room:kick` and `room:transfer-host`
  Lobby host controls.

- `game:action`
  Validates the envelope, passes to `RoomManager.handleGameAction()`, emits results.

- `chat:send`
  Adds chat message and re-emits room state.

- `admin:force-snapshot` and `admin:end-room`
  Admin-only debug controls.

- `disconnect`
  Marks the socket gone. Player seat and hand remain.

## Frontend Socket Hook

File: `apps/web/src/lib/socket/useRoomSocket.ts`

This hook owns the client-side realtime connection.

State it exposes:

- `socket`
  Current Socket.IO client.

- `connected`
  Socket connection status.

- `room`
  Latest `RoomStateView`.

- `gameState`
  Latest private filtered state for the current user.

- `legalActions`
  Current server-provided legal actions for this user.

- `timer`
  Current server timer view.

- `error`
  Last room/game/server error message.

Actions it exposes:

- `sendAction(roomId, type, payload)`
  Emits `game:action` with a fresh `crypto.randomUUID()` action id.

- `sendReady(roomId, ready)`
  Emits lobby ready state.

- `startRoom(roomId)`
  Emits host start.

- `pauseRoom(roomId)`
  Emits host pause.

- `resumeRoom(roomId)`
  Emits host resume.

- `sendChat(roomId, body)`
  Emits chat message.

If you add a new socket event, type it in `packages/shared/src/socket-events.ts`, handle it server-side, then expose it here.

## Frontend Route Flow

### `apps/web/src/app/rooms/[code]/page.tsx`

This is the room page. It uses `useRoomSocket(roomCode)`, renders lobby controls before start, and renders the UNO table for `classic-uno` or `uno-no-mercy` once `gameState` exists.

If a game mode does not show up, check this route and the game id from the room state.

### Other app pages

- `apps/web/src/app/page.tsx`
  Landing/login entry.

- `apps/web/src/app/dashboard/page.tsx`
  Create/join room dashboard.

- `apps/web/src/app/leaderboards/page.tsx`
  Leaderboards.

- `apps/web/src/app/profile/page.tsx`
  Profile.

- `apps/web/src/app/admin/page.tsx`
  Admin/debug UI.

- `apps/web/src/app/dev/cards/page.tsx`
  Card gallery/debug view for checking card assets.

## UNO Frontend Components

Folder: `apps/web/src/features/games/classic-uno`

The folder name is historical. It now renders both Classic UNO and No Mercy because both share an UNO table shape.

### `ClassicUnoTable.tsx`

Main table component for both UNO modes.

Responsibilities:

- Accepts filtered game state, room state, legal actions, current user id, and callbacks.
- Detects card theme:
  - Classic UNO uses `classic`.
  - No Mercy uses `no_mercy`.
- Builds player lists:
  - `me`
  - `others`
  - current player name
  - winner/result rows
- Sends play intents through `onAction("play_card", payload)`.
- Shows room/game header, rules button, reaction button, penalty pill, center table, seats, hand, action bar, rulebook, and results modal.

Do UI layout work here when changing the main table composition.

### `PlayerHand.tsx`

Own hand renderer.

Important pieces:

- `colorOrder`
  Sorts red, yellow, green, blue, wild.

- `valueOrder`
  Sorts numbers first, actions next, wilds last.

- `sortHand(hand)`
  Returns sorted hand without mutating original state.

- `getHandLayout(cardCount)`
  Controls spacing, overlap, scale, and dock height for different hand sizes. Edit this when cards overlap too much or too little.

- `PlayerHand(...)`
  Renders cards with Framer Motion. It:
  - tracks newly drawn card ids for draw animation.
  - computes playable ids from `legalActions`.
  - pops playable cards upward.
  - opens color picker for wild actions.
  - opens target picker for No Mercy 7 swap.
  - sends only intent payloads to the parent.

If card sorting, playable lift, draw animation, or 7 target selection is wrong, start here.

### `UnoCard.tsx`

Reusable button wrapper around a card image.

Responsibilities:

- Resolves card art through `resolveCardAsset()`.
- Sets accessible label/title.
- Applies playable ring/glow.
- Uses Framer Motion hover/tap behavior.
- Renders `SpriteCard`.

Change card size, hover lift, playable ring, and shadow here.

### `DrawPile.tsx`

Renders the face-down draw pile using the active theme's backplate. It sends `draw_card` intent through `onDraw`.

Do not put draw legality here. It only receives `canDraw`.

### `DiscardPile.tsx`

Renders the visible top discard using the actual card asset.

### `PlayerSeat.tsx`

Renders a player panel/seat with display name, hand count, connected status, current turn state, eliminated state if present, and face-down cards.

### `UnoActionBar.tsx`

Bottom action controls:

- Draw.
- Pass/end turn.
- UNO call.

Buttons are enabled from `legalActions`, not local rule guesses.

### `unoActionUtils.ts`

Small helpers for interpreting `legalActions`:

- `hasLegalAction(legalActions, type)`
  Generic action availability.

- `getPlayCardActions(legalActions, cardId)`
  Finds legal `play_card` variants for a card.

- `getPlayCardAction(legalActions, cardId)`
  First legal play action for a card.

- `isPlayableCard(legalActions, card)`
  Used for hand highlights.

If legal action payloads change, update this file.

### `UnoColorPicker.tsx`

Color choice UI for wilds. It returns a declared color to `PlayerHand`.

### `UnoGameStatus.tsx`

Small status pill for phase/current turn/direction information.

### `DirectionIndicator.tsx`

Animated direction marker. It reads `direction` from public state.

### `EmojiReactionButton.tsx`

Quick reaction button. It emits chat messages using a reaction prefix through the parent callback.

### `ReactionOverlay.tsx`

Reads reaction-prefixed chat messages and floats emoji overlays.

### `UnoRuleBookModal.tsx`

Rulebook modal. It receives:

- `mode`: `classic-uno` or `uno-no-mercy`.
- `theme`: `classic` or `no_mercy`.

Use this file to update visible rule explanations or card examples in the rulebook.

### `CardStylePicker.tsx`

Legacy theme selector component. Current table forces Classic assets for Classic UNO and No Mercy assets for No Mercy, so this is not active in the main table right now. Keep it around for later when you want user-selectable themes again.

## Shared Game Shell Components

Folder: `apps/web/src/features/game-shell`

- `GameShell.tsx`
  High-level wrapper for room/game page layout.

- `HostControls.tsx`
  Host pause/resume/start-like controls.

- `TurnTimer.tsx`
  Displays server timer.

- `RoomChat.tsx`
  Chat panel.

- `ReconnectOverlay.tsx`
  Overlay for disconnected/reconnecting state.

- `GameEventLayer.tsx`
  Visual event layer placeholder.

- `PlayerSeatRing.tsx`
  Shared seating helper.

Use these when you want to make the whole game shell more polished without touching rules.

## Card Asset System

The frontend does not draw UNO cards with CSS. It resolves a logical card into an image path.

### Active asset folders

Classic:

`apps/web/public/assets/uno/cards/classic`

Expected examples:

- `back_cover.png`
- `red_0.png`
- `red_plus2.png`
- `red_skip.png`
- `wild_1.png`
- `wild_plus4_1.png`

No Mercy:

`apps/web/public/assets/uno/cards/no_mercy`

Expected examples:

- `back_cover.png`
- `red/red_0.png`
- `red/red_plus2.png`
- `red/red_plus4.png`
- `red/red_swap.png`
- `red/red_discard_all.png`
- `wild/wild_reverse_plus4.png`
- `wild/wild_plus6.png`
- `wild/wild_plus10.png`
- `wild/wild_skip_all.png`

The No Mercy filenames should not end in `_01`, `_02`, etc. The resolver now expects suffix-free names.

### `apps/web/src/lib/cards/cardTypes.ts`

Defines frontend card rendering types:

- `CardTheme`
  Currently `classic`, `no_mercy`, and parked `minimal`.

- `CardColor`
  red/yellow/green/blue/wild.

- `RenderableCard`
  Minimal card shape needed by UI.

- `CardAsset`
  Resolved image source, fallback, key, and accent color.

### `apps/web/src/lib/cards/cardThemeConfig.ts`

Defines visible theme options and theme metadata.

Currently the active UI options are Classic and No Mercy. Minimal exists in types/config for later but is intentionally not the main path right now.

### `apps/web/src/lib/cards/resolveCardAsset.ts`

This is the card image router.

Important functions:

- `normalizeValue(value)`
  Converts values like `draw-two` to `draw_two` shape.

- `hashText(value)`
  Used to choose between duplicate classic wild image variants.

- `classicLabel(card)`
  Converts Classic card data into a filename key.

- `classicSrc(card, faceDown)`
  Returns Classic image path.

- `noMercyColoredLabel(card)`
  Converts No Mercy colored card values:
  - `draw_two` -> `color_plus2`
  - `draw_four` -> `color_plus4`
  - `comeback` -> `color_swap`
  - `discard_all` -> `color_discard_all`

- `noMercyWildLabel(card)`
  Converts No Mercy wild card values:
  - `wild_draw_four_reverse` -> `wild_reverse_plus4`
  - `wild_draw_six` -> `wild_plus6`
  - `wild_draw_ten` -> `wild_plus10`
  - `roulette` -> `wild_skip_all`

- `noMercySrc(card, faceDown)`
  Returns No Mercy image path.

- `minimalSrc(card, faceDown)`
  Parked minimal resolver.

- `resolveCardAsset(params)`
  Public function used by `UnoCard` and `SpriteCard`.

If a card image is broken in UI, this is usually the first file to inspect.

### `apps/web/src/components/cards/CardImage.tsx`

Basic `<img>` wrapper. If `src` fails, it switches to `fallbackSrc` instead of crashing the game.

### `apps/web/src/components/cards/SpriteCard.tsx`

Name is historical. It now renders card images through `resolveCardAsset()` and `CardImage`.

### `apps/web/src/lib/cards/cardSpriteManifests.ts`

Manifest shape kept for card gallery/debug and future sprite work. Current gameplay uses separate card PNGs through `resolveCardAsset()`.

### `scripts/upscale-uno-card-assets.py`

Upscales cards under:

- `apps/web/public/assets/uno/cards/classic`
- `apps/web/public/assets/uno/cards/no_mercy`

Target height is `720`. It also updates manifests with new sizes.

Run it after replacing card images with smaller files.

### `scripts/generate-uno-card-assets.py`

Older generation helper. It can regenerate assets from resources/sprite sheets and fallback drawings. Use carefully because it can reset generated card folders.

For your current hand-edited card assets, prefer manual replacement plus `upscale-uno-card-assets.py`.

## How To Change Common Things

### Change whether a card is playable

Backend:

1. Edit `packages/game-core/src/games/uno-no-mercy/rules.ts` or `classic-uno/rules.ts`.
2. Update `validation.ts` if the action needs a new required payload.
3. Update `selectors.ts` so the UI highlights the same legal action.
4. Add or update tests.

Frontend:

Only change frontend if the payload shape changes, usually in `PlayerHand.tsx` and `unoActionUtils.ts`.

### Change what a card does

Backend:

1. Edit `reducer.ts`.
2. For No Mercy, most card effects are in `applyCardEffect()`.
3. If the effect needs helper logic, add a small helper near related helpers.
4. If the effect changes win/elimination behavior, check `finishIfResolved()` and `scoring.ts`.

Frontend:

Add event animations only after backend state is correct.

### Add a new No Mercy card

Backend checklist:

1. Add value type in `packages/game-core/src/games/uno-no-mercy/types.ts`.
2. Add deck entries in `deck.ts`.
3. Add legality in `rules.ts`.
4. Add payload validation in `validation.ts` if needed.
5. Add legal action variants in `selectors.ts`.
6. Add effect in `reducer.ts`.
7. Add score value in deck card definition or scoring.
8. Add tests.

Frontend checklist:

1. Add PNG file under `apps/web/public/assets/uno/cards/no_mercy`.
2. Add mapping in `resolveCardAsset.ts`.
3. If it needs color choice or target choice, update `PlayerHand.tsx`.
4. Add rulebook entry in `UnoRuleBookModal.tsx`.

### Replace a card image

1. Put the replacement PNG in the expected folder.
2. Keep the same filename if possible.
3. Run:

```bash
python scripts/upscale-uno-card-assets.py
```

4. Open `/dev/cards` in the web app and inspect the result.

If you rename the file, also update `resolveCardAsset.ts`.

### Change hand spacing or card size

Edit:

- `PlayerHand.tsx`
  `getHandLayout()` controls overlap and scale by hand size.

- `UnoCard.tsx`
  Base button dimensions and hover behavior.

- `apps/web/src/styles/globals.css`
  Table/dock visual CSS if the class lives there.

### Change the main game layout

Edit `ClassicUnoTable.tsx` first. It controls table sections, seats, center play area, hand dock, results modal, rules button, and reaction button.

Do not move game rules into this file.

### Change chat or reactions

Backend:

- `RoomManager.addChatMessage()`
- `apps/server/src/chat/ChatRateLimiter.ts`
- `apps/server/src/socket/index.ts` `chat:send`

Frontend:

- `RoomChat.tsx`
- `EmojiReactionButton.tsx`
- `ReactionOverlay.tsx`

### Change reconnect behavior

Backend:

- `RoomManager.getRoomForUser()`
- `RoomManager.attachSocket()`
- `RoomManager.detachSocket()`
- `apps/server/src/socket/index.ts` connection, `auth:resume`, and `disconnect` handlers.

Do not key game identity from `socketId`. Socket ids are temporary. `userId` is permanent.

### Change what is visible to each player

Edit:

- `classic-uno/public-state.ts`
- `uno-no-mercy/public-state.ts`

Never hide data in React only. If the server sends it, a client can inspect it.

### Change timer behavior

Game module:

- `index.ts` `getTurnInfo()`
- `index.ts` `getTimeoutAction()`

Server:

- `RoomTimers.ts`
- `RoomManager.applyTimeout()`

### Change match scoring/results

Game module:

- `scoring.ts`
- reducer finish helpers

Server persistence:

- `apps/server/src/services/MatchResultService.ts`

The client must never submit winners, placements, score, XP, or stats.

## Debugging Guide

### `INVALID_PAYLOAD`

Means a Zod schema rejected the shape before rules ran.

Check:

- Socket envelope schemas in `packages/shared/src/schemas`.
- Game action schema in `classic-uno/actions.ts` or `uno-no-mercy/actions.ts`.
- Frontend payload from `PlayerHand.tsx` or `UnoActionBar.tsx`.

### `ILLEGAL_ACTION`

Payload shape was valid, but rules rejected it.

Check:

- `validation.ts`
- `rules.ts`
- Current player id
- Current color
- Pending penalty
- Target player id for 7 swap
- Eliminated flag

### Card highlight is wrong

Check:

- `selectors.ts`
- `unoActionUtils.ts`
- `PlayerHand.tsx`

If backend validation is correct but UI highlight is wrong, legal action generation is probably out of sync.

### Card image is missing or fallback appears

Check:

1. Browser network path.
2. `resolveCardAsset.ts`.
3. Actual file in `apps/web/public/assets/uno/cards`.
4. Case and underscores in filename.
5. `/dev/cards` page.

For No Mercy, the expected suffix-free pattern is:

```text
no_mercy/red/red_7.png
no_mercy/red/red_plus4.png
no_mercy/wild/wild_plus10.png
```

### Hidden hands leak

Check `public-state.ts` immediately. Other players should only receive `handCount`, not `hand`.

### Game desync or crash after reconnect

Check:

- Reducer mutation safety.
- Snapshot JSON shape.
- `RoomManager.restoreActiveRooms()`.
- `RoomManager.getPrivateGamePayload()`.
- `public-state.ts` assumptions about optional/missing restored fields.

### Server crashes after restoring old snapshots

Old snapshots may have an older state shape. Add defensive restoration logic in `RoomManager.restoreGameState()` or make public-state functions tolerate missing legacy fields.

## Review Checklist Before You Finish a Rule/UI Change

- Backend validation rejects illegal actions.
- Reducer applies the effect server-side.
- Legal actions match validation.
- Public state hides other hands.
- UI only sends intent.
- No winner/result/XP is submitted by the client.
- Reconnect still identifies players by `userId`.
- No database write is required for every move.
- Card assets resolve to existing files.
- Typecheck passes.
- Tests cover any changed rule.

## Useful Commands

From the project root:

```bash
corepack pnpm typecheck
corepack pnpm --filter @tabletop/game-core test
corepack pnpm --filter @tabletop/web typecheck
```

With your local Conda environment from Git Bash:

```bash
/c/Users/nazmu/miniconda3/Scripts/conda.exe run -p ./.conda corepack pnpm typecheck
/c/Users/nazmu/miniconda3/Scripts/conda.exe run -p ./.conda corepack pnpm --filter @tabletop/game-core test
/c/Users/nazmu/miniconda3/Scripts/conda.exe run -p ./.conda corepack pnpm --filter @tabletop/web typecheck
```

Upscale card assets:

```bash
python scripts/upscale-uno-card-assets.py
```

## Current Asset Notes

No Mercy currently uses the `no_mercy` card folder and suffix-free filenames. The resolver maps:

- `draw_two` to `plus2`
- colored `draw_four` to `plus4`
- `comeback` to `swap`
- `discard_all` to `discard_all`
- `wild_draw_four_reverse` to `wild_reverse_plus4`
- `wild_draw_six` to `wild_plus6`
- `wild_draw_ten` to `wild_plus10`
- `roulette` to `wild_skip_all`

The current asset set does not include a separate normal No Mercy `wild.png` or separate normal No Mercy `wild_plus4.png`. Until those files exist, `resolveCardAsset.ts` intentionally routes normal No Mercy wild and wild +4 to the closest available wild art instead of crashing.

When you add those exact files later, update `noMercyWildLabel()` in `resolveCardAsset.ts`.
