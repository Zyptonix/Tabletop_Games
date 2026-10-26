"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  FlaskConical,
  Gamepad2,
  Plus,
  RefreshCw,
  Sparkles,
  StopCircle,
  Users,
} from "lucide-react";
import type { RoomStateView } from "@tabletop/shared";
import { AppShell } from "@/components/layout/AppShell";
import { CreateRoomPanel } from "@/components/room/CreateRoomPanel";
import { JoinRoomPanel } from "@/components/room/JoinRoomPanel";
import { JoinableRoomsList } from "@/components/room/JoinableRoomsList";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";
import {
  getCompletedGames,
  getPrototypeGames,
  type GameStatus,
} from "@/config/game-status.config";

interface GameSummary {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}

function GameCard({
  game,
  status,
  onPlay,
}: {
  game: GameSummary;
  status: GameStatus;
  onPlay: (game: GameSummary) => void;
}) {
  const isComplete = status === "complete";

  return (
    <article className="group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1515]/90 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-[#0d1b19]">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-80 ${isComplete
          ? "bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-400/5"
          : "bg-gradient-to-br from-amber-400/10 via-transparent to-sky-400/5"}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl border ${isComplete
          ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-200"
          : "border-amber-200/20 bg-amber-200/10 text-amber-100"}`}>
          {isComplete ? <Gamepad2 className="h-6 w-6" /> : <FlaskConical className="h-6 w-6" />}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.15em] ${isComplete
          ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-200"
          : "border-amber-200/20 bg-amber-200/10 text-amber-100"}`}>
          {isComplete ? <CircleCheck className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
          {isComplete ? "Ready to play" : "Prototype"}
        </span>
      </div>

      <div className="relative mt-5 flex-1">
        <h3 className="text-lg font-black tracking-tight text-white">{game.displayName}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {game.minPlayers}–{game.maxPlayers} players
        </p>
      </div>

      <div className="relative mt-5">
        <Button type="button" className="w-full" onClick={() => onPlay(game)}>
          {isComplete ? "Create game" : "Launch test room"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth({ required: true });
  const [activeRooms, setActiveRooms] = useState<RoomStateView[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [activeRoomsError, setActiveRoomsError] = useState<string | null>(null);
  const [testGamesOpen, setTestGamesOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const completedGames = useMemo(() => getCompletedGames(games), [games]);
  const prototypeGames = useMemo(() => getPrototypeGames(games), [games]);
  const selectedGame = games.find((game) => game.id === selectedGameId);

  async function loadGames() {
    setGamesLoading(true);
    setGamesError(null);
    try {
      const result = await api.games();
      setGames(result.games);
    } catch (error) {
      setGamesError(error instanceof Error ? error.message : "Could not load the game catalogue.");
    } finally {
      setGamesLoading(false);
    }
  }

  async function loadActiveRooms() {
    setActiveRoomsError(null);
    try {
      const result = await api.myRoom();
      setActiveRooms((result.rooms ?? []).filter((room) => room.status !== "finished" && room.status !== "abandoned"));
    } catch (error) {
      setActiveRoomsError(error instanceof Error ? error.message : "Could not load active rooms.");
    }
  }

  useEffect(() => {
    void loadGames();
    void loadActiveRooms();
  }, []);

  function openCreateDialog(game?: GameSummary) {
    setSelectedGameId(game?.id ?? null);
    setCreateDialogOpen(true);
  }

  async function endRoom(room: RoomStateView) {
    if (!window.confirm(`End room ${room.code} for everyone?`)) return;
    try {
      await api.endRoom(room.id);
      await loadActiveRooms();
    } catch (error) {
      setActiveRoomsError(error instanceof Error ? error.message : "Could not end this room.");
    }
  }

  return (
    <AppShell>
      <div className="menu-dark space-y-7">
        <section className="relative overflow-hidden rounded-3xl border border-emerald-200/10 bg-[#081310] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_0%,rgba(16,185,129,0.16),transparent_45%),radial-gradient(ellipse_at_100%_100%,rgba(14,165,233,0.08),transparent_40%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.23em] text-emerald-300/75">
                <Sparkles className="h-4 w-4" /> Your local game lounge
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Welcome back, {user?.displayName ?? "Player"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Pick a finished game, try something in development, or jump back into a table.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[21rem]">
              <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                <p className="text-2xl font-black tabular-nums text-emerald-200">{user?.level ?? 1}</p>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Level</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                <p className="text-2xl font-black tabular-nums text-amber-200">{user?.xp ?? 0}</p>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">XP</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center">
                <p className="text-2xl font-black tabular-nums text-sky-200">{user?.coins ?? 0}</p>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Coins</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Button type="button" onClick={() => openCreateDialog()}>
              <Plus className="h-4 w-4" /> Create Game
            </Button>
            <Button type="button" variant="outline" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10" onClick={() => setJoinDialogOpen(true)}>
              <Users className="h-4 w-4" /> Join by code
            </Button>
            <Button type="button" variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => { void loadGames(); void loadActiveRooms(); }}>
              <RefreshCw className="h-4 w-4" /> Refresh dashboard
            </Button>
          </div>
        </section>
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/65">Play together</p>
            <h2 className="mt-1 text-2xl font-black text-white">Open lobbies</h2>
          </div>
          <JoinableRoomsList />
        </section>
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/65">Pick up where you left off</p>
              <h2 className="mt-1 text-2xl font-black text-white">My active games</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-slate-300">{activeRooms.length} active</span>
          </div>
          {activeRoomsError ? <div className="rounded-xl border border-rose-300/20 bg-rose-950/30 p-3 text-sm text-rose-200">{activeRoomsError}</div> : null}
          {activeRooms.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {activeRooms.map((room) => {
                const canEnd = room.effectiveHostUserId === user?.id || user?.role === "ADMIN";
                const humanCount = room.players.filter((player) => !player.isBot).length;
                const botCount = room.players.filter((player) => player.isBot).length;
                return (
                  <article key={room.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200/10 bg-[#0b1515] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="font-black text-white">{room.gameId} <span className="font-medium text-slate-400">· Room {room.code}</span></p>
                      <p className="mt-1 text-sm text-slate-400">{room.status} · {humanCount} human{humanCount === 1 ? "" : "s"}{botCount > 0 ? ` · ${botCount} bot${botCount === 1 ? "" : "s"}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canEnd ? <Button type="button" variant="outline" className="border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/10" size="sm" onClick={() => void endRoom(room)}><StopCircle className="h-4 w-4" /> End</Button> : null}
                      <Link href={`/rooms/${room.code}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Rejoin <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">No active rooms yet. Create a game above or join a friend with a room code.</div>
          )}
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/65">The main collection</p>
              <h2 className="mt-1 text-2xl font-black text-white">Games</h2>
              <p className="mt-1 text-sm text-slate-400">Finished and approved games appear here.</p>
            </div>
            <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.07] px-3 py-1 text-xs font-bold text-emerald-200">
              {completedGames.length} ready
            </span>
          </div>

          {gamesError ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-950/30 p-4 text-sm font-semibold text-rose-200">{gamesError}</div>
          ) : gamesLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center text-sm font-medium text-slate-400">Loading games…</div>
          ) : completedGames.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {completedGames.map((game) => <GameCard key={game.id} game={game} status="complete" onPlay={openCreateDialog} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-sm text-slate-400">
              No completed games are configured yet. Set a game to <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-200">"complete"</code> in <code className="text-slate-200">game-status.config.ts</code> when it is ready.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-amber-100/10 bg-[#0a1113]/80">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] sm:px-6"
            aria-expanded={testGamesOpen}
            aria-controls="test-games-list"
            onClick={() => setTestGamesOpen((open) => !open)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-100/15 bg-amber-100/[0.07] text-amber-100"><FlaskConical className="h-5 w-5" /></span>
              <span>
                <span className="block text-base font-black text-white">Test Games</span>
                <span className="mt-0.5 block text-sm text-slate-400">Prototypes, experiments, and games awaiting approval</span>
              </span>
              <span className="rounded-full border border-amber-100/15 bg-amber-100/[0.06] px-2.5 py-1 text-xs font-bold text-amber-100">{prototypeGames.length}</span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${testGamesOpen ? "rotate-180" : ""}`} />
          </button>

          {testGamesOpen ? (
            <div id="test-games-list" className="border-t border-white/8 p-4 sm:p-5">
              {gamesLoading ? (
                <p className="p-3 text-sm text-slate-400">Loading test games…</p>
              ) : prototypeGames.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {prototypeGames.map((game) => <GameCard key={game.id} game={game} status="prototype" onPlay={openCreateDialog} />)}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">There are no prototype games in the current game registry.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <Dialog
        open={createDialogOpen}
        title={selectedGame ? `Create ${selectedGame.displayName} room` : "Create a game room"}
        onClose={() => { setCreateDialogOpen(false); setSelectedGameId(null); }}
      >
        <CreateRoomPanel
          key={selectedGameId ?? "completed-games"}
          {...(selectedGameId ? { initialGameId: selectedGameId } : {})}
          hideGameSelect={Boolean(selectedGameId)}
        />
      </Dialog>

      <Dialog open={joinDialogOpen} title="Join a game" onClose={() => setJoinDialogOpen(false)}>
        <JoinRoomPanel />
      </Dialog>
    </AppShell>
  );
}
