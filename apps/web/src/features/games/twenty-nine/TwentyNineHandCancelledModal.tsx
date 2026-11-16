"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shuffle,
  Info,
  ArrowRight,
  X,
  Scale,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  Gavel,
  Eye
} from "lucide-react";
import type { PublicTwentyNineState, TwentyNineHandResult } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
import { casinoAudio } from "../casino/casinoAudio";

export interface TwentyNineHandCancelledModalProps {
  result: TwentyNineHandResult;
  state: PublicTwentyNineState;
  currentUserId: string | null;
  onDismiss: () => void;
  isReview?: boolean;
}

function parseCancelledReason(reason: string | undefined, declarerName: string) {
  const r = (reason ?? "").toLowerCase();

  if (r.includes("no scoring trump") || r.includes("seventh")) {
    return {
      ruleTag: "7TH CARD TRUMP RULE",
      title: "No Point Trump Held",
      subtitle: "Hand Skipped & Redealt",
      explanation: `${declarerName} chose 7th Card Trump, but held 0 scoring cards (Jack, 9, Ace, or 10) in that trump suit. Under official Bangladesh 29 rules, the declarer cannot play without point trump. The deal is voided and passes on.`,
      icon: "cards" as const,
      accentBorder: "border-amber-400/50",
      accentGlow: "bg-amber-400",
      tagColor: "border-amber-400/40 bg-amber-500/10 text-amber-300"
    };
  }

  if (r.includes("opponents held no trump") || r.includes("only the seven")) {
    return {
      ruleTag: "TRUMP VOID RULE",
      title: "Defenders Void in Trump",
      subtitle: "Hand Skipped & Redealt",
      explanation: `The defending team held no trump cards (or only the 7). Under official 29 rules, the hand cannot be contested fairly and is automatically redealt.`,
      icon: "shield" as const,
      accentBorder: "border-sky-400/50",
      accentGlow: "bg-sky-400",
      tagColor: "border-sky-400/40 bg-sky-500/10 text-sky-300"
    };
  }

  if (r.includes("passed") || r.includes("no player bid") || r.includes("auction")) {
    return {
      ruleTag: "AUCTION PASSED OUT",
      title: "First Three Players Passed",
      subtitle: "Hand Skipped & Redealt",
      explanation: `The first three players passed their turn to bid without opening the minimum 16 contract. The deal is skipped and moves to the next dealer.`,
      icon: "gavel" as const,
      accentBorder: "border-violet-400/50",
      accentGlow: "bg-violet-400",
      tagColor: "border-violet-400/40 bg-violet-500/10 text-violet-300"
    };
  }

  if (r.includes("never revealed")) {
    return {
      ruleTag: "UNREVEALED TRUMP RULE",
      title: "Trump Never Revealed",
      subtitle: "Hand Skipped & Voided",
      explanation: `All 8 tricks were played without any player asking to reveal the concealed trump suit. The hand is voided with zero penalty.`,
      icon: "eye" as const,
      accentBorder: "border-indigo-400/50",
      accentGlow: "bg-indigo-400",
      tagColor: "border-indigo-400/40 bg-indigo-500/10 text-indigo-300"
    };
  }

  return {
    ruleTag: "TABLE RULE ACTIVATED",
    title: "Hand Skipped",
    subtitle: reason ?? "Deal Cancelled",
    explanation: reason
      ? `This deal was cancelled under table rules: ${reason}. Dealer button moves forward.`
      : "The deal was cancelled without scoring and will be redealt.",
    icon: "alert" as const,
    accentBorder: "border-amber-400/50",
    accentGlow: "bg-amber-400",
    tagColor: "border-amber-400/40 bg-amber-500/10 text-amber-300"
  };
}

