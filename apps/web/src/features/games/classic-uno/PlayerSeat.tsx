"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RoomPlayerView } from "@tabletop/shared";
import { Ban, Skull, Star, WifiOff } from "lucide-react";
import { CardImage } from "@/components/cards/CardImage";
import { resolveCardAsset } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";
import type { CardThemeId } from "./cardThemes";
import type { PowerSeatEffect } from "./PowerEventOverlay";

interface PublicSeatPlayer {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  seat: number;
  handCount: number;
  unoCalled: boolean;
  isCurrentTurn: boolean;
  eliminated?: boolean | undefined;
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "P";
}

export function PlayerSeat({
  player,
  roomPlayer,
  theme,
  isSelf = false,
  compact = false,
  fanSide = "right",
  seatSide = "top",
  stackHitAmount,
  powerEffect,
  turnProgress
}: {
  player: PublicSeatPlayer;
  roomPlayer?: RoomPlayerView | undefined;
  theme: CardThemeId;
  isSelf?: boolean;
  compact?: boolean;
  fanSide?: "left" | "right";
  seatSide?: "top" | "left" | "right";
  stackHitAmount?: number | undefined;
  powerEffect?: PowerSeatEffect | undefined;
  turnProgress?: number | undefined;
}) {
  const connected = roomPlayer?.connected ?? false;
  const avatarUrl = player.avatarUrl ?? roomPlayer?.avatarUrl ?? null;
  const inactive = !connected || player.eliminated;

  return (
    <div
      className={cn(
        "relative isolate overflow-visible rounded-[1.55rem] border text-white backdrop-blur-xl",
        compact ? "min-h-[5.25rem]" : "min-h-[6.05rem]",
        player.isCurrentTurn
          ? "border-lime-200/85 bg-[linear-gradient(135deg,rgba(18,83,38,0.96),rgba(21,128,61,0.86)_48%,rgba(4,18,10,0.82)_100%)]"
          : "border-emerald-300/12 bg-[linear-gradient(135deg,rgba(7,22,14,0.88),rgba(5,15,12,0.76)_42%,rgba(0,0,0,0.66)_100%)]",
        player.isCurrentTurn
          ? "shadow-[0_0_0_1px_rgba(190,242,100,0.45),0_0_52px_rgba(34,197,94,0.55),0_18px_62px_rgba(0,0,0,0.58)]"
          : "shadow-[0_18px_44px_rgba(0,0,0,0.66),0_0_24px_rgba(34,197,94,0.07)]",
        inactive && "opacity-60 grayscale",
        player.isCurrentTurn && "ring-1 ring-lime-200/45",
        isSelf ? "p-4" : compact ? "p-3" : "p-3.5"
      )}
    >
      {player.isCurrentTurn ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(190,242,100,0.22),rgba(132,204,22,0.14)_42%,rgba(0,0,0,0)_78%)]"
            animate={{ opacity: [0.62, 1, 0.62] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-lime-400/18 blur-2xl"
            animate={{ opacity: [0.35, 0.82, 0.35], scale: [0.98, 1.04, 0.98] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[inherit] border border-lime-200/45"
            animate={{ opacity: [0.4, 0.95, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute top-1/2 h-16 w-32 -translate-y-1/2 rounded-full blur-2xl",
          player.isCurrentTurn ? "bg-lime-400/24" : "bg-emerald-500/10",
          fanSide === "right" ? "left-[-1.8rem]" : "right-[-1.8rem]"
        )}
      />

      <div className="pointer-events-none absolute inset-0 rounded-[1.55rem] bg-[radial-gradient(circle_at_14%_52%,rgba(34,197,94,0.09),transparent_25%),radial-gradient(circle_at_90%_50%,rgba(14,165,233,0.045),transparent_30%)]" />

      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-3",
          compact ? "min-h-[4.1rem]" : "min-h-[4.7rem]",
          fanSide === "right" ? "pr-[6.45rem]" : "pl-[6.45rem]"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-3.5",
            fanSide === "left" && "flex-row-reverse text-right"
          )}
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                "grid place-items-center rounded-full border text-sm font-black",
                compact ? "h-11 w-11" : "h-12 w-12",
                player.isCurrentTurn
                  ? "border-lime-200/70 bg-lime-300/20 text-lime-50 shadow-[0_0_24px_rgba(190,242,100,0.38)]"
                  : "border-emerald-200/14 bg-black/58 text-white"
              )}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={player.displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span>{getInitials(player.displayName)}</span>
              )}
              {player.isCurrentTurn && typeof turnProgress === "number" ? (
                <SeatTimerRing progress={turnProgress} compact={compact} />
              ) : null}
            </div>

            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#08130e]",
                connected ? "bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.95)]" : "bg-red-500"
              )}
            />
          </div>

          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-black leading-none text-white",
                compact ? "max-w-[5.5rem] text-[0.92rem]" : "max-w-[7.25rem] text-[1rem]"
              )}
              title={player.displayName}
            >
              {player.displayName}
            </p>

            <div
              className={cn(
                "mt-2 flex items-center gap-2 text-amber-300",
                fanSide === "left" && "justify-end"
              )}
            >
              <Star className="h-4 w-4 fill-current" />
              <span className="text-[1rem] font-black leading-none">{player.handCount}</span>
            </div>

            <div
              className={cn(
                "mt-2 flex flex-wrap items-center gap-1.5",
                fanSide === "left" && "justify-end"
              )}
            >
              {player.isCurrentTurn ? <Badge tone="turn">Turn</Badge> : null}
              {player.unoCalled ? <Badge tone="uno">UNO</Badge> : null}
              {player.eliminated ? <Badge tone="out">Out</Badge> : null}
              {!connected ? <Badge tone="out">Offline</Badge> : null}
            </div>
          </div>
        </div>
      </div>

      <MiniCardFan
        count={player.handCount}
        theme={theme}
        active={player.isCurrentTurn}
        self={isSelf}
        side={fanSide}
      />


      <AnimatePresence>
        {powerEffect ? (
          <motion.div
            key={powerEffect.id}
            initial={{ opacity: 0, scale: 0.74, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute inset-[-0.35rem] z-[65] grid place-items-center overflow-hidden rounded-[1.8rem] border text-center backdrop-blur-[2px]",
              powerEffect.kind === "skip" && "border-red-300/55 bg-red-950/60 shadow-[0_0_48px_rgba(239,68,68,0.42)]",
              powerEffect.kind === "offline" && "border-orange-300/55 bg-orange-950/62 shadow-[0_0_48px_rgba(249,115,22,0.42)]",
              powerEffect.kind === "draw" && "border-amber-300/55 bg-amber-950/58 shadow-[0_0_48px_rgba(245,158,11,0.40)]",
              powerEffect.kind === "roulette" && "border-fuchsia-300/55 bg-fuchsia-950/60 shadow-[0_0_48px_rgba(168,85,247,0.40)]"
            )}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.7, repeat: 1, ease: "easeInOut" }}
              className="grid justify-items-center gap-1"
            >
              {powerEffect.kind === "offline" ? <WifiOff className="h-9 w-9 text-orange-100" /> : null}
              {powerEffect.kind === "skip" ? <Ban className="h-10 w-10 text-red-100" /> : null}
              {powerEffect.kind === "roulette" ? <Skull className="h-9 w-9 text-fuchsia-100" /> : null}
              <p className="text-3xl font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.4)]">
                {powerEffect.label}
              </p>
              {powerEffect.detail ? <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/70">{powerEffect.detail}</p> : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {stackHitAmount ? (
          <motion.div
            key={stackHitAmount}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute z-50 rounded-[0.9rem] border border-red-200/25",
              "bg-[linear-gradient(135deg,rgba(35,18,18,0.94),rgba(90,28,28,0.88))]",
              "px-3 py-2 text-center shadow-[0_12px_28px_rgba(0,0,0,0.42),0_0_24px_rgba(239,68,68,0.25)] backdrop-blur-xl",
              seatSide === "left" && "right-[-0.6rem] top-1/2 -translate-y-1/2 translate-x-full",
              seatSide === "right" && "left-[-0.6rem] top-1/2 -translate-y-1/2 -translate-x-full",
              seatSide === "top" && "left-1/2 top-full mt-2 -translate-x-1/2"
            )}
          >
            <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] text-red-200/65">
              Stack hit
            </p>
            <p className="mt-0.5 text-base font-black leading-none text-red-50">
              +{stackHitAmount} cards
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SeatTimerRing({ progress, compact }: { progress: number; compact: boolean }) {
  const size = compact ? 54 : 58;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clampedProgress);
  const urgent = clampedProgress <= 0.18;

  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-90 overflow-visible"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="2"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={urgent ? "#f87171" : "#bef264"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{
          strokeDashoffset: dashOffset,
          opacity: urgent ? [0.65, 1, 0.65] : 1
        }}
        transition={urgent ? { duration: 0.62, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
        style={{ filter: urgent ? "drop-shadow(0 0 10px rgba(248,113,113,0.72))" : "drop-shadow(0 0 10px rgba(190,242,100,0.55))" }}
      />
    </svg>
  );
}

