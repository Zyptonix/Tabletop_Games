"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CreateRoomPanel } from "@/components/room/CreateRoomPanel";
import { JoinRoomPanel } from "@/components/room/JoinRoomPanel";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

interface ActiveRoomResume {
  code?: string;
  gameId?: string;
  status?: string;
}

export default function DashboardPage() {
  const { user } = useAuth({ required: true });
  const [activeRoom, setActiveRoom] = useState<ActiveRoomResume | null>(null);

  useEffect(() => {
    void api.myRoom().then((result) => setActiveRoom(result.room as ActiveRoomResume | null));
  }, []);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Welcome back</p>
              <h1 className="mt-1 text-3xl font-black text-zinc-950">{user?.displayName ?? "Player"}</h1>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-emerald-50 p-3">
                <p className="text-xl font-black text-emerald-800">{user?.level ?? 1}</p>
                <p className="text-xs font-semibold text-emerald-900">Level</p>
              </div>
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-xl font-black text-amber-800">{user?.xp ?? 0}</p>
                <p className="text-xs font-semibold text-amber-900">XP</p>
              </div>
              <div className="rounded-md bg-sky-50 p-3">
                <p className="text-xl font-black text-sky-800">{user?.coins ?? 0}</p>
                <p className="text-xs font-semibold text-sky-900">Coins</p>
              </div>
            </div>
          </div>
          {activeRoom?.code ? (
            <Card className="mt-6 border-emerald-200 bg-emerald-50">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-800" />
                  <div>
                    <p className="font-bold text-emerald-950">Active room {activeRoom.code}</p>
                    <p className="text-sm text-emerald-800">{activeRoom.gameId} · {activeRoom.status}</p>
                  </div>
                </div>
                <Link
                  href={`/rooms/${activeRoom.code}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Resume
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </section>
        <aside className="grid gap-4">
          <CreateRoomPanel />
          <JoinRoomPanel />
        </aside>
      </div>
    </AppShell>
  );
}
