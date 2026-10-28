"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Trophy, HelpCircle, Volume2, VolumeX, Sparkles, Flame } from "lucide-react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { CasinoChip, ChipStack } from "../casino/CasinoChip";
import { CasinoPlayingCard } from "../casino/CasinoPlayingCard";
import { casinoAudio } from "../casino/casinoAudio";
import { owns, isAction } from "../board-games/shared/ui-utils";

const POKER_HAND_RANKINGS = [
  { name: "Royal Flush", tier: "Top Tier", example: "A♠ K♠ Q♠ J♠ 10♠", detail: "A-K-Q-J-10 of the exact same suit." },
  { name: "Straight Flush", tier: "Tier 2", example: "9♥ 8♥ 7♥ 6♥ 5♥", detail: "Five consecutive cards of the same suit." },
  { name: "Four of a Kind", tier: "Tier 3", example: "Q♠ Q♥ Q♦ Q♣ A♦", detail: "Four cards of matching rank." },
  { name: "Full House", tier: "Tier 4", example: "10♠ 10♥ 10♦ 4♣ 4♥", detail: "Three of a kind combined with a pair." },
  { name: "Flush", tier: "Tier 5", example: "A♦ J♦ 8♦ 5♦ 2♦", detail: "Any five cards of the same suit, not in sequence." },
  { name: "Straight", tier: "Tier 6", example: "9♠ 8♥ 7♦ 6♣ 5♠", detail: "Five cards in sequence of mixed suits." },
  { name: "Three of a Kind", tier: "Tier 7", example: "7♠ 7♥ 7♦ A♣ 9♠", detail: "Three cards of identical rank." },
  { name: "Two Pair", tier: "Tier 8", example: "K♠ K♥ 3♦ 3♣ A♠", detail: "Two distinct pairs of cards." },
  { name: "One Pair", tier: "Tier 9", example: "J♠ J♥ A♦ 8♣ 4♠", detail: "Two cards of the same rank." },
  { name: "High Card", tier: "Lowest", example: "A♠ J♥ 8♦ 5♣ 2♠", detail: "No combinations; highest individual card plays." }
];

// Helper to quickly evaluate player's combined cards for a descriptive badge
function evaluateQuickHandName(holeCards: string[], communityCards: string[]): string {
  const allCards = [...holeCards, ...communityCards].filter(Boolean);
  if (allCards.length < 2) return "High Card";

  const ranks = allCards.map((c) => c.slice(0, -1));
  const counts: Record<string, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] ?? 0) + 1;
  }
  const freq = Object.values(counts).sort((a, b) => b - a);

  if (freq[0] === 4) return "Four of a Kind 💥";
  if (freq[0] === 3 && freq[1] && freq[1] >= 2) return "Full House 🏰";

  const suits = allCards.map((c) => c.slice(-1));
  const suitCounts: Record<string, number> = {};
  for (const s of suits) {
    suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  }
  if (Object.values(suitCounts).some((c) => c >= 5)) return "Flush 🌊";

  if (freq[0] === 3) return "Three of a Kind 🔥";
  if (freq[0] === 2 && freq[1] === 2) return "Two Pair ✌️";
  if (freq[0] === 2) return "One Pair 🃏";

  return "High Card";
}

