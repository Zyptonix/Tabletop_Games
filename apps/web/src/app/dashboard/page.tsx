"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  Filter,
  FlaskConical,
  Gamepad2,
  Plus,
  RefreshCw,
  Search,
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
import { getGameVisualMeta } from "@/config/game-thumbnails.config";

interface GameSummary {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
}

type CategoryFilter = "all" | "cards" | "board" | "strategy" | "party";

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
  const meta = getGameVisualMeta(game.id);
  const [imageError, setImageError] = useState(false);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#091214]/95 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/35 hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)]">
      {/* 16:9 Thumbnail Header Banner */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/50">
        {!imageError ? (
          <img
            src={meta.thumbnailUrl}
            alt={game.displayName}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${meta.fallbackGradient} p-6 text-center`}>
            <span className="text-3xl opacity-60">🎮</span>
          </div>
        )}

        {/* Ambient Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#091214] via-[#091214]/40 to-black/25" />

        {/* Top Badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-200 backdrop-blur-md">
            {meta.categoryLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider backdrop-blur-md ${
              isComplete
                ? "border-emerald-400/30 bg-emerald-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "border-amber-400/30 bg-amber-950/80 text-amber-200"
            }`}
          >
            {isComplete ? <CircleCheck className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
            {isComplete ? "Ready to play" : "Prototype"}
          </span>
        </div>

        {/* Subtle Player Count Floating Tag */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[0.7rem] font-medium text-slate-300 backdrop-blur-sm">
            <Users className="h-3 w-3 text-slate-400" />
            {game.minPlayers === game.maxPlayers ? `${game.minPlayers} Players` : `${game.minPlayers}–${game.maxPlayers} Players`}
          </span>
          {meta.highlight ? (
            <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[0.65rem] font-bold text-emerald-300/80 backdrop-blur-sm">
              {meta.highlight}
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-lg font-black tracking-tight text-white transition-colors group-hover:text-emerald-200">
          {game.displayName}
        </h3>
        <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-slate-400 line-clamp-2">
          {meta.tagline}
        </p>

        {/* Action Button */}
        <div className="mt-4 border-t border-white/[0.07] pt-3">
          <Button
            type="button"
            className={`w-full font-bold shadow-md transition-all duration-200 ${
              isComplete
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border border-white/10 bg-white/[0.08] text-slate-100 hover:bg-white/[0.14]"
            }`}
            onClick={() => onPlay(game)}
          >
            {isComplete ? "Create game" : "Launch test room"}
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const completedGames = useMemo(() => getCompletedGames(games), [games]);
  const prototypeGames = useMemo(() => getPrototypeGames(games), [games]);
  const selectedGame = games.find((game) => game.id === selectedGameId);

  // Filter games based on category and search query
  const filteredCompletedGames = useMemo(() => {
    return completedGames.filter((game) => {
      const meta = getGameVisualMeta(game.id);
      const matchesCategory = categoryFilter === "all" || meta.category === categoryFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        game.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [completedGames, categoryFilter, searchQuery]);

  const filteredPrototypeGames = useMemo(() => {
    return prototypeGames.filter((game) => {
      const meta = getGameVisualMeta(game.id);
      const matchesCategory = categoryFilter === "all" || meta.category === categoryFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        game.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [prototypeGames, categoryFilter, searchQuery]);

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
      <div className="menu-dark space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-200/10 bg-[#081310] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.35)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_0%,rgba(16,185,129,0.18),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgba(14,165,233,0.10),transparent_45%)]"
          />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.23em] text-emerald-300/80">
                <Sparkles className="h-4 w-4" /> Tabletop Arena Lounge
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Welcome back, {user?.displayName ?? "Player"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Pick a tabletop showdown, try experiments in development, or resume your active matches.
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
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10"
              onClick={() => setJoinDialogOpen(true)}
            >
              <Users className="h-4 w-4" /> Join by code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => {
                void loadGames();
                void loadActiveRooms();
              }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh dashboard
            </Button>
          </div>
        </section>

        {/* Open Lobbies */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/65">Play together</p>
            <h2 className="mt-1 text-2xl font-black text-white">Open lobbies</h2>
          </div>
          <JoinableRoomsList />
        </section>

        {/* Active Games */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/65">Pick up where you left off</p>
              <h2 className="mt-1 text-2xl font-black text-white">My active games</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-slate-300">
              {activeRooms.length} active
            </span>
          </div>
          {activeRoomsError ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-950/30 p-3 text-sm text-rose-200">
              {activeRoomsError}
            </div>
          ) : null}
          {activeRooms.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {activeRooms.map((room) => {
                const canEnd = room.effectiveHostUserId === user?.id || user?.role === "ADMIN";
                const humanCount = room.players.filter((player) => !player.isBot).length;
                const botCount = room.players.filter((player) => player.isBot).length;
                return (
                  <article
                    key={room.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200/10 bg-[#0b1515] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-black text-white">
                        {room.gameId} <span className="font-medium text-slate-400">· Room {room.code}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {room.status} · {humanCount} human{humanCount === 1 ? "" : "s"}
                        {botCount > 0 ? ` · ${botCount} bot${botCount === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canEnd ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/10"
                          size="sm"
                          onClick={() => void endRoom(room)}
                        >
                          <StopCircle className="h-4 w-4" /> End
                        </Button>
                      ) : null}
                      <Link
                        href={`/rooms/${room.code}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                      >
                        Rejoin <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
              No active rooms yet. Create a game above or join a friend with a room code.
            </div>
          )}
        </section>

        {/* Main Games Collection Section */}
        <section className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/65">The main collection</p>
              <h2 className="mt-1 text-2xl font-black text-white">Games</h2>
              <p className="mt-1 text-sm text-slate-400">
                Explore finished and ready-to-play tabletop titles.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.07] px-3 py-1 text-xs font-bold text-emerald-200">
                {filteredCompletedGames.length} ready
              </span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#091214] p-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === "all"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                All Games
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("cards")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === "cards"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                Card Games
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("board")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === "board"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                Board Games
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("strategy")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === "strategy"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                Strategy
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("party")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === "party"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                Party & Deduction
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[14rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>

          {gamesError ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-950/30 p-4 text-sm font-semibold text-rose-200">
              {gamesError}
            </div>
          ) : gamesLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-12 text-center text-sm font-medium text-slate-400">
              Loading games catalog…
            </div>
          ) : filteredCompletedGames.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCompletedGames.map((game) => (
                <GameCard key={game.id} game={game} status="complete" onPlay={openCreateDialog} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center text-sm text-slate-400">
              No games found matching the selected filter or search query.
            </div>
          )}
        </section>

        {/* Collapsible Test Games / Prototypes Section */}
        <section className="overflow-hidden rounded-2xl border border-amber-100/10 bg-[#0a1113]/85">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025] sm:px-6"
            aria-expanded={testGamesOpen}
            aria-controls="test-games-list"
            onClick={() => setTestGamesOpen((open) => !open)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-100/15 bg-amber-100/[0.07] text-amber-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-black text-white">Test Games & Prototypes</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Experimental strategy modules, classic prototypes, and games in development
                </span>
              </span>
              <span className="rounded-full border border-amber-100/15 bg-amber-100/[0.06] px-2.5 py-1 text-xs font-bold text-amber-100">
                {filteredPrototypeGames.length}
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${testGamesOpen ? "rotate-180" : ""}`} />
          </button>

          {testGamesOpen ? (
            <div id="test-games-list" className="border-t border-white/8 p-4 sm:p-5">
              {gamesLoading ? (
                <p className="p-3 text-sm text-slate-400">Loading test games…</p>
              ) : filteredPrototypeGames.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredPrototypeGames.map((game) => (
                    <GameCard key={game.id} game={game} status="prototype" onPlay={openCreateDialog} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  No prototype games match that filter.
                </p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* Create Room Modal Dialog */}
      <Dialog
        open={createDialogOpen}
        title={selectedGame ? `Create ${selectedGame.displayName} room` : "Create a game room"}
        onClose={() => {
          setCreateDialogOpen(false);
          setSelectedGameId(null);
        }}
      >
        <CreateRoomPanel
          key={selectedGameId ?? "completed-games"}
          initialGameId={selectedGameId ?? undefined}
          hideGameSelect={Boolean(selectedGameId)}
          allowedGameIds={selectedGameId ? [selectedGameId] : completedGames.map((game) => game.id)}
        />
      </Dialog>

      {/* Join Room Modal Dialog */}
      <Dialog open={joinDialogOpen} title="Join a game" onClose={() => setJoinDialogOpen(false)}>
        <JoinRoomPanel />
      </Dialog>
    </AppShell>
  );
}
