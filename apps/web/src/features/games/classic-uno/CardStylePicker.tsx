"use client";

import { cardThemeOptions, type CardThemeId } from "./cardThemes";
import { cn } from "@/lib/utils/cn";

export function CardStylePicker({ value, onChange }: { value: CardThemeId; onChange: (value: CardThemeId) => void }) {
  return (
    <div className="inline-flex min-h-10 items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 shadow backdrop-blur">
      {cardThemeOptions.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={cn(
            "min-h-8 rounded-full px-3 text-xs font-black uppercase tracking-wide transition",
            value === theme.id ? "bg-amber-300 text-zinc-950" : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
          onClick={() => onChange(theme.id)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
