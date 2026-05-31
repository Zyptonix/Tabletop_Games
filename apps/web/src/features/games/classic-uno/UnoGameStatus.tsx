"use client";

import { ArrowLeftRight, Hash, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StatusColor = "red" | "yellow" | "green" | "blue";

interface GameStatusState {
  currentColor: StatusColor;
  direction: 1 | -1;
  actionNumber?: number;
}

const colorClass: Record<StatusColor, string> = {
  red: "bg-red-500 shadow-red-500/60",
  yellow: "bg-amber-300 shadow-amber-300/60",
  green: "bg-emerald-400 shadow-emerald-400/60",
  blue: "bg-sky-400 shadow-sky-400/60"
};

function colorLabel(color: StatusColor) {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export function UnoGameStatus({ state, currentPlayerName }: { state: GameStatusState; currentPlayerName?: string | undefined }) {
  const DirectionIcon = state.direction === 1 ? RotateCw : RotateCcw;

  return (
    <div className="flex flex-wrap items-center gap-2 text-white">
      <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-black shadow backdrop-blur">
        <span className={cn("h-4 w-4 rounded-full shadow-[0_0_18px]", colorClass[state.currentColor])} />
        <span>{colorLabel(state.currentColor)}</span>
      </div>
      <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-black shadow backdrop-blur">
        <DirectionIcon className="h-4 w-4 text-sky-200" />
        <span>{state.direction === 1 ? "Clockwise" : "Counter"}</span>
      </div>
      <div className="inline-flex min-h-10 max-w-[15rem] items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-black shadow backdrop-blur">
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-amber-200" />
        <span className="truncate">{currentPlayerName ?? "Waiting"}</span>
      </div>
      {typeof state.actionNumber === "number" ? (
        <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-black shadow backdrop-blur">
          <Hash className="h-4 w-4 text-white/55" />
          <span>{state.actionNumber}</span>
        </div>
      ) : null}
    </div>
  );
}