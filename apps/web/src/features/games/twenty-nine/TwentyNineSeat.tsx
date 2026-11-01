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
  className
}: {
  player: PublicTwentyNinePlayer;
  roomPlayer?: RoomPlayerView | undefined;
  roleLabel?: string | undefined;
  isDealer?: boolean;
  isDeclarer?: boolean;
  isSingleHand?: boolean;
  isSittingOut?: boolean;
  bidStatus?: string | undefined;
  className?: string;
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
        className
      )}
    >
      {/* Role / Compass Tag Above Avatar */}
      <div
        className={cn(
          "mb-1 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-wider shadow-md backdrop-blur-md border",
          isRed
            ? "border-rose-400/40 bg-rose-950/80 text-rose-200"
            : "border-sky-400/40 bg-sky-950/80 text-sky-200"
        )}
      >
        <span>{roleLabel ?? (isRed ? "Team Red" : "Team Blue")}</span>
      </div>

      {/* Circular Avatar Container with Active Turn Halo */}
      <div className="relative">
        {/* Pulsing Turn Halo */}
        {isCurrentTurn ? (
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
            isCurrentTurn
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

        {/* Declarer Crown Badge */}
        {isDeclarer ? (
          <div className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg ring-2 ring-black">
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

        {/* Status Badge (Pass, Bid, or Turn indicator) */}
        {bidStatus ? (
          <span
            className={cn(
              "mt-0.5 rounded-full px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider border shadow-sm",
              bidStatus.toLowerCase().includes("pass")
                ? "border-white/10 bg-black/60 text-white/50"
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
