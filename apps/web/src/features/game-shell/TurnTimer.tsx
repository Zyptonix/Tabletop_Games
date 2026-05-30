"use client";

import type { TimerView } from "@tabletop/shared";

export function TurnTimer({ timer }: { timer: TimerView | null }) {
  if (!timer || timer.remainingMs === null) {
    return <div className="h-2 rounded-full bg-zinc-200" />;
  }

  const seconds = Math.ceil(timer.remainingMs / 1000);
  const percent = Math.max(0, Math.min(100, (timer.remainingMs / 90_000) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
        <span>Turn timer</span>
        <span>{seconds}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
