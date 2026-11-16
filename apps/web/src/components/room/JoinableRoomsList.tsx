"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  Gamepad2,
  Plus,
  RefreshCw,
  Sparkles,
  Users
} from "lucide-react";
import type { JoinableRoomSummary } from "@tabletop/shared";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { getGameVisualMeta } from "@/config/game-thumbnails.config";

interface JoinableRoomsListProps {
  onCreateRoom?: () => void;
}

export function JoinableRoomsList({ onCreateRoom }: JoinableRoomsListProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<JoinableRoomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadRooms() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.joinableRooms();
      setRooms(result.rooms.filter((room) => room.status === "lobby"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load rooms.");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom(code: string) {
    setJoiningCode(code);
    setError(null);
    try {
      const result = await api.joinRoom({ code });
      router.push(`/rooms/${result.room.code}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join room.");
      setJoiningCode(null);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  }

  useEffect(() => {
    void loadRooms();
    const interval = window.setInterval(() => void loadRooms(), 7000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {/* Header controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-400">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} waiting for players
          </span>
        </div>

        <button
          type="button"
          onClick={() => void loadRooms()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-bold text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Rooms List */}
      <div className="grid gap-3">
        {rooms.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1215] p-6 text-center sm:p-8">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-950/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-base font-black text-white">No Public Lobbies Open</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              No one is waiting in a lobby right now. Start a new match and invite your friends with a room code!
            </p>
            {onCreateRoom && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  onClick={onCreateRoom}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-black text-zinc-950 shadow-md hover:brightness-110"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create a Game Table
                </Button>
              </div>
            )}
          </div>
        ) : (
          rooms.map((room) => {
            const meta = getGameVisualMeta(room.gameId);
            const hostInitial = (room.hostDisplayName ?? "H").slice(0, 1).toUpperCase();
            const seatsRemaining = Math.max(0, room.maxPlayers - room.playerCount);

            return (
              <article
                key={room.id}
                className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1418] p-4 transition-all duration-200 hover:border-emerald-500/30 hover:bg-[#0e181d] sm:flex-row sm:items-center"
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50">
                    <img
                      src={meta.thumbnailUrl}
                      alt={room.gameName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-black text-white group-hover:text-emerald-200">
                        {meta.displayName || room.gameName}
                      </h4>
                      <span className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-300">
                        {meta.categoryLabel}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                      {/* Host */}
                      <span className="inline-flex items-center gap-1">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/20 text-[0.6rem] font-bold text-emerald-300">
                          {hostInitial}
                        </span>
                        <span className="truncate max-w-[120px] text-slate-300 font-semibold">
                          {room.hostDisplayName ?? "Host"}
                        </span>
                      </span>

                      <span>·</span>

                      {/* Code Pill */}
                      <button
                        type="button"
                        onClick={() => void handleCopy(room.code)}
                        title="Click to copy code"
                        className="inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-emerald-300 hover:bg-black/60 transition-colors"
                      >
                        {copiedCode === room.code ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5 text-slate-400" />
                            <span>{room.code}</span>
                          </>
                        )}
                      </button>

                      <span>·</span>

                      {/* Player Slots */}
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {room.playerCount}/{room.maxPlayers}
                        </span>
                        <span className="text-slate-500 font-normal">
                          ({seatsRemaining} {seatsRemaining === 1 ? "seat" : "seats"} left)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Join Button */}
                <div className="flex shrink-0 items-center justify-end">
                  <Button
                    type="button"
                    onClick={() => void joinRoom(room.code)}
                    disabled={joiningCode === room.code}
                    className="h-10 rounded-xl bg-emerald-600 px-5 font-black text-white shadow-md transition-all hover:bg-emerald-500 hover:scale-[1.02] cursor-pointer"
                  >
                    {joiningCode === room.code ? (
                      "Joining..."
                    ) : (
                      <>
                        Join Table
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
