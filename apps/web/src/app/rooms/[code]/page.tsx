"use client";

import { useParams } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import type { PublicClassicUnoState, PublicNoMercyState } from "@tabletop/game-core";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/useAuth";
import { useRoomSocket } from "@/lib/socket/useRoomSocket";
import { GameShell } from "@/features/game-shell/GameShell";
import { ClassicUnoTable } from "@/features/games/classic-uno/ClassicUnoTable";
import { REACTION_PREFIX } from "@/features/games/classic-uno/ReactionOverlay";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const { user } = useAuth({ required: true });
  const roomCode = params.code?.toUpperCase();
  const socketState = useRoomSocket(roomCode);

  if (!socketState.room) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            <span className="font-semibold">Joining room {roomCode}</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const room = socketState.room;
  const unoState =
    room.gameId === "classic-uno" || room.gameId === "uno-no-mercy"
      ? (socketState.gameState as PublicClassicUnoState | PublicNoMercyState | null)
      : null;

  return (
    <AppShell wide={room.status !== "lobby"}>
      {socketState.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{socketState.error}</div>
      ) : null}
      <GameShell
        connected={socketState.connected}
        room={room}
        currentUserId={user?.id ?? null}
        timer={socketState.timer}
        onReady={socketState.sendReady}
        onStart={socketState.startRoom}
        onPause={socketState.pauseRoom}
        onResume={socketState.resumeRoom}
        onEnd={socketState.endRoom}
        onAddBot={socketState.addBot}
        onFillBots={socketState.fillBots}
        onRemoveBots={socketState.removeBots}
      >
        {room.status === "lobby" ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-600">Invite code</p>
                  <p className="text-3xl font-black tracking-wide text-zinc-950">{room.code}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(room.code)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">{room.players.length} players</Badge>
                <Badge tone="blue">{room.gameId}</Badge>
                <Badge tone="neutral">{room.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : unoState ? (
          <ClassicUnoTable
            room={room}
            state={unoState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user?.id ?? null}
            currentUserRole={user?.role ?? null}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onReaction={(emoji) => socketState.sendChat(room.id, `${REACTION_PREFIX}${emoji}`)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
          />
        ) : (
          <Card>
            <CardContent className="p-5 font-semibold">Waiting for game state</CardContent>
          </Card>
        )}
      </GameShell>
    </AppShell>
  );
}
