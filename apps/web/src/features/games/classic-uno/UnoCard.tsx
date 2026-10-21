"use client";

import type * as React from "react";
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
  style?: React.CSSProperties;
  liftOnHover?: boolean;
  onClick?: (() => void) | undefined;
}) {
  const clickable = Boolean(onClick);
  const asset = resolveCardAsset({ card, theme, faceDown });
  const label = faceDown || !card ? "Card back" : `${card.color} ${card.value.replaceAll("_", " ")}`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "group relative isolate shrink-0 overflow-visible rounded-xl bg-transparent outline-none transition-transform duration-100 disabled:pointer-events-none",
        compact ? "h-24 w-16" : "h-32 w-[5.4rem] sm:h-36 sm:w-24",
        playable && "ring-4 ring-lime-300/90 ring-offset-2 ring-offset-emerald-950",
        clickable ? "cursor-pointer" : "cursor-default",
        clickable && liftOnHover && "enabled:hover:-translate-y-1 enabled:active:scale-[0.98]",
        className
      )}
      style={style}
      {...(onClick ? { onClick } : {})}
      disabled={!clickable}
    >
      <span className="pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 transition-opacity duration-100 group-hover:opacity-30" style={{ backgroundColor: asset.accent }} />
      <SpriteCard card={card} theme={theme} faceDown={faceDown} className="relative z-10" />
      {playable ? <span className="absolute inset-x-3 -bottom-1 h-1 rounded-full" style={{ backgroundColor: asset.accent }} /> : null}
    </button>
  );
}
