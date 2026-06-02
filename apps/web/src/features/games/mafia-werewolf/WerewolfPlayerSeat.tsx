"use client";

import { motion } from "framer-motion";
import { Crosshair, Eye, HeartPulse, Moon, Shield, Skull, Vote, Wand2 } from "lucide-react";
import type { PublicWerewolfPlayer } from "@tabletop/game-core";
import type { RoomPlayerView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";
import { WEREWOLF_ROLE_THEME } from "./werewolfTheme";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";
}

export function WerewolfPlayerSeat({
  player,
  roomPlayer,
  selected,
  actionKind,
  onClick
}: {
  player: PublicWerewolfPlayer;
  roomPlayer?: RoomPlayerView | undefined;
  selected?: boolean;
  actionKind?: "kill" | "save" | "inspect" | "guard" | "shoot" | "poison" | "vote" | undefined;
  onClick?: (() => void) | undefined;
}) {
  const roleTheme = player.role ? WEREWOLF_ROLE_THEME[player.role] : null;
  const connected = roomPlayer?.connected ?? false;
  const voteCount = player.voteCount ?? 0;
  const isKnownWerewolf = Boolean(player.isWerewolfTeammate && player.role === "werewolf");

  const actionClass =
    actionKind === "kill"
      ? "border-red-300/60 shadow-[0_0_32px_rgba(239,68,68,0.38)]"
      : actionKind === "save"
        ? "border-emerald-300/60 shadow-[0_0_32px_rgba(52,211,153,0.32)]"
        : actionKind === "inspect"
          ? "border-blue-300/60 shadow-[0_0_32px_rgba(96,165,250,0.32)]"
          : actionKind === "guard"
            ? "border-cyan-300/60 shadow-[0_0_32px_rgba(34,211,238,0.30)]"
            : actionKind === "shoot"
              ? "border-orange-300/60 shadow-[0_0_32px_rgba(251,146,60,0.30)]"
              : actionKind === "poison"
                ? "border-purple-300/60 shadow-[0_0_32px_rgba(168,85,247,0.30)]"
                : actionKind === "vote"
            ? "border-amber-300/60 shadow-[0_0_32px_rgba(245,158,11,0.32)]"
            : "";

  return (
    <motion.button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-visible rounded-[1.45rem] border px-3.5 py-3 text-left text-white backdrop-blur-xl transition",
        isKnownWerewolf
          ? "border-red-300/70 bg-[linear-gradient(135deg,rgba(92,12,22,0.94),rgba(42,6,12,0.90)_55%,rgba(8,0,0,0.82))]"
          : "border-white/10 bg-[linear-gradient(135deg,rgba(8,11,18,0.88),rgba(3,6,12,0.78)_55%,rgba(0,0,0,0.70))]",
        isKnownWerewolf
          ? "shadow-[0_18px_54px_rgba(0,0,0,0.68),0_0_36px_rgba(239,68,68,0.34),inset_0_1px_0_rgba(255,255,255,0.07)]"
          : "shadow-[0_18px_44px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.05)]",
        !player.alive && "opacity-55 grayscale",
        onClick && "hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]",
        selected && actionClass
      )}
      whileHover={onClick ? { scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.985 } : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-80"
        style={{
          background: isKnownWerewolf
            ? "radial-gradient(circle at 20% 50%, rgba(248,113,113,0.48), rgba(127,29,29,0.22) 42%, transparent 72%)"
            : roleTheme
              ? `radial-gradient(circle at 18% 50%, ${roleTheme.glow}, transparent 42%)`
              : "radial-gradient(circle at 18% 50%, rgba(148,163,184,0.12), transparent 42%)"
        }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <div
          className={cn(
            "relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border bg-black/70 text-sm font-black",
            isKnownWerewolf ? "border-red-200/55 shadow-[0_0_24px_rgba(248,113,113,0.34)]" : "border-white/14"
          )}
        >
          {roomPlayer?.avatarUrl ? (
            <img src={roomPlayer.avatarUrl} alt={player.displayName} className="h-full w-full object-cover" />
          ) : player.alive ? (
            initials(player.displayName)
          ) : (
            <Skull className="h-5 w-5 text-white/65" />
          )}
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#07100d]",
              connected ? "bg-emerald-400" : "bg-zinc-500"
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-white">{player.displayName}</p>
            {player.isViewer ? <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wide text-white/70">You</span> : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em]", player.alive ? "bg-emerald-400/12 text-emerald-200" : "bg-red-500/16 text-red-200")}>{player.alive ? "Alive" : "Dead"}</span>
            {player.role ? (
              <span className="rounded-full border px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em]" style={{ borderColor: roleTheme?.accent, color: roleTheme?.accent }}>
                {roleTheme?.label ?? player.role}
              </span>
            ) : (
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-white/42">Hidden</span>
            )}
            {voteCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/16 px-2 py-0.5 text-[0.6rem] font-black text-amber-100">
                <Vote className="h-3 w-3" /> {voteCount}
              </span>
            ) : null}
            {player.passedVote ? (
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-white/45">Pass</span>
            ) : null}
          </div>
        </div>

        {selected && actionKind ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-black/55">
            {actionKind === "kill" ? <Moon className="h-4 w-4 text-red-200" /> : null}
            {actionKind === "save" ? <HeartPulse className="h-4 w-4 text-emerald-200" /> : null}
            {actionKind === "inspect" ? <Eye className="h-4 w-4 text-blue-200" /> : null}
            {actionKind === "guard" ? <Shield className="h-4 w-4 text-cyan-200" /> : null}
            {actionKind === "shoot" ? <Crosshair className="h-4 w-4 text-orange-200" /> : null}
            {actionKind === "poison" ? <Wand2 className="h-4 w-4 text-purple-200" /> : null}
            {actionKind === "vote" ? <Vote className="h-4 w-4 text-amber-200" /> : null}
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}
