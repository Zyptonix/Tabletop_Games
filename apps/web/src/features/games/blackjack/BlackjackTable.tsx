"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, RotateCcw, HelpCircle, Volume2, VolumeX, Flame } from "lucide-react";
import type { BoardGameTableProps } from "../board-games/shared/types";
import { CasinoChip, ChipStack, type ChipDenomination } from "../casino/CasinoChip";
import { CasinoPlayingCard } from "../casino/CasinoPlayingCard";
import { casinoAudio } from "../casino/casinoAudio";
import { evaluateBlackjackHand, type HandEvaluation } from "@tabletop/game-core";

const BET_CHIPS: ChipDenomination[] = [5, 10, 25, 50, 100, 500, 1000];

// Visual 3D Chip Column for the Dealer Chip Tray
function DealerChipColumn({ denom, count = 10 }: { denom: ChipDenomination; count?: number }) {
  const colors: Record<ChipDenomination, { rim: string; stripe: string; bg: string }> = {
    5: { rim: "#ef4444", stripe: "#ffffff", bg: "#991b1b" },
    10: { rim: "#3b82f6", stripe: "#ffffff", bg: "#1e40af" },
    25: { rim: "#22c55e", stripe: "#fde047", bg: "#166534" },
    50: { rim: "#06b6d4", stripe: "#ffffff", bg: "#155e75" },
    100: { rim: "#475569", stripe: "#fbbf24", bg: "#0f172a" },
    500: { rim: "#a855f7", stripe: "#f472b6", bg: "#6b21a8" },
    1000: { rim: "#eab308", stripe: "#000000", bg: "#854d0e" }
  };
  const c = colors[denom] ?? colors[25];

  return (
    <div className="relative flex flex-col items-center w-5 sm:w-6 h-11 sm:h-13 justify-end bg-black/60 rounded-sm p-0.5 border border-amber-900/40 shadow-inner">
      <div className="flex flex-col-reverse items-center -space-y-2 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="w-full h-1.5 sm:h-2 rounded-xs border-t border-b shadow-xs relative overflow-hidden"
            style={{
              backgroundColor: c.bg,
              borderColor: c.rim,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4), 0 1px 1px rgba(0,0,0,0.6)"
            }}
          >
            <div
              className="absolute inset-y-0 left-0.5 w-0.5 opacity-70"
              style={{ backgroundColor: c.stripe }}
            />
            <div
              className="absolute inset-y-0 right-0.5 w-0.5 opacity-70"
              style={{ backgroundColor: c.stripe }}
            />
          </div>
        ))}
      </div>
      <span className="text-[7px] font-black tracking-tighter text-amber-300/80 mt-0.5">
        ${denom}
      </span>
    </div>
  );
}

