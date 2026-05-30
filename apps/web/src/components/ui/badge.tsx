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
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold",
        tone === "neutral" && "bg-zinc-100 text-zinc-700",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "red" && "bg-red-100 text-red-800",
        tone === "gold" && "bg-amber-100 text-amber-800",
        tone === "blue" && "bg-sky-100 text-sky-800",
        className
      )}
      {...props}
    />
  );
}
