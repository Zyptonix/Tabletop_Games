# Tabletop Arena — Mega Board-Games Integration

## Included in this milestone

The patch keeps the PC browser/office LAN experience as the primary design target. Connect Four and Reversi continue to use the existing board-games engine and the Connect Four v3.2 UI. Classic UNO and UNO No Mercy implementation files are not edited.

This patch registers and routes the following additional games into the normal room/game-module flow:

- Chess
- Battleships
- Ludo
- Barricades (Quoridor-inspired original game)
- Property Tycoon (Monopoly-style)
- Risk
- World Conquest (a separate larger original conquest map)
- Codenames-style team deduction
- Poker — Texas Hold'em

`monopoly` and `codenames` were already present in the shared ID list, but were not in the server registry. This patch registers them as prototypes. Existing game IDs such as Scribble, Spades, Polashi, UNO Flip and Twenty-Nine are left untouched.

## Honest prototype scope

These new games are wired into the registry and the room route; they start, maintain server-authoritative state, expose legal action candidates, emit activity events, and display a PC-first table with player list, emoji log and chat. Some have useful first-pass mechanics, but this is not a claim that the full commercial rules are complete.

- **Chess:** starting position, basic movement geometry and captures; full check legality, castling, en passant, repetition and tournament rules remain.
- **Battleships:** private fleet cells, hidden ship information, alternating fire, hit tracking and fleet elimination; custom fleet placement and all ship-sinking UI remain.
- **Ludo:** dice, four tokens and progress track; exact safe squares, captures, and home-stretch rules remain.
- **Barricades:** 9×9 pawn, turn moves and wall placements; path preservation, jump rules and full 4-player rules remain.
- **Property Tycoon:** board movement, Start salary, buying and rent; auctions, jail, mortgages, trades, houses and bankruptcy remain.
- **Risk / World Conquest:** claims, reinforcements and simplified one-die territory attacks; full Risk deployment, continent bonuses, card sets and proper attack/defense dice remain.
- **Codenames-style:** 25-word board, team colors, hidden key, reveals and basic team switching; spymaster clue-giving and precise official scoring remain.
- **Poker:** Texas Hold'em-style deal, blinds, private cards, community cards and simplified betting streets; real poker hand evaluation, side pots, all-in side-pot accounting, ties and tournament structure remain. The current showdown uses a high-card approximation and must not be treated as a finished poker implementation.

All hidden state must continue to be produced through `getPublicState` per viewer. In particular, Battleships fleet cells and Poker hole cards are intentionally omitted from other players' views, and unrevealed Codenames roles are omitted from public state.

## Desktop layout

The prototype table screen is PC-first: central game board, fixed right column for Players / Game log / Table chat, internal panel scrolling, and no page-wide scrolling at normal desktop height. The screen has a visible Prototype badge and a clear early-access notice so unfinished rules are not misrepresented. A Dashboard button is available; a finished game shows a manual Return to dashboard button, not an automatic redirect.

## Engineering follow-up order

1. Chess legal moves and full terminal conditions.
2. Battleships ship placement and sinking presentation.
3. Ludo safe cells, captures, home lanes and complete win rules.
4. Barricades wall geometry and pathfinding invariant tests.
5. Poker hand evaluator, betting-round/side-pot correctness and showdown tests.
6. Monopoly auctions/trades/jail/mortgages.
7. Risk continent deployment, multi-dice attacks and cards.
8. Codenames spymaster/clue/guess phases and word-list management.

The implementation is modular so work can happen one game at a time without a rewrite of login, rooms, chat, snapshots or Socket.IO.
