"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const SUIT_FILES: Record<string, string> = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs"
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
  const [failed, setFailed] = useState(false);

  const isHidden = hidden || !card || card === "hidden";
  const suit = !isHidden && card ? card.slice(-1) : "";
  const rank = !isHidden && card ? card.slice(0, -1) : "";
  const suitFile = SUIT_FILES[suit];
  const isRed = suit === "♥" || suit === "♦";

  const sizeClasses = {
    xs: "w-8 h-12 rounded-sm text-[9px]",
    sm: "w-11 h-16 rounded-md text-xs",
    md: "w-14 h-20 sm:w-16 sm:h-24 rounded-lg text-sm",
    lg: "w-20 h-28 sm:w-24 sm:h-34 rounded-xl text-base",
    xl: "w-24 h-34 sm:w-28 sm:h-40 rounded-2xl text-lg"
  }[size];

  const asset = `/game-assets/twenty-nine/cards/${rank}_of_${suitFile}.png`;
  const backAsset = "/game-assets/twenty-nine/cards/back.png";

  return (
    <motion.div
      layout
      whileHover={onClick ? { scale: 1.06, y: -4 } : {}}
      onClick={onClick}
      className={`relative select-none shrink-0 overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/20 transition-all ${sizeClasses} ${
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
            src={backAsset}
            alt="Card Back"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-fill rounded-[inherit]"
          />
          {/* Subtle gold foil emblem overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-amber-300/40 text-xs sm:text-sm font-black drop-shadow">
              ♠
            </span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center bg-white">
          {!failed && suitFile ? (
            <img
              src={asset}
              alt={`${rank} of ${suitFile}`}
              draggable={false}
              onError={() => setFailed(true)}
              className="h-full w-full object-fill rounded-[inherit]"
            />
          ) : (
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
