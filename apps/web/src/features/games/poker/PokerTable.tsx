"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Trophy, HelpCircle, Volume2, VolumeX, Sparkles, Flame, CheckCircle2 } from "lucide-react";
import type { PokerLastHandResult } from "@tabletop/game-core";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { CasinoChip, ChipStack, breakdownChips, type ChipDenomination } from "../casino/CasinoChip";
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

const RAISE_CHIPS: ChipDenomination[] = [5, 10, 25, 50, 100, 500];

// Dynamic physical multi-stack chip cluster for the pot
function DynamicPotCluster({ potAmount, callAmount }: { potAmount: number; callAmount: number }) {
  const stacks = useMemo(() => {
    if (potAmount <= 0) return [];
    const chips = breakdownChips(potAmount);
    if (chips.length <= 2) {
      return [chips];
    }
    const stack1: ChipDenomination[] = [];
    const stack2: ChipDenomination[] = [];
    const stack3: ChipDenomination[] = [];
    chips.forEach((c, idx) => {
      if (idx % 3 === 0) stack1.push(c);
      else if (idx % 3 === 1) stack2.push(c);
      else stack3.push(c);
    });
    return [stack1, stack2, stack3].filter((s) => s.length > 0);
  }, [potAmount]);

  if (potAmount <= 0) return null;

  return (
    <motion.div
      key={potAmount}
      initial={{ scale: 0.94, y: 5 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 14, stiffness: 220 }}
      className="flex items-center gap-3 sm:gap-4 rounded-full border-2 border-dashed border-amber-400/50 bg-black/75 px-5 py-2 shadow-[0_0_35px_rgba(251,191,36,0.35)] backdrop-blur-md"
    >
      {/* Cluster of Dynamic Physical Chip Piles */}
      <div className="flex items-end -space-x-2">
        {stacks.map((stackChips, sIdx) => (
          <motion.div
            key={sIdx}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: sIdx * 0.04 }}
            className="relative flex flex-col items-center justify-end"
            style={{
              height: `${24 + stackChips.length * 3.5}px`,
              width: "28px",
              transform: `rotate(${(sIdx - 1) * 7}deg)`
            }}
          >
            {stackChips.map((denom, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  bottom: `${i * 3.5}px`,
                  zIndex: i
                }}
              >
                <CasinoChip value={denom} size="xs" />
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Pot Total & Call Amount */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="font-mono text-base sm:text-lg font-black text-amber-300 drop-shadow">
            POT: ${potAmount.toLocaleString("en-US")}
          </span>
        </div>

        {callAmount > 0 ? (
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-xs font-bold text-white/90">
            To Call: ${callAmount}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

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

// Tasteful live feed card presenting poker action and table intel with emojis & clean pills
function TastefulPokerInfo({ actionText }: { actionText: string }) {
  if (!actionText) return null;

  const parts = actionText
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  const mainEvent = parts[0] ?? "";
  const metaPills = parts.slice(1);

  // Parse main event characteristics
  let emoji = "🎲";
  let mainClass = "text-emerald-200";
  let borderGlow = "border-amber-400/30";

  if (/takes the main pot|won hand|winner|champion/i.test(mainEvent)) {
    emoji = "🏆";
    mainClass = "text-amber-200 font-extrabold";
    borderGlow = "border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.25)]";
  } else if (/all-in/i.test(mainEvent)) {
    emoji = "🔥";
    mainClass = "text-rose-300 font-extrabold";
    borderGlow = "border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]";
  } else if (/raised/i.test(mainEvent)) {
    emoji = "⚡";
    mainClass = "text-amber-300 font-bold";
    borderGlow = "border-amber-400/40";
  } else if (/called/i.test(mainEvent)) {
    emoji = "🪙";
    mainClass = "text-sky-200 font-bold";
    borderGlow = "border-sky-400/30";
  } else if (/checked/i.test(mainEvent)) {
    emoji = "✋";
    mainClass = "text-slate-200 font-medium";
  } else if (/folded/i.test(mainEvent)) {
    emoji = "🚫";
    mainClass = "text-rose-300/90 font-medium";
  } else if (/cards dealt/i.test(mainEvent)) {
    emoji = "🎴";
    mainClass = "text-emerald-300 font-bold";
  }

  // Clean raw string artifacts
  const cleanMain = mainEvent
    .replace(/^[🃏🎲🏆🔥⚡🪙✋🚫🎴]\s*/u, "")
    .replace(/;\s*side pots are settled\.?/i, "")
    .trim();

  return (
    <motion.div
      key={actionText}
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`w-full max-w-[280px] sm:max-w-[340px] rounded-2xl border ${borderGlow} bg-gradient-to-br from-black/85 via-slate-950/85 to-[#05110d]/90 p-3 shadow-xl backdrop-blur-md text-left space-y-1.5`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{emoji}</span>
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
            Table Action
          </span>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Main event description */}
      <p className={`text-xs leading-snug drop-shadow-sm ${mainClass}`}>
        {cleanMain}
      </p>

      {/* Meta tags pills (e.g. Hand #2, Blinds $10/$20, Button: Bot 3) */}
      {metaPills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {metaPills.map((pill, idx) => {
            let pIcon = "ℹ️";
            let pColor = "border-white/15 bg-white/5 text-white/80";

            if (/hand/i.test(pill)) {
              pIcon = "🃏";
              pColor = "border-amber-400/30 bg-amber-400/10 text-amber-200";
            } else if (/blinds/i.test(pill)) {
              pIcon = "🪙";
              pColor = "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
            } else if (/button/i.test(pill)) {
              pIcon = "🔘";
              pColor = "border-sky-400/30 bg-sky-400/10 text-sky-200";
            }

            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-tight shadow-sm ${pColor}`}
              >
                <span>{pIcon}</span>
                <span>{pill}</span>
              </span>
            );
          })}
        </div>
      ) : null}
    </motion.div>
  );
}

export function PokerTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, onAction, onChat, onEndMatch } = props;

  const [pokerRulesOpen, setPokerRulesOpen] = useState(false);
  const [hideMyCards, setHideMyCards] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [activeWinnerResult, setActiveWinnerResult] = useState<PokerLastHandResult | null>(null);
  const lastCelebratedHandRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.pokerLastHandResult && state.pokerLastHandResult.handNumber !== lastCelebratedHandRef.current) {
      lastCelebratedHandRef.current = state.pokerLastHandResult.handNumber;
      setActiveWinnerResult(state.pokerLastHandResult);
      setShowWinnerModal(true);
      if (soundEnabled) casinoAudio.playWin();

      const timer = setTimeout(() => {
        setShowWinnerModal(false);
      }, 6500);

      return () => clearTimeout(timer);
    }
  }, [state.pokerLastHandResult, soundEnabled]);

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);

  const myPaid = state.pokerBets[currentUserId] ?? 0;
  const myStack = state.pokerStacks[currentUserId] ?? 0;
  const callAmount = Math.min(Math.max(0, state.pokerBetToCall - myPaid), myStack);

  const canRaise = isMyTurn && legalActions.some((a) => isAction(a) && a.type === "poker_action" && a.choice === "raise");
  const maxAllowedRaise = Math.max(20, myStack - callAmount);
  const [raiseAmount, setRaiseAmount] = useState(20);

  const effectiveRaise = Math.min(Math.max(20, raiseAmount), maxAllowedRaise);

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

  function handleAddRaiseChip(val: ChipDenomination) {
    playSound("chip");
    setRaiseAmount((prev) => Math.min(prev + val, maxAllowedRaise));
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
              Blinds $10 / $20 · Interactive Chip Betting
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
          className="relative flex h-full w-full max-w-[1720px] 2xl:max-w-[1850px] flex-col items-center justify-between rounded-[80px] sm:rounded-[120px] border-[12px] sm:border-[18px] border-[#542d10] p-4 shadow-[inset_0_0_120px_rgba(0,0,0,0.85),0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #064e3b 0%, #043d2e 45%, #022c22 80%, #011c15 100%)",
            boxShadow:
              "inset 0 0 120px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.25), 0 25px 60px rgba(0,0,0,0.9)"
          }}
        >
          {/* Inner Golden Racetrack Line */}
          <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-[60px] sm:rounded-[90px] border-2 border-amber-300/25" />

          {/* ========================================================== */}
          {/* TOP OPPONENTS ROW                                          */}
          {/* ========================================================== */}
          <div className="relative z-10 flex w-full items-start justify-around px-2 sm:px-8">
            {opponents.map((player) => {
              const isEliminated = (player.stack ?? 0) <= 0 && player.folded;
              const isTurn = state.currentPlayerId === player.userId && state.phase === "playing";
              const isDealer = player.seat === state.pokerButtonSeat;
              const showdownCards = state.pokerLastHandResult?.showdownCards?.[player.userId];

              return (
                <div
                  key={player.userId}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 sm:p-2.5 backdrop-blur-md transition-all ${
                    isTurn
                      ? "border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.5)] scale-105"
                      : "border-white/10 bg-black/50 shadow-lg"
                  } ${player.folded || isEliminated ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[130px]">
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

                  {/* Opponent Hole Cards: Showdown reveal or Card backs */}
                  <div className="flex items-center -space-x-3 sm:-space-x-4 mt-0.5">
                    {player.folded || isEliminated ? (
                      <div className="h-14 w-10 rounded border border-dashed border-white/20" />
                    ) : showdownCards && showdownCards.length >= 2 ? (
                      <>
                        <CasinoPlayingCard card={showdownCards[0] ?? null} size="sm" className="shadow-md ring-1 ring-amber-400/50" />
                        <CasinoPlayingCard card={showdownCards[1] ?? null} size="sm" className="shadow-md ring-1 ring-amber-400/50" />
                      </>
                    ) : (
                      <>
                        <CasinoPlayingCard hidden size="sm" className="shadow-md" />
                        <CasinoPlayingCard hidden size="sm" className="shadow-md" />
                      </>
                    )}
                  </div>

                  {/* Opponent Active Bet Badge */}
                  {(player.bet ?? 0) > 0 ? (
                    <div className="mt-1">
                      <ChipStack amount={player.bet ?? 0} size="sm" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ========================================================== */}
          {/* CENTER FELT: 3-PANEL WIDESCREEN ARENA                      */}
          {/* (Pot on Left, Cards in Center, Street/Action on Right)      */}
          {/* ========================================================== */}
          <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-8 lg:px-14 my-auto py-1">
            {/* LEFT FELT STATION: Dynamic Multi-Stack Pot Cluster & Last Winner */}
            <div className="flex flex-1 flex-col items-start justify-center gap-2">
              <DynamicPotCluster potAmount={state.pokerPot} callAmount={callAmount} />

              {state.pokerLastHandResult ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setActiveWinnerResult(state.pokerLastHandResult!);
                    setShowWinnerModal(true);
                  }}
                  className="group flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-black/60 px-3 py-1.5 shadow-lg backdrop-blur-md hover:border-amber-300 hover:bg-black/80 transition-all text-left"
                  title="Click to view showdown winner details"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400/20 text-amber-300 shrink-0 group-hover:scale-110 transition-transform text-xs">
                    🏆
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                      Last Hand #{state.pokerLastHandResult.handNumber}
                    </span>
                    <span className="text-xs font-black text-white truncate max-w-[170px] sm:max-w-[210px]">
                      {state.pokerLastHandResult.winnerNames.join(", ")}{" "}
                      <span className="text-emerald-400 font-mono">(+${state.pokerLastHandResult.potWon})</span>
                    </span>
                    <span className="text-[10px] text-amber-200/70 font-semibold">
                      {state.pokerLastHandResult.handName} · <span className="underline text-amber-300">View</span>
                    </span>
                  </div>
                </motion.button>
              ) : null}
            </div>

            {/* CENTER FELT STATION: Community Cards (Clean & Uncrowded) */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3" aria-label="Community Cards">
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
              <span className="mt-1.5 text-[10px] font-black tracking-widest uppercase text-emerald-300/40">
                Community Cards
              </span>
            </div>

            {/* RIGHT FELT STATION: Street, Active Players Count & Action Banner */}
            <div className="flex flex-1 flex-col items-end justify-center gap-2 text-right">
              {/* Street Badge & Active Live Count */}
              <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/60 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300 shadow-md backdrop-blur-sm">
                <span className="text-amber-300 font-extrabold">{state.pokerStreet}</span>
                <span className="text-white/30">·</span>
                <span className="text-emerald-400 font-bold">
                  {state.players.filter((p) => !p.folded).length} PLAYERS IN
                </span>
              </div>

              {/* Tasteful Live Table Intel Card */}
              <TastefulPokerInfo actionText={state.pokerLastAction} />
            </div>
          </div>

          {/* ========================================================== */}
          {/* LOCAL PLAYER (YOU) SEAT & BET CHIPS ON THE SIDE            */}
          {/* ========================================================== */}
          {me ? (
            <div className="relative z-10 mb-2 sm:mb-3 flex items-center justify-center gap-4 sm:gap-6">
              {/* Main Player Pod */}
              <div
                className={`relative flex flex-col items-center gap-1 rounded-3xl border px-4 py-2 sm:py-2.5 backdrop-blur-md transition-all ${
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
                      size="md"
                      className="shadow-2xl ring-1 ring-white/10"
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
              </div>

              {/* DEDICATED CURRENT BET CHIPS POSITIONED ON THE SIDE OF THE HAND */}
              {myPaid > 0 ? (
                <motion.div
                  initial={{ scale: 0.8, x: -10, opacity: 0 }}
                  animate={{ scale: 1, x: 0, opacity: 1 }}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-black/60 border border-amber-400/50 shadow-xl backdrop-blur-md shrink-0"
                >
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                    Your Bet
                  </span>
                  <ChipStack amount={myPaid} size="sm" showLabel={false} />
                  <span className="rounded-full bg-slate-950 border border-amber-400/50 px-2 py-0.5 font-mono text-xs font-black text-emerald-300 shadow">
                    ${myPaid.toLocaleString("en-US")}
                  </span>
                </motion.div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ============================================================== */}
        {/* CASINO ACTION / BETTING CONSOLE (BOTTOM BAR)              */}
        {/* ============================================================== */}
        <div className="relative z-20 mt-2 flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-amber-500/20 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
          {/* INTERACTIVE CHIP SELECTOR TRAY FOR RAISING */}
          {canRaise ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 mr-1 hidden sm:inline">
                  Add Chips to Raise:
                </span>
                {RAISE_CHIPS.map((chip) => (
                  <CasinoChip
                    key={chip}
                    value={chip}
                    size="sm"
                    onClick={() => handleAddRaiseChip(chip)}
                    disabled={effectiveRaise + chip > maxAllowedRaise}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount(20);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/70 hover:bg-white/10 active:scale-95"
                >
                  Min ($20)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount((prev) => Math.min(prev + 40, maxAllowedRaise));
                  }}
                  className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/20 active:scale-95"
                >
                  +2X BB
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount((prev) => Math.min(Math.max(prev, state.pokerPot), maxAllowedRaise));
                  }}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-400/20 active:scale-95"
                >
                  +Pot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount(20);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/40 hover:bg-white/10 active:scale-95"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : null}

          {/* Player Chips & Action Buttons: FOLD, CHECK / CALL, RAISE, ALL-IN */}
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
            <div className="flex items-center gap-2 sm:gap-3">
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
                        className="group relative flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-black tracking-wider uppercase text-rose-200 transition-all shadow-[0_4px_0_#4c0519,0_8px_16px_rgba(225,29,72,0.3)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#4c0519] border border-rose-500/40"
                        style={{
                          background: "linear-gradient(180deg, #881337 0%, #4c0519 100%)"
                        }}
                      >
                        <span>FOLD</span>
                        <span>🚫</span>
                      </button>
                    );
                  }

                  if (choice === "check") {
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => dispatch(action)}
                        className="group relative flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-black tracking-wider uppercase text-emerald-200 transition-all shadow-[0_4px_0_#064e3b,0_8px_16px_rgba(16,185,129,0.3)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#064e3b] border border-emerald-500/40"
                        style={{
                          background: "linear-gradient(180deg, #065f46 0%, #064e3b 100%)"
                        }}
                      >
                        <span>CHECK</span>
                        <span>✋</span>
                      </button>
                    );
                  }

                  if (choice === "call") {
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => dispatch(action)}
                        className="group relative flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_5px_0_#064e3b,0_10px_20px_rgba(16,185,129,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#064e3b]"
                        style={{
                          background: "linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)"
                        }}
                      >
                        <span>CALL</span>
                        <span className="font-mono font-black">${callAmount}</span>
                      </button>
                    );
                  }

                  if (choice === "raise") {
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => {
                          dispatch({ type: "poker_action", choice: "raise", amount: effectiveRaise });
                          setRaiseAmount(20);
                        }}
                        className="group relative flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_5px_0_#78350f,0_10px_20px_rgba(245,158,11,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#78350f]"
                        style={{
                          background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>RAISE (+${effectiveRaise})</span>
                      </button>
                    );
                  }

                  if (choice === "all_in") {
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => dispatch(action)}
                        className="group relative flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-black tracking-wider uppercase text-white transition-all shadow-[0_5px_0_#7f1d1d,0_10px_20px_rgba(239,68,68,0.5)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#7f1d1d]"
                        style={{
                          background: "linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)"
                        }}
                      >
                        <Flame className="h-3.5 w-3.5 text-amber-300" />
                        <span>ALL-IN (${myStack})</span>
                      </button>
                    );
                  }

                  return null;
                })}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* WINNER CELEBRATION MODAL (POPUP LIKE UNO & 29)                */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showWinnerModal && activeWinnerResult ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setShowWinnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#14231b] via-[#0b1612] to-[#040807] p-6 text-center shadow-[0_0_90px_rgba(251,191,36,0.45)]"
            >
              {/* Radial Golden Background Rays */}
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />

              {/* Hand Completion Badge */}
              <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Hand #{activeWinnerResult.handNumber} Complete</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </div>

              {/* Animated Trophy Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className="relative z-10 mx-auto mt-4 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-4xl shadow-[0_0_40px_rgba(251,191,36,0.5)] border border-amber-200/50"
              >
                🏆
              </motion.div>

              {/* Winner Name / Headline */}
              <div className="relative z-10 mt-4">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow">
                  {activeWinnerResult.winnerUserIds.includes(currentUserId) ? (
                    <span className="bg-gradient-to-r from-emerald-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                      🎉 YOU WON THE POT! 🎉
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
                      {activeWinnerResult.winnerNames.join(", ")} WINS!
                    </span>
                  )}
                </h2>

                {/* Pot Amount */}
                <div className="mt-2 font-mono text-3xl sm:text-4xl font-black text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                  +${activeWinnerResult.potWon.toLocaleString("en-US")}
                </div>

                {/* Winning Hand Type Pill */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 shadow">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Winning Hand:</span>
                  <span className="text-xs font-black text-amber-300">{activeWinnerResult.handName}</span>
                </div>

                {/* Showdown Hole Cards if present */}
                {activeWinnerResult.winnerUserIds.length > 0 &&
                activeWinnerResult.showdownCards?.[activeWinnerResult.winnerUserIds[0]!] &&
                activeWinnerResult.showdownCards[activeWinnerResult.winnerUserIds[0]!]!.length >= 2 ? (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                      Winning Hole Cards
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {activeWinnerResult.showdownCards[activeWinnerResult.winnerUserIds[0]!]!.map((c, i) => (
                        <CasinoPlayingCard key={i} card={c} size="md" className="shadow-xl ring-2 ring-amber-400/50" />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Decorative Flying Casino Chips */}
                <div className="mt-4 flex items-center justify-center -space-x-1">
                  {[-24, -12, 0, 12, 24].map((deg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, rotate: deg }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                      <CasinoChip value={([100, 50, 25, 50, 100] as const)[idx]!} size="xs" />
                    </motion.div>
                  ))}
                </div>

                {/* Summary Text */}
                <p className="mt-3 text-xs text-white/70">
                  {activeWinnerResult.summary}
                </p>
              </div>

              {/* Action Button */}
              <div className="relative z-10 mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowWinnerModal(false)}
                  className="w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-black tracking-wider uppercase text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Continue to Hand #{state.pokerHandNumber} →
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

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
