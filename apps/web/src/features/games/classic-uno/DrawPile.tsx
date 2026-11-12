"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";
import { cn } from "@/lib/utils/cn";

/**
 * =========================================================================
 * DRAW PILE ANIMATION & TUNING PARAMETERS
 * You can tweak these values anytime to customize the feel of the pile:
 * =========================================================================
 */
export const DRAW_PILE_CONFIG = {
  // Base scale of the pile when forced to draw (1.0 = normal, 1.16 = 16% bigger)
  forcedBaseScale: 1.16,

  // Peak scale reached at the height of the smooth float
  forcedJumpScale: 1.26,

  // Peak height in pixels to float upwards (negative number = moves UPWARDS)
  jumpHeight: -12,

  // Time in seconds for one complete, silky smooth up-and-down cycle
  bounceDuration: 1.8,

  // Scale when the player hovers their mouse over the pile (smoothly expands)
  hoverScale: 1.24,

  // How many pixels upwards the "DRAW!" text moves so it never gets covered by the pile
  textElevateY: -22
};

/**
 * Color styling matching the active playing card below on the table
 */
const COLOR_GLOW_MAP: Record<
  string,
  {
    aura: string;
    border: string;
    bg: string;
    ring: string;
    shadow: string;
    text: string;
  }
> = {
  red: {
    aura: "bg-rose-500/50",
    border: "border-rose-400/50",
    bg: "bg-rose-950/50",
    ring: "ring-rose-500",
    shadow: "shadow-[0_0_38px_rgba(244,63,94,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-rose-400 drop-shadow-[0_0_14px_rgba(244,63,94,0.95)]"
  },
  blue: {
    aura: "bg-sky-500/50",
    border: "border-sky-400/50",
    bg: "bg-sky-950/50",
    ring: "ring-sky-400",
    shadow: "shadow-[0_0_38px_rgba(56,189,248,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-sky-300 drop-shadow-[0_0_14px_rgba(56,189,248,0.95)]"
  },
  green: {
    aura: "bg-emerald-500/50",
    border: "border-emerald-400/50",
    bg: "bg-emerald-950/50",
    ring: "ring-emerald-400",
    shadow: "shadow-[0_0_38px_rgba(52,211,153,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.95)]"
  },
  yellow: {
    aura: "bg-amber-400/50",
    border: "border-amber-400/50",
    bg: "bg-amber-950/50",
    ring: "ring-amber-400",
    shadow: "shadow-[0_0_38px_rgba(251,191,36,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.95)]"
  },
  wild: {
    aura: "bg-fuchsia-500/50",
    border: "border-fuchsia-400/50",
    bg: "bg-fuchsia-950/50",
    ring: "ring-fuchsia-400",
    shadow: "shadow-[0_0_38px_rgba(217,70,239,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-fuchsia-300 drop-shadow-[0_0_14px_rgba(217,70,239,0.95)]"
  }
};

