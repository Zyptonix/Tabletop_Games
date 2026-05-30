"use client";

import { ArrowLeftRight, RotateCcw, RotateCw } from "lucide-react";
import type { PublicClassicUnoState } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";

const colorClass: Record<PublicClassicUnoState["currentColor"], string> = {
  red: "bg-red-500 shadow-red-500/50",
  yellow: "bg-amber-300 shadow-amber-300/50",
  green: "bg-emerald-400 shadow-emerald-400/50",
  blue: "bg-sky-400 shadow-sky-400/50"
};

export function UnoGameStatus({ state, currentPlayerName }: { state: PublicClassicUnoState; currentPlayerName?: string | undefined }) {
  const DirectionIcon = state.direction === 1 ? RotateCw : RotateCcw;

  return (
    <div className="flex flex-wrap items-center gap-2 text-white">
      <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 text-sm font-black shadow backdrop-blur">
        <span className={cn("h-5 w-5 rounded-full shadow-[0_0_20px]", colorClass[state.currentColor])} />
        {state.currentColor}
      </div>
      <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 text-sm font-black shadow backdrop-blur">
        <DirectionIcon className="h-4 w-4 text-amber-200" />
        {state.direction === 1 ? "Clockwise" : "Counter"}
      </div>
      <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 text-sm font-black shadow backdrop-blur">
        <ArrowLeftRight className="h-4 w-4 text-sky-200" />
        {currentPlayerName ?? "Waiting"}
      </div>
    </div>
  );
}

