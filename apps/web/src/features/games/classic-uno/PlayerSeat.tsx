"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { RoomPlayerView } from "@tabletop/shared";
import { Star } from "lucide-react";
import { CardImage } from "@/components/cards/CardImage";
import { resolveCardAsset } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";
import type { CardThemeId } from "./cardThemes";

interface PublicSeatPlayer {
  userId: string;
  displayName: string;
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
  fanSide = "right"
}: {
  player: PublicSeatPlayer;
  roomPlayer?: RoomPlayerView | undefined;
  theme: CardThemeId;
  isSelf?: boolean;
  compact?: boolean;
  fanSide?: "left" | "right";
}) {
  const connected = roomPlayer?.connected ?? false;
  const inactive = !connected || player.eliminated;

  return (
    <div
      className={cn(
        "relative isolate overflow-visible rounded-[1.55rem] border text-white backdrop-blur-xl",
        compact ? "min-h-[5.25rem]" : "min-h-[6.05rem]",
        "border-emerald-300/12 bg-[linear-gradient(135deg,rgba(7,22,14,0.88),rgba(5,15,12,0.76)_42%,rgba(0,0,0,0.66)_100%)]",
        "shadow-[0_18px_44px_rgba(0,0,0,0.66),0_0_24px_rgba(34,197,94,0.07)]",
        inactive && "opacity-60 grayscale",
        player.isCurrentTurn &&
          "border-lime-300/60 shadow-[0_24px_70px_rgba(0,0,0,0.66),0_0_46px_rgba(132,204,22,0.28)]",
        isSelf ? "p-4" : compact ? "p-3" : "p-3.5"
      )}
    >
      {player.isCurrentTurn ? (
        <>
          <motion.div
            className="pointer-events-none absolute -inset-8 rounded-[2.1rem] bg-lime-400/20 blur-3xl"
            animate={{ opacity: [0.22, 0.72, 0.22], scale: [0.96, 1.08, 0.96] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -inset-2 rounded-[1.8rem] border border-lime-300/50"
            animate={{ opacity: [0.35, 0.95, 0.35] }}
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
                  ? "border-lime-200/65 bg-lime-400/12 text-lime-50 shadow-[0_0_24px_rgba(132,204,22,0.26)]"
                  : "border-emerald-200/14 bg-black/58 text-white"
              )}
            >
              {getInitials(player.displayName)}
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
    </div>
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
        "rounded-full px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.12em]",
        tone === "turn" && "bg-lime-300 text-zinc-950",
        tone === "uno" && "bg-red-500 text-white",
        tone === "out" && "bg-white/80 text-zinc-950"
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