export function TwentyNineHandCancelledModal({
  result,
  state,
  currentUserId,
  onDismiss,
  isReview = false
}: TwentyNineHandCancelledModalProps) {
  useEffect(() => {
    // Play a gentle card shuffle/deal sound (NOT win or bust audio)
    try {
      casinoAudio.playCardDeal();
    } catch {
      // ignore
    }
  }, [result.handNumber]);

  const declarer = state.players.find((p) => p.userId === result.declarerId);
  const declarerName = declarer?.displayName ?? "Declarer";
  const parsed = parseCancelledReason(result.reason, declarerName);

  // Find dealer and next dealer
  const currentDealer = state.players.find((p) => p.userId === result.dealerPlayerId);
  const dealerSeat = currentDealer?.seat ?? 0;
  const nextDealer = state.players.find((p) => p.seat === (dealerSeat + 1) % 4);

  const currentRedGamePts = state.teamGamePoints["0"] ?? 0;
  const currentBlueGamePts = state.teamGamePoints["1"] ?? 0;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "relative w-full max-w-xl overflow-hidden rounded-3xl border p-6 sm:p-7 shadow-2xl bg-gradient-to-b from-slate-900/98 via-slate-950/95 to-black/98 text-white",
            parsed.accentBorder
          )}
        >
          {/* Subtle Ambient Halo */}
          <div
            className={cn(
              "pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full blur-3xl opacity-20",
              parsed.accentGlow
            )}
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white transition"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header Tag & Headline */}
          <div className="text-center mb-5">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-wider",
                parsed.tagColor
              )}
            >
              <RotateCcw className="h-3.5 w-3.5 animate-spin-slow" />
              <span>{parsed.ruleTag}</span>
            </div>

            <h2 className="mt-2.5 text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{parsed.title}</span>
            </h2>

            <p className="mt-1 text-sm font-bold text-amber-200/80 uppercase tracking-wide">
              {parsed.subtitle}
            </p>
          </div>

          {/* Explanation Box */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 my-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/40 text-amber-300">
                {parsed.icon === "cards" ? <Shuffle className="h-5 w-5" /> : null}
                {parsed.icon === "shield" ? <ShieldAlert className="h-5 w-5" /> : null}
                {parsed.icon === "gavel" ? <Gavel className="h-5 w-5" /> : null}
                {parsed.icon === "eye" ? <Eye className="h-5 w-5" /> : null}
                {parsed.icon === "alert" ? <AlertCircle className="h-5 w-5" /> : null}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[0.68rem] font-black uppercase tracking-wider text-white/50 block">
                  Rule Triggered
                </span>
                <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-white/90">
                  {parsed.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Status Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            {/* Score Impact Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-emerald-300/80 block">
                  Score Impact
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  0 Points Won / Lost
                </span>
              </div>
            </div>

            {/* Next Dealer Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-sky-400/30 bg-sky-950/20 p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500/20 text-sky-300">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-sky-300/80 block">
                  Next Deal
                </span>
                <span className="text-xs sm:text-sm font-black text-white truncate block">
                  Dealer: {nextDealer?.displayName ?? "Next Player"}
                </span>
              </div>
            </div>
          </div>

          {/* Match Scoreboard Summary & Action Button */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-4">
            {/* Scoreboard */}
            <div className="flex items-center gap-3 text-xs font-bold text-white/70">
              <span className="text-[0.65rem] uppercase tracking-wider text-white/40">
                Match Score:
              </span>
              <span className="text-rose-300 font-black text-sm">
                Red: {currentRedGamePts > 0 ? `+${currentRedGamePts}` : currentRedGamePts}
              </span>
              <span className="text-white/20">vs</span>
              <span className="text-sky-300 font-black text-sm">
                Blue: {currentBlueGamePts > 0 ? `+${currentBlueGamePts}` : currentBlueGamePts}
              </span>
            </div>

            {/* Advance Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-amber-400/80 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-black text-black shadow-xl shadow-amber-500/30 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{isReview ? "Close Notification" : "Continue to Next Deal"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
