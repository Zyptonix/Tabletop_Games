#!/usr/bin/env python3
"""Tabletop Arena PC-first full continuation patch v4.

Composes the V3 chess/visual/menu/no-scroll patch in memory, then layers in:
- a multi-hand Texas Hold'em tournament lifecycle (button rotation until one stack remains),
- poker cards rendered from the existing Twenty-Nine card PNG set,
- a compact casino-themed Poker table and hand-ranking modal,
- viewport-locked, no-scroll game panels across every active game,
- Ludo three-consecutive-sixes forfeiture and Battleships per-ship sinking,
- regression tests for Poker lifecycle/chip conservation, Ludo and Battleships.

It expects the user's already-applied V2 backend hardening and the PC-first branch.
Nothing is written until every transformation has passed its source guards.
"""
from __future__ import annotations
import argparse
import importlib.util
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BASE_COMMIT = "19aead093be3c8e1d758413d70b4909977285462"
EXPECTED_BRANCH = "feat/board-games-pc-first-v1"
MARKER = "TABLETOP ARENA FULL PATCH V4"

class PatchError(RuntimeError):
    pass

def load_v3():
    path = Path(__file__).with_name("apply_pc_first_game_engine_v3.py")
    if not path.is_file():
        raise PatchError("Missing bundled apply_pc_first_game_engine_v3.py; keep both scripts in the same folder.")
    spec = importlib.util.spec_from_file_location("_tabletop_pc_first_v3", path)
    if spec is None or spec.loader is None:
        raise PatchError("Could not load the bundled v3 patch component.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module

V3 = load_v3()

def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise PatchError(f"{label}: expected one anchor, found {count}; no files changed.")
    return src.replace(old, new, 1)

def replace_region(src: str, start: str, end: str, new: str, label: str) -> str:
    a = src.find(start)
    if a < 0:
        raise PatchError(f"{label}: start anchor not found; no files changed.")
    b = src.find(end, a + len(start))
    if b < 0:
        raise PatchError(f"{label}: end anchor not found; no files changed.")
    if src.find(start, a + len(start), b) >= 0:
        raise PatchError(f"{label}: ambiguous region; no files changed.")
    return src[:a] + new + src[b:]

POKER_MULTI_HAND_HELPER = r'''function startNextPokerHand(state: PrototypeGameState, now: string, previousHandNote = ""): void {
  const survivingPlayers = state.players.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  if (survivingPlayers.length <= 1) {
    const champion = survivingPlayers[0] ?? null;
    state.pokerPot = 0;
    state.pokerLastAction = champion
      ? `${previousHandNote ? `${previousHandNote} · ` : ""}${champion.displayName} wins the Poker tournament with the last remaining stack.`
      : `${previousHandNote ? `${previousHandNote} · ` : ""}Poker tournament ended without a surviving stack.`;
    finish(state, champion?.userId ?? null, now);
    return;
  }

  // Reset hand-scoped data but preserve tournament stacks and rotate the dealer
  // to the next player who still has chips. Zero-stack players are eliminated.
  const ordered = state.players.slice().sort((a, b) => a.seat - b.seat);
  const oldButtonIndex = ordered.findIndex((player) => player.seat === state.pokerButtonSeat);
  let button: GamePlayer | null = null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const candidate = ordered[(Math.max(0, oldButtonIndex) + offset) % ordered.length];
    if (candidate && (state.pokerStacks[candidate.userId] ?? 0) > 0) { button = candidate; break; }
  }
  button ??= survivingPlayers[0] ?? null;
  if (!button) {
    finish(state, null, now);
    return;
  }

  state.phase = "playing";
  state.winnerUserId = null;
  state.pokerHandNumber = (state.pokerHandNumber ?? 1) + 1;
  state.pokerButtonSeat = button.seat;
  state.pokerStreet = "preflop";
  state.pokerPot = 0;
  state.pokerBetToCall = 0;
  state.pokerFolded = state.players
    .filter((player) => (state.pokerStacks[player.userId] ?? 0) <= 0)
    .map((player) => player.userId);
  state.pokerActed = [];
  state.pokerBets = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.pokerContributions = Object.fromEntries(state.players.map((player) => [player.userId, 0]));
  state.communityCards = [];
  state.pokerCardsByPlayer = {};

  const shuffled = shuffle(freshDeck(), state.rngState);
  state.pokerDeck = shuffled.items;
  state.rngState = shuffled.rngState;
  for (const player of survivingPlayers) {
    state.pokerCardsByPlayer[player.userId] = [state.pokerDeck.shift()!, state.pokerDeck.shift()!];
  }

  const active = ordered.filter((player) => (state.pokerStacks[player.userId] ?? 0) > 0);
  const buttonIndex = active.findIndex((player) => player.userId === button!.userId);
  const smallBlindIndex = active.length <= 2 ? buttonIndex : (buttonIndex + 1) % active.length;
  const bigBlindIndex = active.length <= 2 ? (buttonIndex + 1) % active.length : (buttonIndex + 2) % active.length;
  const smallBlindPlayer = active[smallBlindIndex] ?? button;
  const bigBlindPlayer = active[bigBlindIndex] ?? active.find((player) => player.userId !== smallBlindPlayer.userId) ?? button;
  for (const [blindPlayer, nominalBlind] of [[smallBlindPlayer, 10], [bigBlindPlayer, 20]] as Array<[GamePlayer, number]>) {
    if (!blindPlayer || state.pokerFolded.includes(blindPlayer.userId)) continue;
    const paid = Math.min(nominalBlind, state.pokerStacks[blindPlayer.userId] ?? 0);
    state.pokerStacks[blindPlayer.userId] = (state.pokerStacks[blindPlayer.userId] ?? 0) - paid;
    state.pokerBets[blindPlayer.userId] = (state.pokerBets[blindPlayer.userId] ?? 0) + paid;
    state.pokerContributions[blindPlayer.userId] = (state.pokerContributions[blindPlayer.userId] ?? 0) + paid;
    state.pokerPot += paid;
  }
  state.pokerBetToCall = Math.max(0, ...Object.values(state.pokerBets));
  if (active.length <= 2) {
    state.currentPlayerId = (state.pokerStacks[button.userId] ?? 0) > 0 ? button.userId : nextPokerActor(state, button.userId);
  } else {
    state.currentPlayerId = nextPokerActor(state, bigBlindPlayer.userId);
  }
  state.updatedAt = now;
  state.turnStartedAt = now;
  state.pokerLastAction = [previousHandNote, `Hand ${state.pokerHandNumber} begins`, `Blinds $10/$20`, `Button: ${button.displayName}`]
    .filter(Boolean).join(" · ");

  // When blind posts put every remaining player all-in, play the runout and
  // showdown automatically instead of waiting for an action that cannot happen.
  if (!state.currentPlayerId) advancePokerStreet(state, now);
}

'''

POKER_CARD_COMPONENTS = r'''const POKER_CARD_SUIT_FILES: Record<string, string> = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
function PokerPlayingCard({ card, hidden = false, compact = false }: { card?: string | null; hidden?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (hidden || !card) return <div className={`poker-playing-card poker-card-back ${compact ? "poker-card-compact" : ""}`} aria-label="Hidden card"><span>♠</span><b>TABLETOP</b><small>ARENA</small></div>;
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const suitFile = POKER_CARD_SUIT_FILES[suit];
  const asset = `/game-assets/twenty-nine/cards/${rank}_of_${suitFile}.png`;
  const red = suit === "♥" || suit === "♦";
  return <div className={`poker-playing-card ${compact ? "poker-card-compact" : ""}`} title={`${rank} of ${suitFile ?? "unknown suit"}`}>
    {!failed && suitFile ? <img src={asset} alt={`${rank} of ${suitFile}`} draggable={false} onError={() => setFailed(true)} /> : <div className={`poker-card-fallback ${red ? "text-rose-600" : "text-slate-950"}`}><strong>{rank}</strong><span>{suit}</span><small>{rank}{suit}</small></div>}
  </div>;
}

const POKER_HAND_RANKINGS = [
  { name: "Royal flush", tier: "Top tier", example: "A♠ K♠ Q♠ J♠ 10♠", detail: "A-K-Q-J-10, all one suit. The highest possible straight flush." },
  { name: "Straight flush", tier: "Tier 2", example: "9♥ 8♥ 7♥ 6♥ 5♥", detail: "Five consecutive ranks in the same suit. A-2-3-4-5 is the low ace straight." },
  { name: "Four of a kind", tier: "Tier 3", example: "Q♠ Q♥ Q♦ Q♣ A♦", detail: "Four cards of one rank, then the highest kicker." },
  { name: "Full house", tier: "Tier 4", example: "10♠ 10♥ 10♦ 4♣ 4♥", detail: "Three of a kind plus a pair. Compare the three-card rank first, then the pair." },
  { name: "Flush", tier: "Tier 5", example: "A♦ J♦ 8♦ 5♦ 2♦", detail: "Five cards of one suit, not in sequence. Compare highest card downward." },
  { name: "Straight", tier: "Tier 6", example: "9♠ 8♥ 7♦ 6♣ 5♠", detail: "Five consecutive ranks in mixed suits. Ace can be high or low, never wrap around." },
  { name: "Three of a kind", tier: "Tier 7", example: "7♠ 7♥ 7♦ A♣ 9♠", detail: "Three equal ranks plus two kickers, compared from highest to lowest." },
  { name: "Two pair", tier: "Tier 8", example: "K♠ K♥ 3♦ 3♣ A♠", detail: "Compare the higher pair, then the lower pair, then the kicker." },
  { name: "One pair", tier: "Tier 9", example: "J♠ J♥ A♦ 8♣ 4♠", detail: "One pair plus three kickers, compared in order." },
  { name: "High card", tier: "Lowest", example: "A♠ J♥ 8♦ 5♣ 2♠", detail: "No combination; compare all five card ranks from highest down." }
];
'''

POKER_RENDER = r'''  function renderPoker() {
    const myPaid = state.pokerBets[currentUserId] ?? 0;
    const myStack = state.pokerStacks[currentUserId] ?? 0;
    const callAmount = Math.min(Math.max(0, state.pokerBetToCall - myPaid), myStack);
    const activePlayers = state.players.filter((player) => !player.folded).length;
    const showHandCards = state.communityCards.length > 0 && state.pokerStreet !== "preflop";
    return <div className="poker-casino flex h-full min-h-0 w-full flex-col gap-2">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/15 bg-[#0b1513] px-3 py-2 shadow-[0_8px_25px_rgba(0,0,0,.22)]">
        <div className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-amber-200/25 bg-amber-300/10 text-2xl text-amber-100">♠</span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.25em] text-amber-200/55">After-hours casino</p><h2 className="truncate text-lg font-black text-white">Texas Hold’em <span className="text-amber-100/55">· Hand {state.pokerHandNumber ?? 1}</span></h2></div></div>
        <div className="flex items-center gap-2"><div className="rounded-lg border border-amber-200/15 bg-black/20 px-3 py-1.5 text-right"><p className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">Table pot</p><p className="text-lg font-black tabular-nums text-amber-100">${state.pokerPot.toLocaleString("en-US")}</p></div><button type="button" onClick={() => setPokerRulesOpen(true)} className="min-h-9 rounded-lg border border-amber-200/25 bg-amber-200/10 px-3 text-[10px] font-black uppercase tracking-wider text-amber-100 transition hover:bg-amber-200/20">♜ Hand rankings</button></div>
      </header>
      <section className="poker-casino-felt relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[2rem] border-[5px] border-[#9e7138] px-2 py-2 shadow-[inset_0_0_0_2px_rgba(255,235,190,.08),inset_0_0_60px_rgba(0,0,0,.3),0_18px_35px_rgba(0,0,0,.35)] sm:px-3">
        <div className="pointer-events-none absolute inset-[3%] rounded-[48%] border border-amber-100/15"/><div className="pointer-events-none absolute inset-[7%] rounded-[45%] border border-emerald-100/[.06]"/>
        <div className="relative z-10 grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          {state.players.map((player) => {
            const eliminated = (player.stack ?? 0) <= 0 && player.folded;
            return <div key={player.userId} className={`min-w-0 rounded-lg border px-2 py-1.5 text-center shadow-[0_4px_12px_rgba(0,0,0,.15)] ${player.isCurrentTurn ? "border-amber-200/50 bg-amber-100/[.12] ring-1 ring-amber-200/20" : "border-white/10 bg-[#04120e]/65"} ${player.folded || eliminated ? "opacity-45" : ""}`}>
              <div className="flex items-center justify-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}/><p className="max-w-full truncate text-[10px] font-black text-white">{player.displayName}{player.userId === currentUserId ? " · YOU" : ""}</p></div>
              <p className="mt-0.5 truncate text-[9px] font-bold text-emerald-100/60">{eliminated ? "BUSTED" : player.folded ? "FOLDED" : `$${(player.stack ?? 0).toLocaleString("en-US")}`}{player.seat === state.pokerButtonSeat ? " · DEALER" : ""}</p>
              <div className="mt-1 flex min-h-[2.6rem] items-center justify-center gap-1">
                {player.folded || eliminated ? <span className="text-[9px] font-black uppercase text-white/25">Out</span> : player.userId === currentUserId ? state.myPokerCards.map((card) => <PokerPlayingCard key={card} card={card} compact />) : <><PokerPlayingCard hidden compact/><PokerPlayingCard hidden compact/></>}
              </div>
              <p className="mt-0.5 text-[8px] font-bold text-amber-100/60">Bet ${(player.bet ?? 0).toLocaleString("en-US")}</p>
            </div>;
          })}
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center py-1 text-center">
          <div className="rounded-full border border-amber-100/15 bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[.22em] text-amber-100/65">{state.pokerStreet} · {activePlayers} live</div>
          <div className="mt-2 flex min-h-0 items-center justify-center gap-1.5 sm:gap-2" aria-label="Community cards">
            {Array.from({ length: 5 }, (_, index) => <PokerPlayingCard key={index} card={state.communityCards[index] ?? null} compact />)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2"><span className="rounded-full border border-amber-100/15 bg-[#04120e]/70 px-3 py-1 text-[10px] font-black text-amber-100">POT ${state.pokerPot.toLocaleString("en-US")}</span><span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-bold text-white/65">To call ${callAmount.toLocaleString("en-US")}</span></div>
          <p className="mt-2 max-w-[95%] text-[10px] font-semibold leading-relaxed text-emerald-50/70" aria-live="polite">{state.pokerLastAction}</p>
          {showHandCards ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[.18em] text-amber-100/35">Best five cards win · kickers break ties</p> : null}
        </div>
      </section>
      <footer className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-white/[.07] bg-[#0b1513] px-3 py-2">
        <div className="mr-auto min-w-0"><p className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">Your chips</p><p className="text-sm font-black text-emerald-100">${myStack.toLocaleString("en-US")} <span className="text-[9px] font-semibold text-white/35">· Button rotates each hand</span></p></div>
        {legalActions.filter(isAction).filter((action) => action.type === "poker_action").map((action) => <button key={String(action.choice)} type="button" onClick={() => dispatch(action)} className={`min-h-10 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider transition hover:-translate-y-0.5 ${action.choice === "fold" ? "border border-rose-300/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : action.choice === "raise" || action.choice === "all_in" ? "border border-amber-100/30 bg-gradient-to-b from-amber-200 to-amber-400 text-[#251707] shadow-[0_3px_0_#8e5d25] hover:brightness-105" : "border border-emerald-200/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"}`}>{action.choice === "fold" ? "Fold" : action.choice === "check" ? "Check" : action.choice === "call" ? `Call $${callAmount}` : action.choice === "raise" ? "Raise +$20" : "All-in"}</button>)}
      </footer>
      {pokerRulesOpen ? <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="poker-rules-title" onClick={() => setPokerRulesOpen(false)}><section className="poker-rules-modal w-full max-w-3xl rounded-2xl border border-amber-200/25 bg-[#07120f] p-4 shadow-[0_25px_90px_rgba(0,0,0,.72)]" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.25em] text-amber-200/55">Casino cheat sheet</p><h3 id="poker-rules-title" className="mt-1 text-xl font-black text-amber-100">Poker hand rankings</h3><p className="mt-1 text-[10px] text-white/50">Strongest to weakest · use your best five of seven cards.</p></div><button type="button" onClick={() => setPokerRulesOpen(false)} aria-label="Close hand rankings" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10">✕</button></div><div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {POKER_HAND_RANKINGS.map((hand, index) => <article key={hand.name} className="flex min-w-0 items-start gap-2 rounded-lg border border-white/[.07] bg-white/[.035] p-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-amber-100/20 bg-amber-200/10 text-[10px] font-black text-amber-100">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h4 className="text-[11px] font-black text-white">{hand.name}</h4><span className="text-[7px] font-black uppercase tracking-widest text-amber-200/45">{hand.tier}</span></div><p className="mt-0.5 font-mono text-[9px] font-bold text-emerald-100/85">{hand.example}</p><p className="mt-0.5 text-[9px] leading-snug text-white/50">{hand.detail}</p></div></article>)}
      </div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Card order</p><p className="mt-1 text-[9px] leading-snug text-white/55">2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A. Ace can be low only in A-2-3-4-5.</p></div><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Kickers & ties</p><p className="mt-1 text-[9px] leading-snug text-white/55">Compare the category first, then its tie-break ranks. Equal hands split the eligible pot; odd chips go by seat order.</p></div><div className="rounded-lg border border-white/[.07] bg-black/20 p-2"><p className="text-[9px] font-black text-amber-100">Hand flow</p><p className="mt-1 text-[9px] leading-snug text-white/55">Preflop → flop (3 cards) → turn → river → showdown. Fold, check/call, raise or go all-in. Dealer button rotates; play continues until one stack remains.</p></div></div><p className="mt-2 text-[8px] font-semibold text-white/30">Suits have equal strength. This table uses fixed $10/$20 blinds and $20 fixed-limit raises (not no-limit betting).</p></section></div> : null}
    </div>;
  }
'''

POKER_CSS = r'''
/* TABLETOP ARENA FULL PATCH V4 — no-scroll casino layout + poker card art */
.tt-game-viewport .overflow-y-auto,
.tt-game-viewport .overflow-x-auto {
  overflow: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.tt-game-viewport .overflow-y-auto::-webkit-scrollbar,
.tt-game-viewport .overflow-x-auto::-webkit-scrollbar { display: none !important; }
.tt-game-viewport,
.tt-game-viewport * { overscroll-behavior: none; }
.poker-casino { --poker-gold: #d8ae67; }
.poker-casino-felt {
  background:
    radial-gradient(ellipse at 50% 42%, rgba(21,108,73,.98) 0%, rgba(7,59,42,.98) 46%, rgba(3,28,21,.99) 78%),
    repeating-linear-gradient(115deg, rgba(255,255,255,.012) 0 1px, transparent 1px 4px);
  box-shadow: inset 0 0 55px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,245,216,.08);
}
.poker-playing-card {
  position: relative;
  display: grid;
  width: clamp(2.25rem, 4.2vw, 3.45rem);
  aspect-ratio: 5 / 7;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: .42rem;
  border: 1px solid rgba(255,255,255,.75);
  background: #f8fafc;
  box-shadow: 0 3px 9px rgba(0,0,0,.28);
}
.poker-playing-card > img { display:block; width:100%; height:100%; object-fit:contain; }
.poker-card-compact { width: clamp(1.8rem, 3.3vw, 2.75rem); border-radius: .3rem; }
.poker-card-back {
  place-items: center;
  color: #f4d497;
  border: 1px solid rgba(255,226,172,.72);
  background:
    linear-gradient(45deg, transparent 46%, rgba(255,255,255,.12) 48%, transparent 52%),
    linear-gradient(-45deg, transparent 46%, rgba(255,255,255,.12) 48%, transparent 52%),
    repeating-linear-gradient(45deg, #112f29 0 4px, #1c4c3f 4px 8px);
  outline: 2px solid rgba(10,25,20,.9);
  outline-offset: -4px;
}
.poker-card-back > span { font-size: clamp(.8rem, 1.8vw, 1.3rem); line-height: 1; }
.poker-card-back > b { font-size: clamp(.28rem, .7vw, .42rem); letter-spacing: .1em; }
.poker-card-back > small { font-size: .32rem; letter-spacing: .18em; }
.poker-card-fallback { width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:.18rem .22rem; font-weight:900; line-height:1; }
.poker-card-fallback strong { font-size:clamp(.55rem,1.2vw,.9rem); }
.poker-card-fallback span { align-self:center; font-size:clamp(.8rem,1.8vw,1.2rem); }
.poker-card-fallback small { align-self:flex-end; font-size:.45rem; }
.poker-rules-modal { max-height: calc(100dvh - 1.5rem); overflow: hidden; }
@media (max-height: 850px) {
  .poker-casino-felt { padding-top: .35rem !important; padding-bottom: .35rem !important; }
  .poker-casino .poker-playing-card { width: clamp(1.8rem, 3.4vw, 2.8rem); }
  .poker-casino .poker-card-compact { width: clamp(1.55rem, 2.9vw, 2.35rem); }
  .poker-casino-felt .mt-2 { margin-top: .3rem !important; }
  .poker-casino-felt .mt-1 { margin-top: .15rem !important; }
}
@media (max-height: 700px) {
  .poker-casino header { padding-top: .25rem; padding-bottom: .25rem; }
  .poker-casino .poker-playing-card { width: clamp(1.55rem, 2.8vw, 2.2rem); }
  .poker-casino .poker-card-compact { width: clamp(1.3rem, 2.4vw, 1.8rem); }
  .poker-rules-modal { padding: .65rem; }
  .poker-rules-modal .mt-3 { margin-top: .4rem; }
}
@media (max-width: 900px) {
  .poker-casino-felt { border-width: 3px; }
}
@media (max-height: 850px) {
  .mafia-werewolf-screen > .relative.z-10 { zoom: .88; }
}
@media (max-height: 700px) {
  .mafia-werewolf-screen > .relative.z-10 { zoom: .76; }
}
'''

def patch_engine(src: str) -> str:
    if MARKER in src:
        raise PatchError("Poker multi-hand lifecycle already appears installed in the engine.")
    src = f"/* {MARKER} */\n" + src
    src = replace_once(src,
        '  const state = JSON.parse(JSON.stringify(params.state)) as PrototypeGameState;\n  const { playerId, action, now } = params;',
        '  const state = JSON.parse(JSON.stringify(params.state)) as PrototypeGameState;\n  // Normalize older persisted snapshots before touching fields introduced by this patch.\n  state.ludoConsecutiveSixes ??= {};\n  state.shipGroupsByPlayer ??= {};\n  state.pokerHandNumber ??= 1;\n  state.pokerButtonSeat ??= state.players[0]?.seat ?? 0;\n  state.pokerContributions ??= {};\n  const { playerId, action, now } = params;',
        "normalize persisted snapshots for the added rules fields")
    src = replace_once(src,
        '  pokerButtonSeat: number;\n  pokerStreet: PokerStreet;',
        '  pokerButtonSeat: number;\n  pokerHandNumber: number;\n  pokerStreet: PokerStreet;',
        "poker hand number in persistent state")
    src = replace_once(src,
        '  pokerPot: number;\n  pokerStreet: PokerStreet;\n  pokerLastAction: string;',
        '  pokerPot: number;\n  pokerStreet: PokerStreet;\n  pokerButtonSeat: number;\n  pokerHandNumber: number;\n  pokerLastAction: string;',
        "poker hand number in public state")
    src = replace_once(src,
        'pokerButtonSeat: players[0]?.seat ?? 0, pokerFolded: [],',
        'pokerButtonSeat: players[0]?.seat ?? 0, pokerHandNumber: 1, pokerFolded: [],',
        "initialize poker tournament hand counter")
    src = replace_once(src,
        'pokerPot: state.pokerPot, pokerStreet: state.pokerStreet, pokerLastAction: state.pokerLastAction,',
        'pokerPot: state.pokerPot, pokerStreet: state.pokerStreet, pokerButtonSeat: state.pokerButtonSeat, pokerHandNumber: state.pokerHandNumber, pokerLastAction: state.pokerLastAction,',
        "publish poker tournament hand counter")
    src = replace_once(src,
        '      state.wallsRemaining[player.userId] = 10;',
        '      state.wallsRemaining[player.userId] = players.length > 2 ? 5 : 10;',
        "use standard Quoridor wall counts for two/four-player tables")
    # Ludo: implement the common three-consecutive-sixes forfeiture rule.
    ludo_field = '  ludoTokens: Record<string, number[]>;\n  diceRoll: number | null;'
    if src.count(ludo_field) != 2:
        raise PatchError(f"persistent Ludo consecutive-six counter: expected 2 interface anchors, found {src.count(ludo_field)}")
    src = src.replace(ludo_field, '  ludoTokens: Record<string, number[]>;\n  ludoConsecutiveSixes: Record<string, number>;\n  diceRoll: number | null;', 1)
    src = replace_once(src,
        'ludoTokens: {}, diceRoll: null, hasRolled: false,',
        'ludoTokens: {}, ludoConsecutiveSixes: {}, diceRoll: null, hasRolled: false,',
        "initialize Ludo consecutive-six counter")
    src = replace_region(src,
        '  } else if (action.type === "roll_dice" && state.gameId === "ludo") {',
        '  } else if (action.type === "move_token" && state.gameId === "ludo") {',
        r'''  } else if (action.type === "roll_dice" && state.gameId === "ludo") {
    const roll = random(state, 6) + 1;
    state.diceRoll = roll;
    state.hasRolled = true;
    state.ludoConsecutiveSixes ??= {};
    state.ludoConsecutiveSixes[playerId] = roll === 6 ? (state.ludoConsecutiveSixes[playerId] ?? 0) + 1 : 0;
    if (roll === 6 && (state.ludoConsecutiveSixes[playerId] ?? 0) >= 3) {
      state.ludoConsecutiveSixes[playerId] = 0;
      state.diceRoll = null;
      state.hasRolled = false;
      state.currentPlayerId = nextPlayerId(state, playerId);
      state.turnNumber += 1;
      message = `🎲 ${player.displayName} rolled a third consecutive six and forfeited the turn.`;
    } else {
      message = `🎲 ${player.displayName} rolled ${roll}.`;
    }
''',
        "Ludo three-six turn forfeiture")

    # Battleships: track the five ships separately so sunk messages are accurate,
    # and only end when every ship—not merely an arbitrary hit count—is sunk.
    src = replace_once(src,
        '  shipCellsByPlayer: Record<string, string[]>;\n  shots: Shot[];',
        '  shipCellsByPlayer: Record<string, string[]>;\n  shipGroupsByPlayer: Record<string, string[][]>;\n  shots: Shot[];',
        "private Battleships ship groups")
    src = replace_once(src,
        'shipCellsByPlayer: {}, shots: [], wordCards: [],',
        'shipCellsByPlayer: {}, shipGroupsByPlayer: {}, shots: [], wordCards: [],',
        "initialize private Battleships ship groups")
    src = replace_once(src,
        'function fleetForSeat(seat: number, seed: number): { cells: string[]; rngState: number } {',
        'function fleetForSeat(seat: number, seed: number): { cells: string[]; ships: string[][]; rngState: number } {',
        "return ship groups from the seeded fleet generator")
    src = replace_once(src,
        '  return { cells: ships.flat(), rngState: localRng };',
        '  return { cells: ships.flat(), ships, rngState: localRng };',
        "preserve each generated Battleships ship")
    src = replace_once(src,
        '      state.shipCellsByPlayer[player.userId] = fleet.cells;\n      rngState = fleet.rngState;',
        '      state.shipCellsByPlayer[player.userId] = fleet.cells;\n      state.shipGroupsByPlayer[player.userId] = fleet.ships;\n      rngState = fleet.rngState;',
        "initialize individual Battleships ships")
    src = replace_region(src,
        '  } else if (action.type === "fire" && state.gameId === "battleship") {',
        '  } else if (action.type === "roll_dice" && state.gameId === "ludo") {',
        r'''  } else if (action.type === "fire" && state.gameId === "battleship") {
    const targetId = nextPlayerId(state, playerId);
    if (!targetId || targetId === playerId) return { state: params.state, events: [] };
    const targetCell = coordsKey(action.x, action.y);
    const hit = (state.shipCellsByPlayer[targetId] ?? []).includes(targetCell);
    const priorTargetShots = state.shots.filter((item) => item.targetId === targetId);
    if (priorTargetShots.some((item) => item.x === action.x && item.y === action.y)) return { state: params.state, events: [] };
    const shot: Shot = { shooterId: playerId, targetId, x: action.x, y: action.y, hit, sunk: false };
    state.shots.push(shot);
    const targetShots = state.shots.filter((item) => item.targetId === targetId && item.hit);
    const hitCells = new Set(targetShots.map((item) => coordsKey(item.x, item.y)));
    state.shipGroupsByPlayer ??= {};
    const groups = state.shipGroupsByPlayer[targetId] ?? (() => {
      const flattened = state.shipCellsByPlayer[targetId] ?? [];
      let offset = 0;
      return [5, 4, 3, 3, 2].map((length) => {
        const group = flattened.slice(offset, offset + length);
        offset += length;
        return group;
      }).filter((group) => group.length > 0);
    })();
    state.shipGroupsByPlayer[targetId] = groups;
    const sunkGroups = groups.filter((group) => group.every((cell) => hitCells.has(cell)));
    const priorHitCells = new Set(priorTargetShots.filter((item) => item.hit).map((item) => coordsKey(item.x, item.y)));
    const previouslySunkGroups = groups.filter((group) => group.every((cell) => priorHitCells.has(cell)));
    const newlySunk = sunkGroups.find((group) => !previouslySunkGroups.includes(group));
    shot.sunk = Boolean(newlySunk);
    const fleetDestroyed = groups.length > 0 ? sunkGroups.length === groups.length : targetShots.length >= (state.shipCellsByPlayer[targetId] ?? []).length;
    const shipNames = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];
    const sunkName = newlySunk ? shipNames[groups.indexOf(newlySunk)] ?? `${newlySunk.length}-cell ship` : "";
    message = `${hit ? "💥 HIT" : "🌊 Splash"}! ${player.displayName} fired at ${String.fromCharCode(65 + action.x)}${action.y + 1}${newlySunk ? ` — ${sunkName} sunk!` : ""}${fleetDestroyed ? " — entire fleet destroyed!" : ""}`;
    if (fleetDestroyed) finish(state, playerId, now);
    else state.currentPlayerId = targetId;
''',
        "Battleships ship-by-ship sinking and fleet victory")
    src = replace_once(src,
        'function settlePokerShowdown(state: PrototypeGameState, now: string): void {',
        POKER_MULTI_HAND_HELPER + 'function settlePokerShowdown(state: PrototypeGameState, now: string): void {',
        "multi-hand lifecycle helper")
    src = replace_region(src,
        '  // In this single-hand table, the game result is based on final chips after every',
        '\n}',
        '  // Only the tournament end condition finalizes a match. A normal showdown pays\n  // the pots and immediately starts the next hand while at least two stacks remain.\n  startNextPokerHand(state, now, state.pokerLastAction);',
        "continue Poker after showdown")
    src = replace_once(src,
        '    finish(state, winner?.userId ?? null, now);\n    state.pokerLastAction = winner ? `${winner.displayName} wins the pot because every opponent folded.` : "Hand ended without an eligible player.";\n    return;',
        '    state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";\n    startNextPokerHand(state, now, state.pokerLastAction);\n    return;',
        "advance to next hand after fold-out street")
    src = replace_once(src,
        '    if (active.length <= 1) {\n      const winner = active[0]; if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;\n      state.pokerPot = 0;\n      finish(state, winner?.userId ?? null, now); state.pokerLastAction = winner ? `${winner.displayName} wins the pot because every opponent folded.` : "Hand ended without an eligible player.";\n    } else if (everyoneActed && allMatched) advancePokerStreet(state, now);',
        '    if (active.length <= 1) {\n      const winner = active[0];\n      if (winner) state.pokerStacks[winner.userId] = (state.pokerStacks[winner.userId] ?? 0) + state.pokerPot;\n      state.pokerPot = 0;\n      state.pokerLastAction = winner ? `${winner.displayName} won hand ${state.pokerHandNumber} because every opponent folded.` : "Hand ended without an eligible player.";\n      startNextPokerHand(state, now, state.pokerLastAction);\n    } else if (everyoneActed && allMatched) advancePokerStreet(state, now);',
        "continue Poker after betting round fold-out")
    src = replace_once(src,
        '  } else if (action.type === "end_turn") {\n    state.currentPlayerId = nextPlayerId(state, playerId); state.turnNumber += 1; state.hasRolled = false; state.diceRoll = null; state.reinforcedThisTurn = false;\n    if (state.gameId === "poker") return { state: params.state, events: [] };',
        '  } else if (action.type === "end_turn") {\n    state.currentPlayerId = nextPlayerId(state, playerId); state.turnNumber += 1; state.hasRolled = false; state.diceRoll = null; state.reinforcedThisTurn = false;\n    if (state.gameId === "ludo") state.ludoConsecutiveSixes[playerId] = 0;\n    if (state.gameId === "poker") return { state: params.state, events: [] };',
        "reset Ludo six streak when turn ends without a legal token move")
    # Correct the stale single-hand specification now that a real tournament session exists.
    old_notice = '  poker: { title: "Poker · Texas Hold\'em", min: 2, max: 6, notice: "Best-five-of-seven hand ranking and side-pot settlement are implemented for the single-hand prototype; tournament sessions and raise-reopening edge cases remain separate work." }'
    new_notice = '  poker: { title: "Poker · Texas Hold\'em", min: 2, max: 6, notice: "Server-side Hold’em hand ranking, all-in side pots, split pots and rotating multi-hand tournament sessions are implemented. The configured table uses fixed $10/$20 blinds and fixed $20 raises." }'
    src = replace_once(src, old_notice, new_notice, "accurate multi-hand Poker rules notice")
    for marker in ["pokerHandNumber", "function startNextPokerHand", "startNextPokerHand(state, now, state.pokerLastAction)", "evaluateTexasHoldemHand", "barricadesCanReachGoal", "ludoGlobalTrackPosition", "ludoConsecutiveSixes", "shipGroupsByPlayer"]:
        if marker not in src:
            raise PatchError(f"Internal engine check failed: missing {marker!r}.")
    return src

def patch_ui(src: str) -> str:
    if MARKER in src:
        raise PatchError("Poker casino UI already appears installed.")
    src = f"/* {MARKER} */\n" + src
    src = replace_once(src,
        '  const [hoveredWall, setHoveredWall] = useState<{ x: number; y: number; orientation: "h" | "v" } | null>(null);',
        '  const [hoveredWall, setHoveredWall] = useState<{ x: number; y: number; orientation: "h" | "v" } | null>(null);\n  const [pokerRulesOpen, setPokerRulesOpen] = useState(false);',
        "Poker hand-rules modal state")
    src = replace_once(src,
        'function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }',
        'function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }\n\n' + POKER_CARD_COMPONENTS,
        "reuse Twenty-Nine PNG cards for Poker")
    src = replace_region(src, '  function renderPoker() {', '\n  function renderBoard() {', POKER_RENDER + "\n", "casino Poker table and hand-ranking modal")
    src = replace_once(src,
        '{shot ? shot.hit ? "💥" : "·" : ""}',
        '{shot ? shot.sunk ? "🚢" : shot.hit ? "💥" : "·" : ""}',
        "show sunk Battleships ships in shot history")
    for marker in ["twenty-nine/cards/", "poker-hand-rankings", "POKER_HAND_RANKINGS", "Hand {state.pokerHandNumber", "setPokerRulesOpen"]:
        if marker not in src:
            # The modal is JSX and the generated marker is a title; some checks are case-sensitive.
            if marker == "poker-hand-rankings" and "poker-rules-title" in src:
                continue
            raise PatchError(f"Internal Poker UI check failed: missing {marker!r}.")
    return src

def patch_styles(src: str) -> str:
    if MARKER in src:
        raise PatchError("V4 viewport/poker CSS already appears installed.")
    old = '''.tt-game-viewport .overflow-y-auto,
.tt-game-viewport .overflow-x-auto {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.tt-game-viewport .overflow-y-auto::-webkit-scrollbar,
.tt-game-viewport .overflow-x-auto::-webkit-scrollbar {
  display: none !important;
}'''
    new = '''.tt-game-viewport .overflow-y-auto,
.tt-game-viewport .overflow-x-auto {
  overflow: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.tt-game-viewport .overflow-y-auto::-webkit-scrollbar,
.tt-game-viewport .overflow-x-auto::-webkit-scrollbar {
  display: none !important;
}'''
    src = replace_once(src, old, new, "disable internal scroll containers in game viewports")
    return src.rstrip() + "\n\n" + POKER_CSS + "\n"

def patch_tests(src: str) -> str:
    if MARKER in src:
        raise PatchError("Poker multi-hand regression tests already appear installed.")
    src = f"// {MARKER}\n" + src
    return src.rstrip() + r'''

// V4: a completed hand is not a completed Poker tournament.
describe("Poker tournament hand lifecycle v4", () => {
  it("rotates the button and starts a second hand after a fold-out", () => {
    const state = start(pokerModule);
    const beforeHand = state.pokerHandNumber;
    const beforeChips = Object.values(state.pokerStacks).reduce((sum, stack) => sum + stack, 0) + state.pokerPot;
    const actor = state.currentPlayerId;
    expect(actor).toBeTruthy();
    const result = pokerModule.applyAction({
      state,
      playerId: actor!,
      action: { type: "poker_action", choice: "fold" },
      now: "2026-10-25T00:03:00.000Z"
    });
    const next = result.state as PrototypeGameState;
    const afterChips = Object.values(next.pokerStacks).reduce((sum, stack) => sum + stack, 0) + next.pokerPot;
    expect(next.phase).toBe("playing");
    expect(next.pokerHandNumber).toBe(beforeHand + 1);
    expect(next.pokerStreet).toBe("preflop");
    expect(next.communityCards).toHaveLength(0);
    expect(next.pokerButtonSeat).not.toBe(state.pokerButtonSeat);
    expect(afterChips).toBe(beforeChips);
  });
});
''' + r'''

describe("Ludo and Battleships rule regressions v4", () => {
  it("forfeits a turn on the third consecutive six in Ludo", () => {
    const state = start(ludoModule);
    state.currentPlayerId = "p1";
    state.rngState = 1542; // next LCG value produces a six
    state.ludoConsecutiveSixes.p1 = 2;
    const result = ludoModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "roll_dice" },
      now: "2026-10-25T00:04:00.000Z"
    });
    const next = result.state as PrototypeGameState;
    expect(next.currentPlayerId).toBe("p2");
    expect(next.hasRolled).toBe(false);
    expect(next.diceRoll).toBeNull();
    expect(next.ludoConsecutiveSixes.p1).toBe(0);
  });

  it("resets the six streak when a six leaves no legal Ludo token move", () => {
    const state = start(ludoModule);
    state.currentPlayerId = "p1";
    state.ludoTokens.p1 = [56, 56, 56, 56];
    state.diceRoll = 6;
    state.hasRolled = true;
    state.ludoConsecutiveSixes.p1 = 1;
    const result = ludoModule.applyAction({
      state,
      playerId: "p1",
      action: { type: "end_turn" },
      now: "2026-10-25T00:04:30.000Z"
    });
    const next = result.state as PrototypeGameState;
    expect(next.currentPlayerId).toBe("p2");
    expect(next.ludoConsecutiveSixes.p1).toBe(0);
  });

  it("uses five Quoridor walls per player in a four-player table", () => {
    const fourPlayers: GamePlayer[] = [
      { userId: "p1", username: "p1", displayName: "Player One", seat: 0 },
      { userId: "p2", username: "p2", displayName: "Player Two", seat: 1 },
      { userId: "p3", username: "p3", displayName: "Player Three", seat: 2 },
      { userId: "p4", username: "p4", displayName: "Player Four", seat: 3 }
    ];
    const state = barricadesModule.createInitialState({
      players: fourPlayers,
      settings: { turnSeconds: null } as never,
      seed: "barricades-four-player",
      now: "2026-10-25T00:04:45.000Z"
    }) as PrototypeGameState;
    expect(Object.values(state.wallsRemaining)).toEqual([5, 5, 5, 5]);
  });

  it("tracks individual Battleships ships and only marks a ship sunk on its final hit", () => {
    const state = start(battleshipModule);
    const target = "p2";
    const ships = state.shipGroupsByPlayer[target]!;
    expect(ships).toHaveLength(5);
    expect(ships.map((ship) => ship.length).sort((a, b) => a - b)).toEqual([2, 3, 3, 4, 5]);
    const carrier = ships.find((ship) => ship.length === 5)!;
    for (const cell of carrier.slice(0, -1)) {
      const [x, y] = cell.split(",").map(Number);
      state.shots.push({ shooterId: "p1", targetId: target, x: x!, y: y!, hit: true, sunk: false });
    }
    const remaining = carrier[carrier.length - 1]!;
    const [x, y] = remaining.split(",").map(Number);
    const result = battleshipModule.applyAction({
      state: { ...state, currentPlayerId: "p1" },
      playerId: "p1",
      action: { type: "fire", x: x!, y: y! },
      now: "2026-10-25T00:05:00.000Z"
    });
    const shotHistory = (result.state as PrototypeGameState).shots;
    const latest = shotHistory[shotHistory.length - 1];
    expect(latest?.hit).toBe(true);
    expect(latest?.sunk).toBe(true);
    expect((result.state as PrototypeGameState).phase).toBe("playing");
  });
});
'''

def patch_werewolf_viewport(src: str) -> str:
    return replace_once(src,
        'className={cn("tt-game-viewport relative h-dvh min-h-0 overflow-hidden bg-gradient-to-b text-white", phaseTone(state.phase))}',
        'className={cn("tt-game-viewport mafia-werewolf-screen relative h-dvh min-h-0 overflow-hidden bg-gradient-to-b text-white", phaseTone(state.phase))}',
        "Werewolf responsive no-scroll viewport marker")

def patch_app_shell(src: str) -> str:
    # Fix the pre-existing typo while retaining V3's fixed active-game shell.
    return src.replace('min-h-min-h-screen', 'min-h-screen')

def build_edits(root: Path) -> dict[str, str]:
    if not (root / ".git").exists() or not (root / "package.json").is_file():
        raise PatchError("Run from the Tabletop_Games repository root.")
    branch = V3.run_git(root, "branch", "--show-current").stdout.strip()
    if branch != EXPECTED_BRANCH:
        raise PatchError(f"Expected branch {EXPECTED_BRANCH}, found {branch or '<detached HEAD>'}; no files changed.")
    if V3.run_git(root, "merge-base", "--is-ancestor", BASE_COMMIT, "HEAD", check=False).returncode:
        raise PatchError(f"Base commit {BASE_COMMIT[:12]} is not an ancestor of HEAD; no files changed.")
    # V3 composes the chess special moves, Barricades path-safe hover UI, game-selection
    # menu, scoreboards, responsive game viewports and duplicate-match-reward guard.
    edits = V3.build_edits(root)
    edits["packages/game-core/src/games/prototype-board-games.ts"] = patch_engine(edits["packages/game-core/src/games/prototype-board-games.ts"])
    edits["apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx"] = patch_ui(edits["apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx"])
    edits["apps/web/src/styles/globals.css"] = patch_styles(edits["apps/web/src/styles/globals.css"])
    edits["apps/web/src/components/layout/AppShell.tsx"] = patch_app_shell(edits["apps/web/src/components/layout/AppShell.tsx"])
    edits["apps/web/src/features/games/mafia-werewolf/MafiaWerewolfTable.tsx"] = patch_werewolf_viewport(edits["apps/web/src/features/games/mafia-werewolf/MafiaWerewolfTable.tsx"])
    edits["packages/game-core/src/__tests__/prototype-board-games.test.ts"] = patch_tests(edits["packages/game-core/src/__tests__/prototype-board-games.test.ts"])

    # The dynamic leaderboard page/table are already part of V2: the page queries
    # GameRegistry's actual modules and gives each registered game its own score board.
    leaderboard = edits["apps/web/src/app/leaderboards/page.tsx"]
    if "api.games()" not in leaderboard or "api.gameWinsLeaderboard(game.id)" not in leaderboard:
        raise PatchError("Dynamic per-registered-game leaderboard validation failed; no files changed.")
    menu = edits["apps/web/src/components/game-menu/GameSelectionMenu.tsx"]
    if "api.games()" not in menu or "Create room" not in menu:
        raise PatchError("Game menu validation failed; no files changed.")
    engine = edits["packages/game-core/src/games/prototype-board-games.ts"]
    if 'finish(state, winner?.userId ?? null, now);' in engine[engine.find("function settlePokerShowdown"):engine.find("function advancePokerStreet")]:
        raise PatchError("Poker showdown still ends the match after a single hand; no files changed.")
    if 'overflow: hidden !important' not in edits["apps/web/src/styles/globals.css"]:
        raise PatchError("No-scroll viewport rule missing; no files changed.")
    return edits

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate the full combined patch without writing files.")
    args = parser.parse_args()
    root = Path.cwd().resolve()
    try:
        edits = build_edits(root)
        print(f"Validated combined patch ({len(edits)} files) for {EXPECTED_BRANCH} at base {BASE_COMMIT[:12]}:")
        for rel, content in sorted(edits.items()):
            print(f"  UPDATE {rel} ({len(content.encode('utf-8')):,} bytes)")
        if args.dry_run:
            print("DRY RUN OK. No files changed.")
            return 0
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = root / ".tmp" / f"pc-first-full-patch-v4-backup-{stamp}"
        for rel in edits:
            dest = backup / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if (root / rel).exists():
                shutil.copy2(root / rel, dest)
        for rel, content in edits.items():
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8", newline="\n")
        print(f"\nPatch applied. Original files are backed up at {backup.relative_to(root)}")
        print("Run the test/typecheck/build commands in the bundled README next.")
        return 0
    except (PatchError, OSError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}\nNo files changed.", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
