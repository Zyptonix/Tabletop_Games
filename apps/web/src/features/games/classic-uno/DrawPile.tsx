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
      <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/62">Draw</p>
      <div className="relative">
        <div className="absolute -right-3 top-3 h-40 w-[6.75rem] rounded-2xl border border-sky-300/25 bg-sky-950/35 shadow-[0_0_28px_rgb(14_165_233_/_0.28)] sm:h-44 sm:w-[7.35rem]" />
        <div className="absolute -right-1.5 top-1.5 h-40 w-[6.75rem] rounded-2xl border border-white/20 bg-black/55 sm:h-44 sm:w-[7.35rem]" />
        <UnoCard
          faceDown
          theme={theme}
          onClick={canDraw ? onDraw : undefined}
          className={canDraw ? "h-40 w-[6.75rem] rounded-2xl ring-2 ring-sky-300/50 sm:h-44 sm:w-[7.35rem]" : "h-40 w-[6.75rem] rounded-2xl opacity-60 sm:h-44 sm:w-[7.35rem]"}
        />
        <AnimatePresence>
          {drawAnimationKey > 0 ? (
            <motion.div
              key={drawAnimationKey}
              className="pointer-events-none absolute left-0 top-0 z-20"
              initial={{ opacity: 0.95, x: 0, y: 0, rotate: -4, scale: 1 }}
              animate={{ opacity: 0, x: -52, y: 270, rotate: -18, scale: 0.76 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.58, ease: "easeOut" }}
            >
              <UnoCard faceDown theme={theme} className="h-40 w-[6.75rem] rounded-2xl sm:h-44 sm:w-[7.35rem]" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}