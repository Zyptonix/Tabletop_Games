"use client";

import { motion } from "framer-motion";
import { Moon, SunDim, Timer, Vote } from "lucide-react";
import type { PublicWerewolfState } from "@tabletop/game-core";
import { WEREWOLF_PHASE_LABELS } from "./werewolfTheme";

export function WerewolfPhaseBanner({ state, moderatorLine, now }: { state: PublicWerewolfState; moderatorLine: string; now: number }) {
  const remainingMs = Math.max(0, new Date(state.phaseEndsAt).getTime() - now);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = state.phaseDurationMs > 0 ? Math.max(0, Math.min(1, remainingMs / state.phaseDurationMs)) : 0;
  const circumference = 2 * Math.PI * 30;
  const offset = circumference * (1 - progress);

  const icon = state.phase === "night" ? <Moon className="h-5 w-5" /> : state.phase === "voting" ? <Vote className="h-5 w-5" /> : <SunDim className="h-5 w-5" />;

  return (
    <motion.div
      key={`${state.phase}-${state.round}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/58 p-5 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(148,163,255,0.18),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(127,29,29,0.16),transparent_45%)]" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white/60">
          {icon}
          Round {state.round}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{WEREWOLF_PHASE_LABELS[state.phase]}</h1>
        <p className="max-w-2xl text-sm font-semibold leading-relaxed text-white/64">{moderatorLine}</p>
        <div className="mt-1 flex items-center gap-3">
          <div className="relative h-16 w-16">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 68 68">
              <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
              <circle cx="34" cy="34" r="30" fill="none" stroke={secondsLeft <= 5 ? "#ef4444" : "#93c5fd"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-sm font-black text-white">{secondsLeft}s</div>
          </div>
          <div className="text-left">
            <p className="flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/38"><Timer className="h-3.5 w-3.5" /> Phase timer</p>
            <p className="mt-1 text-sm font-bold text-white/70">The computer moderator advances automatically.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
