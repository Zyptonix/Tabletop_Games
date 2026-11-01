"use client";

import { Crown, Sparkles, Swords, Trophy, Lock, Unlock } from "lucide-react";
import type { PublicTwentyNineState, TwentyNineSuit } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
import { SuitMark, TWENTY_NINE_SUITS_INFO } from "./TwentyNineCard";

export function TwentyNineHUD({
  state,
  currentUserId,
  className
}: {
  state: PublicTwentyNineState;
  currentUserId: string | null;
  className?: string;
}) {
  const redGamePoints = state.teamGamePoints["0"] ?? 0;
  const blueGamePoints = state.teamGamePoints["1"] ?? 0;

  const redCardPoints = state.capturedPointsByTeam["0"] ?? 0;
  const blueCardPoints = state.capturedPointsByTeam["1"] ?? 0;

  const redTricks = state.tricksWonByTeam["0"] ?? 0;
  const blueTricks = state.tricksWonByTeam["1"] ?? 0;

  const declarer = state.players.find((p) => p.userId === state.declarerId);
  const isRedDeclarer = declarer?.team === 0;
  const isViewerDeclarer = currentUserId === state.declarerId;

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 shadow-2xl backdrop-blur-xl",
        className
      )}
    >
      {/* Left: Team Red Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          <span className="text-xs font-black text-rose-300">RED</span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-black uppercase tracking-wider text-rose-400">
              Team Red
            </span>
            <span className="text-[0.62rem] font-bold text-white/40">
              {redCardPoints}/28 pts · {redTricks}/8 tricks
            </span>
          </div>

          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">
              {redGamePoints > 0 ? `+${redGamePoints}` : redGamePoints}
            </span>
            <span className="text-[0.65rem] font-bold text-white/40">/ 6 game pts</span>
          </div>
        </div>
      </div>

      {/* Center: Hand Contract, Trump & Multiplier Plaque */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-1.5 shadow-inner">
        {/* Hand # */}
        <div className="text-center">
          <span className="block text-[0.55rem] font-black uppercase tracking-widest text-white/40">
            Hand
          </span>
          <span className="text-sm font-black text-white">#{state.handNumber}</span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Contract & Target */}
        <div className="text-center">
          <span className="block text-[0.55rem] font-black uppercase tracking-widest text-amber-200/70">
            Contract
          </span>
          <span className="text-sm font-black text-amber-300">
            {state.contractTarget ?? state.currentBid ?? "—"}
            {state.multiplier > 1 ? (
              <span className="ml-1 text-xs font-extrabold text-rose-400">
                ×{state.multiplier}
              </span>
            ) : null}
          </span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Declarer */}
        {declarer ? (
          <>
            <div className="text-center">
              <span className="block text-[0.55rem] font-black uppercase tracking-widest text-white/40">
                Declarer
              </span>
              <span
                className={cn(
                  "text-xs font-black truncate max-w-[6rem] block",
                  isRedDeclarer ? "text-rose-300" : "text-sky-300"
                )}
                title={declarer.displayName}
              >
                {declarer.displayName} {isViewerDeclarer ? "(You)" : ""}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
          </>
        ) : null}

        {/* Trump Status Badge with explicit Concealed/Revealed indicators */}
        <div className="flex items-center gap-1.5 pl-1">
          {state.singleHandPlayerId ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-xs font-black text-violet-200">
              <Swords className="h-3 w-3" /> SOLO (NO TRUMP)
            </span>
          ) : state.trumpRevealed && state.trumpSuit ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.35)]">
              <Unlock className="h-3.5 w-3.5 text-emerald-300" />
              <SuitMark suit={state.trumpSuit} size={15} />
              <span>{TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label} (Active)</span>
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black shadow-sm",
                isViewerDeclarer
                  ? "border border-amber-400/50 bg-amber-500/15 text-amber-200"
                  : "border border-white/20 bg-white/[0.08] text-white/70"
              )}
            >
              <Lock className="h-3 w-3 text-amber-300" />
              <span>
                {isViewerDeclarer && state.trumpSuit
                  ? `CONCEALED (${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label})`
                  : "TRUMP: CONCEALED"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Team Blue Telemetry */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[0.62rem] font-black uppercase tracking-wider text-sky-400">
              Team Blue
            </span>
            <span className="text-[0.62rem] font-bold text-white/40">
              {blueCardPoints}/28 pts · {blueTricks}/8 tricks
            </span>
          </div>

          <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
            <span className="text-xl font-black text-white">
              {blueGamePoints > 0 ? `+${blueGamePoints}` : blueGamePoints}
            </span>
            <span className="text-[0.65rem] font-bold text-white/40">/ 6 game pts</span>
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
          <span className="text-xs font-black text-sky-300">BLUE</span>
        </div>
      </div>
    </div>
  );
}
