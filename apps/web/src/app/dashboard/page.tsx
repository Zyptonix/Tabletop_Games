"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gamepad2, Radio, Trophy, Users, Zap } from "lucide-react";
import type { RoomStateView } from "@tabletop/shared";
import { AppShell } from "@/components/layout/AppShell";
import { CreateRoomPanel } from "@/components/room/CreateRoomPanel";
import { JoinRoomPanel } from "@/components/room/JoinRoomPanel";
import { JoinableRoomsList } from "@/components/room/JoinableRoomsList";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

function gameName(gameId: string) {
  if (gameId === "classic-uno") return "Classic UNO";
  if (gameId === "uno-no-mercy") return "UNO No Mercy";
  if (gameId === "strategic-shockwave") return "Strategic Shockwave";
  return gameId.replaceAll("-", " ");
}

export default function DashboardPage() {
  const { user } = useAuth({ required: true });
  const [activeRooms, setActiveRooms] = useState<RoomStateView[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);

  async function loadActiveRooms() {
    try {
      const result = await api.myRoom();
      setActiveRooms((result.rooms ?? []).filter((room) => room.status !== "finished" && room.status !== "abandoned"));
      setRoomError(null);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "Couldn't load your active rooms.");
    }
  }

  useEffect(() => {
    void loadActiveRooms();
    const interval = window.setInterval(() => void loadActiveRooms(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  async function endRoom(room: RoomStateView) {
    if (!window.confirm(`End room ${room.code} for everyone?`)) return;
    try {
      await api.endRoom(room.id);
      await loadActiveRooms();
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "Couldn't end the room.");
    }
  }

  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "friend";

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative isolate overflow-hidden rounded-[1.8rem] border border-emerald-300/15 bg-[radial-gradient(circle_at_82%_12%,rgba(16,185,129,.18),transparent_26rem),linear-gradient(125deg,#102620,#10171d_55%,#111a22)] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-12 -top-10 -z-10 h-64 w-64 rounded-full border border-emerald-200/10" />
          <div className="pointer-events-none absolute right-8 top-8 -z-10 h-28 w-28 rounded-full border border-emerald-200/10" />
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/[.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.18em] text-emerald-200"><Radio className="h-3.5 w-3.5" /> Local party lobby</span>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">Game night,<br /><span className="text-emerald-300">{firstName}.</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300/75 sm:text-base">Pick a game, make a room, drop the code in the group chat, and let the friendly betrayal begin.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/leaderboards" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-[#07120d] transition hover:bg-emerald-200"><Trophy className="h-4 w-4" /> See the leaderboard <ArrowRight className="h-4 w-4" /></Link>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-4 py-2.5 text-xs font-bold text-slate-300"><Users className="h-4 w-4 text-emerald-300" /> 2–10 players depending on the game</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[19rem]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"><Gamepad2 className="h-4 w-4 text-emerald-300" /><p className="mt-3 text-2xl font-black text-white">{user?.level ?? 1}</p><p className="mt-1 text-[11px] font-bold text-slate-400">Level</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"><Zap className="h-4 w-4 text-amber-300" /><p className="mt-3 text-2xl font-black text-white">{user?.xp ?? 0}</p><p className="mt-1 text-[11px] font-bold text-slate-400">XP</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"><Trophy className="h-4 w-4 text-sky-300" /><p className="mt-3 text-2xl font-black text-white">{user?.coins ?? 0}</p><p className="mt-1 text-[11px] font-bold text-slate-400">Coins</p></div>
            </div>
          </div>
        </section>

        {roomError ? <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">{roomError}</p> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-[#10171d] p-4 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-300">Pick up where you left off</p><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Your active rooms</h2></div>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadActiveRooms()}>Refresh</Button>
            </div>
            <div className="mt-5 space-y-3">
              {activeRooms.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 bg-white/[.025] px-4 py-8 text-center"><Gamepad2 className="mx-auto h-7 w-7 text-slate-500" /><p className="mt-3 font-bold text-slate-200">No games waiting on you.</p><p className="mt-1 text-sm text-slate-500">Create a room or join one with your group's code.</p></div> : null}
              {activeRooms.map((room) => {
                const canEnd = room.effectiveHostUserId === user?.id || user?.role === "ADMIN";
                const humans = room.players.filter((player) => !player.isBot).length;
                const bots = room.players.filter((player) => player.isBot).length;
                return <div key={room.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#0b1116] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{gameName(room.gameId)}</h3><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-200">{room.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-slate-400">Room <span className="font-black tracking-wider text-slate-200">{room.code}</span> · {humans} human{humans === 1 ? "" : "s"}{bots ? ` · ${bots} bot${bots === 1 ? "" : "s"}` : ""}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canEnd ? <Button type="button" variant="outline" size="sm" onClick={() => void endRoom(room)}>End room</Button> : null}
                    <Link href={`/rooms/${room.code}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-[#06110d] transition hover:bg-emerald-200">Rejoin <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </div>
                </div>;
              })}
            </div>
          </section>

          <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <CreateRoomPanel />
            <JoinRoomPanel />
          </aside>
        </div>
        <JoinableRoomsList />
      </div>
    </AppShell>
  );
}
