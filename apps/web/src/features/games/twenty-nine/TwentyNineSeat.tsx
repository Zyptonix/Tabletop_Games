"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Crown, Gavel, Sparkles, Star } from "lucide-react";
import type { PublicTwentyNinePlayer } from "@tabletop/game-core";
import type { RoomPlayerView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";
import { TwentyNineCardBack } from "./TwentyNineCard";

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
  contractTarget,
  isSingleHand = false,
  isSittingOut = false,
  bidStatus,
  isHighestBidder = false,
  hasPassed = false,
  fanSide = "right",
  className
}: {
  player: PublicTwentyNinePlayer;
  roomPlayer?: RoomPlayerView | undefined;
  roleLabel?: string | undefined;
  isDealer?: boolean | undefined;
  isDeclarer?: boolean | undefined;
  contractTarget?: number | null | undefined;
  isSingleHand?: boolean | undefined;
  isSittingOut?: boolean | undefined;
  bidStatus?: string | undefined;
  isHighestBidder?: boolean | undefined;
  hasPassed?: boolean | undefined;
  fanSide?: "left" | "right";
  className?: string | undefined;
}) {
  const isRed = player.team === 0;
  const connected = roomPlayer?.connected ?? true;
  const isBot = roomPlayer?.isBot ?? false;
  const avatarUrl = roomPlayer?.avatarUrl ?? null;
  const isCurrentTurn = Boolean(player.isCurrentTurn);
  const handCount = player.handCount ?? (player.hand?.length ?? 0);

  return (
    <div
      className={cn(
        "relative isolate overflow-visible select-none transition-all duration-300 rounded-[1.4rem] border backdrop-blur-xl",
        isHighestBidder
          ? "border-2 border-amber-400 bg-[linear-gradient(135deg,rgba(217,119,6,0.5),rgba(40,20,5,0.85)_45%,rgba(0,0,0,0.8)_100%)] shadow-[0_0_30px_rgba(245,158,11,0.5),0_12px_28px_rgba(0,0,0,0.6)]"
          : isDeclarer
          ? isCurrentTurn
            ? "border-2 border-amber-300 bg-[linear-gradient(135deg,rgba(217,119,6,0.6),rgba(50,20,5,0.9)_45%,rgba(0,0,0,0.9)_100%)] shadow-[0_0_36px_rgba(245,158,11,0.75),0_12px_28px_rgba(0,0,0,0.6)] ring-2 ring-amber-400/60"
            : "border-2 border-amber-400/80 bg-[linear-gradient(135deg,rgba(180,83,9,0.45),rgba(40,16,4,0.85)_45%,rgba(0,0,0,0.85)_100%)] shadow-[0_0_24px_rgba(245,158,11,0.5),0_10px_24px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/40"
          : isCurrentTurn
          ? isRed
            ? "border-2 border-rose-500 bg-[linear-gradient(135deg,rgba(225,29,72,0.55),rgba(50,10,20,0.85)_45%,rgba(0,0,0,0.8)_100%)] shadow-[0_0_32px_rgba(244,63,94,0.6),0_12px_28px_rgba(0,0,0,0.6)]"
            : "border-2 border-sky-400 bg-[linear-gradient(135deg,rgba(2,132,199,0.55),rgba(10,30,50,0.85)_45%,rgba(0,0,0,0.8)_100%)] shadow-[0_0_32px_rgba(56,189,248,0.6),0_12px_28px_rgba(0,0,0,0.6)]"
          : isRed
          ? "border-rose-400/30 bg-[linear-gradient(135deg,rgba(136,19,55,0.4),rgba(20,5,10,0.75)_50%,rgba(0,0,0,0.75)_100%)] shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
          : "border-sky-400/30 bg-[linear-gradient(135deg,rgba(12,74,110,0.4),rgba(5,15,25,0.75)_50%,rgba(0,0,0,0.75)_100%)] shadow-[0_10px_24px_rgba(0,0,0,0.5)]",
        isSittingOut && "opacity-50 grayscale",
        hasPassed && !isSittingOut && !isHighestBidder && "opacity-75",
        "p-2.5 sm:p-3 min-w-[13.5rem]",
        className
      )}
    >
      {/* Pulsing Luminous Halo for Active Turn / Highest Bidder / Declarer */}
      {isHighestBidder ? (
        <motion.div
          className="pointer-events-none absolute -inset-2 rounded-[1.8rem] blur-xl bg-amber-400/40"
          animate={{ opacity: [0.65, 1, 0.65], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : isDeclarer ? (
        <motion.div
          className="pointer-events-none absolute -inset-2 rounded-[1.8rem] blur-xl bg-amber-400/35"
          animate={{ opacity: isCurrentTurn ? [0.75, 1, 0.75] : [0.45, 0.8, 0.45], scale: [0.98, 1.025, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : isCurrentTurn ? (
        <motion.div
          className={cn(
            "pointer-events-none absolute -inset-2 rounded-[1.8rem] blur-xl",
            isRed ? "bg-rose-500/40" : "bg-sky-400/40"
          )}
          animate={{ opacity: [0.6, 1, 0.6], scale: [0.98, 1.025, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {/* UNO-Style Full Seat Overlay for Bidding & Actions (Semi-transparent & covers card fan) */}
      <AnimatePresence>
        {isHighestBidder || (bidStatus && bidStatus !== "Passed") ? (
          <motion.div
            key={isHighestBidder ? "highest" : bidStatus}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={cn(
              "absolute -top-2 -bottom-2 z-30 flex flex-col items-center justify-center rounded-[1.6rem] py-2 px-3 text-center select-none shadow-2xl border-2 backdrop-blur-xl",
              fanSide === "left"
                ? "-left-14 sm:-left-16 right-0"
                : "-right-14 sm:-right-16 left-0",
              isHighestBidder
                ? "border-2 border-amber-400 bg-[linear-gradient(135deg,rgba(110,45,10,0.96),rgba(45,16,4,0.98)_50%,rgba(16,6,1,0.99))] text-white shadow-[0_0_35px_rgba(245,158,11,0.7)]"
                : bidStatus?.includes("Achii") || bidStatus?.includes("Ditto")
                ? "border-2 border-purple-400 bg-[linear-gradient(135deg,rgba(88,28,135,0.95),rgba(45,10,75,0.98)_50%,rgba(18,4,30,0.99))] text-white shadow-[0_0_35px_rgba(168,85,247,0.7)]"
                : bidStatus?.includes("Double")
                ? "border-2 border-rose-400 bg-[linear-gradient(135deg,rgba(159,18,57,0.95),rgba(65,8,25,0.98)_50%,rgba(25,2,8,0.99))] text-white shadow-[0_0_35px_rgba(244,63,94,0.7)]"
                : "border-2 border-amber-500/80 bg-[linear-gradient(135deg,rgba(90,40,10,0.95),rgba(35,12,3,0.98)_50%,rgba(12,4,1,0.99))] text-white shadow-[0_0_24px_rgba(245,158,11,0.5)]"
            )}
          >
            {/* Player name inside overlay - moved down with ample clearance from top border */}
            <div className="flex items-center gap-1.5 mt-0.5 mb-1 opacity-95">
              <span
                className="text-[0.62rem] font-black uppercase tracking-widest leading-none truncate max-w-[11.5rem] px-2.5 py-0.5 rounded-full border shadow-sm bg-black/75 text-white border-white/25"
              >
                {player.displayName}
              </span>
            </div>

            {/* Giant UNO Action Callout */}
            <div className="flex items-center justify-center gap-1.5 my-0.5">
              {isHighestBidder ? (
                <Crown className="h-4 w-4 fill-amber-300 text-amber-300 shrink-0 animate-bounce" />
              ) : bidStatus?.includes("Achii") || bidStatus?.includes("Ditto") ? (
                <span className="text-lg">🤝</span>
              ) : bidStatus?.includes("Double") ? (
                <span className="text-lg">⚔️</span>
              ) : null}
              <span
                className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none drop-shadow-md text-white"
              >
                {isHighestBidder
                  ? bidStatus?.startsWith("Achii")
                    ? bidStatus
                    : `Bid ${bidStatus ?? ""}`
                  : bidStatus}
              </span>
            </div>

            {/* Subtitle / badge at bottom */}
            <span
              className="mt-1 rounded-full px-2.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider bg-black/75 text-white/90 border border-white/15 mb-0.5"
            >
              {isHighestBidder ? "Winning Bid" : "Auction Call"}
            </span>
          </motion.div>
        ) : hasPassed ? (
          <motion.div
            key="passed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className={cn(
              "absolute -top-2 -bottom-2 z-30 flex flex-col items-center justify-center rounded-[1.6rem] bg-black/90 border border-white/25 backdrop-blur-xl py-2 px-3 text-center select-none shadow-2xl",
              fanSide === "left"
                ? "-left-14 sm:-left-16 right-0"
                : "-right-14 sm:-right-16 left-0"
            )}
          >
            <span className="text-[0.62rem] font-black text-white uppercase tracking-widest mb-1 truncate max-w-[11rem] px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20">
              {player.displayName}
            </span>
            <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-white/80">
              PASSED
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main Seat Horizontal Content Row */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-3",
          fanSide === "right" ? "pr-14 sm:pr-16" : "pl-14 sm:pl-16"
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-3", fanSide === "left" && "flex-row-reverse text-right")}>
          {/* Avatar Container */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full border-2 text-sm font-black overflow-hidden shadow-md",
                isHighestBidder
                  ? "border-amber-300 bg-black/60 text-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.8)]"
                  : isDeclarer
                  ? "border-amber-300 bg-black/60 text-amber-300 ring-2 ring-amber-400/70 shadow-[0_0_16px_rgba(245,158,11,0.7)]"
                  : isCurrentTurn
                  ? "border-white bg-black/50 text-white shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                  : isRed
                  ? "border-rose-400/70 bg-gradient-to-br from-rose-950 to-slate-950 text-rose-100"
                  : "border-sky-400/70 bg-gradient-to-br from-sky-950 to-slate-950 text-sky-100"
              )}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={player.displayName} className="h-full w-full object-cover" />
              ) : isBot ? (
                <Bot className={cn("h-6 w-6", isRed ? "text-rose-200" : "text-sky-200")} />
              ) : (
                <span>{getInitials(player.displayName)}</span>
              )}
            </div>

            {/* Highest Bidder Crown */}
            {isHighestBidder ? (
              <div
                className="absolute -top-2 -right-2 z-20 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-200 text-black shadow-[0_0_10px_rgba(251,191,36,0.9)] ring-1 ring-black animate-bounce"
                title="Leading Bidder"
              >
                <Crown className="h-3 w-3 fill-amber-950 text-amber-950" />
              </div>
            ) : isDeclarer ? (
              <div
                className="absolute -top-1.5 -right-1.5 z-20 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-amber-300 via-amber-400 to-yellow-200 text-black shadow-[0_0_12px_rgba(245,158,11,0.9)] ring-1 ring-black"
                title={`Trump Setter (Declarer${contractTarget ? ` · Target ${contractTarget}` : ""})`}
              >
                <Crown className="h-3 w-3 fill-amber-950 text-amber-950" />
              </div>
            ) : null}

            {/* Dealer Marker */}
            {isDealer ? (
              <div className="absolute -bottom-1 -left-1 z-20 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[0.55rem] font-black text-amber-950 shadow-md ring-1 ring-black">
                D
              </div>
            ) : null}

            {/* Online Status Dot */}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black z-20",
                connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-neutral-600"
              )}
            />
          </div>

          {/* Player Info Details */}
          <div className="min-w-0">
            {/* Role, Team & Declarer Badges */}
            <div className={cn("flex items-center gap-1 mb-0.5", fanSide === "left" && "justify-end")}>
              <span
                className={cn(
                  "rounded-full px-2 py-0.2 text-[0.55rem] font-black uppercase tracking-wider border",
                  isHighestBidder
                    ? "border-amber-400/80 bg-amber-500/30 text-amber-200"
                    : isRed
                    ? "border-rose-400/40 bg-rose-950/80 text-rose-300"
                    : "border-sky-400/40 bg-sky-950/80 text-sky-300"
                )}
              >
                {roleLabel ?? (isRed ? "Team Red" : "Team Blue")}
              </span>

              {isDeclarer ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/90 bg-gradient-to-r from-amber-500/40 via-yellow-500/35 to-amber-600/40 px-2 py-0.2 text-[0.55rem] font-black uppercase tracking-wider text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/50"
                  title={`Declarer${contractTarget ? ` · Target ${contractTarget}` : ""}`}
                >
                  <Crown className="h-2.5 w-2.5 fill-amber-300 text-amber-300 shrink-0" />
                  <span>Declarer{contractTarget ? ` (${contractTarget})` : ""}</span>
                </span>
              ) : null}

              {isSingleHand ? (
                <span className="rounded-full border border-violet-400/50 bg-violet-500/30 px-1.5 py-0.2 text-[0.52rem] font-black uppercase text-violet-200">
                  Solo
                </span>
              ) : null}
            </div>

            {/* Display Name */}
            <p
              className={cn(
                "truncate font-black text-xs text-white leading-tight",
                isCurrentTurn && "text-amber-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
              )}
              title={player.displayName}
            >
              {player.displayName}
            </p>

            {/* Badges Row: Cards in Hand & Bidding Status */}
            <div className={cn("mt-1 flex flex-wrap items-center gap-1.5", fanSide === "left" && "justify-end")}>
              {/* Card Count */}
              <div
                className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.2 text-[0.62rem] font-bold text-white/80 border border-white/10"
                title={`${handCount} cards in hand`}
              >
                <span className="text-[0.68rem]">🃏</span>
                <span className="font-mono font-black">{handCount}</span>
              </div>

              {/* Status Badge */}
              {isHighestBidder ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/80 bg-amber-950/90 text-white px-2 py-0.2 text-[0.58rem] font-black uppercase tracking-wider shadow">
                  <Crown className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                  {bidStatus ?? "Winning"}
                </span>
              ) : hasPassed ? (
                <span className="rounded-full border border-white/10 bg-black/60 px-1.5 py-0.2 text-[0.55rem] font-black uppercase text-white/40">
                  Passed
                </span>
              ) : bidStatus ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-950/80 px-1.5 py-0.2 text-[0.58rem] font-bold text-white">
                  {bidStatus}
                </span>
              ) : isCurrentTurn ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/80 bg-emerald-950/90 text-white px-2 py-0.2 text-[0.58rem] font-black uppercase tracking-wider animate-pulse shadow">
                  <Sparkles className="h-2.5 w-2.5 text-emerald-300" />
                  Turn
                </span>
              ) : player.tricksWon > 0 ? (
                <span className="rounded-full border border-white/10 bg-black/50 px-1.5 py-0.2 text-[0.55rem] font-semibold text-white/60">
                  {player.tricksWon} trick{player.tricksWon === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Card Fan Beside Seat (UNO Style) */}
      <MiniCardFan count={handCount} side={fanSide} />
    </div>
  );
}

function MiniCardFan({
  count,
  side = "right"
}: {
  count: number;
  side?: "left" | "right";
}) {
  // Reflects the exact number of cards in hand (up to all 8 cards in 29)
  const visible = Math.min(8, Math.max(0, count));
  if (visible === 0) return null;

  // Dynamic spread and rotation so 1 to 8 cards fit comfortably without overflowing
  const spread = visible <= 1 ? 0 : Math.min(8.5, Math.max(4.5, 46 / (visible - 1)));
  const rotation = visible <= 1 ? 0 : Math.min(3.5, Math.max(1.5, 20 / (visible - 1)));

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 z-20 h-16 w-24 -translate-y-1/2 flex items-center justify-center",
        side === "right" ? "-right-5 sm:-right-7" : "-left-5 sm:-left-7"
      )}
    >
      {Array.from({ length: visible }).map((_, index) => {
        const offset = index - (visible - 1) / 2;
        const sideMultiplier = side === "right" ? 1 : -1;
        const x = offset * spread * sideMultiplier;
        const rotate = offset * rotation * sideMultiplier;

        return (
          <div
            key={index}
            className="absolute rounded-lg border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.9)] ring-1 ring-black/60 overflow-hidden w-[2.2rem] h-[3.4rem] bg-[#0c1829] transition-all duration-200"
            style={{
              transform: `translateX(${x}px) rotate(${rotate}deg)`,
              transformOrigin: "bottom center",
              zIndex: side === "right" ? 10 + index : 10 + (visible - 1 - index)
            }}
          >
            <TwentyNineCardBack variant="clean" className="h-full w-full rounded-[0.35rem] border-0 shadow-none" small />
          </div>
        );
      })}
    </div>
  );
}
