"use client";

import { useMemo, useState } from "react";
import type { TwentyNineCard as CardType, TwentyNineSuit } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";

export const TWENTY_NINE_SUITS_INFO: Record<
  TwentyNineSuit,
  { suit: TwentyNineSuit; color: string; label: string; symbol: string }
> = {
  spades: { suit: "spades", color: "#1e293b", label: "Spades", symbol: "♠" },
  hearts: { suit: "hearts", color: "#e11d48", label: "Hearts", symbol: "♥" },
  diamonds: { suit: "diamonds", color: "#e11d48", label: "Diamonds", symbol: "♦" },
  clubs: { suit: "clubs", color: "#1e293b", label: "Clubs", symbol: "♣" }
};

export function SuitMark({
  suit,
  color,
  size = 24,
  className
}: {
  suit: TwentyNineSuit;
  color?: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<TwentyNineSuit, string> = {
    spades:
      "M24 3 C19 11 5 17 5 28 C5 37 14 40 21 33 C20 39 18 43 14 45 H34 C30 43 28 39 27 33 C34 40 43 37 43 28 C43 17 29 11 24 3 Z",
    hearts:
      "M24 43 C20 39 5 27 5 16 C5 7 16 4 24 14 C32 4 43 7 43 16 C43 27 28 39 24 43 Z",
    diamonds:
      "M24 3 C30 13 39 22 43 24 C36 31 29 39 24 45 C19 39 12 31 5 24 C12 17 19 9 24 3 Z",
    clubs:
      "M24 5 C15 5 11 16 18 22 C8 17 3 23 3 29 C3 38 15 40 22 32 C21 39 18 43 14 45 H34 C30 43 27 39 26 32 C33 40 45 38 45 29 C45 23 40 17 30 22 C37 16 33 5 24 5 Z"
  };

  const ink = color ?? TWENTY_NINE_SUITS_INFO[suit]?.color ?? "currentColor";

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      style={{ color: ink }}
    >
      <path d={paths[suit]} fill="currentColor" />
    </svg>
  );
}

export function CardSpriteImage({
  rank,
  suit,
  className
}: {
  rank: string;
  suit: TwentyNineSuit;
  className?: string;
}) {
  const filename = `${rank}_of_${suit}.png`;
  const candidates = useMemo(
    () => [
      `/game-assets/twenty-nine/cards/${filename}`,
      `/game-assets/twenty-nine/${filename}`,
      `/game-assets/29/cards/${filename}`
    ],
    [filename]
  );
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return null;
  }

  return (
    <img
      src={candidates[index]}
      alt={`${rank} of ${suit}`}
      draggable={false}
      className={cn("pointer-events-none select-none object-contain", className)}
      onError={() => setIndex((curr) => curr + 1)}
    />
  );
}

export function TwentyNineCardBack({
  className,
  small = false
}: {
  className?: string;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-emerald-400/30 bg-[linear-gradient(145deg,#064e3b,#022c22_60%,#011713)] shadow-[0_8px_20px_rgba(0,0,0,0.5)]",
        small ? "h-[4.2rem] w-[3rem]" : "h-[6.2rem] w-[4.4rem]",
        className
      )}
    >
      {!failed ? (
        <img
          src="/game-assets/twenty-nine/cards/back.png"
          alt="Card back"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
          <div className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2 py-1">
            <span className="text-sm font-black tracking-widest text-emerald-200">29</span>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
    </div>
  );
}

export function TwentyNineCardFace({
  card,
  size = "md",
  playable = false,
  muted = false,
  isWinning = false,
  className
}: {
  card: CardType;
  size?: "sm" | "md" | "lg";
  playable?: boolean;
  muted?: boolean;
  isWinning?: boolean;
  className?: string;
}) {
  const suitInfo = TWENTY_NINE_SUITS_INFO[card.suit] ?? TWENTY_NINE_SUITS_INFO.spades;
  const isRed = card.suit === "hearts" || card.suit === "diamonds";

  const sizeClasses = {
    sm: "h-[4.8rem] w-[3.4rem] rounded-lg",
    md: "h-[6.6rem] w-[4.7rem] rounded-xl",
    lg: "h-[8.8rem] w-[6.2rem] rounded-2xl"
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 select-none flex-col justify-between overflow-hidden border bg-white text-slate-900 shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-200",
        sizeClasses[size],
        muted && "opacity-45 grayscale",
        playable && "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.55)] cursor-pointer",
        isWinning && "ring-2 ring-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.65)]",
        className
      )}
    >
      {/* Real PNG Sprite */}
      <CardSpriteImage
        rank={card.rank}
        suit={card.suit}
        className="absolute inset-0 z-10 h-full w-full object-cover"
      />

      {/* Procedural Fallback Face */}
      <div className="absolute inset-0 z-0 flex flex-col justify-between p-1.5 bg-[linear-gradient(145deg,#ffffff,#f1f5f9)]">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-black", isRed ? "text-rose-600" : "text-slate-900")}>
            {card.rank}
          </span>
          <SuitMark suit={card.suit} size={14} />
        </div>

        <div className="flex items-center justify-center">
          <SuitMark suit={card.suit} size={size === "sm" ? 22 : size === "md" ? 28 : 36} />
        </div>

        <div className="flex items-end justify-between">
          {card.points > 0 ? (
            <span className="rounded bg-amber-400/20 px-1 text-[0.55rem] font-black text-amber-800">
              {card.points}P
            </span>
          ) : (
            <span />
          )}
          <span className={cn("text-xs font-black", isRed ? "text-rose-600" : "text-slate-900")}>
            {card.rank}
          </span>
        </div>
      </div>

      {/* Point badge pill if points > 0 */}
      {card.points > 0 ? (
        <span className="absolute bottom-1 left-1 z-20 rounded bg-black/75 px-1 py-0.2 text-[0.58rem] font-black text-amber-300 backdrop-blur-sm border border-amber-400/30">
          +{card.points}
        </span>
      ) : null}

      {/* Playable Aura Overlay */}
      {playable ? (
        <div className="pointer-events-none absolute inset-0 z-30 bg-emerald-400/10 ring-2 ring-emerald-400/80 rounded-[inherit]" />
      ) : null}
    </div>
  );
}

