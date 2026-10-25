# Twenty-Nine Frontend Arcade Polish v1

This patch is intentionally frontend-only. It does not change `packages/game-core/src/games/twenty-nine`, scoring rules, legal actions, auction semantics, or the server-authoritative state engine.

## Card sprites

Put the provided card images into `apps/web/public/game-assets/twenty-nine/cards/` using the exact names:

- `A_of_clubs.png`
- `10_of_spades.png`
- `K_of_diamonds.png`
- and so on, with rank values `J`, `9`, `A`, `10`, `K`, `Q`, `8`, `7` for the playable 29 deck.

The loader also tries files directly under `game-assets/twenty-nine/`, under its `sprites/` folder, and the analogous `game-assets/29/` paths. If a file is absent, the existing procedural card face is shown instead. Six-of-hearts and six-of-spades sprites are used opportunistically for the +6/-6 progress-card reveal, even though sixes are not part of the 32-card playing deck.

## Changes

- Sort the hand by suit group (spades, clubs, hearts, diamonds), then by the Bangladesh 29 rank order `J > 9 > A > 10 > K > Q > 8 > 7`; preserve stable ids as a tie-breaker.
- Render larger real card sprites with an UNO-inspired shallow fan, overlap, hover lift, legal-play glow, draw/play motion and reduced-motion handling.
- Render the four trick cards upright in one horizontal rail rather than rotating each card around the center. Show the current trick number in a top-right status chip and gently highlight the card currently taking the trick using led-suit and revealed-trump rules.
- Add a prominent animated bidding prompt directly above the player's hand.
- Replace numeric-only ±6 pills with overlapping 6-of-hearts and 6-of-spades score cards under a patterned card back. Each score point reveals the relevant face and a six-segment progress strip; zero remains face-down, +6 shows the red winning face, and -6 the black losing face.
- Expand the Twenty-Nine table into a viewport-filling dark arcade stage with a generated electric-blue/red/gold background, a denser hand/table layout, and the existing right-side hand log and chat.

The first-pass engine and both UNO implementations remain unchanged. The generated stage image is only a background asset; the card sprites remain replaceable user-owned files.
