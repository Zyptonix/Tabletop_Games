"use client";

import type * as React from "react";
import { motion, type MotionStyle } from "framer-motion";
import { SpriteCard } from "@/components/cards/SpriteCard";
import { resolveCardAsset, type RenderableCard } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";
import type { CardThemeId } from "./cardThemes";

export function UnoCard({
  card,
  playable = false,
  compact = false,
  faceDown = false,
  theme = "classic",
  className,
  style,
  liftOnHover = true,
  onClick
}: {
  card?: RenderableCard | undefined;
  playable?: boolean;
  compact?: boolean;
  faceDown?: boolean;
  theme?: CardThemeId;
  className?: string;
  style?: MotionStyle | React.CSSProperties;
  liftOnHover?: boolean;
  onClick?: (() => void) | undefined;
}) {
  const clickable = Boolean(onClick);
  const asset = resolveCardAsset({ card, theme, faceDown });
  const label = faceDown || !card ? "Card back" : `${card.color} ${card.value.replaceAll("_", " ")}`;

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "group relative isolate shrink-0 overflow-visible rounded-xl bg-transparent outline-none transition disabled:pointer-events-none",
        compact ? "h-24 w-16" : "h-32 w-[5.4rem] sm:h-36 sm:w-24",
        playable && "ring-4 ring-lime-300/90 ring-offset-2 ring-offset-emerald-950",
        clickable ? "cursor-pointer" : "cursor-default",
        className
      )}
      {...(style ? { style: style as MotionStyle } : {})}
      {...(onClick ? { onClick } : {})}
      disabled={!clickable}
      {...(clickable && liftOnHover
        ? { whileHover: { y: compact ? -4 : -14, rotate: compact ? 0 : -2 }, whileTap: { scale: 0.96 } }
        : clickable
          ? { whileTap: { scale: 0.96 } }
          : {})}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <span
        className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-lg transition group-hover:opacity-70"
        style={{ backgroundColor: asset.accent }}
      />
      <SpriteCard
        card={card}
        theme={theme}
        faceDown={faceDown}
        className="relative z-10 drop-shadow-[0_18px_22px_rgb(0_0_0_/_0.42)]"
      />
      {playable ? (
        <span
          className="absolute inset-x-3 -bottom-1 h-1 rounded-full shadow-[0_0_18px_currentColor]"
          style={{ backgroundColor: asset.accent, color: asset.accent }}
        />
      ) : null}
    </motion.button>
  );
}