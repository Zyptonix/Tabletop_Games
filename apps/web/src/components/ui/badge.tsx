import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "green" | "red" | "gold" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em]",
        tone === "neutral" && "border-zinc-700/80 bg-zinc-900/80 text-zinc-200",
        tone === "green" && "border-emerald-500/30 bg-emerald-500/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.18)]",
        tone === "red" && "border-red-500/30 bg-red-500/12 text-red-200",
        tone === "gold" && "border-amber-500/30 bg-amber-500/12 text-amber-100",
        tone === "blue" && "border-sky-500/30 bg-sky-500/12 text-sky-100",
        className
      )}
      {...props}
    />
  );
}
