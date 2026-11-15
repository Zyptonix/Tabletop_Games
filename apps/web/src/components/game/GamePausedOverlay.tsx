"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, Pause, Play, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { RoomStateView } from "@tabletop/shared";

interface GamePausedOverlayProps {
  room: RoomStateView;
  currentUserId: string | null;
  onResume?: ((roomId: string) => void) | undefined;
  gameName?: string | undefined;
}

export function GamePausedOverlay({
  room,
  currentUserId,
  onResume,
  gameName
}: GamePausedOverlayProps) {
  if (room.status !== "paused") {
    return null;
  }

  const isHost =
    Boolean(currentUserId) &&
    (room.hostUserId === currentUserId || room.effectiveHostUserId === currentUserId);
  const hostPlayer = room.players.find(
    (p) => p.userId === room.effectiveHostUserId || p.userId === room.hostUserId
  );
  const hostName = hostPlayer?.displayName || "The Host";

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/35 bg-[linear-gradient(145deg,rgba(18,14,10,0.98),rgba(28,20,12,0.97))] p-6 text-center text-white shadow-[0_0_60px_rgba(245,158,11,0.25)]"
      >
        {/* Pulsing Pause Badge */}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.3)] animate-pulse">
          <Pause className="h-8 w-8" />
        </div>

        <span className="mt-4 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
          Match Paused
        </span>

        <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
          {gameName ? `${gameName} is Paused` : "Game is Paused"}
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
          {isHost
            ? "You paused the game. All cards, positions, timers, and moves are preserved. Resume whenever everyone is ready."
            : `${hostName} has paused the match. All player hands and board states are safely stored.`}
        </p>

        {/* State Preserved Tag */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-xl py-1.5 px-3">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Game state securely saved · You can leave and rejoin anytime</span>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col gap-2.5">
          {isHost ? (
            <button
              type="button"
              onClick={() => onResume?.(room.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-teal-400 transition active:scale-98 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume Game for Everyone</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-xs font-semibold text-slate-300">
              <Clock className="h-3.5 w-3.5 animate-spin text-amber-400" />
              <span>Waiting for {hostName} to resume...</span>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

