"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

const SUIT_TO_NAME: Record<string, string> = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs",
  spades: "spades",
  hearts: "hearts",
  diamonds: "diamonds",
  clubs: "clubs",
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs"
};

function parseCard(cardStr?: string | null): { rank: string; suit: string; suitName: string; isRed: boolean } {
  if (!cardStr || cardStr === "hidden") {
    return { rank: "", suit: "", suitName: "", isRed: false };
  }
  const clean = cardStr.trim();
  const suit = clean.slice(-1);
  const rank = clean.slice(0, -1);
  const suitName = SUIT_TO_NAME[suit] ?? "";
  const isRed = suit === "♥" || suit === "♦" || suitName === "hearts" || suitName === "diamonds";
  return { rank, suit, suitName, isRed };
}

export function CasinoPlayingCard({
  card,
  hidden = false,
  size = "md",
  peek = false,
  className = "",
  onClick
}: {
  card?: string | null;
  hidden?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  peek?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const isHidden = hidden || !card || card === "hidden";
  const { rank, suit, suitName, isRed } = parseCard(card);

  const candidates = useMemo(() => {
    if (isHidden || !rank || !suitName) return [];
    return [
      `/game-assets/twenty-nine/cards/${rank}_of_${suitName}.png`,
      `/game-assets/twenty-nine/${rank}_of_${suitName}.png`,
      `/game-assets/29/cards/${rank}_of_${suitName}.png`
    ];
  }, [isHidden, rank, suitName]);

  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0);
  }, [card, hidden]);

  // Guaranteed, rock-solid pixel dimensions (prevents any natural-image blowup)
  const sizeConfig: Record<
    "xs" | "sm" | "md" | "lg" | "xl",
    { width: string; height: string; rounded: string; textClass: string }
  > = {
    xs: { width: "2.5rem", height: "3.6rem", rounded: "rounded-md", textClass: "text-[9px]" },
    sm: { width: "3.3rem", height: "4.7rem", rounded: "rounded-lg", textClass: "text-[10px]" },
    md: { width: "4.2rem", height: "6.0rem", rounded: "rounded-xl", textClass: "text-xs" },
    lg: { width: "5.2rem", height: "7.4rem", rounded: "rounded-xl", textClass: "text-sm" },
    xl: { width: "6.5rem", height: "9.2rem", rounded: "rounded-2xl", textClass: "text-base" }
  };

  const currentSize = sizeConfig[size] ?? sizeConfig.md;

  return (
    <motion.div
      layout
      whileHover={onClick ? { scale: 1.06, y: -4 } : {}}
      onClick={onClick}
      className={`relative select-none shrink-0 overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.6)] border border-slate-300/40 bg-white transition-all ${currentSize.rounded} ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        width: currentSize.width,
        height: currentSize.height,
        minWidth: currentSize.width,
        minHeight: currentSize.height,
        maxWidth: currentSize.width,
        maxHeight: currentSize.height
      }}
    >
      {isHidden ? (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#7f1d1d]">
          <img
            src="/game-assets/twenty-nine/cards/back.png"
            alt="Card Back"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          />
          {/* Subtle gold foil emblem overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-amber-300/40 text-xs sm:text-sm font-black drop-shadow">
              ♠
            </span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center bg-white overflow-hidden">
          {/* Real High-Resolution Playing Card PNG Sprite */}
          {candidates.length > 0 && imgIndex < candidates.length ? (
            <img
              key={candidates[imgIndex]}
              src={candidates[imgIndex]}
              alt={`${rank} of ${suitName}`}
              draggable={false}
              className="absolute inset-0 z-10 h-full w-full object-cover select-none pointer-events-none"
              onError={() => setImgIndex((prev) => prev + 1)}
            />
          ) : null}

          {/* Procedural fallback face rendered underneath or as backup */}
          <div
            className={`absolute inset-0 z-0 flex h-full w-full flex-col justify-between p-1 font-black ${
              isRed ? "text-rose-600" : "text-slate-950"
            } ${currentSize.textClass}`}
          >
            <div className="flex items-center justify-between leading-none">
              <span>{rank}</span>
              <span>{suit}</span>
            </div>
            <span className="self-center text-base sm:text-lg leading-none">{suit}</span>
            <div className="flex items-center justify-between leading-none rotate-180">
              <span>{rank}</span>
              <span>{suit}</span>
            </div>
          </div>
        </div>
      )}

      {/* Glossy card sheen overlay */}
      <span className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
    </motion.div>
  );
}
