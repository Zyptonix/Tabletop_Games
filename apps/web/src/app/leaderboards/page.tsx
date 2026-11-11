"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";
import {
  Trophy,
  Crown,
  Flame,
  Gamepad2,
  Users,
  Sparkles,
  RefreshCw,
  Swords,
  ChevronRight,
  TrendingUp,
  ShieldCheck
} from "lucide-react";

interface GameTab {
  id: string;
  displayName: string;
  icon: string;
  tagline?: string;
}

const GAME_TABS: GameTab[] = [
  { id: "global", displayName: "Overall Arena", icon: "👑", tagline: "Global XP, tournament wins, player levels, and total arena prestige." },
  { id: "twenty-nine", displayName: "Twenty-Nine", icon: "🃏", tagline: "South Asian trick-taking Bangladesh rules: bidding, trump reveals, and team pairs." },
  { id: "poker", displayName: "Poker (Hold’em)", icon: "♠️", tagline: "Texas Hold’em tournament survival, chip earnings, and final showdown victories." },
  { id: "blackjack", displayName: "Blackjack (21)", icon: "🎰", tagline: "Classic Vegas casino table: dealer showdowns, double downs, and chip bankrolls." },
  { id: "classic-uno", displayName: "Classic UNO", icon: "🌈", tagline: "Color matching, wild card counters, skips, reverse plays, and hand-clearing wins." },
  { id: "uno-no-mercy", displayName: "UNO No Mercy", icon: "🔥", tagline: "High-stakes merciless UNO: +10 draw stacks, 25-card eliminations, and roulette." },
  { id: "chess", displayName: "Chess", icon: "♟️", tagline: "Classic grandmaster strategy: checkmates, Elo ratings, and tactical endgames." },
  { id: "connect-four", displayName: "Connect Four", icon: "🔵", tagline: "4-in-a-row vertical grid tactics, diagonal traps, and rapid duels." },
  { id: "battleship", displayName: "Battleship", icon: "🎯", tagline: "Naval warfare grid strategy, fleet placements, and accurate direct hits." },
  { id: "mafia-werewolf", displayName: "Mafia / Werewolf", icon: "🕵️", tagline: "Social deduction, night voting, villager alliances, and deceptive bluffs." },
  { id: "strategic-shockwave", displayName: "Strategic Shockwave", icon: "💥", tagline: "Destructive explosive grid control, territory traps, and bomb detonations." },
  { id: "reversi", displayName: "Reversi", icon: "⚪", tagline: "Othello-style disc flipping, corner captures, and board dominance." },
  { id: "barricades", displayName: "Barricades", icon: "🚧", tagline: "Obstacle course race to the summit with dice rolls and tactical blockades." },
  { id: "codenames", displayName: "Codenames", icon: "🔎", tagline: "Secret agent word associations, spymaster clues, and operative deductions." }
];

