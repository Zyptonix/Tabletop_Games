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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  ArrowRight
} from "lucide-react";
import {
  bestPokerHandDetails,
  type PokerLastHandResult
} from "@tabletop/game-core";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { CasinoChip, ChipStack, breakdownChips, type ChipDenomination } from "../casino/CasinoChip";
import { CasinoPlayingCard } from "../casino/CasinoPlayingCard";
import { casinoAudio } from "../casino/casinoAudio";
import { owns, isAction } from "../board-games/shared/ui-utils";

// Visual miniature card for the Hand Rankings reference modal
function MiniCard({ card }: { card: string }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const isRed = suit === "♥" || suit === "♦";
  return (
    <div className="flex h-10 w-7 flex-col justify-between rounded border border-slate-300 bg-white p-1 shadow-sm select-none leading-none sm:h-11 sm:w-8">
      <span className={`text-[10px] font-black sm:text-xs ${isRed ? "text-rose-600" : "text-slate-900"}`}>
        {rank}
      </span>
      <span className={`text-center text-xs sm:text-sm ${isRed ? "text-rose-600" : "text-slate-900"}`}>
        {suit}
      </span>
    </div>
  );
}

const POKER_HAND_RANKINGS = [
  { name: "Royal Flush", tier: "Top Tier", cards: ["A♠", "K♠", "Q♠", "J♠", "10♠"], detail: "A-K-Q-J-10 of the exact same suit." },
  { name: "Straight Flush", tier: "Tier 2", cards: ["9♥", "8♥", "7♥", "6♥", "5♥"], detail: "Five consecutive cards of the same suit." },
  { name: "Four of a Kind", tier: "Tier 3", cards: ["Q♠", "Q♥", "Q♦", "Q♣", "A♦"], detail: "Four cards of matching rank." },
  { name: "Full House", tier: "Tier 4", cards: ["10♠", "10♥", "10♦", "4♣", "4♥"], detail: "Three of a kind combined with a pair." },
  { name: "Flush", tier: "Tier 5", cards: ["A♦", "J♦", "8♦", "5♦", "2♦"], detail: "Any five cards of the same suit, not in sequence." },
  { name: "Straight", tier: "Tier 6", cards: ["9♠", "8♥", "7♦", "6♣", "5♠"], detail: "Five cards in sequence of mixed suits." },
  { name: "Three of a Kind", tier: "Tier 7", cards: ["7♠", "7♥", "7♦", "A♣", "9♠"], detail: "Three cards of identical rank." },
  { name: "Two Pair", tier: "Tier 8", cards: ["K♠", "K♥", "3♦", "3♣", "A♠"], detail: "Two distinct pairs of cards." },
  { name: "One Pair", tier: "Tier 9", cards: ["J♠", "J♥", "A♦", "8♣", "4♠"], detail: "Two cards of the same rank." },
  { name: "High Card", tier: "Lowest", cards: ["A♠", "J♥", "8♦", "5♣", "2♠"], detail: "No combinations; highest individual card plays." }
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

// Radial seat placement coordinates surrounding the table (Like in UNO and 29)
function getOpponentSeatStyle(index: number, totalOpponents: number) {
  if (totalOpponents === 1) {
    // 2 Players Total (Heads-Up): Opponent Top-Center
    return { left: "50%", top: "8px", transform: "translate(-50%, 0)" };
  }
  if (totalOpponents === 2) {
    // 3 Players Total: Top-Left and Top-Right
    const positions = [
      { left: "24%", top: "10px", transform: "translate(-50%, 0)" },
      { left: "76%", top: "10px", transform: "translate(-50%, 0)" }
    ];
    return positions[index]!;
  }
  if (totalOpponents === 3) {
    // 4 Players Total: Mid-Left, Top-Center, Mid-Right
    const positions = [
      { left: "4%", top: "35%", transform: "translate(0, -50%)" },
      { left: "50%", top: "8px", transform: "translate(-50%, 0)" },
      { right: "4%", top: "35%", transform: "translate(0, -50%)" }
    ];
    return positions[index]!;
  }
  if (totalOpponents === 4) {
    // 5 Players Total
    const positions = [
      { left: "4%", top: "40%", transform: "translate(0, -50%)" },
      { left: "26%", top: "10px", transform: "translate(-50%, 0)" },
      { left: "74%", top: "10px", transform: "translate(-50%, 0)" },
      { right: "4%", top: "40%", transform: "translate(0, -50%)" }
    ];
    return positions[index]!;
  }
  // 6 Players Total (5 Opponents)
  const positions = [
    { left: "4%", top: "48%", transform: "translate(0, -50%)" },
    { left: "20%", top: "10px", transform: "translate(-50%, 0)" },
    { left: "50%", top: "8px", transform: "translate(-50%, 0)" },
    { right: "20%", top: "10px", transform: "translate(50%, 0)" },
    { right: "4%", top: "48%", transform: "translate(0, -50%)" }
  ];
  return positions[index % positions.length]!;
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

  // Hand Showdown Modal & Carousel Slide State
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [nextHandCountdown, setNextHandCountdown] = useState(20);
  const lastCelebratedHandRef = useRef<number | null>(null);

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId) && !state.pokerAwaitingNextHand;
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const isSittingOut = Boolean(state.pokerSittingOut?.[currentUserId]);

  const myPaid = state.pokerBets[currentUserId] ?? 0;
  const myTotalPaid = state.pokerContributions?.[currentUserId] ?? myPaid;
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
        setActiveSlideIndex(0);
        setShowWinnerModal(true);
        setNextHandCountdown(20);
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
          setShowWinnerModal(false);
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
  // other players are seated clockwise around the table.
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

  // Build list of all players who went to showdown for the interactive comparison carousel
  const showdownPlayerList = useMemo(() => {
    if (!state.pokerLastHandResult || state.pokerLastHandResult.byFold) return [];
    const cardsMap = state.pokerLastHandResult.showdownCards ?? {};
    const playerIds = Object.keys(cardsMap);
    if (playerIds.length === 0) return [];

    const winnerIds = state.pokerLastHandResult.winnerUserIds ?? [];
    // Sort so the winner(s) appear first!
    const sortedIds = [...playerIds].sort((a, b) => {
      const aIsWinner = winnerIds.includes(a);
      const bIsWinner = winnerIds.includes(b);
      if (aIsWinner && !bIsWinner) return -1;
      if (!aIsWinner && bIsWinner) return 1;
      return 0;
    });

    const rankNames = [
      "High Card", "One Pair", "Two Pair", "Three of a Kind",
      "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"
    ];

    return sortedIds.map((pid) => {
      const playerObj = state.players.find((p) => p.userId === pid);
      const holeCards = cardsMap[pid] ?? [];
      const allCards = [...holeCards, ...(state.communityCards ?? [])];
      let handName = "Hand";
      let bestCards: string[] = [];
      try {
        const details = bestPokerHandDetails(allCards);
        bestCards = details.bestCards;
        handName = rankNames[details.handValue[0] ?? 0] ?? "Hand";
      } catch {
        bestCards = holeCards;
      }
      const isWinner = winnerIds.includes(pid);

      return {
        userId: pid,
        displayName: playerObj?.displayName ?? (pid === currentUserId ? "You" : "Player"),
        isWinner,
        holeCards,
        bestCards,
        handName,
        potWon: isWinner ? state.pokerLastHandResult!.potWon : 0
      };
    });
  }, [state.pokerLastHandResult, state.players, state.communityCards, currentUserId]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col select-none overflow-hidden text-white"
      style={{
        background: "radial-gradient(ellipse at 50% 45%, #085a44 0%, #054030 40%, #032b20 75%, #011610 100%)"
      }}
    >
      {/* ============================================================== */}
      {/* CASINO AMBIENCE & CHANDELIER LIGHTING                         */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(16,185,129,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(245,158,11,0.1),transparent_65%)]" />

      {/* Subtle Casino Table Outer Perimeter Line */}
      <div className="pointer-events-none absolute inset-2 sm:inset-4 rounded-3xl border border-amber-400/15" />

      {/* FLOATING CORNER CONTROLS (Top Right of Table Felt) */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
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

      {/* ============================================================== */}
      {/* MAIN FULL-SCREEN TABLE PLAYING FIELD (NO BOUNDING OVAL BOX!)  */}
      {/* ============================================================== */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col justify-between p-2">
        {/* ============================================================ */}
        {/* SURROUNDING OPPONENT SEATS (SPATIAL POSITIONING LIKE UNO)    */}
        {/* ============================================================ */}
        {opponents.map((player, idx) => {
          const seatStyle = getOpponentSeatStyle(idx, opponents.length);
          const isEliminated = (player.stack ?? 0) <= 0 && player.folded;
          const isTurn = state.currentPlayerId === player.userId && !state.pokerAwaitingNextHand;
          const isDealer = player.seat === state.pokerButtonSeat;
          const playerAway = Boolean(state.pokerSittingOut?.[player.userId]);

          const roundBet = state.pokerBets[player.userId] ?? player.bet ?? 0;
          const totalPaid = state.pokerContributions?.[player.userId] ?? roundBet;

          return (
            <div
              key={player.userId}
              style={seatStyle}
              className="absolute z-20 transition-all duration-300"
            >
              <div
                className={`relative flex flex-col items-center gap-0.5 sm:gap-1 rounded-2xl border p-1.5 sm:p-2 backdrop-blur-md transition-all w-32 sm:w-36 ${
                  isTurn
                    ? "border-amber-400 bg-amber-500/25 ring-4 ring-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-105 z-30"
                    : "border-white/15 bg-black/65 shadow-xl"
                } ${player.folded || isEliminated ? "opacity-35" : ""} ${playerAway ? "border-rose-400/40 bg-rose-950/25" : ""}`}
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
                <div className="flex items-center gap-1.5 w-full justify-center">
                  <span className="text-xs font-bold text-white truncate max-w-[80px] sm:max-w-[95px]">
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

                {/* Stack, Status & Net Session P/L */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black text-emerald-300">
                    {isEliminated
                      ? "BUSTED"
                      : player.folded
                      ? "FOLDED"
                      : playerAway
                      ? "SITTING OUT"
                      : `$${(player.stack ?? 0).toLocaleString("en-US")}`}
                  </span>
                  {!isEliminated && !player.folded && (player.stack ?? 0) !== 1000 ? (
                    <span
                      className={`font-mono text-[9px] font-bold ${
                        (player.stack ?? 0) > 1000 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {(player.stack ?? 0) > 1000 ? `+$${(player.stack ?? 0) - 1000}` : `-$${1000 - (player.stack ?? 0)}`}
                    </span>
                  ) : null}
                </div>

                {/* Paid This Round & Total Paid into Pot Overall */}
                {(roundBet > 0 || totalPaid > 0) && !isEliminated ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    {roundBet > 0 ? (
                      <span
                        className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 font-mono text-[9px] font-black text-emerald-200 shadow-sm"
                        title="Chips paid in current betting round"
                      >
                        Round: ${roundBet}
                      </span>
                    ) : null}
                    {totalPaid > 0 ? (
                      <span
                        className="rounded-full bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.5 font-mono text-[9px] font-black text-amber-200 shadow-sm"
                        title="Total chips paid into this hand's pot overall"
                      >
                        In Pot: ${totalPaid}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Opponents' Hole Cards: Always Face-Down on Seats (NO LEAKING!) */}
                <div className="flex items-center -space-x-3 sm:-space-x-4 mt-0.5">
                  {player.folded || isEliminated ? (
                    <div className="h-11 w-8 rounded border border-dashed border-white/20 grid place-items-center text-[9px] text-white/30">
                      Muck
                    </div>
                  ) : (
                    <>
                      <CasinoPlayingCard hidden size="xs" className="shadow-md" />
                      <CasinoPlayingCard hidden size="xs" className="shadow-md" />
                    </>
                  )}
                </div>

                {/* Active Bet Chips placed physically on table felt in front of seat */}
                {roundBet > 0 ? (
                  <div className="mt-1">
                    <ChipStack amount={roundBet} size="sm" />
                  </div>
                ) : null}

                {/* Turn Countdown Pill */}
                {isTurn ? (
                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 mt-0.5 animate-pulse">
                    <Clock className="h-3 w-3" />
                    <span>{secondsRemaining}s</span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* ============================================================ */}
        {/* CENTER TABLE AREA: POT CLUSTER & HELLA BIG COMMUNITY CARDS   */}
        {/* ============================================================ */}
        <div className="relative z-10 flex flex-col items-center justify-center mt-auto mb-2 sm:mb-4 py-1">
          {/* Main Pot Cluster */}
          <div className="mb-3">
            <DynamicPotCluster potAmount={state.pokerPot} callAmount={callAmount} />
          </div>

          {/* 5 EXTRA LARGE COMMUNITY CARDS (HELLA BIG!) */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4" aria-label="Community Board Cards">
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

          <span className="mt-2 text-[11px] font-black tracking-widest uppercase text-emerald-300/60">
            Community Board · {state.pokerStreet}
          </span>
        </div>

        {/* ============================================================ */}
        {/* FELT FOOTER: LIVE TABLE FEED TICKER                          */}
        {/* ============================================================ */}
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
      </main>

      {/* ============================================================== */}
      {/* SITTING OUT BANNER (IF HERO IS SITTING OUT)                    */}
      {/* ============================================================== */}
      {isSittingOut ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-30 mx-auto mb-2 flex w-full max-w-4xl items-center justify-between rounded-2xl border-2 border-rose-500 bg-gradient-to-r from-rose-950/90 via-slate-950/95 to-slate-950/95 px-5 py-3 shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-xl"
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
      {/* UNIFIED BOTTOM ACTION COCKPIT (POLISHED GLASS DOCK)           */}
      {/* ============================================================== */}
      <footer className="relative z-30 p-2 sm:p-3 flex justify-center">
        <div className="flex w-full max-w-5xl items-center justify-between gap-3 sm:gap-4 rounded-3xl border border-amber-500/35 bg-gradient-to-b from-slate-950/95 via-black/95 to-slate-950/95 p-3 sm:p-4 shadow-[0_15px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {/* LEFT / CENTER: BETTING CONSOLE */}
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            {/* Quick Pot Sizing & Pre-actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
              {/* Quick Pot Buttons */}
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
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/15 disabled:opacity-30 active:scale-95"
                >
                  Min ($20)
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(0.5)}
                  className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-30 active:scale-95"
                >
                  1/2 Pot
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(0.75)}
                  className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 disabled:opacity-30 active:scale-95"
                >
                  3/4 Pot
                </button>
                <button
                  type="button"
                  disabled={!canRaise}
                  onClick={() => handleQuickPot(1.0)}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-30 active:scale-95"
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
                  className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-black text-rose-300 hover:bg-rose-500/25 disabled:opacity-30 active:scale-95"
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

            {/* Raise Slider */}
            {canRaise ? (
              <div className="flex items-center gap-3 py-0.5">
                <span className="text-[10px] font-bold text-white/50 whitespace-nowrap">Raise Slider:</span>
                <button
                  type="button"
                  onClick={() => setRaiseAmount((prev) => Math.max(20, prev - 20))}
                  className="grid h-6 w-6 place-items-center rounded bg-white/10 text-xs font-bold hover:bg-white/20"
                >
                  -
                </button>
                <input
                  type="range"
                  min={20}
                  max={maxAllowedRaise}
                  step={10}
                  value={effectiveRaise}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setRaiseAmount((prev) => Math.min(maxAllowedRaise, prev + 20))}
                  className="grid h-6 w-6 place-items-center rounded bg-white/10 text-xs font-bold hover:bg-white/20"
                >
                  +
                </button>
                <span className="font-mono text-xs font-black text-amber-300 whitespace-nowrap">
                  +${effectiveRaise}
                </span>
              </div>
            ) : null}

            {/* Metrics & Action Buttons */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2 pt-0.5">
              {/* Stack, Round Bet, In Pot (Total) & Turn Info */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-amber-400">Your Stack</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-base font-black text-emerald-300">
                      ${myStack.toLocaleString("en-US")}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        netEarnings > 0 ? "text-emerald-400" : netEarnings < 0 ? "text-rose-400" : "text-white/40"
                      }`}
                    >
                      {netEarnings > 0 ? `+$${netEarnings}` : netEarnings < 0 ? `-$${Math.abs(netEarnings)}` : "$0"}
                    </span>
                  </div>
                </div>

                <div className="h-7 w-px bg-white/10" />

                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-emerald-400" title="Chips paid in this round">
                    This Round
                  </span>
                  <span className="font-mono text-sm font-black text-white">
                    ${myPaid}
                  </span>
                </div>

                <div className="h-7 w-px bg-white/10" />

                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-amber-400" title="Total chips paid into this hand overall">
                    In Pot (Total)
                  </span>
                  <span className="font-mono text-sm font-black text-amber-300">
                    ${myTotalPaid}
                  </span>
                </div>

                <div className="h-7 w-px bg-white/10" />

                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-white/40">Turn</span>
                  <span className="text-xs font-bold text-white">
                    {myStack <= 0 ? (
                      <span className="text-rose-400 font-bold">Busted ($0)</span>
                    ) : isMyTurn ? (
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

                    if (choice === "rebuy") {
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => dispatch(action)}
                          className="group relative flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_4px_0_#065f46] hover:brightness-110 active:translate-y-0.5"
                          style={{ background: "linear-gradient(180deg, #34d399 0%, #10b981 100%)" }}
                        >
                          <Coins className="h-3.5 w-3.5 text-emerald-950" />
                          <span>REBUY ($1,000)</span>
                        </button>
                      );
                    }

                    return null;
                  })}
              </div>
            </div>
          </div>

          {/* RIGHT: INTEGRATED HERO HOLE CARDS DOCK */}
          <div className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4 border-l border-white/10 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                Your Hand
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
              {myStack <= 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 shadow-lg">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-rose-300">Busted ($0)</span>
                    <span className="text-[9px] text-white/50">Out of chips</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "poker_action", choice: "rebuy" })}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
                  >
                    + Rebuy $1,000 🪙
                  </button>
                </div>
              ) : (state.myPokerCards ?? []).length > 0 ? (
                (state.myPokerCards ?? []).map((card, i) => {
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
                })
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="h-16 w-11 rounded-xl border border-dashed border-white/20 grid place-items-center text-[9px] font-bold text-white/30 bg-white/5 text-center p-1 leading-tight">
                    Wait Hand
                  </div>
                  <div className="h-16 w-11 rounded-xl border border-dashed border-white/20 grid place-items-center text-[9px] font-bold text-white/30 bg-white/5 text-center p-1 leading-tight">
                    Next Deal
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* SHOWDOWN & WINNER CAROUSEL MODAL (ALL PLAYERS VS RIVER!)       */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showWinnerModal && state.pokerLastHandResult ? (
          <motion.div
            key="poker-winner-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-3 sm:p-4 backdrop-blur-md"
          >
            <motion.div
              key="poker-winner-modal-dialog"
              initial={{ scale: 0.85, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#14231b] via-[#0b1612] to-[#040807] p-5 sm:p-6 text-center shadow-[0_0_90px_rgba(251,191,36,0.45)]"
            >
              {/* Radial Golden Background Rays */}
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />

              {/* Hand Completion Badge */}
              <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Hand #{state.pokerLastHandResult.handNumber} Showdown</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </div>

              {/* If Win By Fold: Opponents Folded Result */}
              {state.pokerLastHandResult.byFold ? (
                <div className="relative z-10 mt-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-3xl shadow-[0_0_35px_rgba(251,191,36,0.5)] border border-amber-200/50">
                    🏆
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    {state.pokerLastHandResult.winnerUserIds.includes(currentUserId)
                      ? "🎉 YOU WON THE POT! 🎉"
                      : `${state.pokerLastHandResult.winnerNames.join(", ")} WINS!`}
                  </h2>
                  <div className="mt-1 font-mono text-3xl font-black text-amber-300">
                    +${state.pokerLastHandResult.potWon.toLocaleString("en-US")}
                  </div>
                  <p className="mt-2 text-xs text-white/70">
                    Won because every opponent folded. Cards remain mucked (hidden).
                  </p>
                </div>
              ) : (
                /* Interactive Showdown Carousel for All Players Still in Game */
                <div className="relative z-10 mt-3">
                  {/* Top Pot Winner Banner */}
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-black text-amber-300">
                      {state.pokerLastHandResult.winnerNames.join(", ")} takes the pot of ${state.pokerLastHandResult.potWon}!
                    </span>
                  </div>

                  {/* Carousel Navigation Bar */}
                  {showdownPlayerList.length > 1 ? (
                    <div className="mt-3 flex items-center justify-between border-y border-white/10 py-1.5 px-2">
                      <button
                        type="button"
                        disabled={activeSlideIndex === 0}
                        onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white/80 hover:bg-white/10 disabled:opacity-30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase text-amber-400">
                          Player {activeSlideIndex + 1} of {showdownPlayerList.length}
                        </span>
                        <div className="flex items-center gap-1 ml-1">
                          {showdownPlayerList.map((_, dotIdx) => (
                            <button
                              key={dotIdx}
                              type="button"
                              onClick={() => setActiveSlideIndex(dotIdx)}
                              className={`h-2 rounded-full transition-all ${
                                dotIdx === activeSlideIndex ? "w-5 bg-amber-400" : "w-2 bg-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={activeSlideIndex === showdownPlayerList.length - 1}
                        onClick={() => setActiveSlideIndex((prev) => Math.min(showdownPlayerList.length - 1, prev + 1))}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white/80 hover:bg-white/10 disabled:opacity-30 transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  {/* Slide Content: Active Player Hand vs River */}
                  {(() => {
                    const activePlayer = showdownPlayerList[activeSlideIndex] ?? showdownPlayerList[0];
                    if (!activePlayer) return null;

                    return (
                      <motion.div
                        key={activePlayer.userId}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4 text-center"
                      >
                        {/* Player Name, Winner Badge & Hand Name */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">
                              {activePlayer.displayName}
                            </span>
                            {activePlayer.isWinner ? (
                              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase shadow">
                                🏆 WINNER (+${activePlayer.potWon})
                              </span>
                            ) : (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60 uppercase">
                                Showdown
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-amber-300">
                            {activePlayer.handName}
                          </span>
                        </div>

                        {/* Player's 2 Hole Cards */}
                        <div className="mt-3 flex flex-col items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                            {activePlayer.displayName}&apos;s Hole Cards
                          </span>
                          <div className="flex items-center justify-center gap-2">
                            {activePlayer.holeCards.map((c, i) => {
                              const isKey = activePlayer.bestCards.includes(c);
                              return (
                                <CasinoPlayingCard
                                  key={i}
                                  card={c}
                                  size="md"
                                  className={`shadow-xl transition-all ${
                                    isKey
                                      ? "ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                                      : "opacity-60"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Matched Against The 5 River Cards */}
                        <div className="mt-3 flex flex-col items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1">
                            Matched with Community Board Cards
                          </span>
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            {state.communityCards.map((c, i) => {
                              const isKey = activePlayer.bestCards.includes(c);
                              return (
                                <CasinoPlayingCard
                                  key={i}
                                  card={c}
                                  size="sm"
                                  className={`shadow-md transition-all ${
                                    isKey
                                      ? "ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] -translate-y-1"
                                      : "opacity-40"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Best 5 Cards Explanation */}
                        <div className="mt-2.5 text-xs text-white/70">
                          Best 5 cards:{" "}
                          <span className="font-mono font-bold text-amber-300">
                            {activePlayer.bestCards.join(" ")}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              )}

              {/* Action Button: Next Hand with Live Countdown */}
              <div className="relative z-10 mt-5 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWinnerModal(false);
                    dispatch({ type: "poker_action", choice: "next_hand" });
                  }}
                  className="w-full max-w-sm rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-black tracking-wider uppercase text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Continue to Hand #{(state.pokerHandNumber ?? 1) + 1} ({nextHandCountdown}s) →
                </button>
                <span className="text-[11px] text-white/40">Auto-advances when countdown finishes</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* HAND RANKINGS MODAL (WITH REAL VISUAL MINI CARDS!)             */}
      {/* ============================================================== */}
      <AnimatePresence>
        {pokerRulesOpen ? (
          <motion.div
            key="poker-rules-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-3 sm:p-4 backdrop-blur-md"
            onClick={() => setPokerRulesOpen(false)}
          >
            <motion.div
              key="poker-rules-dialog"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-amber-400/40 bg-slate-950 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xl font-black text-amber-300">Poker Hand Rankings</h3>
                  <p className="text-xs text-white/50">Highest to lowest standard 5-card poker combinations with visual examples.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPokerRulesOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POKER_HAND_RANKINGS.map((hand, idx) => (
                  <div key={hand.name} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-400/20 text-xs font-black text-amber-300 shrink-0">
                          {idx + 1}
                        </span>
                        <strong className="text-xs text-white font-black">{hand.name}</strong>
                      </div>
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{hand.tier}</span>
                    </div>

                    {/* Real visual playing cards! */}
                    <div className="flex items-center gap-1.5 py-0.5">
                      {hand.cards.map((c, i) => (
                        <MiniCard key={i} card={c} />
                      ))}
                    </div>

                    <p className="text-[10px] text-white/60 leading-snug">{hand.detail}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* CASH OUT & LEAVE MODAL                                         */}
      {/* ============================================================== */}
      <AnimatePresence>
        {cashOutOpen ? (
          <motion.div
            key="poker-cashout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md"
            onClick={() => setCashOutOpen(false)}
          >
            <motion.div
              key="poker-cashout-dialog"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
