"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { UnoDeclaredColor } from "@tabletop/game-core";
import { Palette, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ColorChoice {
  color: UnoDeclaredColor;
  label: string;
  gradient: string;
  border: string;
  glow: string;
  textColor: string;
}

const COLOR_CHOICES: ColorChoice[] = [
  {
    color: "red",
    label: "Red",
    gradient: "from-rose-500 via-red-600 to-rose-700",
    border: "border-rose-300/70",
    glow: "shadow-[0_0_26px_rgba(244,63,94,0.6)]",
    textColor: "text-white"
  },
  {
    color: "yellow",
    label: "Yellow",
    gradient: "from-amber-300 via-amber-400 to-yellow-500",
    border: "border-amber-200/90",
    glow: "shadow-[0_0_26px_rgba(251,191,36,0.6)]",
    textColor: "text-slate-950"
  },
  {
    color: "green",
    label: "Green",
    gradient: "from-emerald-400 via-emerald-500 to-green-600",
    border: "border-emerald-200/70",
    glow: "shadow-[0_0_26px_rgba(52,211,153,0.6)]",
    textColor: "text-white"
  },
  {
    color: "blue",
    label: "Blue",
    gradient: "from-sky-400 via-sky-500 to-blue-600",
    border: "border-sky-200/70",
    glow: "shadow-[0_0_26px_rgba(56,189,248,0.6)]",
    textColor: "text-white"
  }
];

export function UnoColorPicker({
  onPick,
  onCancel
}: {
  onPick: (color: UnoDeclaredColor) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 16 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-[2.25rem] border border-white/15 bg-gradient-to-b from-slate-900/95 via-black/90 to-black/95 p-6 shadow-[0_28px_85px_rgba(0,0,0,0.8),0_0_45px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl text-white select-none"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                Choose Color
              </h2>
              <p className="text-[0.68rem] font-semibold text-white/50">
                Pick the next active color for the table
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/5 text-white/60 hover:bg-white/15 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 4 Player-Seat Style Color Cards */}
        <div className="grid grid-cols-2 gap-3.5 my-5">
          {COLOR_CHOICES.map((item) => (
            <motion.button
              key={item.color}
              type="button"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "group relative flex flex-col items-center justify-center h-20 rounded-2xl border-2 p-2 shadow-lg transition-all duration-200 overflow-hidden",
                "bg-gradient-to-br",
                item.gradient,
                item.border,
                item.glow
              )}
              onClick={() => onPick(item.color)}
              aria-label={`Select ${item.label}`}
            >
              {/* Gloss Highlight on top half */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/35 to-transparent" />

              {/* Color Dot indicator */}
              <span className="relative z-10 flex h-3 w-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] mb-1.5" />

              {/* Color Name */}
              <span
                className={cn(
                  "relative z-10 text-xs sm:text-sm font-black uppercase tracking-[0.16em] drop-shadow-sm",
                  item.textColor
                )}
              >
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* High-Contrast Cancel Button: Black text against solid White background */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-full bg-white hover:bg-white/90 active:scale-[0.98] py-2.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_0_18px_rgba(255,255,255,0.3)] transition-all duration-200"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
