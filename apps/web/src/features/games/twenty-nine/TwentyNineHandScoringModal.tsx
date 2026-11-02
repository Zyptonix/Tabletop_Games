"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Trophy,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  X
} from "lucide-react";
import type { PublicTwentyNineState, TwentyNineHandResult } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
import { casinoAudio } from "../casino/casinoAudio";

export interface TwentyNineHandScoringModalProps {
  result: TwentyNineHandResult | null;
  state: PublicTwentyNineState;
  currentUserId: string | null;
  onDismiss: () => void;
  isReview?: boolean;
}

export function TwentyNineHandScoringModal({
  result,
  state,
  currentUserId,
  onDismiss,
  isReview = false
}: TwentyNineHandScoringModalProps) {
  // Staged revelation:
  // 0: Hand summary header & points tally
  // 1: Target comparison & outcome verdict (succeeded vs failed)
  // 2: Multiplier & Game points calculation
  // 3: Scoreboard update rollup & continue button
  const [stage, setStage] = useState<number>(isReview ? 3 : 0);
  const [dismissCountdown, setDismissCountdown] = useState<number>(10);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const handNumber = result?.handNumber;

  useEffect(() => {
    if (!result) return;

    if (isReview) {
      setStage(3);
      return;
    }

    setStage(0);
    setDismissCountdown(10);

    // Staged step progression:
    // 0 -> 1 at 700ms (verdict reveals with audio)
    const t1 = setTimeout(() => {
      setStage(1);
      try {
        if (result.succeeded) {
          casinoAudio.playWin();
        } else {
          casinoAudio.playBust();
        }
      } catch {
        // ignore audio errors
      }
    }, 700);

    // 1 -> 2 at 1500ms (points math & award badge)
    const t2 = setTimeout(() => {
      setStage(2);
      try {
        casinoAudio.playChip();
      } catch {
        // ignore
      }
    }, 1500);

    // 2 -> 3 at 2200ms (scoreboard progression & continue button)
    const t3 = setTimeout(() => {
      setStage(3);
    }, 2200);

    // Auto dismiss countdown
    const interval = setInterval(() => {
      setDismissCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [handNumber, isReview]);

  if (!result) return null;

  const declarer = state.players.find((p) => p.userId === result.declarerId);
  const declarerName = declarer?.displayName ?? "Declarer";
  const declarerTeam = result.declarerTeam;
  const isRedDeclarer = declarerTeam === 0;

  const redPoints = result.teamPoints["0"] ?? 0;
  const bluePoints = result.teamPoints["1"] ?? 0;
  const declarerPoints = isRedDeclarer ? redPoints : bluePoints;
  const target = result.contractTarget;

  const me = state.players.find((p) => p.userId === currentUserId);
  const isMyTeamDeclarer = me ? me.team === declarerTeam : false;
  const didMyTeamWin = result.succeeded ? isMyTeamDeclarer : !isMyTeamDeclarer;

  const scoreChangeMagnitude = Math.abs(result.scoreChange);
  const winningTeamName = result.succeeded
    ? isRedDeclarer
      ? "Team Red"
      : "Team Blue"
    : isRedDeclarer
    ? "Team Blue"
    : "Team Red";

  // Scoreboard calculation
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
          onClick={() => {
            if (stage < 3) setStage(3);
          }}
          className={cn(
            "relative w-full max-w-2xl overflow-hidden rounded-3xl border p-6 shadow-2xl cursor-pointer",
            didMyTeamWin
              ? "border-emerald-500/50 bg-gradient-to-b from-slate-900/95 via-emerald-950/40 to-slate-950/95 shadow-emerald-500/20"
              : "border-rose-500/40 bg-gradient-to-b from-slate-900/95 via-rose-950/30 to-slate-950/95 shadow-rose-500/20"
          )}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={cn(
              "pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full blur-3xl opacity-30",
              didMyTeamWin ? "bg-emerald-400" : "bg-rose-500"
            )}
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white transition"
            title="Dismiss ceremony"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header Badge & Title */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <Trophy className="h-3.5 w-3.5" />
              <span>Hand #{result.handNumber} Complete</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stage >= 1 ? (
                result.succeeded ? (
                  <span className="text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400 animate-bounce" />
                    Contract Made!
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center justify-center gap-2">
                    <XCircle className="h-7 w-7 text-rose-400" />
                    Contract Defeated (Set)!
                  </span>
                )
              ) : (
                <span className="inline-flex items-center justify-center gap-2.5 text-amber-300 animate-pulse">
                  <Sparkles className="h-6 w-6 animate-spin text-amber-300" />
                  Calculating Hand Results…
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-white/60">
              Declarer <strong className="text-white">{declarerName}</strong> (
              <span className={isRedDeclarer ? "text-rose-300 font-bold" : "text-sky-300 font-bold"}>
                {isRedDeclarer ? "Team Red" : "Team Blue"}
              </span>
              ) bid <strong>{result.bid}</strong> · Target: <strong>{target} pts</strong>
            </p>
          </div>

          {/* STAGE 0: TEAMS CARD POINTS TALLY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
            {/* Team Red Card */}
            <div
              className={cn(
                "relative rounded-2xl border p-4 transition-all duration-300",
                isRedDeclarer
                  ? "border-rose-400/60 bg-rose-950/40 shadow-lg shadow-rose-950/50"
                  : "border-white/10 bg-black/40"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                    Team Red
                  </span>
                </div>
                {isRedDeclarer ? (
                  <span className="rounded-md border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-[0.62rem] font-black uppercase text-rose-200">
                    👑 Declarer
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white">{redPoints}</span>
                <span className="text-xs font-bold text-white/40">/ 28 card pts</span>
              </div>

              {/* Progress Bar */}
              <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (redPoints / 28) * 100)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                />
              </div>

              {isRedDeclarer ? (
                <div className="mt-2 text-[0.68rem] text-rose-200/80 font-bold flex items-center justify-between">
                  <span>Target: {target} pts</span>
                  <span>{redPoints >= target ? `+${redPoints - target} surplus` : `${target - redPoints} short`}</span>
                </div>
              ) : null}
            </div>

            {/* Team Blue Card */}
            <div
              className={cn(
                "relative rounded-2xl border p-4 transition-all duration-300",
                !isRedDeclarer
                  ? "border-sky-400/60 bg-sky-950/40 shadow-lg shadow-sky-950/50"
                  : "border-white/10 bg-black/40"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                    Team Blue
                  </span>
                </div>
                {!isRedDeclarer ? (
                  <span className="rounded-md border border-sky-400/40 bg-sky-500/20 px-2 py-0.5 text-[0.62rem] font-black uppercase text-sky-200">
                    👑 Declarer
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white">{bluePoints}</span>
                <span className="text-xs font-bold text-white/40">/ 28 card pts</span>
              </div>

              {/* Progress Bar */}
              <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (bluePoints / 28) * 100)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                />
              </div>

              {!isRedDeclarer ? (
                <div className="mt-2 text-[0.68rem] text-sky-200/80 font-bold flex items-center justify-between">
                  <span>Target: {target} pts</span>
                  <span>{bluePoints >= target ? `+${bluePoints - target} surplus` : `${target - bluePoints} short`}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* STAGE 1 & 2: VERDICT & GAME POINTS AWARDED */}
          {stage >= 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="my-3 rounded-2xl border border-white/10 bg-black/50 p-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <span className="text-[0.65rem] font-black uppercase tracking-wider text-white/50 block">
                    Hand Verdict & Points Math
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm sm:text-base font-black text-white">
                      Needed: <span className="text-amber-300">{target} pts</span> · Captured:{" "}
                      <span className={result.succeeded ? "text-emerald-400" : "text-rose-400"}>
                        {declarerPoints} pts
                      </span>
                    </span>
                  </div>
                  {result.multiplier > 1 ? (
                    <span className="text-xs font-bold text-amber-400/90 block mt-0.5">
                      Stakes: ×{result.multiplier} Multiplier applied!
                    </span>
                  ) : null}
                </div>

                {stage >= 2 ? (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-lg",
                      result.succeeded
                        ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-emerald-500/30"
                        : "border-rose-400/60 bg-rose-500/20 text-rose-200 shadow-rose-500/30"
                    )}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <div>
                      <span className="block text-[0.6rem] font-black uppercase tracking-widest opacity-80">
                        Match Score Award
                      </span>
                      <span className="text-base sm:text-lg font-black">
                        {winningTeamName}: +{scoreChangeMagnitude} Game Point{scoreChangeMagnitude === 1 ? "" : "s"}
                      </span>
                    </div>
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {/* STAGE 3: MATCH SCOREBOARD PROGRESSION & ADVANCE BUTTON */}
          {stage >= 3 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4"
            >
              {/* Match Scoreboard Summary */}
              <div className="flex items-center gap-4 text-xs font-bold text-white/70">
                <span className="text-[0.65rem] uppercase tracking-wider text-white/40">
                  Match Score:
                </span>
                <span className="flex items-center gap-1.5 text-rose-300 font-black text-sm">
                  Team Red: {currentRedGamePts > 0 ? `+${currentRedGamePts}` : currentRedGamePts}
                </span>
                <span className="text-white/20">vs</span>
                <span className="flex items-center gap-1.5 text-sky-300 font-black text-sm">
                  Team Blue: {currentBlueGamePts > 0 ? `+${currentBlueGamePts}` : currentBlueGamePts}
                </span>
                <span className="text-[0.62rem] text-white/40 font-normal">
                  (Goal: +6 to Win)
                </span>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={onDismiss}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-6 py-2.5 text-sm font-black shadow-xl transition hover:scale-105 active:scale-95",
                  didMyTeamWin
                    ? "border-emerald-400/80 bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-emerald-500/40"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <span>Continue to Hand #{result.handNumber + 1}</span>
                <span className="text-xs opacity-60">({dismissCountdown}s)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

