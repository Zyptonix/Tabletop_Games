"use client";

import type { RoomStateView } from "@tabletop/shared";
import { Pause, Play, Save, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HostControls({
  room,
  currentUserId,
  onStart,
  onPause,
  onResume
}: {
  room: RoomStateView;
  currentUserId: string | null;
  onStart: (roomId: string) => void;
  onPause: (roomId: string) => void;
  onResume: (roomId: string) => void;
}) {
  const canHost = room.effectiveHostUserId === currentUserId;
  if (!canHost) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
      <span className="inline-flex items-center gap-2 px-2 text-xs font-black uppercase text-amber-900">
        <Crown className="h-4 w-4" />
        Host
      </span>
      {room.status === "lobby" ? (
        <Button type="button" size="sm" onClick={() => onStart(room.id)}>
          <Play className="h-4 w-4" />
          Start
        </Button>
      ) : null}
      {room.status === "in_game" ? (
        <Button type="button" size="sm" variant="outline" onClick={() => onPause(room.id)}>
          <Pause className="h-4 w-4" />
          Pause
        </Button>
      ) : null}
      {room.status === "paused" ? (
        <Button type="button" size="sm" onClick={() => onResume(room.id)}>
          <Play className="h-4 w-4" />
          Resume
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="ghost" title="Admin snapshot is available from the admin page">
        <Save className="h-4 w-4" />
      </Button>
    </div>
  );
}
