"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, Users } from "lucide-react";
import type { JoinableRoomSummary } from "@tabletop/shared";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function JoinableRoomsList() {
  const router = useRouter();
  const [rooms, setRooms] = useState<JoinableRoomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadRooms();
    const interval = window.setInterval(() => void loadRooms(), 8000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="rounded-lg border border-emerald-500/30 bg-[#0b1417] p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_18px_32px_rgba(2,6,23,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-400">Join a table</p>
          <h2 className="text-xl font-black text-emerald-50">Open lobbies</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadRooms()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? <p className="mt-3 rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm font-semibold text-red-200">{error}</p> : null}

      <div className="mt-4 grid gap-3">
        {rooms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-emerald-500/30 bg-[#0d1719] p-4 text-sm font-semibold text-emerald-100/80">
            No joinable games right now. Create one or keep the code box handy.
          </div>
        ) : null}

        {rooms.map((room) => (
          <Card key={room.id} className="border-emerald-400/25 bg-[#11211d]">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-black text-emerald-50">{room.gameName}</p>
                <p className="text-sm font-semibold text-emerald-300">
                  Room {room.code} / {room.status} / host {room.hostDisplayName ?? "Unknown"}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-100/75">
                  <Users className="h-3.5 w-3.5" />
                  {room.playerCount}/{room.maxPlayers} seats
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => void joinRoom(room.code)} disabled={joiningCode === room.code}>
                {joiningCode === room.code ? "Joining" : "Join"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}