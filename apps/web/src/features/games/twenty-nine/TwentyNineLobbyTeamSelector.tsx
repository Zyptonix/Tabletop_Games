"use client";

import { useMemo } from "react";
import { Bot, CheckCircle2, Clock, Crown, Shield, Sparkles, User, UserCheck, ArrowRightLeft } from "lucide-react";
import type { RoomPlayerView, RoomStateView } from "@tabletop/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TwentyNineLobbyTeamSelectorProps {
  room: RoomStateView;
  currentUserId: string | null;
  onSelectSeat: (roomId: string, seat: number) => void;
  onReady?: (roomId: string, ready: boolean) => void;
  onStart?: (roomId: string) => void;
  onAddBot?: (roomId: string) => void;
  onFillBots?: (roomId: string) => void;
  onRemoveBots?: (roomId: string) => void;
}

interface SeatDef {
  seat: number;
  compass: string;
  partnerInfo: string;
}

const RED_SEATS: SeatDef[] = [
  { seat: 0, compass: "North (Dealer / First Lead)", partnerInfo: "Partners with South (Seat 3)" },
  { seat: 2, compass: "South", partnerInfo: "Partners with North (Seat 1)" }
];

const BLUE_SEATS: SeatDef[] = [
  { seat: 1, compass: "East", partnerInfo: "Partners with West (Seat 4)" },
  { seat: 3, compass: "West", partnerInfo: "Partners with East (Seat 2)" }
];

