# Connect Four — Final Arcade Polish v4

This patch is based on remote [first-pass commit `b2565d3b184a41690f64bf1d6b21fb7f86e14fab` (`First pass`)](https://github.com/Zyptonix/Tabletop_Games/commit/b2565d3b184a41690f64bf1d6b21fb7f86e14fab) on `feat/board-games-pc-first-v1`.

## Fixes

- Increase the custom red/yellow disc rendering from 56% to 64% of the slot width. The image remains independent from the board, so your existing `red-disc-trimmed.png` and `yellow-disc-trimmed.png` sprites stay intact.
- Separate pointer hover from keyboard-column selection. The third column is no longer highlighted by default just because `keyboardColumn` starts at 3.
- Clear hover/keyboard-navigation highlight when the pointer leaves the board, column selector or cabinet. Pointer movement re-enters pointer mode; arrow keys activate keyboard-column mode. Keyboard-only highlighting is also cleared after a drop.
- Add a dark, cinematic arcade backdrop and restrained cabinet glow, edge lighting, selected-slot and winning-disc polish. The board and disc sprites remain user-owned and replaceable.
- If `theme.json` already points `screenBackground` to a non-empty custom image, it is preserved. The bundled background is configured only when that setting is blank.

## Asset

`apps/web/public/game-assets/connect-four/arcade-background.webp` is an optional 1600x900 dark arcade-stage background. Change `screenBackground` in `theme.json` later to any other local image under `/game-assets/connect-four/` to replace it.

## Deliberate exclusions

- No game-engine, bot, Reversi, room, socket, or UNO files are changed.
- No existing board or disc sprite is replaced.
- No automatic redirect is added; the existing manual Dashboard button remains.
