"use client";

import { motion } from "framer-motion";
import type { RoomPlayerView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";
import { UnoCard } from "./UnoCard";
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

export function PlayerSeat({
  player,
  roomPlayer,
  theme,
  isSelf = false
}: {
  player: PublicSeatPlayer;
  roomPlayer?: RoomPlayerView | undefined;
  theme: CardThemeId;
  isSelf?: boolean;
}) {
  const connected = roomPlayer?.connected ?? false;
  const initials = player.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .padEnd(2, player.displayName[1]?.toUpperCase() ?? "•");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.25rem] border text-white backdrop-blur-xl",
        "bg-[linear-gradient(135deg,rgb(255_255_255_/_0.11),rgb(255_255_255_/_0.035)_42%,rgb(0_0_0_/_0.28))]",
        "shadow-[0_18px_45px_rgb(0_0_0_/_0.34)]",
        player.isCurrentTurn ? "border-amber-300/75" : "border-white/12",
        (!connected || player.eliminated) && "opacity-60 grayscale",
        isSelf ? "min-h-[8.25rem] p-3" : "min-h-[6.7rem] p-3"
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div
          className={cn(
            "absolute -right-12 -top-16 h-36 w-36 rounded-full blur-3xl",
            player.isCurrentTurn ? "bg-amber-300/24" : "bg-emerald-300/10"
          )}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
      </div>

      {player.isCurrentTurn ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[1.25rem] border border-amber-200/45"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -inset-4 rounded-[1.5rem] bg-amber-300/10 blur-2xl"
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      <div className="relative z-10 flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl border text-sm font-black shadow-inner",
                player.isCurrentTurn
                  ? "border-amber-200/60 bg-amber-300/18 text-amber-50"
                  : "border-white/18 bg-black/35 text-white"
              )}
            >
              {initials}
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#06140e]",
                connected ? "bg-lime-400 shadow-[0_0_12px_rgb(163_230_53_/_0.8)]" : "bg-red-500"
              )}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight tracking-wide">{player.displayName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-white/75">
                {player.handCount} cards
              </span>
              {player.isCurrentTurn ? (
                <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-zinc-950">
                  Turn
                </span>
              ) : null}
              {player.unoCalled ? (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-white">
                  UNO
                </span>
              ) : null}
              {player.eliminated ? (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-zinc-950">
                  Out
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <MiniCardFan count={player.handCount} theme={theme} active={player.isCurrentTurn} />
      </div>
    </div>
  );
}

function MiniCardFan({ count, theme, active }: { count: number; theme: CardThemeId; active: boolean }) {
  const visible = Math.min(4, Math.max(1, count));

  return (
    <div className="relative hidden h-20 w-24 shrink-0 sm:block">
      {Array.from({ length: visible }).map((_, index) => {
        const offset = index - (visible - 1) / 2;

        return (
          <div
            key={index}
            className="absolute left-1/2 top-1/2 transition-transform duration-300"
            style={{
              transform: `translate(${ -28 + offset * 15 }px, ${ -36 + Math.abs(offset) * 3 }px) rotate(${ offset * 8 }deg) scale(${active && index === visible - 1 ? 1.04 : 1})`,
              zIndex: index
            }}
          >
            <UnoCard faceDown compact theme={theme} className="h-[4.5rem] w-12 rounded-lg" />
          </div>
        );
      })}
    </div>
  );
}