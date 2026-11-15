"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

const discardGlow: Record<
  string,
  {
    bg: string;
    border: string;
    glow: string;
    soft: string;
  }
> = {
  red: {
    bg: "rgba(239, 68, 68, 0.65)",
    border: "rgba(244, 63, 94, 0.95)",
    glow: "rgba(239, 68, 68, 0.85)",
    soft: "rgba(225, 29, 72, 0.55)"
  },
  yellow: {
    bg: "rgba(234, 179, 8, 0.65)",
    border: "rgba(250, 204, 21, 0.95)",
    glow: "rgba(234, 179, 8, 0.85)",
    soft: "rgba(202, 138, 4, 0.55)"
  },
  green: {
    bg: "rgba(34, 197, 94, 0.65)",
    border: "rgba(74, 222, 128, 0.95)",
    glow: "rgba(34, 197, 94, 0.85)",
    soft: "rgba(22, 163, 74, 0.55)"
  },
  blue: {
    bg: "rgba(14, 165, 233, 0.65)",
    border: "rgba(56, 189, 248, 0.95)",
    glow: "rgba(14, 165, 233, 0.85)",
    soft: "rgba(2, 132, 199, 0.55)"
  },
  wild: {
    bg: "rgba(217, 70, 239, 0.65)",
    border: "rgba(240, 171, 252, 0.95)",
    glow: "rgba(217, 70, 239, 0.85)",
    soft: "rgba(192, 38, 211, 0.55)"
  }
};

export function DiscardPile({ card, theme, currentColor }: { card: RenderableCard; theme: CardThemeId; currentColor?: string }) {
  const currentKey = currentColor ?? card.color ?? "red";
  const glowConfig = discardGlow[currentKey] ?? discardGlow.wild!;

  return (
    <div className="relative grid place-items-center gap-3 select-none">
      <div className="flex min-h-[2rem] items-center justify-center mb-1">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.24em] text-white/70">
          Discard
        </p>
      </div>

      <div className="relative h-56 w-[9.45rem] sm:h-60 sm:w-[10.15rem]">
        {/* Rich atmospheric color glow behind discard pile */}
        <div
          className="absolute -inset-3 rounded-2xl blur-xl transition-all duration-300"
          style={{
            backgroundColor: glowConfig.bg,
            boxShadow: `0 0 35px ${glowConfig.glow}, 0 0 70px ${glowConfig.soft}`
          }}
        />

        {/* Ambient background card layer beneath active top card */}
        <div
          className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-3 rounded-2xl border bg-black/45 shadow-lg transition-all duration-300"
          style={{ borderColor: glowConfig.border }}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card.id}
            className="absolute inset-0"
            initial={{ opacity: 0, y: -62, rotate: -9, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: 42, rotate: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 430, damping: 30 }}
          >
            <UnoCard
              card={card}
              theme={theme}
              className="h-full w-full rounded-2xl ring-2 ring-white/45 shadow-[0_0_24px_rgba(255,255,255,0.3)] transition-all sm:h-full sm:w-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
