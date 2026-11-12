"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import type {
  PublicClassicUnoState,
  PublicGridGameState,
  PublicNoMercyState,
  PublicBoardGameState,
  PublicStrategicShockwaveState,
  PublicTwentyNineState,
  PublicWerewolfState,
  PublicSnakesAndLaddersState,
  SnakesAndLaddersPieceId
} from "@tabletop/game-core";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/useAuth";
import { useRoomSocket } from "@/lib/socket/useRoomSocket";
import { GameShell } from "@/features/game-shell/GameShell";
import { BoardGamesTable } from "@/features/games/board-games/BoardGamesTable";
import { BoardGameTable } from "@/features/games/board-games/BoardGameTable";
import { ClassicUnoTable } from "@/features/games/classic-uno/ClassicUnoTable";
import { StrategicShockwaveTable } from "@/features/games/strategic-shockwave/StrategicShockwaveTable";
import { TwentyNineTable } from "@/features/games/twenty-nine/TwentyNineTable";
import { TwentyNineLobbyTeamSelector } from "@/features/games/twenty-nine/TwentyNineLobbyTeamSelector";
import { MafiaWerewolfTable } from "@/features/games/mafia-werewolf/MafiaWerewolfTable";
import { SnakesAndLaddersTable, PiecePicker } from "@/features/games/snakes-and-ladders";
import { REACTION_PREFIX } from "@/features/games/classic-uno/ReactionOverlay";
import { GamePausedOverlay } from "@/components/game/GamePausedOverlay";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const { user, loading } = useAuth({ required: true });
  const roomCode = params.code?.toUpperCase();
  const socketState = useRoomSocket(loading || !user ? undefined : roomCode);
  const [myLobbyPiece, setMyLobbyPiece] = useState<SnakesAndLaddersPieceId>("horse");

  if (loading || !user) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            <span className="font-semibold">Loading your account...</span>
          </div>
        </div>
      </AppShell>
    );
  }

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
  const werewolfState =
    room.gameId === "mafia-werewolf"
      ? (socketState.gameState as PublicWerewolfState | null)
      : null;
  const shockwaveState =
    room.gameId === "strategic-shockwave"
      ? (socketState.gameState as PublicStrategicShockwaveState | null)
      : null;
  const twentyNineState =
    room.gameId === "twenty-nine"
      ? (socketState.gameState as PublicTwentyNineState | null)
      : null;
  const gridGameState =
    room.gameId === "connect-four" || room.gameId === "reversi"
      ? (socketState.gameState as PublicGridGameState | null)
      : null;
  const snakesAndLaddersState =
    room.gameId === "snakes-and-ladders" || room.gameId === "ludo"
      ? (socketState.gameState as PublicSnakesAndLaddersState | null)
      : null;

  const boardGameState =
    ["chess", "battleship", "barricades", "monopoly", "risk", "world-conquest", "codenames", "poker", "blackjack"].includes(room.gameId as string)
      ? (socketState.gameState as PublicBoardGameState | null)
      : null;

  return (
    <AppShell wide={room.status !== "lobby"}>
      {socketState.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{socketState.error}</div>
      ) : null}
      <GameShell
        connected={socketState.connected}
        room={room}
        currentUserId={user.id}
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
        <GamePausedOverlay
          room={room}
          currentUserId={user.id}
          onResume={socketState.resumeRoom}
          gameName={room.gameId}
        />
        {room.status === "lobby" ? (
          <div className="space-y-4">
            <Card className="border-white/10 bg-[#09141f]">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-zinc-400">Invite code</p>
                    <p className="text-3xl font-black tracking-wide text-white">{room.code}</p>
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

                {/* Lobby Game Settings (e.g. Battleship / Chess Clock) */}
                {room.gameId === "battleship" || room.gameId === "chess" ? (
                  <div className="mt-4 rounded-xl border border-cyan-500/25 bg-[#051624] p-4 text-slate-200">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                        ⏱️ {room.gameId === "battleship" ? "Naval Battle Clock" : "Chess Clock"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {room.effectiveHostUserId === user.id ? "Host controls" : "Configured by host"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Timer per player</p>
                        <p className="text-xs text-slate-400">
                          {room.gameId === "battleship"
                            ? "Each commander's clock counts down only during their turn."
                            : "Each player's clock runs during their move."}
                        </p>
                      </div>

                      {room.effectiveHostUserId === user.id ? (
                        <select
                          value={Number(room.settings?.clockSeconds ?? 300)}
                          onChange={(e) =>
                            socketState.updateRoomSettings(room.id, {
                              clockSeconds: Number(e.target.value),
                            })
                          }
                          className="min-h-10 rounded-lg border border-cyan-400/30 bg-[#081e30] px-3 text-xs font-bold text-cyan-100 outline-none hover:border-cyan-400"
                        >
                          <option value={60}>1 minute (Bullet)</option>
                          <option value={180}>3 minutes (Blitz)</option>
                          <option value={300}>5 minutes (Rapid - Recommended)</option>
                          <option value={600}>10 minutes (Tactical)</option>
                          <option value={900}>15 minutes (Long match)</option>
                          <option value={1800}>30 minutes</option>
                          <option value={0}>Unlimited (Casual)</option>
                        </select>
                      ) : (
                        <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-cyan-300">
                          {Number(room.settings?.clockSeconds ?? 300) > 0
                            ? `${Math.floor(Number(room.settings?.clockSeconds ?? 300) / 60)} minutes per player`
                            : "Unlimited time"}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Snakes & Ladders Lobby Match Settings */}
                {room.gameId === "snakes-and-ladders" || room.gameId === "ludo" ? (
                  <div className="mt-4 space-y-4 rounded-xl border border-amber-500/25 bg-[#051624] p-4 text-slate-200">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        🐍 Snakes & Ladders Match Configuration
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Up to 15 Players Max
                      </span>
                    </div>

                    {/* Host Board Preset & Turn Clock */}
                    {room.effectiveHostUserId === user.id ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold text-white block mb-1">
                            Board Layout Preset
                          </label>
                          <select
                            value={String(room.settings?.boardPreset ?? "classic")}
                            onChange={(e) =>
                              socketState.updateRoomSettings(room.id, {
                                boardPreset: e.target.value
                              })
                            }
                            className="w-full min-h-10 rounded-lg border border-amber-400/30 bg-[#081e30] px-3 text-xs font-bold text-amber-100 outline-none hover:border-amber-400"
                          >
                            <option value="classic">Classic Meadow (Iconic 100-Tile)</option>
                            <option value="jungle">Serpent Jungle (Dense Serpents)</option>
                            <option value="dunes">Desert Dunes (Winding Serpents)</option>
                            <option value="chaos">Procedural Chaos (Randomized Layout)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-white block mb-1">
                            Turn Clock
                          </label>
                          <select
                            value={room.settings?.turnSeconds ? Number(room.settings.turnSeconds) : 0}
                            onChange={(e) =>
                              socketState.updateRoomSettings(room.id, {
                                turnSeconds: Number(e.target.value) > 0 ? Number(e.target.value) : null
                              })
                            }
                            className="w-full min-h-10 rounded-lg border border-amber-400/30 bg-[#081e30] px-3 text-xs font-bold text-amber-100 outline-none hover:border-amber-400"
                          >
                            <option value={0}>Unlimited time (Casual)</option>
                            <option value={15}>15 seconds (Speed Run)</option>
                            <option value={30}>30 seconds (Standard)</option>
                            <option value={60}>60 seconds (Relaxed)</option>
                          </select>
                        </div>
                      </div>
                    ) : null}

                    {/* Bangladesh Standard Rules Information */}
                    <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-xs text-white/70 space-y-1">
                      <p className="font-bold text-amber-300">📜 Bangladesh Standard Rules Active:</p>
                      <p>• <strong>Roll a 1 to enter</strong>: All pieces start at Home and require a 1 to step onto square 1.</p>
                      <p>• <strong>Exact roll to win</strong>: Overshooting square 100 bounces backwards.</p>
                      <p>• <strong>Roll a 6</strong>: Grants a bonus roll (3 consecutive sixes forfeits turn).</p>
                    </div>

                    {/* Creative Piece Selector */}
                    <div className="pt-2">
                      <PiecePicker
                        selectedPiece={
                          ((room.settings?.playerPieces as Record<string, unknown>)?.[user.id] as SnakesAndLaddersPieceId) ??
                          myLobbyPiece
                        }
                        takenByMap={(() => {
                          const map: Record<string, string> = {};
                          const playerPieces = (room.settings?.playerPieces as Record<string, string>) ?? {};
                          for (const [uid, piece] of Object.entries(playerPieces)) {
                            if (uid !== user.id) {
                              const p = room.players.find((rp) => rp.userId === uid);
                              map[piece] = p?.displayName ?? "Another player";
                            }
                          }
                          return map;
                        })()}
                        onSelect={(piece) => {
                          setMyLobbyPiece(piece);
                          if (room.effectiveHostUserId === user.id) {
                            socketState.updateRoomSettings(room.id, {
                              playerPieces: {
                                ...((room.settings?.playerPieces as Record<string, string>) ?? {}),
                                [user.id]: piece
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {room.gameId === "twenty-nine" ? (
              <TwentyNineLobbyTeamSelector
                room={room}
                currentUserId={user.id}
                onSelectSeat={socketState.selectSeat}
                onReady={socketState.sendReady}
                onStart={socketState.startRoom}
                onAddBot={socketState.addBot}
                onFillBots={socketState.fillBots}
                onRemoveBots={socketState.removeBots}
              />
            ) : null}
          </div>
        ) : werewolfState ? (
          <MafiaWerewolfTable
            room={room}
            state={werewolfState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            currentUserRole={user.role}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
          />
        ) : shockwaveState ? (
          <StrategicShockwaveTable
            room={room}
            state={shockwaveState}
            currentUserId={user.id}
            gameEvents={socketState.gameEvents}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
            onEndMatch={socketState.endRoom}
          />
        ) : twentyNineState ? (
          <TwentyNineTable
            room={room}
            state={twentyNineState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
            onReadyNextTrick={() => socketState.socket?.emit("twenty-nine:ready_next_trick")}
            onConfirmSingleHand={() => socketState.socket?.emit("twenty-nine:confirm_single_hand")}
            onReadyNextHand={() => socketState.socket?.emit("twenty-nine:ready_next_hand")}
          />
        ) : snakesAndLaddersState ? (
          <SnakesAndLaddersTable
            room={room}
            state={snakesAndLaddersState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            timer={socketState.timer}
            preferredPiece={myLobbyPiece}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
          />
        ) : boardGameState ? (
          <BoardGameTable
            room={room}
            state={boardGameState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            timer={socketState.timer}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
          />
        ) : gridGameState ? (
          <BoardGamesTable
            room={room}
            state={gridGameState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            timer={socketState.timer}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
          />
        ) : unoState ? (
          <ClassicUnoTable
            room={room}
            state={unoState}
            legalActions={socketState.legalActions}
            gameEvents={socketState.gameEvents}
            currentUserId={user.id}
            currentUserRole={user.role}
            onAction={(type, payload) => socketState.sendAction(room.id, type, payload)}
            onReaction={(emoji) => socketState.sendChat(room.id, `${REACTION_PREFIX}${emoji}`)}
            onChat={socketState.sendChat}
            onEndMatch={socketState.endRoom}
            onPause={socketState.pauseRoom}
            onResume={socketState.resumeRoom}
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