// Inset Brass Cup Holder on the Leather Rail
function BrassCupHolder({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 ${
        side === "left" ? "left-4" : "right-4"
      } h-14 w-14 sm:h-16 sm:w-16 rounded-full border-4 border-[#855325] p-1.5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_6px_14px_rgba(0,0,0,0.7)]`}
      style={{
        background: "radial-gradient(circle at 35% 35%, #92400e 0%, #451a03 60%, #1c0a02 100%)"
      }}
    >
      <div className="h-full w-full rounded-full border border-amber-400/40 bg-[radial-gradient(circle_at_30%_30%,#1e1107,#090401_85%)] shadow-inner flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border border-amber-500/20 bg-black/60 opacity-60" />
      </div>
    </div>
  );
}

// Eye-catching Floating Score Badge for any hand
function HandScoreBadge({ evaluation, className = "" }: { evaluation: HandEvaluation; className?: string }) {
  if (evaluation.total === 0) return null;

  if (evaluation.isBlackjack) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-black uppercase tracking-wide bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.7)] border border-amber-200 animate-pulse ${className}`}
      >
        <Trophy className="h-3 w-3 text-slate-950" />
        <span>BJ 21</span>
      </span>
    );
  }

  if (evaluation.isBust) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-black uppercase tracking-wide bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-[0_0_12px_rgba(225,29,72,0.6)] border border-rose-400 ${className}`}
      >
        <span>💥 {evaluation.total} BUST</span>
      </span>
    );
  }

  if (evaluation.total === 21) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-black tracking-wide bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-300 ${className}`}
      >
        21
      </span>
    );
  }

  if (evaluation.isSoft) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black tracking-wide bg-cyan-950/90 text-cyan-200 border border-cyan-400/60 shadow-md ${className}`}
      >
        Soft {evaluation.total}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-black tracking-wide bg-slate-950/85 text-amber-200 border border-amber-400/40 shadow-md tabular-nums ${className}`}
    >
      {evaluation.total}
    </span>
  );
}

export function BlackjackTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, onAction, onChat, onEndMatch } = props;

  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const me = state.players.find((p) => p.userId === currentUserId);
  const myChips = state.blackjackChips?.[currentUserId] ?? 0;
  const myHands = state.blackjackPlayerHands?.[currentUserId] ?? [[]];
  const myBets = state.blackjackBets?.[currentUserId] ?? [0];
  const myCurrentBet = myBets.reduce((a, b) => a + b, 0);

  const phase = state.blackjackPhase ?? "betting";
  const isMyTurn = state.currentPlayerId === currentUserId && phase === "player_turns";

  const dealerCards = state.blackjackDealerHand ?? [];
  const dealerScore = state.blackjackDealerScore ?? 0;
  const holeHidden = state.blackjackDealerHoleHidden ?? false;

  const roundResults = state.blackjackRoundResults?.[currentUserId];

  function playSound(type: "chip" | "card" | "win" | "bust") {
    if (!soundEnabled) return;
    if (type === "chip") casinoAudio.playChip();
    if (type === "card") casinoAudio.playCardDeal();
    if (type === "win") casinoAudio.playWin();
    if (type === "bust") casinoAudio.playBust();
  }

  // Trigger audio fanfare on round finish
  useEffect(() => {
    if (phase === "round_end" && roundResults && roundResults.length > 0) {
      const anyWin = roundResults.some((r) => r.result === "win" || r.result === "blackjack");
      const allBust = roundResults.every((r) => r.result === "bust");
      if (anyWin) playSound("win");
      else if (allBust) playSound("bust");
    }
  }, [phase, roundResults]);

  function handleBetChip(amount: ChipDenomination) {
    playSound("chip");
    onAction("blackjack_action", { choice: "bet", amount });
  }

  function handleClearBet() {
    playSound("chip");
    onAction("blackjack_action", { choice: "clear_bet" });
  }

  function handleDoubleBet() {
    playSound("chip");
    const additional = Math.min(myCurrentBet, myChips);
    if (additional > 0) {
      onAction("blackjack_action", { choice: "bet", amount: additional });
    }
  }

  function handleDeal() {
    playSound("card");
    onAction("blackjack_action", { choice: "deal" });
  }

  function handleHit() {
    playSound("card");
    onAction("blackjack_action", { choice: "hit" });
  }

  function handleStand() {
    playSound("card");
    onAction("blackjack_action", { choice: "stand" });
  }

  function handleDouble() {
    playSound("chip");
    onAction("blackjack_action", { choice: "double" });
  }

  function handleSplit() {
    playSound("card");
    onAction("blackjack_action", { choice: "split" });
  }

  function handleNextRound() {
    playSound("chip");
    onAction("blackjack_action", { choice: "next_round" });
  }

  const activeHandIndex = state.blackjackActiveHandIndex ?? 0;
  const activeHand = myHands[activeHandIndex] ?? [];
  const canDouble = isMyTurn && activeHand.length === 2 && myChips >= (myBets[activeHandIndex] ?? 0);
  const canSplit =
    isMyTurn &&
    activeHand.length === 2 &&
    myChips >= (myBets[activeHandIndex] ?? 0) &&
    activeHand[0]?.slice(0, -1) === activeHand[1]?.slice(0, -1) &&
    myHands.length < 4;

  // Seating arrangement: 5 positions across the widescreen arc
  // [Seat 1 (Far Left), Seat 2 (Mid Left), Seat 3 (Center: YOU), Seat 4 (Mid Right), Seat 5 (Far Right)]
  const otherPlayers = state.players.filter((p) => p.userId !== currentUserId);

  const fiveSeats = useMemo(() => {
    // Keep baseline flat or gently contoured without pushing the center seat down into the table rim
    const seats: Array<{
      positionIndex: number;
      player: typeof me | null;
      isLocal: boolean;
      yOffsetClass: string;
    }> = [
      { positionIndex: 0, player: null, isLocal: false, yOffsetClass: "-translate-y-2 sm:-translate-y-4" },
      { positionIndex: 1, player: null, isLocal: false, yOffsetClass: "translate-y-0" },
      { positionIndex: 2, player: me ?? null, isLocal: true, yOffsetClass: "translate-y-0" },
      { positionIndex: 3, player: null, isLocal: false, yOffsetClass: "translate-y-0" },
      { positionIndex: 4, player: null, isLocal: false, yOffsetClass: "-translate-y-2 sm:-translate-y-4" }
    ];

    if (otherPlayers.length === 1) {
      seats[1]!.player = otherPlayers[0]!;
    } else if (otherPlayers.length === 2) {
      seats[1]!.player = otherPlayers[0]!;
      seats[3]!.player = otherPlayers[1]!;
    } else if (otherPlayers.length === 3) {
      seats[0]!.player = otherPlayers[0]!;
      seats[1]!.player = otherPlayers[1]!;
      seats[3]!.player = otherPlayers[2]!;
    } else if (otherPlayers.length >= 4) {
      seats[0]!.player = otherPlayers[0]!;
      seats[1]!.player = otherPlayers[1]!;
      seats[3]!.player = otherPlayers[2]!;
      seats[4]!.player = otherPlayers[3]!;
    }

    return seats;
  }, [me, otherPlayers]);

  const dealerEval = useMemo(() => {
    return evaluateBlackjackHand(dealerCards);
  }, [dealerCards]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col select-none overflow-hidden bg-[#030907] text-white">
      {/* ============================================================== */}
      {/* CASINO AMBIENT LIGHTING & CHANDELIER SHADOWS                  */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(217,119,6,0.12),transparent_65%)]" />

      {/* ============================================================== */}
      {/* TOP HEADER: CASINO ROOM INFO & CONTROLS                        */}
      {/* ============================================================== */}
      <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-slate-950/85 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-800 text-slate-950 font-black shadow-lg">
            🎰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-amber-200">
                VIP High-Roller Blackjack
              </h1>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                Round {state.blackjackRoundNumber ?? 1}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-emerald-400/80">
              Vegas Rules · Dealer stands on 17 · Blackjack pays 3 to 2
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Rules, Chip Bankroll */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Chip Bankroll Pod */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-black/50 px-3 py-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400">
              Chips:
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-emerald-300 tabular-nums">
              ${myChips.toLocaleString("en-US")}
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
            onClick={() => setRulesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            <HelpCircle className="h-4 w-4 text-amber-300" />
            <span className="hidden sm:inline">Rules</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CASINO BLACKJACK ARENA (FULL WIDESCREEN 3D TABLE)        */}
      {/* ============================================================== */}
      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-between p-2 sm:p-3 overflow-hidden">
        {/* SEMI-CIRCULAR 3D TABLE BODY */}
        <div
          className="relative flex h-full w-full max-w-[1780px] 2xl:max-w-[1920px] flex-col items-center justify-between rounded-b-[180px] sm:rounded-b-[240px] md:rounded-b-[300px] border-x-[12px] sm:border-x-[18px] md:border-x-[24px] border-b-[14px] sm:border-b-[22px] md:border-b-[28px] border-t-[8px] sm:border-t-[10px] border-[#381a0e] shadow-[inset_0_0_120px_rgba(0,0,0,0.85),0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 50% 15%, #0d6e51 0%, #07523c 40%, #033929 75%, #012218 100%)",
            boxShadow:
              "inset 0 0 140px rgba(0,0,0,0.8), inset 0 3px 6px rgba(255,255,255,0.25), 0 25px 60px rgba(0,0,0,0.9)"
          }}
        >
          {/* Embedded Brass Cup Holders on Rails */}
          <BrassCupHolder side="left" />
          <BrassCupHolder side="right" />

          {/* Golden Stitched Seam on Inner Leather Rail */}
          <div className="pointer-events-none absolute inset-x-3 sm:inset-x-6 top-0 bottom-3 sm:bottom-6 rounded-b-[160px] sm:rounded-b-[220px] md:rounded-b-[280px] border-2 border-dashed border-amber-500/20" />

          {/* ========================================================== */}
          {/* TOP LEFT FELT: BLACKJACK PAYS 3 TO 2 & RULES INSCRIPTION   */}
          {/* ========================================================== */}
          <div className="pointer-events-none absolute left-6 sm:left-12 lg:left-16 top-3 sm:top-5 z-10 flex flex-col items-start select-none">
            <h2 className="font-serif text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-[0.2em] text-[#dc2626] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              ★ BLACKJACK PAYS 3 TO 2 ★
            </h2>
            <p className="mt-0.5 font-serif text-[8px] sm:text-[10px] md:text-xs font-bold tracking-[0.15em] text-amber-200/70 uppercase drop-shadow">
              Dealer must draw to 16, and stand on all 17's
            </p>
          </div>

          {/* ========================================================== */}
          {/* TOP RIGHT FELT: DEALER CHIP TRAY, SHOE & INSURANCE BANNER  */}
          {/* ========================================================== */}
          <div className="absolute right-6 sm:right-12 lg:right-16 top-2 sm:top-3 z-20 flex items-center gap-2 sm:gap-3 select-none">
            {/* Insurance Ribbon Text */}
            <div className="hidden xl:flex flex-col items-end pointer-events-none mr-1">
              <span className="font-serif text-[10px] sm:text-xs font-black tracking-[0.18em] text-yellow-300/85 uppercase drop-shadow">
                ★ INSURANCE PAYS 2 TO 1 ★
              </span>
              <span className="text-[9px] font-bold text-emerald-300/70 uppercase tracking-wider">
                Vegas House Rules
              </span>
            </div>

            {/* Compact 3D Dealer Chip Rack */}
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-lg bg-black/75 border border-amber-900/50 shadow-xl">
              <DealerChipColumn denom={1000} count={6} />
              <DealerChipColumn denom={500} count={7} />
              <DealerChipColumn denom={100} count={9} />
              <DealerChipColumn denom={50} count={8} />
              <DealerChipColumn denom={25} count={10} />
              <DealerChipColumn denom={10} count={9} />
              <DealerChipColumn denom={5} count={11} />
            </div>

            {/* 4-Deck Card Dealing Shoe */}
            <div className="hidden lg:flex flex-col items-center justify-center h-12 w-14 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900 to-black p-1 shadow-xl">
              <span className="text-[7px] font-black tracking-widest text-white/50 uppercase">
                SHOE
              </span>
              <div className="w-10 h-4 rounded-xs border border-white/20 bg-gradient-to-r from-red-900 to-amber-950 mt-0.5 flex items-center justify-center">
                <span className="text-[7px] text-amber-300 font-bold">♠ ♥</span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* DEALER STATION (MOVED TO TOP CENTER - MAXIMUM SPACE)       */}
          {/* ========================================================== */}
          <div className="relative z-20 flex w-full flex-col items-center pt-2 sm:pt-3">
            {/* Dealer Header & Score Pill */}
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full border border-slate-400 bg-white font-serif text-[8px] font-black text-slate-950 shadow-md">
                D
              </div>
              <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
                DEALER
              </span>

              {dealerCards.length > 0 ? (
                holeHidden ? (
                  <span className="rounded-full border border-sky-400/40 bg-sky-950/80 px-2.5 py-0.5 font-mono text-[11px] font-black text-sky-200 shadow">
                    Shows {dealerScore}
                  </span>
                ) : (
                  <HandScoreBadge evaluation={dealerEval} />
                )
              ) : null}
            </div>

            {/* Dealer Cards: ALL CARDS VISIBLE SIDE BY SIDE (NO STACKING) */}
            <div className="flex items-center justify-center gap-2 min-h-[90px] sm:min-h-[105px] pt-1">
              {dealerCards.length === 0 ? (
                <div className="flex items-center gap-2 opacity-30">
                  <div className="h-20 w-14 sm:h-22 sm:w-16 rounded-lg border-2 border-dashed border-white/40" />
                  <div className="h-20 w-14 sm:h-22 sm:w-16 rounded-lg border-2 border-dashed border-white/40" />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {dealerCards.map((card, i) => (
                    <motion.div
                      key={`${i}-${card}`}
                      initial={{ y: -20, opacity: 0, scale: 0.85 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.22, delay: i * 0.06 }}
                      className="relative shrink-0"
                    >
                      <CasinoPlayingCard
                        card={card}
                        hidden={card === "hidden"}
                        size="md"
                        className="shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Game Announcement Capsule (Spacious & Clear) */}
            <div className="mt-1 flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-slate-950/80 px-4 py-1 shadow-lg backdrop-blur-md">
              <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold text-amber-200">
                {state.blackjackLastAction || "Place your bets to start the hand."}
              </span>
            </div>
          </div>

          {/* ========================================================== */}
          {/* THE 5 PANORAMIC BETTING STATIONS (WIDESCREEN ARC)          */}
          {/* ========================================================== */}
          <div className="relative z-20 w-full px-2 sm:px-4 md:px-8 pb-2 sm:pb-3">
            <div className="grid grid-cols-5 gap-2 sm:gap-4 md:gap-5 items-end w-full">
              {fiveSeats.map((seat, seatIdx) => {
                const player = seat.player;
                const isLocal = seat.isLocal;

                // Empty Seat Placeholder
                if (!player) {
                  return (
                    <div
                      key={`empty-${seatIdx}`}
                      className={`flex flex-col items-center justify-end ${seat.yOffsetClass} opacity-30`}
                    >
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-dashed border-emerald-300/30 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300/40">
                          SEAT {seatIdx + 1}
                        </span>
                      </div>
                      <div className="mt-1.5 h-16 w-14 sm:h-20 sm:w-18 rounded-xl border border-dashed border-emerald-300/20 bg-emerald-950/10" />
                    </div>
                  );
                }

                // Active Player / Bot Seat
                const hands = state.blackjackPlayerHands?.[player.userId] ?? [[]];
                const bets = state.blackjackBets?.[player.userId] ?? [0];
                const chips = state.blackjackChips?.[player.userId] ?? 0;
                const isTurn = state.currentPlayerId === player.userId;
                const results = state.blackjackRoundResults?.[player.userId];

                return (
                  <div
                    key={player.userId}
                    className={`flex flex-col items-center justify-end ${seat.yOffsetClass} transition-all duration-300`}
                  >
                    {/* Active Turn Halo Ring & Pod */}
                    <div
                      className={`relative flex flex-col items-center gap-1 rounded-2xl p-2 transition-all duration-300 w-full max-w-[280px] ${
                        isTurn
                          ? "bg-amber-500/20 border-2 border-amber-300 ring-4 ring-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.55)] scale-102 z-30"
                          : isLocal
                            ? "bg-black/55 border border-emerald-400/40 shadow-xl z-20"
                            : "bg-black/40 border border-white/10 shadow-lg"
                      }`}
                    >
                      {/* Floating End-of-Round Celebration Banner */}
                      <AnimatePresence>
                        {phase === "round_end" && results && results[0] ? (
                          <motion.div
                            initial={{ y: -15, scale: 0.8, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className={`absolute -top-6 rounded-full px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-2xl z-40 border ${
                              results[0].result === "win" || results[0].result === "blackjack"
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.8)]"
                                : results[0].result === "bust"
                                  ? "bg-rose-600 text-white border-rose-300 shadow-[0_0_15px_rgba(225,29,72,0.6)]"
                                  : results[0].result === "push"
                                    ? "bg-slate-700 text-amber-200 border-slate-400"
                                    : "bg-slate-900 text-white/70 border-white/20"
                            }`}
                          >
                            {results[0].result === "blackjack"
                              ? `🏆 BJ +$${results[0].payout}`
                              : results[0].result === "win"
                                ? `🎉 WIN +$${results[0].payout}`
                                : results[0].result === "bust"
                                  ? "💥 BUST"
                                  : results[0].result === "push"
                                    ? "🤝 PUSH"
                                    : "DEALER WINS"}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      {/* Seat Avatar & Nameplate */}
                      <div className="flex items-center gap-1.5 w-full justify-center">
                        <div
                          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black shadow-md ${
                            isLocal
                              ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950"
                              : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                          }`}
                        >
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] sm:text-xs font-black text-white truncate max-w-[80px] sm:max-w-[100px]">
                              {player.displayName}
                            </span>
                            {player.isBot ? (
                              <span className="rounded bg-sky-500/25 px-1 py-0.2 text-[8px] font-black text-sky-300 uppercase">
                                BOT
                              </span>
                            ) : isLocal ? (
                              <span className="rounded bg-emerald-500/25 px-1 py-0.2 text-[8px] font-black text-emerald-300 uppercase">
                                YOU
                              </span>
                            ) : null}
                          </div>
                          <span className="font-mono text-[10px] sm:text-[11px] font-bold text-emerald-300 tabular-nums">
                            ${chips.toLocaleString("en-US")}
                          </span>
                        </div>
                      </div>

                      {/* Active Turn Banner */}
                      {isTurn ? (
                        <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 uppercase tracking-widest animate-bounce">
                          <span>▶ ACTING NOW</span>
                        </div>
                      ) : null}

                      {/* Circular Golden Betting Ring */}
                      <div className="relative mt-0.5">
                        <div
                          className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 transition-all ${
                            (bets[0] ?? 0) > 0
                              ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                              : "border-dashed border-amber-400/50 bg-black/30"
                          }`}
                        >
                          {(bets[0] ?? 0) > 0 ? (
                            <ChipStack amount={bets[0]!} size="xs" showLabel={false} />
                          ) : (
                            <span className="text-[8px] font-black uppercase tracking-wider text-amber-300/40">
                              BET
                            </span>
                          )}
                        </div>

                        {/* Bet Amount Pill Badge */}
                        {(bets[0] ?? 0) > 0 ? (
                          <span className="absolute -bottom-2 inset-x-0 mx-auto w-fit rounded-full border border-amber-300 bg-slate-950 px-1.5 py-0.2 font-mono text-[9px] font-black text-amber-300 shadow">
                            ${bets[0]}
                          </span>
                        ) : null}
                      </div>

                      {/* Rectangular Card Placement Felt Box */}
                      <div className="relative mt-1.5 w-full rounded-xl border border-emerald-400/40 bg-emerald-950/30 p-1.5 shadow-inner">
                        {/* Hands Container (Handles Split Hands for Local Player) */}
                        <div className="flex items-center justify-center gap-2">
                          {hands.map((hand, handIdx) => {
                            const handEval = evaluateBlackjackHand(hand);
                            const isActiveSplitHand = isTurn && activeHandIndex === handIdx;

                            return (
                              <div
                                key={handIdx}
                                className={`relative flex flex-col items-center gap-1 rounded-lg p-1 transition-all ${
                                  isActiveSplitHand
                                    ? "ring-2 ring-amber-400 bg-amber-500/10"
                                    : ""
                                }`}
                              >
                                {/* Score Badge for EVERY Player & Bot */}
                                {hand.length > 0 ? (
                                  <div className="self-end -mb-1 z-20">
                                    <HandScoreBadge evaluation={handEval} />
                                  </div>
                                ) : null}

                                {/* ALL CARDS FULLY VISIBLE SIDE BY SIDE (NO OVERLAPPING/STACKING) */}
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-h-[80px] sm:min-h-[96px] pt-1">
                                  {hand.length === 0 ? (
                                    <div className="flex items-center gap-1 opacity-25">
                                      <div className="h-16 w-11 sm:h-20 sm:w-14 rounded-lg border border-dashed border-white" />
                                      <div className="h-16 w-11 sm:h-20 sm:w-14 rounded-lg border border-dashed border-white" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                      {hand.map((c, i) => (
                                        <motion.div
                                          key={`${i}-${c}`}
                                          initial={{ y: -15, opacity: 0, scale: 0.85 }}
                                          animate={{ y: 0, opacity: 1, scale: 1 }}
                                          transition={{ duration: 0.2, delay: i * 0.05 }}
                                          className="relative shrink-0"
                                        >
                                          <CasinoPlayingCard
                                            card={c}
                                            size={isLocal ? "md" : "sm"}
                                            className="shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                                          />
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3D CASINO ACTION / BETTING CONSOLE                             */}
        {/* ============================================================== */}
        <div className="relative z-30 mt-2 flex w-full max-w-5xl flex-col items-center gap-2 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black p-3 shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          {/* PHASE: BETTING CONSOLE */}
          {phase === "betting" ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              {/* Chip Selector Tray */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400/90 mr-1 hidden sm:inline">
                  Select Chip:
                </span>
                {BET_CHIPS.map((chip) => (
                  <CasinoChip
                    key={chip}
                    value={chip}
                    size="md"
                    onClick={() => handleBetChip(chip)}
                    disabled={myChips < chip}
                  />
                ))}
              </div>

              {/* Bet Modifiers & 3D DEAL Button */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleClearBet}
                  disabled={myCurrentBet === 0}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 active:scale-95 disabled:opacity-30"
                >
                  Clear Bet
                </button>

                <button
                  type="button"
                  onClick={handleDoubleBet}
                  disabled={myCurrentBet === 0 || myChips < myCurrentBet}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-950/60 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-900/60 active:scale-95 disabled:opacity-30"
                >
                  2X Bet
                </button>

                {/* 3D Glossy DEAL Button */}
                <button
                  type="button"
                  onClick={handleDeal}
                  disabled={myCurrentBet < 10}
                  className="group relative flex items-center gap-2 rounded-full px-8 py-3 text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_6px_0_#064e3b,0_12px_24px_rgba(16,185,129,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#064e3b] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)"
                  }}
                >
                  <Sparkles className="h-5 w-5 text-slate-950" />
                  <span>DEAL (${myCurrentBet})</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* PHASE: PLAYER TURNS */}
          {phase === "player_turns" ? (
            <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:gap-5 py-1">
              {/* HIT BUTTON */}
              <button
                type="button"
                onClick={handleHit}
                disabled={!isMyTurn}
                className="group relative flex items-center gap-2 rounded-full px-8 py-3 text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_6px_0_#064e3b,0_12px_24px_rgba(16,185,129,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#064e3b] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)"
                }}
              >
                <span>HIT</span>
                <span className="text-base sm:text-lg">🃏</span>
              </button>

              {/* STAND BUTTON */}
              <button
                type="button"
                onClick={handleStand}
                disabled={!isMyTurn}
                className="group relative flex items-center gap-2 rounded-full px-8 py-3 text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_6px_0_#78350f,0_12px_24px_rgba(245,158,11,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#78350f] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
                }}
              >
                <span>STAND</span>
                <span className="text-base sm:text-lg">✋</span>
              </button>

              {/* DOUBLE BUTTON */}
              <button
                type="button"
                onClick={handleDouble}
                disabled={!canDouble}
                className="group relative flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs sm:text-sm font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_5px_0_#164e63,0_10px_20px_rgba(6,182,212,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#164e63] disabled:opacity-25 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(180deg, #38bdf8 0%, #06b6d4 50%, #0891b2 100%)"
                }}
              >
                <span>DOUBLE 2X</span>
                <span>⚡</span>
              </button>

              {/* SPLIT BUTTON */}
              {canSplit ? (
                <button
                  type="button"
                  onClick={handleSplit}
                  className="group relative flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs sm:text-sm font-black tracking-wider uppercase text-white transition-all shadow-[0_5px_0_#581c87,0_10px_20px_rgba(168,85,247,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#581c87]"
                  style={{
                    background: "linear-gradient(180deg, #c084fc 0%, #a855f7 50%, #7e22ce 100%)"
                  }}
                >
                  <span>SPLIT</span>
                  <span>✌️</span>
                </button>
              ) : null}
            </div>
          ) : null}

          {/* PHASE: ROUND END CONSOLE */}
          {phase === "round_end" ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-xs sm:text-sm font-black text-amber-200">
                  {roundResults?.[0]?.message ?? state.blackjackLastAction}
                </span>
              </div>

              {/* NEXT HAND 3D BUTTON */}
              <button
                type="button"
                onClick={handleNextRound}
                className="group relative flex items-center gap-2 rounded-full px-8 py-3 text-sm sm:text-base font-black tracking-wider uppercase text-slate-950 transition-all shadow-[0_6px_0_#78350f,0_12px_24px_rgba(245,158,11,0.4)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#78350f]"
                style={{
                  background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
                }}
              >
                <RotateCcw className="h-5 w-5" />
                <span>NEXT HAND</span>
              </button>
            </div>
          ) : null}
        </div>
      </main>

      {/* ============================================================== */}
      {/* HOUSE RULES MODAL                                              */}
      {/* ============================================================== */}
      <AnimatePresence>
        {rulesOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setRulesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border-2 border-amber-400/40 bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎰</span>
                  <h3 className="text-base sm:text-lg font-black text-amber-300">
                    Vegas Blackjack House Rules
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-white/80 leading-relaxed">
                <p>
                  <strong>Goal:</strong> Achieve a hand value closer to 21 than the dealer without going over 21.
                </p>
                <div className="rounded-xl bg-white/5 p-3 space-y-1 border border-white/10">
                  <p className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">Payouts:</p>
                  <p>• <strong>Natural Blackjack</strong> (2 cards totaling 21): Pays <strong>3 to 2</strong></p>
                  <p>• <strong>Standard Win</strong>: Pays <strong>1 to 1</strong> (Even money)</p>
                  <p>• <strong>Push / Tie</strong>: Bet returned</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 space-y-1 border border-white/10">
                  <p className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">Dealer Rules:</p>
                  <p>• Dealer must draw cards until their hand reaches 17 or higher.</p>
                  <p>• Dealer stands on all 17s (both hard and soft 17).</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 space-y-1 border border-white/10">
                  <p className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">Player Moves:</p>
                  <p>• <strong>Hit:</strong> Draw another card.</p>
                  <p>• <strong>Stand:</strong> Keep current hand and end your turn.</p>
                  <p>• <strong>Double Down:</strong> Double original bet, receive exactly one more card, and stand.</p>
                  <p>• <strong>Split:</strong> If dealt a pair of equal cards, split them into two separate hands with an equal bet.</p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
