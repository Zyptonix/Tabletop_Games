"use client";

import type { PublicTwentyNineState } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";

export function TwentyNineHUD({
  state,
  currentUserId,
  onOpenLastHand,
  className
}: {
  state: PublicTwentyNineState;
  currentUserId?: string | null;
  onOpenLastHand?: () => void;
  className?: string;
}) {
  const redGamePoints = state.teamGamePoints["0"] ?? 0;
  const blueGamePoints = state.teamGamePoints["1"] ?? 0;

  const redCardPoints = state.capturedPointsByTeam["0"] ?? 0;
  const blueCardPoints = state.capturedPointsByTeam["1"] ?? 0;

  const redTricks = state.tricksWonByTeam["0"] ?? 0;
  const blueTricks = state.tricksWonByTeam["1"] ?? 0;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-2 shadow-2xl backdrop-blur-xl max-w-5xl mx-auto",
        className
      )}
    >
      {/* Left: Team Red Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
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
            <span className="text-lg sm:text-xl font-black text-white">
              {redGamePoints > 0 ? `+${redGamePoints}` : redGamePoints}
            </span>
            <span className="text-[0.65rem] font-bold text-white/40">/ 6 game pts</span>
          </div>
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
            <span className="text-lg sm:text-xl font-black text-white">
              {blueGamePoints > 0 ? `+${blueGamePoints}` : blueGamePoints}
            </span>
            <span className="text-[0.65rem] font-bold text-white/40">/ 6 game pts</span>
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
          <span className="text-xs font-black text-sky-300">BLUE</span>
        </div>
      </div>
    </div>
  );
}