export default function LeaderboardsPage() {
  const { user } = useAuth({ required: false });

  const [activeTab, setActiveTab] = useState<string>("global");
  const [xpRows, setXpRows] = useState<LeaderboardRow[]>([]);
  const [gamesMap, setGamesMap] = useState<Record<string, LeaderboardRow[]>>({});
  const [arenaStats, setArenaStats] = useState<{
    totalMatches: number;
    totalPlayers: number;
    totalGamesPlayed: number;
  }>({ totalMatches: 0, totalPlayers: 0, totalGamesPlayed: 0 });

  const [registeredGames, setRegisteredGames] = useState<Array<{ id: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLeaderboards() {
    setLoading(true);
    setError(null);
    try {
      // 1. Try unified summary endpoint first (super fast single query)
      const summary = await api.leaderboardSummary().catch(() => null);

      if (summary) {
        setXpRows(summary.global as LeaderboardRow[]);
        setGamesMap(summary.games as Record<string, LeaderboardRow[]>);
        if (summary.stats) {
          setArenaStats(summary.stats);
        }
      } else {
        // Fallback to legacy individual routes if summary not available
        const [xpResult, gamesResult] = await Promise.all([
          api.xpLeaderboard().catch(() => ({ leaderboard: [] })),
          api.games().catch(() => ({ games: [] }))
        ]);

        setXpRows((xpResult.leaderboard as LeaderboardRow[]) ?? []);
        setRegisteredGames(gamesResult.games ?? []);

        // Load stats for top games
        const map: Record<string, LeaderboardRow[]> = {};
        for (const game of gamesResult.games.slice(0, 10)) {
          const gameRes = await api.gameWinsLeaderboard(game.id).catch(() => ({ leaderboard: [] }));
          map[game.id] = (gameRes.leaderboard as LeaderboardRow[]) ?? [];
        }
        setGamesMap(map);
      }
    } catch (err) {
      console.error("Leaderboard load failed:", err);
      setError("Unable to retrieve live leaderboards right now. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboards();
  }, []);

  // Merge known games with any additional registered games from server
  const allTabs = useMemo(() => {
    const knownIds = new Set(GAME_TABS.map((t) => t.id));
    const extraTabs: GameTab[] = registeredGames
      .filter((g) => !knownIds.has(g.id))
      .map((g) => ({
        id: g.id,
        displayName: g.displayName,
        icon: "🎮",
        tagline: `Match wins and player ratings for ${g.displayName}.`
      }));
    return [...GAME_TABS, ...extraTabs];
  }, [registeredGames]);

  // Current active game tab data
  const currentTab = useMemo(() => {
    return allTabs.find((t) => t.id === activeTab) ?? allTabs[0]!;
  }, [allTabs, activeTab]);

  const activeRows = useMemo(() => {
    if (activeTab === "global") return xpRows;
    return gamesMap[activeTab] ?? [];
  }, [activeTab, xpRows, gamesMap]);

  const topChampion = useMemo(() => {
    return xpRows[0] ?? null;
  }, [xpRows]);

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* ============================================================ */}
        {/* HERO SECTION WITH ARENA STATS RIBBON                         */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-[#0e211c] via-[#091512] to-[#060e0c] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          {/* Ambient Corner Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Hall of Fame & Leaderboards</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Tabletop Arena Standings
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                Live rankings, match win rates, player records, and competitive Elo ratings across all arena games. Compete in multiplayer or practice matches to ascend the leaderboard.
              </p>
            </div>

            {/* Quick Refresh Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => void loadLeaderboards()}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          {/* Quick Arena Key Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Arena Players
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-white mt-1">
                {arenaStats.totalPlayers > 0 ? arenaStats.totalPlayers : xpRows.length > 0 ? xpRows.length : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Gamepad2 className="h-3 w-3" /> Matches Finalized
              </span>
              <p className="font-mono text-xl sm:text-2xl font-black text-white mt-1">
                {arenaStats.totalMatches > 0 ? arenaStats.totalMatches : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-amber-400" /> Current #1 Legend
              </span>
              <p className="font-bold text-sm sm:text-base text-amber-200 truncate mt-1">
                {topChampion ? (topChampion.displayName || topChampion.username) : "Unclaimed"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> System Status
              </span>
              <p className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Stat Tracking
              </p>
            </div>
          </div>
        </section>

        {/* Error notification if server unreachable */}
        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs font-semibold text-rose-200 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadLeaderboards()}
              className="rounded-lg bg-rose-500/20 px-3 py-1 font-bold hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* ============================================================ */}
        {/* GAME SELECTION PILL NAVIGATION BAR                           */}
        {/* ============================================================ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white/50">
              Select Category or Game:
            </span>
            <span className="text-xs text-emerald-400 font-bold">
              {allTabs.length} Categories Registered
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none [scrollbar-width:none]">
            {allTabs.map((tab) => {
              const isSelected = tab.id === activeTab;
              const rowCount = tab.id === "global" ? xpRows.length : (gamesMap[tab.id]?.length ?? 0);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-black transition-all active:scale-95 border ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "border-white/10 bg-slate-950/70 text-white/70 hover:border-white/25 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.displayName}</span>
                  {rowCount > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                        isSelected
                          ? "bg-emerald-400 text-slate-950 font-black"
                          : "bg-white/10 text-white/60 group-hover:bg-white/20"
                      }`}
                    >
                      {rowCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTIVE LEADERBOARD CONTENT DISPLAY                           */}
        {/* ============================================================ */}
        <div className="space-y-4">
          {/* Active Tab Sub-header Description */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>{currentTab.icon}</span>
                <span>{currentTab.displayName} Standings</span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                {currentTab.tagline}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
              <span>{activeRows.length} ranked competitor{activeRows.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {/* Unified Leaderboard Table & Podium */}
          <LeaderboardTable
            title={`${currentTab.displayName} Standings`}
            gameId={currentTab.id}
            gameDisplayName={currentTab.displayName}
            rows={activeRows}
            mode={activeTab === "global" ? "global" : "game"}
            currentUserId={user?.id ?? null}
            loading={loading}
          />
        </div>
      </div>
    </AppShell>
  );
}
