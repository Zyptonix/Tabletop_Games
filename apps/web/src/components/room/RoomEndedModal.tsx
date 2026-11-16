"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gamepad2, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGameVisualMeta } from "@/config/game-thumbnails.config";

interface RoomEndedModalProps {
  open: boolean;
  roomCode?: string | undefined;
  gameId?: string | undefined;
  hostName?: string | null | undefined;
  reason?: string | null | undefined;
  onReturnToDashboard: () => void;
}

export function RoomEndedModal({
  open,
  roomCode,
  gameId,
  hostName,
  reason,
  onReturnToDashboard,
}: RoomEndedModalProps) {
  const meta = gameId ? getGameVisualMeta(gameId) : null;

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md">
          {/* Ambient Red Glow in Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(244,63,94,0.15),transparent_70%)]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-[#091114] p-6 text-white shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_30px_rgba(244,63,94,0.15)] sm:p-7"
          >
            {/* Top Icon Badge */}
            <div className="flex flex-col items-center text-center">
              <span className="relative grid h-16 w-16 place-items-center rounded-2xl border border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                <ShieldAlert className="h-8 w-8" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-zinc-950" />
                </span>
              </span>

              <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Game Table Ended
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {reason ||
                  (hostName
                    ? `Host ${hostName} has closed this table. All gameplay has ceased.`
                    : "The host has ended this game table. All gameplay has ceased.")}
              </p>
            </div>

            {/* Match Information Capsule */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">Game Title</span>
                <span className="font-black text-emerald-300">
                  {meta?.displayName || gameId || "Tabletop Match"}
                </span>
              </div>
              {roomCode && (
                <div className="mt-2 flex items-center justify-between text-xs border-t border-white/5 pt-2">
                  <span className="font-bold text-slate-400">Room Code</span>
                  <span className="font-mono font-black text-amber-300 tracking-wider">
                    {roomCode.toUpperCase()}
                  </span>
                </div>
              )}
              {hostName && (
                <div className="mt-2 flex items-center justify-between text-xs border-t border-white/5 pt-2">
                  <span className="font-bold text-slate-400">Host</span>
                  <span className="font-semibold text-slate-200">{hostName}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-xs border-t border-white/5 pt-2">
                <span className="font-bold text-slate-400">Status</span>
                <span className="font-bold uppercase tracking-wider text-rose-400">
                  Closed / Disbanded
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <Button
                type="button"
                onClick={onReturnToDashboard}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-black text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                RETURN TO DASHBOARD
              </Button>

              <p className="text-center text-[0.7rem] font-bold text-slate-500">
                You can join another open lobby or host a fresh table anytime.
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
