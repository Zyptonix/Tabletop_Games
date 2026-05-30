"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

export function DiscardPile({ card, theme }: { card: RenderableCard; theme: CardThemeId }) {
  return (
    <div className="grid place-items-center gap-2">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/70">Discard</p>
      <div className="relative h-32 w-[5.4rem] sm:h-36 sm:w-24">
        <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-3 rounded-xl border-[3px] border-white/15 bg-black/25" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card.id}
            className="absolute inset-0"
            initial={{ opacity: 0, y: -70, rotate: -10, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: 45, rotate: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 430, damping: 30 }}
          >
            <UnoCard card={card} theme={theme} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}