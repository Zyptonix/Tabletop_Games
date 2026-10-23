# Twenty-Nine (Bangladesh rules)

This game module is separate from Classic UNO and UNO No Mercy. It uses Tabletop Arena's existing room state, action transport, snapshots, event layer, bot seats, chat, and match-result pipeline.

## Selected rules

- Four players; seats 0 and 2 partner against seats 1 and 3. Turn order is counterclockwise.
- 32 cards: J, 9, A, 10, K, Q, 8, 7 in spades, hearts, diamonds and clubs. Card points are J=3, 9=2, A=1, 10=1; the deck has exactly 28 card points. There is **no last-trick bonus** and the maximum bid is 28.
- Deal four cards each for the auction, minimum bid 16. The multi-round Bangladesh auction supports raises, Ditto, and partner takeover after a pass. Three initial passes cancel the deal.
- The declarer chooses a hidden trump suit or the seventh-card option. Double and Redouble are supported (x2 and x4). There is no Set action.
- Follow suit when able. If trump is concealed and a player cannot follow suit, the rules require a trump reveal before they discard; if the declarer is first unable to follow suit, they reveal. Once revealed, trump beats the led suit.
- A King–Queen trump pair can adjust the contract after the reveal trick, with the Bangladesh bid restrictions: the bidder's team does not reduce contracts of 16–18; the opposing team's pair raises the target by four, capped at 28.
- **Single Hand is enabled by default.** Any player may declare it before the first card of the first trick. The caller plays against the two opponents; their partner sits out. There is no trump, and the caller must win all eight tricks. Success awards +3 game points to the caller's team; losing any trick immediately costs that team 3. It is an optional gameplay action and can be disabled in settings with `allowSingleHand: false`.
- Normal contracts score +1/-1, doubled contracts +2/-2, and redoubled contracts +4/-4 according to whether the bidding team reaches its target. First team to +6 wins; reaching -6 loses.

## Visuals and performance

The four suit marks in the table are inline SVG paths, not font glyphs. This makes clubs and spades render reliably even when symbol fonts are missing. The table uses lightweight CSS orbit rings and a capped number of card-flight proxies, animated mainly with transform and opacity. It respects reduced-motion settings.

## Information safety

Player hands are returned only to the owning viewer. Opponents do not receive the hidden trump suit or the seventh card. The room-wide `trump_selected` event deliberately omits the selected suit.

The game-core module remains authoritative. UI animations only visualize events and never apply game actions. The game ID is `twenty-nine`; the display label is `29 (Bangladesh)`.