export function DrawPile({
  count,
  onDraw,
  canDraw,
  isForcedDraw = false,
  isMyTurn = false,
  activeColor = "red",
  theme
}: {
  count: number;
  onDraw: () => void;
  canDraw: boolean;
  isForcedDraw?: boolean;
  isMyTurn?: boolean;
  activeColor?: string;
  theme: CardThemeId;
}) {
  const previousCount = useRef(count);
  const [drawAnimationKey, setDrawAnimationKey] = useState(0);

  useEffect(() => {
    if (count < previousCount.current) {
      setDrawAnimationKey((key) => key + 1);
    }
    previousCount.current = count;
  }, [count]);

  const activeTheme = COLOR_GLOW_MAP[activeColor] ?? COLOR_GLOW_MAP.red!;

  return (
    <div className="relative grid place-items-center gap-3">
      {/* Label container elevated with extra headroom so it never clashes with the float */}
      <motion.div
        animate={{ y: isForcedDraw ? DRAW_PILE_CONFIG.textElevateY : 0 }}
        transition={{ duration: 0.3 }}
        className="flex min-h-[2rem] items-center justify-center mb-1"
      >
        <p
          className={cn(
            "font-black uppercase tracking-[0.24em] transition-all duration-300 select-none",
            !canDraw && isMyTurn && "text-[0.66rem] text-rose-300/40",
            !canDraw && !isMyTurn && "text-[0.66rem] text-white/25",
            canDraw && !isForcedDraw && "text-[0.66rem] text-white/65",
            isForcedDraw && cn("text-xs sm:text-sm font-black tracking-[0.28em]", activeTheme.text)
          )}
        >
          {isForcedDraw ? "DRAW!" : isMyTurn && !canDraw ? "Can't Draw" : "Draw"}
        </p>
      </motion.div>

      <div className="relative">
        {/* Pulsing glow aura matching the active card color */}
        {isForcedDraw ? (
          <motion.div
            aria-hidden="true"
            className={cn("pointer-events-none absolute -inset-6 rounded-3xl blur-2xl", activeTheme.aura)}
            animate={{
              opacity: [0.35, 0.9, 0.35],
              scale: [1, 1.18, 1]
            }}
            transition={{ repeat: Infinity, duration: DRAW_PILE_CONFIG.bounceDuration, ease: "easeInOut" }}
          />
        ) : null}

        <motion.div
          animate={
            isForcedDraw
              ? {
                  scale: [
                    DRAW_PILE_CONFIG.forcedBaseScale,
                    DRAW_PILE_CONFIG.forcedJumpScale,
                    DRAW_PILE_CONFIG.forcedBaseScale
                  ],
                  y: [0, DRAW_PILE_CONFIG.jumpHeight, 0]
                }
              : { scale: 1, y: 0 }
          }
          transition={
            isForcedDraw
              ? {
                  repeat: Infinity,
                  duration: DRAW_PILE_CONFIG.bounceDuration,
                  ease: "easeInOut"
                }
              : { duration: 0.25, ease: "easeOut" }
          }
          {...(canDraw
            ? {
                whileHover: {
                  scale: DRAW_PILE_CONFIG.hoverScale,
                  transition: { duration: 0.2, ease: "easeOut" }
                }
              }
            : {})}
          className={cn(
            "relative transition-all duration-300",
            !canDraw && isMyTurn && "opacity-35 grayscale contrast-50 cursor-not-allowed select-none",
            !canDraw && !isMyTurn && "opacity-45 grayscale contrast-75 cursor-not-allowed select-none"
          )}
        >
          {/* Deck stack layer 2 (bottom) */}
          <div
            className={cn(
              "absolute -right-3 top-3 h-40 w-[6.75rem] rounded-2xl border transition-all sm:h-44 sm:w-[7.35rem]",
              isForcedDraw
                ? cn(activeTheme.border, activeTheme.bg, "shadow-[0_0_36px_rgba(0,0,0,0.6)]")
                : canDraw
                  ? "border-sky-300/40 bg-sky-950/40 shadow-[0_0_32px_rgba(14,165,233,0.45),0_0_15px_rgba(56,189,248,0.3)]"
                  : "border-white/10 bg-black/40 shadow-none"
            )}
          />

          {/* Deck stack layer 1 (middle) */}
          <div
            className={cn(
              "absolute -right-1.5 top-1.5 h-40 w-[6.75rem] rounded-2xl border transition-all sm:h-44 sm:w-[7.35rem]",
              isForcedDraw
                ? cn(activeTheme.border, "bg-black/60")
                : canDraw
                  ? "border-sky-300/30 bg-black/55 shadow-[0_0_18px_rgba(14,165,233,0.25)]"
                  : "border-white/10 bg-black/30"
            )}
          />

          {/* Active top card - liftOnHover disabled here so it doesn't fight the deck hover */}
          <UnoCard
            faceDown
            theme={theme}
            liftOnHover={false}
            onClick={canDraw ? onDraw : undefined}
            className={cn(
              "h-40 w-[6.75rem] rounded-2xl transition-all sm:h-44 sm:w-[7.35rem]",
              !canDraw && "pointer-events-none opacity-60",
              canDraw &&
                !isForcedDraw &&
                "ring-2 ring-sky-300 hover:ring-sky-200 shadow-[0_0_28px_rgba(14,165,233,0.65),0_0_55px_rgba(56,189,248,0.35)] cursor-pointer",
              isForcedDraw &&
                cn(
                  "ring-4 ring-offset-2 ring-offset-slate-950 cursor-pointer",
                  activeTheme.ring,
                  activeTheme.shadow
                )
            )}
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
        </motion.div>
      </div>
    </div>
  );
}
