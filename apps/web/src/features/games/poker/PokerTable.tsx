"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  Coins,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
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

// Dynamic physical multi-stack chip cluster for the pot
function DynamicPotCluster({ potAmount, callAmount }: { potAmount: number; callAmount: number }) {
  const stacks = useMemo(() => {
    if (potAmount <= 0) return [];
    const chips = breakdownChips(potAmount);
    if (chips.length <= 2) return [chips];
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
      className="flex items-center gap-3 sm:gap-4 rounded-full border-2 border-amber-400/60 bg-black/80 px-5 py-2 shadow-[0_0_35px_rgba(251,191,36,0.35)] backdrop-blur-md"
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
              <div key={i} className="absolute" style={{ bottom: `${i * 3.5}px`, zIndex: i }}>
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

// Live table action ticker
function TastefulPokerInfo({ actionText }: { actionText: string }) {
  if (!actionText) return null;
  const parts = actionText.split("·").map((s) => s.trim()).filter(Boolean);
  const mainEvent = parts[0] ?? "";
  const cleanMain = mainEvent.replace(/^[🃏🎲🏆🔥⚡🪙✋🚫🎴]\s*/u, "").replace(/;\s*side pots are settled\.?/i, "").trim();

  let emoji = "🎲";
  let mainClass = "text-emerald-200";
  if (/takes the main pot|won hand|winner|champion/i.test(mainEvent)) {
    emoji = "🏆";
    mainClass = "text-amber-200 font-extrabold";
  } else if (/all-in/i.test(mainEvent)) {
    emoji = "🔥";
    mainClass = "text-rose-300 font-extrabold";
  } else if (/raised/i.test(mainEvent)) {
    emoji = "⚡";
    mainClass = "text-amber-300 font-bold";
  } else if (/called/i.test(mainEvent)) {
    emoji = "🪙";
    mainClass = "text-sky-200 font-bold";
  } else if (/checked/i.test(mainEvent)) {
    emoji = "✋";
    mainClass = "text-slate-200 font-medium";
  } else if (/folded/i.test(mainEvent)) {
    emoji = "🚫";
    mainClass = "text-rose-300/90 font-medium";
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-md text-xs">
      <span>{emoji}</span>
      <span className={mainClass}>{cleanMain}</span>
    </div>
  );
}

export function PokerTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, onAction, onChat, onEndMatch, timer } = props;
  const router = useRouter();

  const [pokerRulesOpen, setPokerRulesOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [hideMyCards, setHideMyCards] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Pre-Action Toggles
  const [preCheckFold, setPreCheckFold] = useState(false);
  const [preAutoCheck, setPreAutoCheck] = useState(false);

  // Hand Showdown Modal
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [nextHandCountdown, setNextHandCountdown] = useState(6);
  const lastCelebratedHandRef = useRef<number | null>(null);

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId) && !state.pokerAwaitingNextHand;
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const isSittingOut = Boolean(state.pokerSittingOut?.[currentUserId]);

  const myPaid = state.pokerBets[currentUserId] ?? 0;
  const myStack = state.pokerStacks[currentUserId] ?? 0;
  const startingStack = 1000;
  const netEarnings = myStack - startingStack;
  const callAmount = Math.min(Math.max(0, state.pokerBetToCall - myPaid), myStack);

  const canRaise = isMyTurn && legalActions.some((a) => isAction(a) && a.type === "poker_action" && a.choice === "raise");
  const maxAllowedRaise = Math.max(20, myStack - callAmount);
  const [raiseAmount, setRaiseAmount] = useState(20);
  const effectiveRaise = Math.min(Math.max(20, raiseAmount), maxAllowedRaise);

  // Turn Timer calculation (20 seconds default)
  const turnDuration = 20;
  const [secondsRemaining, setSecondsRemaining] = useState(turnDuration);

  useEffect(() => {
    if (state.pokerAwaitingNextHand || !state.currentPlayerId) {
      setSecondsRemaining(turnDuration);
      return;
    }
    const compute = () => {
      let remaining = turnDuration;
      if (timer?.deadlineAt) {
        remaining = Math.max(0, Math.ceil((new Date(timer.deadlineAt).getTime() - Date.now()) / 1000));
      } else if (state.turnStartedAt || state.updatedAt) {
        const started = Date.parse(state.turnStartedAt ?? state.updatedAt);
        const elapsed = Math.max(0, (Date.now() - started) / 1000);
        remaining = Math.max(0, Math.ceil(turnDuration - elapsed));
      }
      setSecondsRemaining(remaining);
      if (remaining <= 5 && remaining > 0 && isMyTurn && soundEnabled) {
        casinoAudio.playTick();
      }
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [state.turnStartedAt, state.updatedAt, timer?.deadlineAt, state.currentPlayerId, state.pokerAwaitingNextHand, isMyTurn, soundEnabled]);

  function playSound(type: "chip" | "card" | "win") {
    if (!soundEnabled) return;
    if (type === "chip") casinoAudio.playChip();
    if (type === "card") casinoAudio.playCardDeal();
    if (type === "win") casinoAudio.playWin();
  }

  const dispatch = useCallback(
    (action: AnyAction) => {
      const { type, ...payload } = action;
      if (action.choice === "raise" || action.choice === "call" || action.choice === "all_in") {
        playSound("chip");
      } else {
        playSound("card");
      }
      onAction(type, payload as Record<string, unknown>);
    },
    [onAction, soundEnabled]
  );

  // Pre-Action Execution: When local player's turn arrives
  useEffect(() => {
    if (isMyTurn && !state.pokerAwaitingNextHand) {
      if (preCheckFold) {
        setPreCheckFold(false);
        if (callAmount === 0) {
          const check = legalActions.find((a) => isAction(a) && a.type === "poker_action" && a.choice === "check");
          if (check) dispatch(check as AnyAction);
        } else {
          const fold = legalActions.find((a) => isAction(a) && a.type === "poker_action" && a.choice === "fold");
          if (fold) dispatch(fold as AnyAction);
        }
      } else if (preAutoCheck && callAmount === 0) {
        setPreAutoCheck(false);
        const check = legalActions.find((a) => isAction(a) && a.type === "poker_action" && a.choice === "check");
        if (check) dispatch(check as AnyAction);
      }
    }
  }, [isMyTurn, callAmount, preCheckFold, preAutoCheck, state.pokerAwaitingNextHand, legalActions, dispatch]);

  // Showdown & Hand End Ceremony trigger
  useEffect(() => {
    if (state.pokerAwaitingNextHand && state.pokerLastHandResult) {
      if (lastCelebratedHandRef.current !== state.pokerLastHandResult.handNumber) {
        lastCelebratedHandRef.current = state.pokerLastHandResult.handNumber;
        setShowWinnerModal(true);
        setNextHandCountdown(6);
        if (soundEnabled) casinoAudio.playWin();
      }
    } else {
      setShowWinnerModal(false);
    }
  }, [state.pokerAwaitingNextHand, state.pokerLastHandResult, soundEnabled]);

  // Countdown timer for next hand auto-advancement during showdown pause
  useEffect(() => {
    if (!state.pokerAwaitingNextHand || !showWinnerModal) return;
    const interval = setInterval(() => {
      setNextHandCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          dispatch({ type: "poker_action", choice: "next_hand" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.pokerAwaitingNextHand, showWinnerModal, dispatch]);

  // Play sound when community cards are dealt
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

  const opponents = useMemo(() => seatedPlayers.filter((p) => p.userId !== currentUserId), [seatedPlayers, currentUserId]);

  // Quick Pot raise sizing helpers
  const handleQuickPot = (fraction: number) => {
    playSound("chip");
    const targetPotRaise = Math.round(state.pokerPot * fraction);
    const clamped = Math.min(Math.max(20, targetPotRaise), maxAllowedRaise);
    setRaiseAmount(clamped);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col select-none overflow-hidden bg-[#040a08] text-white">
      {/* ============================================================== */}
      {/* CASINO AMBIENCE & CHANDELIER LIGHTING                         */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(16,185,129,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(245,158,11,0.12),transparent_65%)]" />

      {/* ============================================================== */}
      {/* MAIN CASINO POKER TABLE (EXTENDS DIRECTLY TO THE TOP!)         */}
      {/* ============================================================== */}
      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-between p-1.5 sm:p-2.5 overflow-hidden">
        {/* CASINO OVAL TABLE FELT */}
        <div
          className="relative flex h-full w-full max-w-[1720px] 2xl:max-w-[1850px] flex-col justify-between rounded-[50px] sm:rounded-[80px] border-[12px] sm:border-[16px] border-[#381e0b] p-3 sm:p-4 shadow-[inset_0_0_120px_rgba(0,0,0,0.85),0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #064e3b 0%, #043d2e 45%, #022c22 80%, #011913 100%)"
          }}
        >
          {/* Inner Golden Racetrack Line */}
          <div className="pointer-events-none absolute inset-4 sm:inset-6 rounded-[36px] sm:rounded-[65px] border-2 border-amber-300/20" />

          {/* FLOATING CORNER CONTROLS (Top Right of Felt) */}
          <div className="absolute top-3 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-black/60 text-white/80 hover:bg-black/80 backdrop-blur-md shadow"
              title={soundEnabled ? "Mute audio" : "Enable audio"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
            </button>

            <button
              type="button"
              onClick={() => setPokerRulesOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-black/80 backdrop-blur-md shadow"
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">Rankings</span>
            </button>

            <button
              type="button"
              onClick={() => setCashOutOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/30 backdrop-blur-md shadow transition active:scale-95"
            >
              <Coins className="h-3.5 w-3.5 text-emerald-300" />
              <span>Cash Out</span>
            </button>
          </div>

          {/* ========================================================== */}
          {/* TOP / RADIAL OPPONENTS ROW                                 */}
          {/* ========================================================== */}
          <div className="relative z-10 flex w-full items-start justify-around px-2 sm:px-6 pt-1">
            {opponents.map((player) => {
              const isEliminated = (player.stack ?? 0) <= 0 && player.folded;
              const isTurn = state.currentPlayerId === player.userId && !state.pokerAwaitingNextHand;
              const isDealer = player.seat === state.pokerButtonSeat;
              const playerAway = Boolean(state.pokerSittingOut?.[player.userId]);

              // Showdown card reveal
              const showdownHand = state.pokerLastHandResult?.showdownCards?.[player.userId];
              const showHoleCards = Boolean(showdownHand && showdownHand.length >= 2 && !state.pokerLastHandResult?.byFold);

              return (
                <div
                  key={player.userId}
                  className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2 sm:p-2.5 backdrop-blur-md transition-all ${
                    isTurn
                      ? "border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.5)] scale-105 z-20"
                      : "border-white/10 bg-black/60 shadow-lg"
                  } ${player.folded || isEliminated ? "opacity-40" : ""} ${playerAway ? "border-rose-400/40 bg-rose-950/20" : ""}`}
                >
                  {/* Active Turn Timer Bar */}
                  {isTurn ? (
                    <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden mb-0.5">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          secondsRemaining <= 5 ? "bg-rose-500 animate-pulse" : secondsRemaining <= 10 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${(secondsRemaining / turnDuration) * 100}%` }}
                      />
                    </div>
                  ) : null}

                  {/* Header: Name, Dealer Button, Bot / Away Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[120px]">
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
                    {playerAway ? (
                      <span className="rounded bg-rose-500/20 px-1 text-[8px] font-black text-rose-300 uppercase">
                        AWAY
                      </span>
                    ) : null}
                  </div>

                  {/* Opponent Stack / Status */}
                  <span className="font-mono text-xs font-black text-emerald-300">
                    {isEliminated
                      ? "BUSTED"
                      : player.folded
                      ? "FOLDED"
                      : playerAway
                      ? "SITTING OUT"
                      : `$${(player.stack ?? 0).toLocaleString("en-US")}`}
                  </span>

                  {/* Hole Cards: Face-Down or Revealed at Showdown */}
                  <div className="flex items-center -space-x-3 sm:-space-x-4 mt-0.5">
                    {player.folded || isEliminated ? (
                      <div className="h-12 w-9 rounded border border-dashed border-white/20 grid place-items-center text-[10px] text-white/30">
                        Muck
                      </div>
                    ) : showHoleCards ? (
                      <>
                        <CasinoPlayingCard card={showdownHand![0]} size="sm" className="shadow-lg ring-1 ring-amber-400" />
                        <CasinoPlayingCard card={showdownHand![1]} size="sm" className="shadow-lg ring-1 ring-amber-400" />
                      </>
                    ) : (
                      <>
                        <CasinoPlayingCard hidden size="sm" className="shadow-md" />
                        <CasinoPlayingCard hidden size="sm" className="shadow-md" />
                      </>
                    )}
                  </div>

                  {/* Active Bet Chips placed on table felt in front of seat */}
                  {(player.bet ?? 0) > 0 ? (
                    <div className="mt-1">
                      <ChipStack amount={player.bet ?? 0} size="sm" />
                    </div>
                  ) : null}

                  {/* Turn Status Pill */}
                  {isTurn ? (
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 mt-0.5 animate-pulse">
                      <Clock className="h-3 w-3" />
                      <span>{secondsRemaining}s</span>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ========================================================== */}
          {/* CENTER TABLE FELT: HELLA BIG COMMUNITY CARDS & POT         */}
          {/* ========================================================== */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
            {/* Center Pot Cluster */}
            <div className="mb-3">
              <DynamicPotCluster potAmount={state.pokerPot} callAmount={callAmount} />
            </div>

            {/* 5 EXTRA LARGE COMMUNITY CARDS (HELLA BIG!) */}
            <div className="flex items-center justify-center gap-2 sm:gap-4" aria-label="Community Board Cards">
              {Array.from({ length: 5 }, (_, i) => {
                const card = state.communityCards[i] ?? null;
                const isWinningCard = Boolean(
                  card && state.pokerLastHandResult?.winningCards?.includes(card)
                );
                const isUnusedAtShowdown = Boolean(
                  card &&
                  state.pokerAwaitingNextHand &&
                  state.pokerLastHandResult?.winningCards &&
                  !state.pokerLastHandResult.winningCards.includes(card)
                );

                return (
                  <motion.div
                    key={`${i}-${card ?? "empty"}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{
                      scale: isWinningCard ? 1.08 : 1,
                      y: isWinningCard ? -8 : 0,
                      opacity: isUnusedAtShowdown ? 0.45 : 1
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={isWinningCard ? "relative z-20" : ""}
                  >
                    <CasinoPlayingCard
                      card={card}
                      hidden={!card}
                      size="xl"
                      className={`shadow-2xl transition-all ${
                        isWinningCard
                          ? "ring-4 ring-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.85)]"
                          : "ring-1 ring-white/10"
                      }`}
                    />
                  </motion.div>
                );
              })}
            </div>

            <span className="mt-2 text-[11px] font-black tracking-widest uppercase text-emerald-300/50">
              Community Board · {state.pokerStreet}
            </span>
          </div>

          {/* ========================================================== */}
          {/* FELT FOOTER: LIVE TABLE FEED TICKER                        */}
          {/* ========================================================== */}
          <div className="relative z-10 flex items-center justify-between px-4 pb-0.5">
            <TastefulPokerInfo actionText={state.pokerLastAction} />

            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-white/10 bg-black/60 px-3 py-1 font-mono text-xs font-bold text-emerald-300 backdrop-blur-md">
                Current Bet: ${state.pokerBetToCall}
              </span>
              {callAmount > 0 ? (
                <span className="rounded-xl border border-amber-400/40 bg-black/60 px-3 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur-md">
                  To Call: ${callAmount}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SITTING OUT BANNER (IF HERO IS SITTING OUT)                    */}
        {/* ============================================================== */}
        {isSittingOut ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-30 mt-2 flex w-full max-w-4xl items-center justify-between rounded-2xl border-2 border-rose-500 bg-gradient-to-r from-rose-950/90 via-slate-950/95 to-slate-950/95 px-5 py-3 shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-black text-rose-200">You are currently Sitting Out (AFK)</h4>
                <p className="text-xs text-white/60">Your turns will automatically check or fold.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: "poker_action", choice: "resume_play" })}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              I&apos;m Back / Resume Play 🟢
            </button>
          </motion.div>
        ) : null}

        {/* ============================================================== */}
        {/* UNIFIED BOTTOM ACTION COCKPIT (BETTING LEFT + CARDS ON RIGHT)  */}
        {/* ============================================================== */}
        <div className="relative z-20 mt-1.5 flex w-full max-w-5xl items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-amber-500/25 bg-slate-950/95 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-xl">
          {/* LEFT / CENTER: PRO BETTING CONTROLS */}
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            {/* Quick Pot Sizing & Pre-actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
              {/* Quick Pot Fraction Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 mr-1 hidden sm:inline">
                  Quick Bets:
                </span>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount(20);
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/15 disabled:opacity-30 active:scale-95"
                >
                  Min ($20)
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(0.5)}
                  className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-30 active:scale-95"
                >
                  1/2 Pot
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(0.75)}
                  className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-30 active:scale-95"
                >
                  3/4 Pot
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(1.0)}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-30 active:scale-95"
                >
                  Pot
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => {
                    playSound("chip");
                    setRaiseAmount(maxAllowedRaise);
                  }}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] font-black text-rose-300 hover:bg-rose-500/25 disabled:opacity-30 active:scale-95"
                >
                  All-In
                </button>
              </div>

              {/* Pre-Action Checkboxes */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preCheckFold}
                    onChange={(e) => {
                      setPreCheckFold(e.target.checked);
                      if (e.target.checked) setPreAutoCheck(false);
                    }}
                    className="rounded border-white/20 text-amber-500 focus:ring-0"
                  />
                  <span>Check / Fold</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preAutoCheck}
                    onChange={(e) => {
                      setPreAutoCheck(e.target.checked);
                      if (e.target.checked) setPreCheckFold(false);
                    }}
                    className="rounded border-white/20 text-amber-500 focus:ring-0"
                  />
                  <span>Auto-Check</span>
                </label>
              </div>
            </div>

            {/* Raise Slider (When raise is available) */}
            {canRaise ? (
              <div className="flex items-center gap-3 py-0.5">
                <span className="text-[10px] font-bold text-white/50 whitespace-nowrap">Raise Slider:</span>
                <input
                  type="range"
                  min={20}
                  max={maxAllowedRaise}
                  step={10}
                  value={effectiveRaise}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-xs font-black text-amber-300 whitespace-nowrap">
                  +${effectiveRaise}
                </span>
              </div>
            ) : null}

            {/* Player Chips & Action Buttons */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-0.5">
              {/* Stack & Turn Info */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-amber-400">Your Stack</span>
                  <span className="font-mono text-base font-black text-emerald-300">
                    ${myStack.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-white/40">Turn</span>
                  <span className="text-xs font-bold text-white">
                    {isMyTurn ? (
                      <span className="text-emerald-300 flex items-center gap-1 font-black">
                        🟢 Your Turn ({secondsRemaining}s)
                      </span>
                    ) : (
                      `⏳ ${currentPlayer?.displayName ?? "Waiting"}`
                    )}
                  </span>
                </div>
              </div>

              {/* The Action Buttons: FOLD | CHECK | CALL | RAISE | ALL-IN */}
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
                          className="group relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black tracking-wider uppercase text-rose-200 transition-all shadow-[0_3px_0_#4c0519] hover:brightness-110 active:translate-y-0.5 border border-rose-500/40"
                          style={{ background: "linear-gradient(180deg, #881337 0%, #4c0519 100%)" }}
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
                          className="group relative flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black tracking-wider uppercase text-emerald-100 transition-all shadow-[0_3px_0_#064e3b] hover:brightness-110 active:translate-y-0.5 border border-emerald-500/40"
                          style={{ background: "linear-gradient(180deg, #065f46 0%, #064e3b 100%)" }}
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
                          className="group relative flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_4px_0_#064e3b] hover:brightness-110 active:translate-y-0.5"
                          style={{ background: "linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)" }}
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
                          className="group relative flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_4px_0_#78350f] hover:brightness-110 active:translate-y-0.5"
                          style={{ background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)" }}
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
                          className="group relative flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black tracking-wider uppercase text-white transition-all shadow-[0_4px_0_#7f1d1d] hover:brightness-110 active:translate-y-0.5"
                          style={{ background: "linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)" }}
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

          {/* RIGHT: INTEGRATED HERO HOLE CARDS DOCK */}
          {/* Note: NO cheat text ('One Pair', 'Full House') - player calculates their own cards! */}
          <div className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4 border-l border-white/10 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                Your Cards
              </span>
              <button
                type="button"
                onClick={() => setHideMyCards((prev) => !prev)}
                className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white mt-0.5"
                title={hideMyCards ? "Reveal cards" : "Hide cards"}
              >
                {hideMyCards ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>{hideMyCards ? "Peek" : "Hide"}</span>
              </button>
            </div>

            {/* The 2 Hole Cards */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {(state.myPokerCards ?? []).map((card, i) => {
                const isWinningCard = Boolean(
                  card && state.pokerLastHandResult?.winningCards?.includes(card)
                );
                return (
                  <CasinoPlayingCard
                    key={`${i}-${card}`}
                    card={card}
                    hidden={hideMyCards}
                    size="md"
                    className={`shadow-xl ${
                      isWinningCard ? "ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]" : "ring-1 ring-white/10"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* SHOWDOWN & WINNER CEREMONY MODAL                               */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showWinnerModal && state.pokerLastHandResult ? (
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
                <span>Hand #{state.pokerLastHandResult.handNumber} Complete</span>
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

              {/* Winner Headline */}
              <div className="relative z-10 mt-4">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow">
                  {state.pokerLastHandResult.winnerUserIds.includes(currentUserId) ? (
                    <span className="bg-gradient-to-r from-emerald-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                      🎉 YOU WON THE POT! 🎉
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
                      {state.pokerLastHandResult.winnerNames.join(", ")} WINS!
                    </span>
                  )}
                </h2>

                {/* Pot Amount */}
                <div className="mt-2 font-mono text-3xl sm:text-4xl font-black text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                  +${state.pokerLastHandResult.potWon.toLocaleString("en-US")}
                </div>

                {/* Hand Type or Fold Notice */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 shadow">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    {state.pokerLastHandResult.byFold ? "Result:" : "Winning Hand:"}
                  </span>
                  <span className="text-xs font-black text-amber-300">{state.pokerLastHandResult.handName}</span>
                </div>

                {/* Showdown Hole Cards (Only shown if NOT won by fold!) */}
                {!state.pokerLastHandResult.byFold &&
                state.pokerLastHandResult.winnerUserIds.length > 0 &&
                state.pokerLastHandResult.showdownCards?.[state.pokerLastHandResult.winnerUserIds[0]!] ? (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                      Winning Hole Cards
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {state.pokerLastHandResult.showdownCards[state.pokerLastHandResult.winnerUserIds[0]!]!.map((c, i) => (
                        <CasinoPlayingCard key={i} card={c} size="md" className="shadow-xl ring-2 ring-amber-400/70" />
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Summary Text */}
                <p className="mt-3 text-xs text-white/70">{state.pokerLastHandResult.summary}</p>
              </div>

              {/* Action Button: Next Hand with Live Countdown */}
              <div className="relative z-10 mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "poker_action", choice: "next_hand" })}
                  className="w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-black tracking-wider uppercase text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Continue to Hand #{(state.pokerHandNumber ?? 1) + 1} ({nextHandCountdown}s) →
                </button>
                <span className="text-[11px] text-white/40">Auto-advances when countdown finishes</span>
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
                  <h3 className="text-xl font-black text-amber-300">Poker Hand Rankings</h3>
                  <p className="text-xs text-white/50">Highest to lowest standard 5-card poker combinations.</p>
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
                  <div key={hand.name} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400/20 text-xs font-black text-amber-300 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-white font-black">{hand.name}</strong>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{hand.tier}</span>
                      </div>
                      <p className="font-mono text-[11px] font-bold text-emerald-300 mt-0.5">{hand.example}</p>
                      <p className="text-[10px] text-white/60 leading-snug mt-0.5">{hand.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* CASH OUT & LEAVE MODAL                                         */}
      {/* ============================================================== */}
      <AnimatePresence>
        {cashOutOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md"
            onClick={() => setCashOutOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/20 text-xl text-emerald-300">
                    💰
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">Cash Out & Leave Table</h3>
                    <p className="text-[11px] text-white/50">Texas Hold'em Poker Session Summary</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCashOutOpen(false)}
                  className="h-8 w-8 rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Chip Balance Pod */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300/80">
                  Your Ending Chip Stack
                </span>
                <span className="font-mono text-3xl sm:text-4xl font-black text-emerald-300 mt-1">
                  ${myStack.toLocaleString("en-US")}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                      netEarnings > 0
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                        : netEarnings < 0
                        ? "bg-rose-500/20 text-rose-200 border border-rose-400/40"
                        : "bg-white/10 text-white/70 border border-white/20"
                    }`}
                  >
                    {netEarnings > 0 ? `+${netEarnings.toLocaleString("en-US")} Profit 🚀` : netEarnings < 0 ? `${netEarnings.toLocaleString("en-US")} Net` : "$0 Even"}
                  </span>
                  <span className="text-[11px] text-white/40">(Started with $1,000)</span>
                </div>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[10px] uppercase font-bold text-white/40">Hand Number</span>
                  <p className="mt-0.5 font-mono text-base font-black text-white">#{state.pokerHandNumber ?? 1}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[10px] uppercase font-bold text-white/40">Blinds</span>
                  <p className="mt-0.5 font-mono text-base font-black text-white">$10 / $20</p>
                </div>
              </div>

              <p className="text-xs text-white/60 text-center leading-relaxed">
                Ready to leave the table? Your chip balance will be banked and you will return to the dashboard.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCashOutOpen(false)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/15 transition active:scale-95"
                >
                  Keep Playing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const me = state.players.find((p) => p.userId === currentUserId);
                    if (onChat) {
                      onChat(room.id, `💰 ${me?.displayName ?? "Player"} cashed out of poker with $${myStack.toLocaleString("en-US")} chips!`);
                    }
                    router.push("/dashboard");
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:brightness-110 transition active:scale-95"
                >
                  💰 Cash Out & Exit
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