export function PokerTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, onAction, onChat, onEndMatch } = props;

  const [pokerRulesOpen, setPokerRulesOpen] = useState(false);
  const [hideMyCards, setHideMyCards] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);

  const myPaid = state.pokerBets[currentUserId] ?? 0;
  const myStack = state.pokerStacks[currentUserId] ?? 0;
  const callAmount = Math.min(Math.max(0, state.pokerBetToCall - myPaid), myStack);

  const handDescription = useMemo(
    () => evaluateQuickHandName(state.myPokerCards ?? [], state.communityCards ?? []),
    [state.myPokerCards, state.communityCards]
  );

  function playSound(type: "chip" | "card" | "win") {
    if (!soundEnabled) return;
    if (type === "chip") casinoAudio.playChip();
    if (type === "card") casinoAudio.playCardDeal();
    if (type === "win") casinoAudio.playWin();
  }

  function dispatch(action: AnyAction) {
    const { type, ...payload } = action;
    if (action.choice === "raise" || action.choice === "call" || action.choice === "all_in") {
      playSound("chip");
    } else {
      playSound("card");
    }
    onAction(type, payload as Record<string, unknown>);
  }

  // Play card sound when community cards advance
  useEffect(() => {
    if (state.communityCards && state.communityCards.length > 0) {
      playSound("card");
    }
  }, [state.communityCards?.length, state.pokerStreet]);

  // Seating arrangement: Local player is at seat 0 (bottom center),
  // other players are seated clockwise around the oval.
  const seatedPlayers = useMemo(() => {
    const mySeat = me?.seat ?? 0;
    const count = state.players.length;
    return state.players.map((p) => {
      // Relative offset from me
      const relPos = (p.seat - mySeat + count) % count;
      return { ...p, relPos };
    });
  }, [state.players, me]);

  const opponents = seatedPlayers.filter((p) => p.userId !== currentUserId);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col select-none overflow-hidden bg-[#040a08] text-white">
      {/* ============================================================== */}
      {/* CASINO AMBIENCE & CHANDELIER LIGHTING                         */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(16,185,129,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(245,158,11,0.12),transparent_65%)]" />

      {/* ============================================================== */}
      {/* TOP HEADER: TABLE INFO & CONTROLS                              */}
      {/* ============================================================== */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-slate-950/80 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800 text-slate-950 font-black shadow-lg">
            ♠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-amber-200">
                Texas Hold’em Poker
              </h1>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                Hand #{state.pokerHandNumber ?? 1}
              </span>
            </div>
            <p className="text-[11px] font-medium text-emerald-400/80">
              Blinds $10 / $20 · Fixed-Limit Betting
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Rules, Pot */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-black/40 px-3 py-1.5 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Table Pot:
            </span>
            <span className="font-mono text-base font-black text-amber-300 tabular-nums">
              ${state.pokerPot.toLocaleString("en-US")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={() => setPokerRulesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            <HelpCircle className="h-4 w-4 text-amber-300" />
            <span className="hidden sm:inline">Hand Rankings</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CASINO POKER TABLE (OVAL FELT & SURROUNDING SEATS)        */}
      {/* ============================================================== */}
      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-between p-2 sm:p-4 overflow-hidden">
        {/* CASINO OVAL TABLE FELT */}
        <div
          className="relative flex h-full w-full max-w-5xl flex-col items-center justify-between rounded-[80px] sm:rounded-[120px] border-[12px] sm:border-[16px] border-[#542d10] p-4 shadow-[inset_0_0_100px_rgba(0,0,0,0.85),0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #064e3b 0%, #043d2e 45%, #022c22 80%, #011c15 100%)",
            boxShadow:
              "inset 0 0 100px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.2), 0 20px 50px rgba(0,0,0,0.85)"
          }}
        >
          {/* Inner Golden Racetrack Line */}
          <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-[60px] sm:rounded-[90px] border-2 border-amber-300/25" />

          {/* ========================================================== */}
          {/* TOP OPPONENTS ROW                                          */}
          {/* ========================================================== */}
          <div className="relative z-10 flex w-full items-start justify-around px-2 sm:px-6">
            {opponents.map((player) => {
              const isEliminated = (player.stack ?? 0) <= 0 && player.folded;
              const isTurn = state.currentPlayerId === player.userId && state.phase === "playing";
              const isDealer = player.seat === state.pokerButtonSeat;

              return (
                <div
                  key={player.userId}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-2 backdrop-blur-md transition-all ${
                    isTurn
                      ? "border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50 shadow-2xl scale-105"
                      : "border-white/10 bg-black/50"
                  } ${player.folded || isEliminated ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white truncate max-w-[80px] sm:max-w-[110px]">
                      {player.displayName}
                    </span>
                    {isDealer ? (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[9px] font-black text-slate-950 shadow">
                        D
                      </span>
                    ) : null}
                    {player.isBot ? (
                      <span className="rounded bg-sky-500/20 px-1 text-[8px] font-black text-sky-300 uppercase">
                        BOT
                      </span>
                    ) : null}
                  </div>

                  {/* Opponent Stack */}
                  <span className="font-mono text-xs font-black text-emerald-300">
                    {isEliminated ? "BUSTED" : player.folded ? "FOLDED" : `$${(player.stack ?? 0).toLocaleString("en-US")}`}
                  </span>

                  {/* Opponent Hole Cards */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {player.folded || isEliminated ? (
                      <div className="h-10 w-7 rounded border border-dashed border-white/20" />
                    ) : (
                      <>
                        <CasinoPlayingCard hidden size="xs" />
                        <CasinoPlayingCard hidden size="xs" />
                      </>
                    )}
                  </div>

                  {/* Opponent Active Bet Badge */}
                  {(player.bet ?? 0) > 0 ? (
                    <div className="mt-1">
                      <ChipStack amount={player.bet ?? 0} size="xs" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ========================================================== */}
          {/* CENTER FELT: COMMUNITY CARDS & POT PILE                    */}
          {/* ========================================================== */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2 text-center">
            {/* Street Indicator & Active Live Count */}
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/60 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 shadow-md backdrop-blur-sm">
              <span>{state.pokerStreet}</span>
              <span className="text-white/30">·</span>
              <span className="text-emerald-400">
                {state.players.filter((p) => !p.folded).length} PLAYERS IN
              </span>
            </div>

            {/* Central 5 Community Cards (Flop, Turn, River) */}
            <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3" aria-label="Community Cards">
              {Array.from({ length: 5 }, (_, i) => {
                const card = state.communityCards[i] ?? null;
                return (
                  <CasinoPlayingCard
                    key={`${i}-${card ?? "empty"}`}
                    card={card}
                    hidden={!card}
                    size="md"
                    className="shadow-2xl"
                  />
                );
              })}
            </div>

            {/* Central Pot Display with 3D Chips Stack */}
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-black/70 px-4 py-1.5 shadow-[0_0_25px_rgba(251,191,36,0.25)] backdrop-blur-sm">
                <ChipStack amount={state.pokerPot} size="sm" showLabel={false} />
                <span className="font-mono text-base font-black text-amber-300 drop-shadow">
                  POT: ${state.pokerPot.toLocaleString("en-US")}
                </span>
              </div>

              {callAmount > 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-1 font-mono text-xs font-bold text-white/80">
                  To Call: ${callAmount}
                </div>
              ) : null}
            </div>

            {/* Last Action Telemetry Banner */}
            {state.pokerLastAction ? (
              <p className="mt-2 text-xs font-semibold text-emerald-200/80 drop-shadow">
                {state.pokerLastAction}
              </p>
            ) : null}
          </div>

          {/* ========================================================== */}
          {/* LOCAL PLAYER (YOU) SEAT (BOTTOM CENTER)                    */}
          {/* ========================================================== */}
          {me ? (
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`relative flex flex-col items-center gap-1.5 rounded-3xl border p-3 backdrop-blur-md transition-all ${
                  isMyTurn
                    ? "border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.35)] scale-105"
                    : "border-white/20 bg-black/60 shadow-xl"
                }`}
              >
                {/* Player Name, Stack & Dealer Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white tracking-wide">
                    {me.displayName} (YOU)
                  </span>
                  {me.seat === state.pokerButtonSeat ? (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[9px] font-black text-slate-950 shadow">
                      D
                    </span>
                  ) : null}
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-black text-emerald-300">
                    ${myStack.toLocaleString("en-US")}
                  </span>
                </div>

                {/* Local Hole Cards (With Hide / Peek Toggle) */}
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  {(state.myPokerCards ?? []).map((card, i) => (
                    <CasinoPlayingCard
                      key={`${i}-${card}`}
                      card={card}
                      hidden={hideMyCards}
                      size="lg"
                      className="shadow-2xl"
                    />
                  ))}
                </div>

                {/* Hand Evaluator Badge & Peek Toggle Button */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-0.5 text-[11px] font-black text-amber-300">
                    {handDescription}
                  </span>

                  <button
                    type="button"
                    onClick={() => setHideMyCards((prev) => !prev)}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80 hover:bg-white/20 active:scale-95"
                    title={hideMyCards ? "Reveal Cards" : "Hide Cards"}
                  >
                    {hideMyCards ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    <span>{hideMyCards ? "Peek" : "Hide"}</span>
                  </button>
                </div>

                {/* Current Player Round Bet */}
                {myPaid > 0 ? (
                  <div className="absolute -top-6">
                    <ChipStack amount={myPaid} size="sm" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* ========================================================== */}
        {/* CASINO ACTION / BETTING CONSOLE (BOTTOM BAR)              */}
        {/* ========================================================== */}
        <div className="relative z-20 mt-2 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
          {/* Player Chips & Status Info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Your Stack
              </span>
              <span className="font-mono text-base font-black text-emerald-300">
                ${myStack.toLocaleString("en-US")}
              </span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Turn
              </span>
              <span className="text-xs font-bold text-white">
                {isMyTurn ? "🟢 Your Move" : `⏳ ${currentPlayer?.displayName ?? "Waiting"}`}
              </span>
            </div>
          </div>

          {/* Action Buttons: FOLD, CHECK / CALL, RAISE, ALL-IN */}
          <div className="flex items-center gap-2">
            {legalActions
              .filter(isAction)
              .filter((action) => action.type === "poker_action")
              .map((action) => {
                const choice = String(action.choice);

                if (choice === "fold") {
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => dispatch(action)}
                      className="rounded-xl border border-rose-500/50 bg-rose-600/20 px-4 py-2 text-xs font-black text-rose-200 hover:bg-rose-600/30 active:scale-95 transition"
                    >
                      FOLD 🚫
                    </button>
                  );
                }

                if (choice === "check") {
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => dispatch(action)}
                      className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-5 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition"
                    >
                      CHECK ✋
                    </button>
                  );
                }

                if (choice === "call") {
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => dispatch(action)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-95 transition"
                    >
                      <span>CALL</span>
                      <span className="font-mono">${callAmount}</span>
                    </button>
                  );
                }

                if (choice === "raise") {
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => dispatch(action)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>RAISE (+$20)</span>
                    </button>
                  );
                }

                if (choice === "all_in") {
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => dispatch(action)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 px-5 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-95 transition"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      <span>ALL-IN (${myStack})</span>
                    </button>
                  );
                }

                return null;
              })}
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* HAND RANKINGS MODAL                                            */}
      {/* ============================================================== */}
      <AnimatePresence>
        {pokerRulesOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setPokerRulesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-amber-400/30 bg-slate-950 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xl font-black text-amber-300">
                    Poker Hand Rankings
                  </h3>
                  <p className="text-xs text-white/50">
                    Highest to lowest standard 5-card poker combinations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPokerRulesOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POKER_HAND_RANKINGS.map((hand, idx) => (
                  <div
                    key={hand.name}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400/20 text-xs font-black text-amber-300 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-white font-black">{hand.name}</strong>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                          {hand.tier}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] font-bold text-emerald-300 mt-0.5">
                        {hand.example}
                      </p>
                      <p className="text-[10px] text-white/60 leading-snug mt-0.5">
                        {hand.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
