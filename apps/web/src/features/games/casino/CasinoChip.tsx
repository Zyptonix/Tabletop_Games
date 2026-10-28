"use client";

import { useMemo } from "react";

export type ChipDenomination = 5 | 10 | 25 | 50 | 100 | 500 | 1000;

interface ChipConfig {
  value: ChipDenomination;
  label: string;
  bgGradient: string;
  borderColor: string;
  accentStripe: string;
  textColor: string;
  glowColor: string;
}

export const CHIP_CONFIGS: Record<ChipDenomination, ChipConfig> = {
  5: {
    value: 5,
    label: "$5",
    bgGradient: "radial-gradient(circle at 35% 30%, #ef4444 0%, #b91c1c 65%, #7f1d1d 100%)",
    borderColor: "#fca5a5",
    accentStripe: "#ffffff",
    textColor: "#ffffff",
    glowColor: "rgba(239, 68, 68, 0.4)"
  },
  10: {
    value: 10,
    label: "$10",
    bgGradient: "radial-gradient(circle at 35% 30%, #3b82f6 0%, #1d4ed8 65%, #1e3a8a 100%)",
    borderColor: "#93c5fd",
    accentStripe: "#ffffff",
    textColor: "#ffffff",
    glowColor: "rgba(59, 130, 246, 0.4)"
  },
  25: {
    value: 25,
    label: "$25",
    bgGradient: "radial-gradient(circle at 35% 30%, #22c55e 0%, #15803d 65%, #14532d 100%)",
    borderColor: "#86efac",
    accentStripe: "#fde047",
    textColor: "#ffffff",
    glowColor: "rgba(34, 197, 94, 0.4)"
  },
  50: {
    value: 50,
    label: "$50",
    bgGradient: "radial-gradient(circle at 35% 30%, #06b6d4 0%, #0e7490 65%, #164e63 100%)",
    borderColor: "#a5f3fc",
    accentStripe: "#ffffff",
    textColor: "#ffffff",
    glowColor: "rgba(6, 182, 212, 0.4)"
  },
  100: {
    value: 100,
    label: "$100",
    bgGradient: "radial-gradient(circle at 35% 30%, #334155 0%, #1e293b 65%, #0f172a 100%)",
    borderColor: "#cbd5e1",
    accentStripe: "#fbbf24",
    textColor: "#f8fafc",
    glowColor: "rgba(251, 191, 36, 0.35)"
  },
  500: {
    value: 500,
    label: "$500",
    bgGradient: "radial-gradient(circle at 35% 30%, #a855f7 0%, #7e22ce 65%, #581c87 100%)",
    borderColor: "#e9d5ff",
    accentStripe: "#f472b6",
    textColor: "#ffffff",
    glowColor: "rgba(168, 85, 247, 0.4)"
  },
  1000: {
    value: 1000,
    label: "$1K",
    bgGradient: "radial-gradient(circle at 35% 30%, #eab308 0%, #ca8a04 65%, #854d0e 100%)",
    borderColor: "#fef08a",
    accentStripe: "#000000",
    textColor: "#000000",
    glowColor: "rgba(234, 179, 8, 0.5)"
  }
};

export function CasinoChip({
  value,
  size = "md",
  selected = false,
  onClick,
  disabled = false
}: {
  value: ChipDenomination;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const config = CHIP_CONFIGS[value] ?? CHIP_CONFIGS[25];

  const sizeClasses = {
    xs: "w-6 h-6 text-[8px]",
    sm: "w-8 h-8 text-[9px]",
    md: "w-11 h-11 text-xs",
    lg: "w-14 h-14 text-sm",
    xl: "w-16 h-16 text-base"
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative select-none rounded-full shrink-0 flex items-center justify-center font-black transition-all ${sizeClasses} ${
        onClick && !disabled
          ? "cursor-pointer hover:scale-110 active:scale-95 active:translate-y-0.5"
          : "cursor-default"
      } ${selected ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 -translate-y-1 shadow-lg" : ""}`}
      style={{
        background: config.bgGradient,
        boxShadow: selected
          ? `0 6px 14px ${config.glowColor}, inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -3px 4px rgba(0,0,0,0.5)`
          : "0 3px 6px rgba(0,0,0,0.45), inset 0 2px 2px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.5)",
        border: `2px solid ${config.borderColor}`
      }}
    >
      {/* Authentic Casino Striped Edge Markings */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full border border-dashed opacity-40"
        style={{ borderColor: config.accentStripe }}
      />

      {/* Recessed Center Denomination Inlay */}
      <span
        className="pointer-events-none relative flex h-[70%] w-[70%] items-center justify-center rounded-full border border-white/30 font-black tracking-tight"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.4) 100%)",
          color: config.textColor,
          textShadow: "0 1px 2px rgba(0,0,0,0.8)"
        }}
      >
        {config.label}
      </span>
    </button>
  );
}

/**
 * Break down an integer chip amount into representative casino chips.
 */
export function breakdownChips(amount: number): ChipDenomination[] {
  let remaining = amount;
  const result: ChipDenomination[] = [];
  const denoms: ChipDenomination[] = [1000, 500, 100, 50, 25, 10, 5];

  for (const d of denoms) {
    while (remaining >= d && result.length < 8) {
      result.push(d);
      remaining -= d;
    }
  }

  // If still remaining or empty, provide minimal chips
  if (result.length === 0 && amount > 0) {
    result.push(5);
  }

  return result;
}

/**
 * Visual stack of 3D chips offset slightly vertically to represent a physical pile.
 */
export function ChipStack({
  amount,
  size = "sm",
  showLabel = true
}: {
  amount: number;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const chips = useMemo(() => breakdownChips(amount), [amount]);

  if (amount <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0 select-none">
      <div className="relative flex flex-col items-center justify-center" style={{ height: `${22 + chips.length * 3}px`, width: size === "xs" ? "24px" : "32px" }}>
        {chips.slice(0, 6).map((denom, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              bottom: `${i * 3.5}px`,
              zIndex: i
            }}
          >
            <CasinoChip value={denom} size={size} />
          </div>
        ))}
      </div>
      {showLabel ? (
        <span className="font-mono text-xs font-black text-amber-200 drop-shadow">
          ${amount.toLocaleString("en-US")}
        </span>
      ) : null}
    </div>
  );
}
