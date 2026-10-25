# Tabletop Arena: Board Games and PC-First Mobile-Compatible Roadmap

## Product requirements

### Product and design priority

- **Primary target: desktop PC browsers used in an office LAN.** Mobile is compatibility support, not the main design driver.
- Match the existing Tabletop Arena office style: dark theme, generous board/table area, desktop side-by-side board and chat/log panels, visible status and player information, clear turn ownership, and mouse/keyboard affordances.
- Design and verify desktop layouts first at 1366×768, 1440×900, and 1920×1080. Do not shrink a desktop layout mechanically to phone size; intentionally reflow the controls for mobile afterward.
- Phone and tablet browsers remain supported without apps. Mobile needs functional touch controls and readable panels, but must not dictate desktop board sizing or remove useful desktop information.

- Browser-only. No native iOS or Android apps are required.
- Desktop PC is the primary layout; phone portrait, phone landscape, and tablet are supported adaptive layouts.
- The server remains authoritative for legal moves, turn ownership, hidden information, and win conditions.
- New games reuse the existing room, authentication, reconnect, chat, event feed, and result systems.
- Do not modify the existing UNO/UNO No Mercy rules engine while adding mobile layouts.
- Mouse and keyboard are first-class desktop controls. Touch controls must also be available on mobile; common interactive targets should be at least 44 CSS pixels high/wide where the mobile layout allows it.
- Use responsive board sizing and scrollable supporting panels, safe-area padding, and reduced-motion support. Avoid requiring WebGL or a native app.

## Selected game roster

1. Chess — 2 players.
2. Connect Four — 2 players.
3. Battleships — 2 players (optional free-for-all variant only after the classic mode is stable).
4. Reversi — 2 players.
5. Ludo — 2–4 players.
6. World Conquest — an original Risk-style territory-control game for 2–6 players. This is one game, not a duplicate Risk implementation.
7. Barricades — an original Quoridor-style path-and-wall game for 2–4 players.
8. Property Tycoon / Monopoly-style property trading — 2–6 players. Use original art and branding if this repository is distributed publicly.
9. Codenames-style team word deduction — 4–10 players in the default team mode.

Other candidates such as Catan-style building, Ticket-to-Ride-style routes, Azul-style tile drafting, Take 5-style simultaneous card play, and additional party games remain backlog items.

## Delivery order

### Foundation milestone

- Create reusable server-authoritative grid-game patterns and a desktop-first board UI with a generous play area, side-by-side board/chat/log panels and clear mouse/keyboard controls.
- Add mobile-specific reflow only at suitable breakpoints: stacked content, collapsible chat/log, safe areas and touch controls. Do not redesign the core desktop screen around mobile.
- Add Connect Four and Reversi with focused engine tests.
- Make the existing game tables accessible on narrow viewports without changing UNO rules.
- Add touch movement controls for Bomber Tag alongside WASD/arrow-key controls.

### Next game batches

- Chess and Battleships: rules tests and hidden/private state controls.
- Ludo and Barricades: token/path movement, captures, wall legality and route-to-goal validation.
- World Conquest and Property Tycoon: multi-phase turns, combat/economy rules, bankruptcy/elimination, long-match handling.
- Codenames-style: private spymaster key, public operative board, team actions, clue/guess phase validation, and 4–10-player balance.

## Acceptance checklist

### Desktop-first PC acceptance (required before mobile pass)

- Test at 1366×768, 1440×900, and 1920×1080.
- Board remains the dominant focal point with side-by-side chat/event log and player/status panels where space permits.
- Mouse hover/focus and keyboard input are supported where appropriate; no required interaction depends exclusively on touch.
- Dark office styling, spacing, readable turn ownership and controls remain consistent with Tabletop Arena.
- No unexpected horizontal scrolling at desktop sizes; controls never cover playable board areas.

### Mobile compatibility checklist

- No page-wide horizontal scrolling at 360px, 390px, or 768px unless a game-specific board intentionally uses its own contained pan/zoom.
- Essential mobile actions are reachable by touch in portrait mode; desktop actions do not need to be optimized around one-thumb use.
- Landscape orientation preserves the board and turn/status controls.
- Player information, scores, chat and event feeds stack below or collapse beside the board on phones.
- Board cell sizing remains usable; legal moves are differentiated by shape/contrast as well as color.
- Hidden information is filtered on the server for every viewer; UI hiding alone is insufficient.
- Engine tests cover illegal actions, turn order, win/draw, and reconnect-safe public state.
- Test Classic UNO, UNO No Mercy, Mafia/Werewolf, Bomber Tag and Twenty-Nine after each mobile CSS change.