function Badge({
  tone,
  children
}: {
  tone: "turn" | "uno" | "out";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.12em]",
        tone === "turn" &&
          "border-lime-200/35 bg-lime-300 text-zinc-950 shadow-[0_0_18px_rgba(190,242,100,0.42)]",
        tone === "uno" && "border-red-300/35 bg-red-500 text-white",
        tone === "out" && "border-white/30 bg-white/80 text-zinc-950"
      )}
    >
      {children}
    </span>
  );
}

function MiniCardFan({
  count,
  theme,
  active,
  self,
  side
}: {
  count: number;
  theme: CardThemeId;
  active: boolean;
  self: boolean;
  side: "left" | "right";
}) {
  const visible = Math.min(8, Math.max(0, count));
  const overflow = Math.max(0, count - visible);

  const cardWidth = self ? 48 : 48;
  const cardHeight = self ? 70 : 74;

  const spread = visible >= 5 ? 13 : 15;
  const rotation = visible >= 5 ? 7 : 8;

  if (visible === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 z-20 h-[5.25rem] w-[8.25rem] -translate-y-1/2",
        side === "right" ? (self ? "-right-6" : "-right-7") : (self ? "-left-6" : "-left-7")
      )}
    >
      {Array.from({ length: visible }).map((_, index) => {
        const offset = index - (visible - 1) / 2;
        const sideMultiplier = side === "right" ? 1 : -1;

        return (
          <MiniSeatBackCard
            key={index}
            theme={theme}
            active={active && index === visible - 1}
            width={cardWidth}
            height={cardHeight}
            style={{
              transform: `translate(${sideMultiplier * (offset * spread) - cardWidth / 2}px, ${
                -cardHeight / 2 + Math.abs(offset) * 1.35
              }px) rotate(${sideMultiplier * offset * rotation}deg)`,
              zIndex: index
            }}
          />
        );
      })}

      {overflow > 0 ? (
        <div
          className={cn(
            "absolute bottom-1 z-30 rounded-full border border-white/[0.07] bg-black/80 px-2 py-1 text-[0.66rem] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.5)]",
            side === "right" ? "-right-1" : "-left-1"
          )}
        >
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}

function MiniSeatBackCard({
  theme,
  active,
  width,
  height,
  style
}: {
  theme: CardThemeId;
  active: boolean;
  width: number;
  height: number;
  style: React.CSSProperties;
}) {
  const asset = resolveCardAsset({ theme, faceDown: true });

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width,
        height,
        ...style
      }}
    >
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded-[0.25rem] border bg-[#05070b]",
          "border-white/[0.07] shadow-[0_10px_24px_rgba(0,0,0,0.68)]",
          active &&
            "border-lime-300/60 shadow-[0_0_22px_rgba(132,204,22,0.32),0_10px_22px_rgba(0,0,0,0.58)]"
        )}
      >
        <CardImage
          src={asset.src}
          fallbackSrc={asset.fallbackSrc}
          alt="Card back"
          className="object-cover"
        />
      </div>
    </div>
  );
}