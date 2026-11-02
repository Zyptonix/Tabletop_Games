"use client";

import { motion } from "framer-motion";
import { Bot, Crown } from "lucide-react";
import type { PublicTwentyNinePlayer } from "@tabletop/game-core";
import type { RoomPlayerView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string) {
  const parts = name.split(/\s+/).map((p) => p.trim()).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials || "P";
}

export function TwentyNineSeat({
  player,
  roomPlayer,
  roleLabel,
  isDealer = false,
  isDeclarer = false,
  isSingleHand = false,
  isSittingOut = false,
  bidStatus,
  isHighestBidder = false,
  hasPassed = false,
  className
}: {
  player: PublicTwentyNinePlayer;
  roomPlayer?: RoomPlayerView | undefined;
  roleLabel?: string | undefined;
  isDealer?: boolean | undefined;
  isDeclarer?: boolean | undefined;
  isSingleHand?: boolean | undefined;
  isSittingOut?: boolean | undefined;
  bidStatus?: string | undefined;
  isHighestBidder?: boolean | undefined;
  hasPassed?: boolean | undefined;
  className?: string | undefined;
}) {
  const isRed = player.team === 0;
  const connected = roomPlayer?.connected ?? true;
  const isBot = roomPlayer?.isBot ?? false;
  const avatarUrl = roomPlayer?.avatarUrl ?? null;
  const isCurrentTurn = Boolean(player.isCurrentTurn);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center transition-all duration-300 select-none",
        isSittingOut && "opacity-50 grayscale",
        hasPassed && !isSittingOut && "opacity-65",
        className
      )}
    >
      {/* Role / Compass Tag Above Avatar */}
      <div
        className={cn(
          "mb-1 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-wider shadow-md backdrop-blur-md border",
          isHighestBidder
            ? "border-amber-400 bg-amber-500/30 text-amber-200 ring-2 ring-amber-400/50"
            : isRed
            ? "border-rose-400/40 bg-rose-950/80 text-rose-200"
            : "border-sky-400/40 bg-sky-950/80 text-sky-200"
        )}
      >
        <span>{roleLabel ?? (isRed ? "Team Red" : "Team Blue")}</span>
      </div>

      {/* Circular Avatar Container with Active Turn Halo */}
      <div className="relative">
        {/* Pulsing Turn / Highest Bidder Halo */}
        {isHighestBidder ? (
          <motion.div
            className="absolute -inset-2.5 rounded-full blur-md bg-amber-400/80"
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.14, 0.98] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : isCurrentTurn ? (
          <motion.div
            className={cn(
              "absolute -inset-2 rounded-full blur-md",
              isRed ? "bg-rose-500/60" : "bg-sky-400/60"
            )}
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {/* Circular Avatar Frame */}
        <div
          className={cn(
            "relative grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full border-2 shadow-2xl transition-all duration-300 overflow-hidden",
            isHighestBidder
              ? "border-amber-300 ring-4 ring-amber-400/90 bg-black/75 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.75)]"
              : isCurrentTurn
              ? "border-amber-300 ring-4 ring-amber-400/40 bg-black/60 scale-105"
              : isRed
              ? "border-rose-400/70 bg-gradient-to-br from-rose-950 to-slate-950"
              : "border-sky-400/70 bg-gradient-to-br from-sky-950 to-slate-950"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={player.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              {isBot ? (
                <Bot className={cn("h-6 w-6 sm:h-7 sm:w-7", isRed ? "text-rose-200" : "text-sky-200")} />
              ) : (
                <span className="text-sm sm:text-base font-black text-white">
                  {getInitials(player.displayName)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Highest Bidder Crown or Declarer Crown Badge */}
        {isHighestBidder ? (
          <div
            className="absolute -top-2 -right-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-200 text-black shadow-[0_0_12px_rgba(251,191,36,0.95)] ring-2 ring-black animate-bounce"
            title="Winning the Bid"
          >
            <Crown className="h-3.5 w-3.5 fill-amber-950 text-amber-950" />
          </div>
        ) : isDeclarer ? (
          <div
            className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg ring-2 ring-black"
            title="Declarer"
          >
            <Crown className="h-3 w-3 fill-amber-950 text-amber-950" />
          </div>
        ) : null}

        {/* Dealer Marker */}
        {isDealer ? (
          <div className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[0.62rem] font-black text-amber-950 shadow-md ring-2 ring-black">
            D
          </div>
        ) : null}

        {/* Online Status Dot */}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black",
            connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-neutral-600"
          )}
        />
      </div>

      {/* Name and Status Pill Below Avatar */}
      <div className="mt-1 flex flex-col items-center text-center">
        <span className="text-xs font-black text-white max-w-[6.5rem] truncate" title={player.displayName}>
          {player.displayName}
        </span>

        {/* Status Badge (Highest Bid, Pass, Outbid, Turn indicator, or Tricks) */}
        {isHighestBidder ? (
          <div className="mt-1 flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]">
            <Crown className="h-3 w-3 fill-black text-black shrink-0" />
            <span>High: {bidStatus}</span>
          </div>
        ) : hasPassed ? (
          <span className="mt-0.5 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-white/40">
            Passed
          </span>
        ) : bidStatus ? (
          <span
            className={cn(
              "mt-0.5 rounded-full px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider border shadow-sm",
              bidStatus.toLowerCase().includes("pass")
                ? "border-white/10 bg-black/60 text-white/40"
                : bidStatus.toLowerCase().includes("outbid")
                ? "border-white/15 bg-black/50 text-white/60"
                : "border-amber-400/50 bg-amber-500/20 text-amber-300"
            )}
          >
            {bidStatus}
          </span>
        ) : isCurrentTurn ? (
          <span className="mt-0.5 rounded-full border border-amber-400/60 bg-amber-500/20 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-amber-300 animate-pulse">
            Thinking…
          </span>
        ) : player.tricksWon > 0 ? (
          <span className="mt-0.5 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[0.58rem] font-bold text-white/60">
            {player.tricksWon} trick{player.tricksWon === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
