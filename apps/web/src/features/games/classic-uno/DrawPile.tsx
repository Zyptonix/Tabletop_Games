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
  // Base scale of the pile on the table
  baseScale: 1.0,

  // Peak scale reached at the height of the jump (1.18 = 18% bigger at apex)
  jumpScale: 1.18,

  // Peak height in pixels to jump upwards (-30 = jumps 30px up, make -40 for higher, -20 for lower)
  jumpHeight: -30,

  // Time in seconds for one jump rise & fall (0.8s = fast & snappy, 0.9s = bouncy, 1.4s = slower float)
  jumpDuration: 0.92,

  // Rest pause in seconds on the table before the next jump (0 for continuous, 0.12 for distinct rhythmic hops)
  groundPause: 0.12,

  // Scale when the player hovers their mouse over the pile (when not jumping)
  hoverScale: 1.20,

  // Headroom offset for the "DRAW!" badge so it stays nicely above the jumping pile
  textElevateY: -36
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
    glowColor: string;
    softColor: string;
    coreColor: string;
    badgeClass: string;
  }
> = {
  red: {
    aura: "bg-rose-500/50",
    border: "border-rose-400/50",
    bg: "bg-rose-950/50",
    ring: "ring-rose-500",
    shadow: "shadow-[0_0_38px_rgba(244,63,94,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-rose-400",
    glowColor: "rgba(244, 63, 94, 0.95)",
    softColor: "rgba(239, 68, 68, 0.45)",
    coreColor: "#f43f5e",
    badgeClass: "border-rose-400/80 bg-rose-950/85 text-rose-200"
  },
  blue: {
    aura: "bg-sky-500/50",
    border: "border-sky-400/50",
    bg: "bg-sky-950/50",
    ring: "ring-sky-400",
    shadow: "shadow-[0_0_38px_rgba(56,189,248,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-sky-300",
    glowColor: "rgba(56, 189, 248, 0.95)",
    softColor: "rgba(14, 165, 233, 0.45)",
    coreColor: "#38bdf8",
    badgeClass: "border-sky-400/80 bg-sky-950/85 text-sky-200"
  },
  green: {
    aura: "bg-emerald-500/50",
    border: "border-emerald-400/50",
    bg: "bg-emerald-950/50",
    ring: "ring-emerald-400",
    shadow: "shadow-[0_0_38px_rgba(52,211,153,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-emerald-300",
    glowColor: "rgba(52, 211, 153, 0.95)",
    softColor: "rgba(34, 197, 94, 0.45)",
    coreColor: "#34d399",
    badgeClass: "border-emerald-400/80 bg-emerald-950/85 text-emerald-200"
  },
  yellow: {
    aura: "bg-amber-400/50",
    border: "border-amber-400/50",
    bg: "bg-amber-950/50",
    ring: "ring-amber-400",
    shadow: "shadow-[0_0_38px_rgba(251,191,36,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-amber-300",
    glowColor: "rgba(251, 191, 36, 0.95)",
    softColor: "rgba(234, 179, 8, 0.45)",
    coreColor: "#fbbf24",
    badgeClass: "border-amber-400/80 bg-amber-950/85 text-amber-200"
  },
  wild: {
    aura: "bg-fuchsia-500/50",
    border: "border-fuchsia-400/50",
    bg: "bg-fuchsia-950/50",
    ring: "ring-fuchsia-400",
    shadow: "shadow-[0_0_38px_rgba(217,70,239,0.95),0_0_14px_rgba(255,255,255,0.4)]",
    text: "text-fuchsia-300",
    glowColor: "rgba(217, 70, 239, 0.95)",
    softColor: "rgba(192, 38, 211, 0.45)",
    coreColor: "#e879f9",
    badgeClass: "border-fuchsia-400/80 bg-fuchsia-950/85 text-fuchsia-200"
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
        {isForcedDraw ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: [1, 1.10, 1],
              opacity: 1
            }}
            transition={{
              scale: {
                repeat: Infinity,
                duration: DRAW_PILE_CONFIG.jumpDuration,
                ease: "easeInOut",
                repeatDelay: DRAW_PILE_CONFIG.groundPause
              }
            }}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-black uppercase tracking-[0.28em] select-none border backdrop-blur-md shadow-2xl",
              activeTheme.badgeClass
            )}
            style={{
              boxShadow: `0 0 24px ${activeTheme.glowColor}, 0 0 45px ${activeTheme.softColor}, inset 0 1px 0 rgba(255,255,255,0.4)`
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-80"
                style={{ backgroundColor: activeTheme.coreColor }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: activeTheme.coreColor }}
              />
            </span>
            <span
              className="font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              style={{
                textShadow: `0 0 12px ${activeTheme.glowColor}, 0 0 24px ${activeTheme.glowColor}`
              }}
            >
              DRAW!
            </span>
          </motion.div>
        ) : (
          <p
            className={cn(
              "font-black uppercase tracking-[0.24em] transition-all duration-300 select-none",
              !canDraw && isMyTurn && "text-[0.66rem] text-rose-300/40",
              !canDraw && !isMyTurn && "text-[0.66rem] text-white/25",
              canDraw && "text-[0.66rem] text-white/70"
            )}
          >
            {isMyTurn && !canDraw ? "Can't Draw" : "Draw"}
          </p>
        )}
      </motion.div>

      <div className="relative">
        {/* Pulsing glow aura matching the active card color */}
        {isForcedDraw ? (
          <motion.div
            aria-hidden="true"
            className={cn("pointer-events-none absolute -inset-6 rounded-3xl blur-2xl", activeTheme.aura)}
            animate={{
              opacity: [0.35, 0.92, 0.35],
              scale: [1, 1.22, 1]
            }}
            transition={{
              repeat: Infinity,
              duration: DRAW_PILE_CONFIG.jumpDuration,
              ease: "easeInOut",
              repeatDelay: DRAW_PILE_CONFIG.groundPause
            }}
          />
        ) : null}

        <motion.div
          animate={
            isForcedDraw
              ? {
                  y: [0, DRAW_PILE_CONFIG.jumpHeight, 0],
                  scale: [
                    DRAW_PILE_CONFIG.baseScale,
                    DRAW_PILE_CONFIG.jumpScale,
                    DRAW_PILE_CONFIG.baseScale
                  ]
                }
              : { y: 0, scale: 1 }
          }
          transition={
            isForcedDraw
              ? {
                  repeat: Infinity,
                  duration: DRAW_PILE_CONFIG.jumpDuration,
                  ease: ["easeOut", "easeIn"],
                  repeatDelay: DRAW_PILE_CONFIG.groundPause
                }
              : { duration: 0.25, ease: "easeOut" }
          }
          {...(canDraw && !isForcedDraw
            ? {
                whileHover: {
                  scale: DRAW_PILE_CONFIG.hoverScale,
                  transition: { duration: 0.2, ease: "easeOut" }
                }
              }
            : {})}
          className={cn(
            "relative transition-opacity duration-300",
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
