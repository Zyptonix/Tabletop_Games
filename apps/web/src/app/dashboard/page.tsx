"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, StopCircle, Sparkles } from "lucide-react";
import type { RoomStateView } from "@tabletop/shared";
import { AppShell } from "@/components/layout/AppShell";
import { CreateRoomPanel } from "@/components/room/CreateRoomPanel";
import { JoinRoomPanel } from "@/components/room/JoinRoomPanel";
import { JoinableRoomsList } from "@/components/room/JoinableRoomsList";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

export default function DashboardPage() {
  const { user } = useAuth({ required: true });
  const [activeRooms, setActiveRooms] = useState<RoomStateView[]>([]);

  const loadActiveRooms = async () => {
    const result = await api.myRoom();
    setActiveRooms((result.rooms ?? []).filter((room) => room.status !== "finished" && room.status !== "abandoned"));
  };

  useEffect(() => {
    void loadActiveRooms();
  }, []);

  const endRoom = async (room: RoomStateView) => {
    if (!window.confirm(`End room ${room.code} for everyone?`)) {
      return;
    }
    await api.endRoom(room.id);
    await loadActiveRooms();
  };

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-emerald-500/30 bg-[#0d1715] p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_22px_40px_rgba(2,6,23,0.4)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-400">Welcome back</p>
              <h1 className="mt-1 text-3xl font-black text-emerald-50">{user?.displayName ?? "Player"}</h1>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-emerald-400/30 bg-[#0c201b] p-3">
                <p className="text-xl font-black text-emerald-300">{user?.level ?? 1}</p>
                <p className="text-xs font-semibold text-emerald-200">Level</p>
              </div>
              <div className="rounded-md border border-amber-400/30 bg-[#201b0d] p-3">
                <p className="text-xl font-black text-amber-300">{user?.xp ?? 0}</p>
                <p className="text-xs font-semibold text-amber-200">XP</p>
              </div>
              <div className="rounded-md border border-sky-400/30 bg-[#0c1a23] p-3">
                <p className="text-xl font-black text-sky-300">{user?.coins ?? 0}</p>
                <p className="text-xs font-semibold text-sky-200">Coins</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-black text-emerald-50">My active games</h2>
            </div>
            {activeRooms.length > 0 ? (
              <div className="grid gap-3">
                {activeRooms.map((room) => {
                  const canEnd = room.effectiveHostUserId === user?.id || user?.role === "ADMIN";
                  const humanCount = room.players.filter((player) => !player.isBot).length;
                  const botCount = room.players.filter((player) => player.isBot).length;
                  return (
                    <Card key={room.id} className="border-emerald-400/30 bg-[#0f1d1a]">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-emerald-100">Room {room.code}</p>
                          <p className="text-sm text-emerald-300">
                            {room.gameId} / {room.status} / {humanCount} human{humanCount === 1 ? "" : "s"}
                            {botCount > 0 ? ` / ${botCount} bot${botCount === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canEnd ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => void endRoom(room)}>
                              <StopCircle className="h-4 w-4" />
                              End
                            </Button>
                          ) : null}
                          <Link
                            href={`/rooms/${room.code}`}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                          >
                            Rejoin
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-emerald-500/30 bg-[#0b1417] p-4 text-sm font-semibold text-emerald-100/80">
                No active rooms yet. Create one or join with a code.
              </div>
            )}
          </div>
        </section>
        <aside className="grid gap-4">
          <CreateRoomPanel />
          <JoinRoomPanel />
          <div className="hidden lg:block">
            <JoinableRoomsList />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}