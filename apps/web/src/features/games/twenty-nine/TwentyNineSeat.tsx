"use client";

import { motion } from "framer-motion";
import { Bot, Crown, Shield, Trophy } from "lucide-react";
import type { PublicTwentyNinePlayer, TwentyNineTeam } from "@tabletop/game-core";
import type { RoomPlayerView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";
import { TwentyNineCardBack } from "./TwentyNineCard";

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "P";
}

export function TwentyNineSeat({
  player,
  roomPlayer,
  isDealer = false,
  isDeclarer = false,
  isSingleHand = false,
  isSittingOut = false,
  bidStatus,
  compact = false,
  className
}: {
  player: PublicTwentyNinePlayer;
  roomPlayer?: RoomPlayerView | undefined;
  isDealer?: boolean;
  isDeclarer?: boolean;
  isSingleHand?: boolean;
  isSittingOut?: boolean;
  bidStatus?: string | undefined;
  compact?: boolean;
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
        "relative isolate flex flex-col justify-between rounded-2xl border text-white backdrop-blur-xl transition-all duration-300",
        compact ? "min-w-[9.5rem] p-2.5" : "min-w-[11.5rem] max-w-[14rem] p-3",
        // Active Turn Highlight
        isCurrentTurn
          ? isRed
            ? "border-2 border-rose-400 bg-[linear-gradient(135deg,rgba(225,29,72,0.35),rgba(159,18,57,0.85)_50%,rgba(10,5,12,0.95))] scale-[1.02] shadow-[0_0_35px_rgba(244,63,94,0.65),0_12px_36px_rgba(0,0,0,0.6)]"
            : "border-2 border-sky-400 bg-[linear-gradient(135deg,rgba(14,165,233,0.35),rgba(2,132,199,0.85)_50%,rgba(5,10,24,0.95))] scale-[1.02] shadow-[0_0_35px_rgba(56,189,248,0.65),0_12px_36px_rgba(0,0,0,0.6)]"
          : isRed
          ? "border-rose-500/20 bg-[linear-gradient(135deg,rgba(38,10,18,0.92),rgba(18,5,10,0.86)_60%,rgba(5,2,4,0.9))] shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          : "border-sky-500/20 bg-[linear-gradient(135deg,rgba(8,24,42,0.92),rgba(4,14,28,0.86)_60%,rgba(2,4,8,0.9))] shadow-[0_12px_28px_rgba(0,0,0,0.5)]",
        isSittingOut && "opacity-60 grayscale",
        className
      )}
    >
      {/* Active Turn Neon Aura */}
      {isCurrentTurn ? (
        <>
          <motion.div
            className={cn(
              "pointer-events-none absolute -inset-2 rounded-[2rem] blur-xl",
              isRed ? "bg-rose-500/35" : "bg-sky-400/35"
            )}
            animate={{ opacity: [0.65, 1, 0.65], scale: [0.99, 1.025, 0.99] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[inherit] ring-1",
              isRed ? "ring-rose-300/60" : "ring-sky-300/60"
            )}
          />
        </>
      ) : null}

      {/* Top Header: Avatar, Name & Team */}
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div
            className={cn(
              "grid place-items-center rounded-full border text-xs font-black shadow-inner",
              compact ? "h-9 w-9" : "h-10 w-10",
              isCurrentTurn
                ? "border-2 border-white bg-black/45 text-white"
                : isRed
                ? "border-rose-400/40 bg-rose-950/60 text-rose-100"
                : "border-sky-400/40 bg-sky-950/60 text-sky-100"
            )}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={player.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{getInitials(player.displayName)}</span>
            )}
          </div>

          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black",
              connected
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : "bg-neutral-500"
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-black text-white" title={player.displayName}>
              {player.displayName}
            </span>
            {isBot ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 py-0.2 text-[0.55rem] font-bold text-sky-200">
                <Bot className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.58rem] font-black uppercase tracking-wider">
            <span
              className={cn(
                "rounded px-1.5 py-0.2",
                isRed
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              )}
            >
              {isRed ? "Team Red" : "Team Blue"}
            </span>
            <span className="text-white/40">· S{player.seat + 1}</span>
          </div>
        </div>
      </div>

      {/* Role & Status Row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {isCurrentTurn ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-white shadow-sm",
              isRed ? "bg-rose-600 border border-rose-300/60" : "bg-sky-600 border border-sky-300/60"
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 bg-white" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            <span>Turn</span>
          </div>
        ) : null}

        {isDealer ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.2 text-[0.58rem] font-black text-amber-200">
            🃏 Dealer
          </span>
        ) : null}

        {isDeclarer ? (
          <span className="rounded-full border border-yellow-400/50 bg-yellow-500/25 px-2 py-0.2 text-[0.58rem] font-black text-yellow-200 flex items-center gap-0.5">
            <Crown className="h-2.5 w-2.5" /> Declarer
          </span>
        ) : null}

        {isSingleHand ? (
          <span className="rounded-full border border-violet-400/50 bg-violet-500/25 px-2 py-0.2 text-[0.58rem] font-black text-violet-200">
            🗡️ Solo Hand
          </span>
        ) : null}

        {isSittingOut ? (
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.2 text-[0.58rem] font-bold text-white/60">
            Sitting out
          </span>
        ) : null}

        {bidStatus ? (
          <span className="rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.2 text-[0.6rem] font-black text-amber-100">
            {bidStatus}
          </span>
        ) : null}
      </div>

      {/* Bottom Card Fan & Tricks Won */}
      <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-white/10 pt-2">
        {/* Fan of Mini Card Backs */}
        <div className="flex items-end -space-x-4 pl-0.5">
          {Array.from({ length: Math.min(player.handCount, 5) }).map((_, idx) => (
            <motion.div
              key={idx}
              className="origin-bottom"
              initial={false}
              animate={{ rotate: (idx - 2) * 4, y: isCurrentTurn ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              style={{ zIndex: idx }}
            >
              <TwentyNineCardBack small className="h-[3rem] w-[2.1rem]" />
            </motion.div>
          ))}
          {player.handCount > 5 ? (
            <span className="pl-1 text-[0.62rem] font-black text-white/50">+{player.handCount - 5}</span>
          ) : null}
        </div>

        {/* Card count & tricks badge */}
        <div className="text-right">
          <span className="inline-block rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[0.62rem] font-black text-white/80">
            {player.handCount} {player.handCount === 1 ? "card" : "cards"}
          </span>
          {player.tricksWon > 0 ? (
            <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[0.58rem] font-black text-amber-300">
              <Trophy className="h-2.5 w-2.5" />
              <span>{player.tricksWon} tricks</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

