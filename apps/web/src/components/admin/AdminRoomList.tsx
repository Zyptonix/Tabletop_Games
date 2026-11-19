"use client";

import { useCallback, useEffect, useState } from "react";
import { GAME_LABELS, type ActiveRoomSummary } from "@tabletop/shared";
import { api, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameConfirmModal } from "@/components/ui/GameConfirmModal";
import { Gamepad2, Loader2, RefreshCw, Trash2, User, Users } from "lucide-react";

export function AdminRoomList() {
  const [rooms, setRooms] = useState<ActiveRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [roomToRemove, setRoomToRemove] = useState<ActiveRoomSummary | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.activeRooms();
      setRooms(result.rooms);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load active rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRemoveRoom() {
    if (!roomToRemove) return;
    const target = roomToRemove;
    setRemovingId(target.id);
    try {
      await api.adminRemoveRoom(target.id);
      setRooms((current) => current.filter((r) => r.id !== target.id));
      setMessage(`Room ${target.code} (${GAME_LABELS[target.gameId] ?? target.gameId}) has been removed.`);
      setError("");
      setRoomToRemove(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Failed to remove room.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Card className="border-white/10 bg-[#09141f]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-base font-black tracking-tight text-white">
              Active Games & Rooms
            </CardTitle>
            <Badge tone="blue" className="ml-1 text-xs">
              {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-zinc-300 hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {message ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
              {error}
            </div>
          ) : null}

          {rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm font-semibold text-zinc-500">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Loading active rooms...</span>
                </div>
              ) : (
                "No active game rooms found on the server."
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            {rooms.map((room) => {
              const gameName = GAME_LABELS[room.gameId] ?? room.gameId;
              const isRemoving = removingId === room.id;

              return (
                <div
                  key={room.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black tracking-wider text-white">
                        {room.code}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {gameName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3 text-zinc-500" />
                        Host:{" "}
                        <strong className="font-semibold text-zinc-300">
                          {room.hostDisplayName || "Unknown"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Created: {new Date(room.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        room.status === "in_game"
                          ? "green"
                          : room.status === "paused"
                          ? "gold"
                          : "blue"
                      }
                      className="capitalize"
                    >
                      {room.status.replace("_", " ")}
                    </Badge>

                    <Badge tone="neutral" className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.connectedCount}/{room.playerCount}
                    </Badge>

                    <Badge tone="neutral">
                      #{room.actionNumber}
                    </Badge>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRoomToRemove(room)}
                      disabled={isRemoving}
                      title="Remove and terminate this active game room"
                      className="ml-auto h-8 gap-1.5 border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300 hover:bg-rose-500 hover:text-white"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal for Game Removal */}
      <GameConfirmModal
        open={Boolean(roomToRemove)}
        title={`Remove Room ${roomToRemove?.code}?`}
        message={`Are you sure you want to remove active room ${roomToRemove?.code} (${
          roomToRemove ? GAME_LABELS[roomToRemove.gameId] ?? roomToRemove.gameId : ""
        }) hosted by ${
          roomToRemove?.hostDisplayName || "Player"
        }? All players in this room will be disconnected immediately.`}
        confirmLabel="Remove Game"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => void handleRemoveRoom()}
        onCancel={() => setRoomToRemove(null)}
      />
    </>
  );
}
