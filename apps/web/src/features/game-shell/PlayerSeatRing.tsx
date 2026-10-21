"use client";

import type { RoomPlayerView } from "@tabletop/shared";
import { Badge } from "@/components/ui/badge";

export function PlayerSeatRing({ players }: { players: RoomPlayerView[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => (
        <div
          key={player.userId}
          className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-[#07140f]/85 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
        >
          <div>
            <p className="text-sm font-bold text-zinc-100">{player.displayName}</p>
            <p className="text-xs text-emerald-300/70">Seat {player.seat + 1}</p>
          </div>
          <div className="flex items-center gap-2">
            {player.isHost ? <Badge tone="gold">Host</Badge> : null}
            <Badge tone={player.connected ? "green" : "red"}>{player.connected ? "Online" : "Away"}</Badge>
            <Badge tone={player.ready ? "blue" : "neutral"}>{player.ready ? "Ready" : "Waiting"}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