export function TwentyNineLobbyTeamSelector({
  room,
  currentUserId,
  onSelectSeat,
  onReady,
  onStart,
  onFillBots,
  onRemoveBots
}: TwentyNineLobbyTeamSelectorProps) {
  const me = room.players.find((p) => p.userId === currentUserId);
  const isHost = room.effectiveHostUserId === currentUserId;

  const playerBySeat = useMemo(() => {
    const map = new Map<number, RoomPlayerView>();
    for (const player of room.players) {
      map.set(player.seat, player);
    }
    return map;
  }, [room.players]);

  const botCount = room.players.filter((p) => p.isBot).length;
  const humanCount = room.players.length - botCount;

  const renderSeatSlot = (seatDef: SeatDef, teamTone: "red" | "blue") => {
    const player = playerBySeat.get(seatDef.seat);
    const isMe = player?.userId === currentUserId;
    const isRed = teamTone === "red";

    return (
      <div
        key={seatDef.seat}
        onClick={() => {
          if (!isMe) {
            onSelectSeat(room.id, seatDef.seat);
          }
        }}
        className={cn(
          "relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200",
          !isMe && "cursor-pointer hover:border-white/40 hover:scale-[1.01] active:scale-[0.99]",
          isMe
            ? "border-emerald-400 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50"
            : player
              ? isRed
                ? "border-rose-500/30 bg-rose-950/15 hover:bg-rose-950/25"
                : "border-sky-500/30 bg-sky-950/15 hover:bg-sky-950/25"
              : "border-dashed border-white/20 bg-black/20 hover:bg-white/5"
        )}
      >
        {/* Seat Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                isRed ? "bg-rose-500 text-white" : "bg-sky-500 text-white"
              )}
            >
              {seatDef.seat + 1}
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-white/90">
              {seatDef.compass}
            </span>
          </div>
          <span className="text-[10px] text-white/40 font-medium">
            Seat {seatDef.seat}
          </span>
        </div>

        {/* Player / Bot / Empty Slot Body */}
        <div className="my-3 min-h-[52px] flex items-center justify-between gap-3">
          {player ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black shadow-md",
                  player.isBot
                    ? "border border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : isMe
                      ? "border border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                      : "border border-white/20 bg-white/10 text-white"
                )}
              >
                {player.isBot ? (
                  <Bot className="h-5 w-5 text-amber-300" />
                ) : (
                  <User className="h-5 w-5 text-white/90" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="truncate text-sm font-black text-white">
                    {player.displayName}
                  </p>
                  {isMe ? (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-300 border border-emerald-400/30">
                      YOU
                    </span>
                  ) : null}
                  {player.isHost ? (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-400/30">
                      Host
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  {player.isBot ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300/80">
                      <Sparkles className="h-3 w-3" /> AI Bot · Always Ready
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold",
                        player.ready ? "text-emerald-400" : "text-amber-400/90"
                      )}
                    >
                      {player.ready ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> Waiting
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-white/30">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/50">Empty Seat</p>
                <p className="text-[10px] text-white/30">
                  Bot will take this seat on start
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          {!isMe && (
            <Button
              type="button"
              size="sm"
              variant={player ? "outline" : "primary"}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSeat(room.id, seatDef.seat);
              }}
              className={cn(
                "shrink-0 text-xs font-bold transition-all",
                player
                  ? "border-white/20 bg-white/5 hover:bg-white/15 text-white"
                  : isRed
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    : "bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]"
              )}
            >
              <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
              {player ? "Swap Seat" : "Take Seat"}
            </Button>
          )}
        </div>

        {/* Partner note */}
        <p className="text-[10px] text-white/40 italic">
          {seatDef.partnerInfo}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Strategy / Rules Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#071711] via-[#091b15] to-[#071711] p-4 text-white shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white">
                Team & Seat Selector · Bangladesh 29
              </h2>
              <p className="text-xs text-emerald-300/80">
                Partners sit directly opposite each other. Choose your seat to team up with your partner!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="green">{humanCount} Human{humanCount === 1 ? "" : "s"}</Badge>
            <Badge tone="gold">{botCount} Bot{botCount === 1 ? "" : "s"}</Badge>
            <Badge tone="neutral">{4 - room.players.length} Open</Badge>
          </div>
        </div>

        <p className="mt-2.5 text-xs text-white/60">
          💡 <strong className="text-white/80">How partnerships work:</strong> Seats 0 & 2 are <strong className="text-rose-400">Team Red</strong> (North & South). Seats 1 & 3 are <strong className="text-sky-400">Team Blue</strong> (East & West). Any seats not selected by players will automatically be assigned bots when the game starts.
        </p>
      </div>

      {/* Two Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* TEAM RED COLUMN */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-[#1d0a0f]/80 to-[#120508]/80 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-rose-500/20 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">
                Team Red (North & South)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-rose-400/80">
              Partnership 1
            </span>
          </div>

          <div className="space-y-3">
            {RED_SEATS.map((seatDef) => renderSeatSlot(seatDef, "red"))}
          </div>
        </div>

        {/* TEAM BLUE COLUMN */}
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-[#081524]/80 to-[#040e18]/80 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-sky-500/20 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-sky-300">
                Team Blue (East & West)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-sky-400/80">
              Partnership 2
            </span>
          </div>

          <div className="space-y-3">
            {BLUE_SEATS.map((seatDef) => renderSeatSlot(seatDef, "blue"))}
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {isHost && onFillBots ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFillBots(room.id)}
              className="border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
            >
              <Bot className="mr-1.5 h-4 w-4" />
              Fill Empty with Bots
            </Button>
          ) : null}

          {isHost && botCount > 0 && onRemoveBots ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemoveBots(room.id)}
              className="border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            >
              Remove Bots
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {me && onReady ? (
            <Button
              type="button"
              onClick={() => onReady(room.id, !me.ready)}
              className={cn(
                "font-black tracking-wide transition-all shadow-lg",
                me.ready
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40"
              )}
            >
              {me.ready ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Ready (Click to Unready)
                </>
              ) : (
                <>
                  <Clock className="mr-1.5 h-4 w-4" /> Ready Up
                </>
              )}
            </Button>
          ) : null}

          {isHost && onStart ? (
            <Button
              type="button"
              onClick={() => onStart(room.id)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 font-black text-black hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <Crown className="mr-1.5 h-4 w-4 text-black" />
              Start Match
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

