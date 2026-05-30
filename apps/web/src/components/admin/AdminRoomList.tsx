"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActiveRoom {
  id?: string;
  code?: string;
  gameId?: string;
  status?: string;
  playerCount?: number;
  connectedCount?: number;
  actionNumber?: number;
}

export function AdminRoomList() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);

  useEffect(() => {
    void api.activeRooms().then((result) => setRooms(result.rooms as ActiveRoom[]));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Rooms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rooms.length === 0 ? <p className="text-sm font-semibold text-zinc-500">No active rooms</p> : null}
        {rooms.map((room) => (
          <div key={room.id} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">{room.code}</p>
              <p className="text-sm text-zinc-500">{room.gameId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{room.status}</Badge>
              <Badge tone="green">{room.connectedCount}/{room.playerCount}</Badge>
              <Badge tone="neutral">#{room.actionNumber}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
