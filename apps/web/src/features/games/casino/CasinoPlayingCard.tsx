"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

const SUIT_FILES: Record<string, string> = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs",
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs"
};

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

  let suit = "";
  let rank = "";
  if (!isHidden && card) {
    suit = card.slice(-1);
    rank = card.slice(0, -1);
  }

  const suitFile = SUIT_FILES[suit] ?? "";
  const isRed = suit === "♥" || suit === "♦" || suit === "h" || suit === "d";

  const candidates = useMemo(() => {
    if (!rank || !suitFile) return [];
    return [
      `/game-assets/twenty-nine/cards/${rank}_of_${suitFile}.png`,
      `/game-assets/twenty-nine/${rank}_of_${suitFile}.png`,
      `/game-assets/29/cards/${rank}_of_${suitFile}.png`
    ];
  }, [rank, suitFile]);

  const [imgIndex, setImgIndex] = useState(0);

  // Always reset candidate index whenever the card or hidden status changes
  useEffect(() => {
    setImgIndex(0);
  }, [card, hidden]);

  const sizeClasses = {
    xs: "w-9 h-13 rounded-md text-[9px]",
    sm: "w-12 h-17 sm:w-14 sm:h-20 rounded-lg text-xs",
    md: "w-15 h-22 sm:w-17 sm:h-25 rounded-xl text-sm",
    lg: "w-20 h-29 sm:w-24 sm:h-35 rounded-2xl text-base",
    xl: "w-24 h-35 sm:w-28 sm:h-41 rounded-2xl text-lg"
  }[size];

  return (
    <motion.div
      layout
      whileHover={onClick ? { scale: 1.06, y: -4 } : {}}
      onClick={onClick}
      className={`relative select-none shrink-0 overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.55)] border border-slate-300/40 transition-all ${sizeClasses} ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        background: isHidden
          ? "linear-gradient(135deg, #881337 0%, #4c0519 100%)"
          : "#ffffff"
      }}
    >
      {isHidden ? (
        <div className="relative flex h-full w-full items-center justify-center p-0.5">
          <img
            src="/game-assets/twenty-nine/cards/back.png"
            alt="Card Back"
            draggable={false}
            className="h-full w-full object-cover rounded-[inherit]"
          />
          {/* Subtle gold foil emblem overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-amber-300/40 text-xs sm:text-sm font-black drop-shadow">
              ♠
            </span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center bg-white rounded-[inherit] overflow-hidden">
          {candidates.length > 0 && imgIndex < candidates.length ? (
            <img
              key={candidates[imgIndex]}
              src={candidates[imgIndex]}
              alt={`${rank} of ${suitFile}`}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none p-0.5"
              onError={() => setImgIndex((prev) => prev + 1)}
            />
          ) : null}

          {/* Procedural fallback only if image candidates are exhausted */}
          {imgIndex >= candidates.length && (
            <div
              className={`flex h-full w-full flex-col justify-between p-1 font-black ${
                isRed ? "text-rose-600" : "text-slate-950"
              }`}
            >
              <div className="flex items-center justify-between text-xs leading-none">
                <span>{rank}</span>
                <span>{suit}</span>
              </div>
              <span className="self-center text-lg">{suit}</span>
              <div className="flex items-center justify-between text-xs leading-none rotate-180">
                <span>{rank}</span>
                <span>{suit}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Glossy card sheen overlay */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
    </motion.div>
  );
}
