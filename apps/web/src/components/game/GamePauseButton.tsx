"use client";

import { Pause, Play } from "lucide-react";
import type { RoomStateView } from "@tabletop/shared";
import { cn } from "@/lib/utils/cn";

export type PauseButtonVariant =
  | "uno"
  | "twenty-nine"
  | "snakes"
  | "casino"
  | "mafia"
  | "cyan"
  | "default";

interface GamePauseButtonProps {
  room: RoomStateView;
  currentUserId: string | null;
  onPause?: ((roomId: string) => void) | undefined;
  onResume?: ((roomId: string) => void) | undefined;
  variant?: PauseButtonVariant | undefined;
  className?: string | undefined;
}

export function GamePauseButton({
  room,
  currentUserId,
  onPause,
  onResume,
  variant = "default",
  className
}: GamePauseButtonProps) {
  const isHost =
    Boolean(currentUserId) &&
    (room.hostUserId === currentUserId || room.effectiveHostUserId === currentUserId);
  const isPaused = room.status === "paused";
  const isInGame = room.status === "in_game";

  if (!isPaused && !isInGame) {
    return null;
  }

  // If not host and game is paused, render status indicator
  if (!isHost) {
    if (isPaused) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)] animate-pulse",
            className
          )}
          title="Game is paused by the host"
        >
          <Pause className="h-3.5 w-3.5" />
          <span>Paused</span>
        </span>
      );
    }
    return null;
  }

  // Host buttons
  const getVariantStyles = (): { pause: string; resume: string } => {
    switch (variant) {
      case "uno":
        return {
          pause:
            "border-white/12 bg-black/40 hover:bg-white/15 text-white rounded-full min-h-10 px-3.5 text-xs font-black shadow-sm",
          resume:
            "border-emerald-400/50 bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 rounded-full min-h-10 px-3.5 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
        };
      case "twenty-nine":
        return {
          pause:
            "border-emerald-400/30 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-500/20 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-sm",
          resume:
            "border-amber-400/60 bg-amber-500/25 text-amber-200 hover:bg-amber-500/35 rounded-xl px-3 py-1.5 text-xs font-black shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse"
        };
      case "snakes":
        return {
          pause:
            "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/60 hover:bg-amber-400/20 rounded-lg px-2.5 py-1 text-xs font-bold",
          resume:
            "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 rounded-lg px-3 py-1 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
        };
      case "casino":
        return {
          pause:
            "border-amber-400/30 bg-black/60 text-amber-200 hover:bg-black/80 rounded-xl px-3 py-1.5 text-xs font-bold shadow",
          resume:
            "border-emerald-400/60 bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35 rounded-xl px-3 py-1.5 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
        };
      case "mafia":
        return {
          pause:
            "border-white/10 bg-black/42 text-white/70 hover:bg-white/15 hover:text-white rounded-full min-h-10 px-3 text-xs font-black uppercase tracking-[0.16em]",
          resume:
            "border-violet-400/60 bg-violet-500/25 text-violet-200 hover:bg-violet-500/35 rounded-full min-h-10 px-3 text-xs font-black uppercase tracking-[0.16em] shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse"
        };
      case "cyan":
        return {
          pause:
            "border-cyan-400/30 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-500/20 rounded-xl px-3 py-1.5 text-xs font-bold",
          resume:
            "border-cyan-400/60 bg-cyan-500/25 text-cyan-200 hover:bg-cyan-500/35 rounded-xl px-3 py-1.5 text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
        };
      case "default":
      default:
        return {
          pause:
            "min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-xs font-black text-white/80 hover:border-white/20 hover:bg-white/[0.09]",
          resume:
            "min-h-10 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 text-xs font-black text-emerald-200 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
        };
    }
  };

  const styles = getVariantStyles();

  if (isPaused) {
    return (
      <button
        type="button"
        onClick={() => onResume?.(room.id)}
        className={cn(
          "inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md",
          styles.resume,
          className
        )}
        title="Resume game for all players"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>Resume</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPause?.(room.id)}
      className={cn(
        "inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md",
        styles.pause,
        className
      )}
      title="Pause game for all players (only host can pause/resume)"
    >
      <Pause className="h-3.5 w-3.5" />
      <span>Pause</span>
    </button>
  );
}

