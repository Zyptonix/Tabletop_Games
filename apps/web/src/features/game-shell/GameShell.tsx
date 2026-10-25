/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import type { RoomStateView, TimerView } from "@tabletop/shared";
import { HostControls } from "./HostControls";
import { PlayerSeatRing } from "./PlayerSeatRing";
import { ReconnectOverlay } from "./ReconnectOverlay";
import { TurnTimer } from "./TurnTimer";

export function GameShell({
  connected,
  room,
  currentUserId,
  timer,
  children,
  onReady,
  onStart,
  onPause,
  onResume,
  onEnd,
  onAddBot,
  onFillBots,
  onRemoveBots
}: {
  connected: boolean;
  room: RoomStateView;
  currentUserId: string | null;
  timer: TimerView | null;
  children: React.ReactNode;
  onReady: (roomId: string, ready: boolean) => void;
  onStart: (roomId: string) => void;
  onPause: (roomId: string) => void;
  onResume: (roomId: string) => void;
  onEnd?: (roomId: string) => void;
  onAddBot?: (roomId: string) => void;
  onFillBots?: (roomId: string) => void;
  onRemoveBots?: (roomId: string) => void;
}) {
  const me = room.players.find((player) => player.userId === currentUserId);
  const inGame = room.status !== "lobby";

  /**
   * Active games own their whole layout now.
   * Chat, host controls, timer, and table chrome are handled by the game screen.
   */
  if (inGame) {
    return (
      <div className="tt-game-viewport h-dvh bg-[#020604] text-white">
        <ReconnectOverlay connected={connected} />
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReconnectOverlay connected={connected} />
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-[#07120e]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300/80">Room {room.code}</p>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">{room.gameId}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {room.status === "lobby" && me ? (
            <button
              type="button"
              className="min-h-11 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.16)] transition hover:border-emerald-300/55 hover:bg-emerald-500/16"
              onClick={() => onReady(room.id, !me.ready)}
            >
              {me.ready ? "Unready" : "Ready"}
            </button>
          ) : null}
          <HostControls
            room={room}
            currentUserId={currentUserId}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onEnd={onEnd}
            onAddBot={onAddBot}
            onFillBots={onFillBots}
            onRemoveBots={onRemoveBots}
          />
        </div>
      </div>
      <TurnTimer timer={timer} />
      {room.status === "lobby" ? <PlayerSeatRing players={room.players} /> : null}
      <div>{children}</div>
    </div>
  );
}