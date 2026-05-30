"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

export function DrawPile({ count, onDraw, canDraw, theme }: { count: number; onDraw: () => void; canDraw: boolean; theme: CardThemeId }) {
  const previousCount = useRef(count);
  const [drawAnimationKey, setDrawAnimationKey] = useState(0);

  useEffect(() => {
    if (count < previousCount.current) {
      setDrawAnimationKey((key) => key + 1);
    }
    previousCount.current = count;
  }, [count]);

  return (
    <div className="relative grid place-items-center gap-2">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/70">Draw</p>      <div className="relative">
        <div className="absolute -right-2 top-2 h-32 w-[5.4rem] rounded-xl border-[3px] border-white/20 bg-red-950/50 sm:h-36 sm:w-24" />
        <div className="absolute -right-1 top-1 h-32 w-[5.4rem] rounded-xl border-[3px] border-white/30 bg-red-900/70 sm:h-36 sm:w-24" />
        <UnoCard faceDown theme={theme} onClick={canDraw ? onDraw : undefined} className={!canDraw ? "opacity-60" : ""} />
        <AnimatePresence>
          {drawAnimationKey > 0 ? (
            <motion.div
              key={drawAnimationKey}
              className="pointer-events-none absolute left-0 top-0 z-20"
              initial={{ opacity: 0.95, x: 0, y: 0, rotate: -4, scale: 1 }}
              animate={{ opacity: 0, x: -52, y: 310, rotate: -22, scale: 0.72 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.58, ease: "easeOut" }}
            >
              <UnoCard faceDown theme={theme} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}