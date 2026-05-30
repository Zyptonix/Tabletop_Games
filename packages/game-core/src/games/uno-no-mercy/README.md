# UNO No Mercy Module

Status: playable server-authoritative MVP.

Implemented systems:
- Separate No Mercy deck builder and settings.
- Number cards 0-9 in red, yellow, green, and blue.
- Skip, reverse, draw two, colored draw four, comeback / skip-all, and discard-all cards.
- Wild, wild draw four, wild draw four reverse, wild draw six, wild draw ten, and roulette cards.
- 7 swap and 0 pass hand movement, resolved on the server.
- Pending draw penalty stack with stack power checks.
- Colored +4 cards are not wild and require matching current color.
- Wild +4 reverse applies draw four and reverses direction.
- Roulette draws until the declared color appears.
- 25-card elimination by default.
- Per-viewer public state filtering so only the viewer receives their own hand.

Frontend notes:
- Uses the shared UNO table components.
- 7 swap opens a target picker from legal server actions.
- Card faces resolve through `apps/web/src/lib/cards` into `public/assets/uno/cards`.

Future improvements:
- Tune exact card counts against your preferred physical deck list.
- Add more animation-specific game event handling for every special card.
- Add challenge/house-rule toggles if you want stricter variants later.