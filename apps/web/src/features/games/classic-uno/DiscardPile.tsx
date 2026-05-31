"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

const discardGlow: Record<string, string> = {
  red: "rgb(255 59 48 / 0.45)",
  yellow: "rgb(255 201 40 / 0.42)",
  green: "rgb(30 215 96 / 0.42)",
  blue: "rgb(45 140 255 / 0.48)",
  wild: "rgb(255 255 255 / 0.28)"
};

export function DiscardPile({ card, theme, currentColor }: { card: RenderableCard; theme: CardThemeId; currentColor?: string }) {
  const glow = discardGlow[currentColor ?? card.color] ?? discardGlow.wild;

  return (
    <div className="grid place-items-center gap-2">
      <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/62">Discard</p>
      <div className="relative h-40 w-[6.75rem] sm:h-44 sm:w-[7.35rem]">
        <div className="absolute -inset-2 rounded-2xl blur-xl" style={{ backgroundColor: glow }} />
        <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-3 rounded-2xl border border-white/15 bg-black/30" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card.id}
            className="absolute inset-0"
            initial={{ opacity: 0, y: -62, rotate: -9, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: 42, rotate: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 430, damping: 30 }}
          >
            <UnoCard card={card} theme={theme} className="h-40 w-[6.75rem] rounded-2xl ring-2 ring-white/25 sm:h-44 sm:w-[7.35rem]" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}