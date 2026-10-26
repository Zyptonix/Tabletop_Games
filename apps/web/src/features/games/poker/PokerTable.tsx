"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";

const POKER_CARD_SUIT_FILES: Record<string, string> = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };

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
export function PokerTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
const [pokerRulesOpen,setPokerRulesOpen]=useState(false);function dispatch(action:AnyAction){const {type,...payload}=action;onAction(type,payload as Record<string,unknown>);}

function renderPoker() {
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
return renderPoker();
}
