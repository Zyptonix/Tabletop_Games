"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

type GameLeaderboard = { id: string; title: string; rows: LeaderboardRow[] };

export default function LeaderboardsPage() {
  useAuth({ required: true });
  const [xpRows, setXpRows] = useState<LeaderboardRow[]>([]);
  const [gameBoards, setGameBoards] = useState<GameLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLeaderboards() {
      try {
        const [xpResult, gamesResult] = await Promise.all([api.xpLeaderboard(), api.games()]);
        const boards = await Promise.all(gamesResult.games.map(async (game) => {
          const result = await api.gameWinsLeaderboard(game.id);
          return {
            id: game.id,
            title: `${game.displayName} · Wins and Score`,
            rows: result.leaderboard as LeaderboardRow[]
          };
        }));
        if (!cancelled) {
          setXpRows(xpResult.leaderboard as LeaderboardRow[]);
          setGameBoards(boards);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Leaderboards could not be loaded. Check that the local game server is running, then refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadLeaderboards();
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="rounded-2xl border border-emerald-400/20 bg-[#0b1513] p-5">
          <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-300/70">Tabletop Arena</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-50">Leaderboards</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-100/60">Global XP and the registered games' results are shown separately. Game boards use recorded wins, match scores, rating and participation from completed matches.</p>
        </section>
        {error ? <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          <LeaderboardTable title="Global XP and Coins" rows={xpRows} mode="global" />
          {gameBoards.map((board) => <LeaderboardTable key={board.id} title={board.title} rows={board.rows} mode="game" />)}
        </div>
        {loading ? <p className="text-sm text-emerald-100/55">Loading leaderboards…</p> : null}
        {!loading && !error && gameBoards.length === 0 ? <p className="rounded-xl border border-dashed border-emerald-400/20 p-4 text-sm text-emerald-100/60">No game modules are registered yet.</p> : null}
      </div>
    </AppShell>
  );
}
