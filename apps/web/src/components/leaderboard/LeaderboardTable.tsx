"use client";

import { useState, useMemo } from "react";
import Link from "next/navigation";
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  Sparkles,
  Star,
  Search,
  ArrowUpDown,
  Coins,
  ShieldAlert,
  Gamepad2,
  TrendingUp,
  User
} from "lucide-react";

export interface LeaderboardRow {
  rank?: number;
  userId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  xp?: number;
  level?: number;
  coins?: number;
  wins?: number;
  totalWins?: number;
  gamesPlayed?: number;
  totalGamesPlayed?: number;
  totalScore?: number;
  bestScore?: number;
  losses?: number;
  winRate?: number;
  rating?: number;
}

export interface LeaderboardProps {
  title: string;
  gameId?: string | undefined;
  gameDisplayName?: string | undefined;
  rows: LeaderboardRow[];
  mode?: "global" | "game" | undefined;
  currentUserId?: string | null | undefined;
  loading?: boolean | undefined;
}

// ----------------------------------------------------------------------------
// CHAMPION PODIUM (Top 3 Players)
// ----------------------------------------------------------------------------
export function LeaderboardPodium({
  rows,
  mode = "global",
  currentUserId
}: {
  rows: LeaderboardRow[];
  mode?: "global" | "game" | undefined;
  currentUserId?: string | null | undefined;
}) {
  if (rows.length === 0) return null;

  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const third = rows[2] ?? null;

  return (
    <div className="relative my-6 flex flex-col items-center justify-center">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 -bottom-8 flex justify-center opacity-40">
        <div className="h-64 w-full max-w-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/20 to-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl items-end justify-center gap-2 sm:gap-6 px-2">
        {/* SECOND PLACE (Silver) */}
        {second ? (
          <div className="flex flex-1 flex-col items-center">
            {/* Avatar & Silver Medal */}
            <div className="relative mb-2">
              <div
                className={`relative grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full border-2 border-slate-300 bg-slate-900 shadow-[0_0_25px_rgba(203,213,225,0.4)] ${
                  second.userId === currentUserId ? "ring-4 ring-emerald-400" : ""
                }`}
              >
                {second.avatarUrl ? (
                  <img src={second.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-slate-300">
                    {(second.displayName || second.username || "2")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border border-slate-300/60 bg-gradient-to-r from-slate-400 to-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-md">
                <span>🥈 #2</span>
              </div>
            </div>

            <p className="max-w-[100px] sm:max-w-[130px] truncate text-center text-xs sm:text-sm font-bold text-white mt-1">
              {second.displayName || second.username}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-black text-slate-300">
                {second.wins ?? second.totalWins ?? 0}W
              </span>
              <span className="text-[10px] text-white/50">
                {Math.round(((second.winRate ?? 0) * 100))}%
              </span>
            </div>

            {/* Silver Pedestal */}
            <div className="w-full h-24 sm:h-28 rounded-t-2xl border-t border-x border-slate-400/30 bg-gradient-to-b from-slate-800/80 to-slate-950/90 shadow-xl flex flex-col items-center justify-center pt-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-slate-300/40">2</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {mode === "game" ? `${second.rating ?? 1000} ELO` : `Lvl ${second.level ?? 1}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* FIRST PLACE (Gold Crown) */}
        {first ? (
          <div className="flex flex-1 flex-col items-center -mt-6">
            {/* Crown Icon Above Avatar */}
            <div className="relative mb-2">
              <Crown className="mx-auto h-7 w-7 text-amber-400 animate-bounce drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              <div
                className={`relative grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full border-4 border-amber-400 bg-slate-900 shadow-[0_0_35px_rgba(251,191,36,0.6)] ${
                  first.userId === currentUserId ? "ring-4 ring-emerald-400" : ""
                }`}
              >
                {first.avatarUrl ? (
                  <img src={first.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-amber-300">
                    {(first.displayName || first.username || "1")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 px-2.5 py-0.5 text-[11px] font-black uppercase text-slate-950 shadow-lg">
                <span>👑 #1 CHAMPION</span>
              </div>
            </div>

            <p className="max-w-[120px] sm:max-w-[160px] truncate text-center text-sm sm:text-base font-black text-amber-200 mt-1">
              {first.displayName || first.username}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs sm:text-sm font-black text-amber-400">
                {first.wins ?? first.totalWins ?? 0} Wins
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300">
                {Math.round(((first.winRate ?? 0) * 100))}% Win Rate
              </span>
            </div>

            {/* Gold Pedestal */}
            <div className="w-full h-32 sm:h-36 rounded-t-2xl border-t-2 border-x-2 border-amber-400/50 bg-gradient-to-b from-amber-500/25 via-slate-900/90 to-slate-950/95 shadow-[0_0_40px_rgba(251,191,36,0.2)] flex flex-col items-center justify-center pt-2">
              <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400/50">1</span>
              <span className="text-xs uppercase font-black text-amber-300 tracking-wider">
                {mode === "game" ? `⭐ ${first.rating ?? 1000} Rating` : `Level ${first.level ?? 1}`}
              </span>
              <span className="text-[10px] text-white/50">
                {mode === "game" ? `Best: ${first.bestScore ?? 0} pts` : `${(first.xp ?? 0).toLocaleString()} XP`}
              </span>
            </div>
          </div>
        ) : null}

        {/* THIRD PLACE (Bronze) */}
        {third ? (
          <div className="flex flex-1 flex-col items-center">
            {/* Avatar & Bronze Medal */}
            <div className="relative mb-2">
              <div
                className={`relative grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full border-2 border-amber-700 bg-slate-900 shadow-[0_0_20px_rgba(180,83,9,0.4)] ${
                  third.userId === currentUserId ? "ring-4 ring-emerald-400" : ""
                }`}
              >
                {third.avatarUrl ? (
                  <img src={third.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-amber-600">
                    {(third.displayName || third.username || "3")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-2 py-0.5 text-[10px] font-black uppercase text-amber-100 shadow-md">
                <span>🥉 #3</span>
              </div>
            </div>

            <p className="max-w-[100px] sm:max-w-[130px] truncate text-center text-xs sm:text-sm font-bold text-white mt-1">
              {third.displayName || third.username}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-black text-amber-500">
                {third.wins ?? third.totalWins ?? 0}W
              </span>
              <span className="text-[10px] text-white/50">
                {Math.round(((third.winRate ?? 0) * 100))}%
              </span>
            </div>

            {/* Bronze Pedestal */}
            <div className="w-full h-20 sm:h-24 rounded-t-2xl border-t border-x border-amber-700/30 bg-gradient-to-b from-amber-950/40 to-slate-950/90 shadow-xl flex flex-col items-center justify-center pt-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-amber-600/40">3</span>
              <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">
                {mode === "game" ? `${third.rating ?? 1000} ELO` : `Lvl ${third.level ?? 1}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MAIN LEADERBOARD TABLE COMPONENT
// ----------------------------------------------------------------------------
export function LeaderboardTable({
  title,
  gameId,
  gameDisplayName,
  rows,
  mode = "global",
  currentUserId,
  loading = false
}: LeaderboardProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"wins" | "winRate" | "rating" | "level">("wins");

  // Determine current user's personal row if present
  const myRow = useMemo(() => {
    if (!currentUserId) return null;
    return rows.find((r) => r.userId === currentUserId) ?? null;
  }, [rows, currentUserId]);

  const filteredAndSortedRows = useMemo(() => {
    let result = rows.slice();

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.displayName && r.displayName.toLowerCase().includes(q)) ||
          (r.username && r.username.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "winRate") {
        return (b.winRate ?? 0) - (a.winRate ?? 0);
      }
      if (sortBy === "rating") {
        return (b.rating ?? 1000) - (a.rating ?? 1000);
      }
      if (sortBy === "level") {
        return (b.level ?? 1) - (a.level ?? 1);
      }
      // Default: wins
      const winsA = a.wins ?? a.totalWins ?? 0;
      const winsB = b.wins ?? b.totalWins ?? 0;
      if (winsB !== winsA) return winsB - winsA;
      return (b.totalScore ?? 0) - (a.totalScore ?? 0);
    });

    return result;
  }, [rows, search, sortBy]);

  return (
    <div className="space-y-4 w-full">
      {/* Top 3 Champions Podium Spotlight */}
      <LeaderboardPodium rows={rows} mode={mode} currentUserId={currentUserId} />

      {/* User's Personal Standing Card (if ranked) */}
      {myRow ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-950/60 via-slate-950 to-emerald-950/60 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xl font-black text-emerald-300 shrink-0">
              #{myRow.rank ?? (rows.indexOf(myRow) + 1)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate">
                  {myRow.displayName || myRow.username}
                </span>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                  Your Standing
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {myRow.wins ?? myRow.totalWins ?? 0} Wins · {myRow.losses ?? 0} Losses ·{" "}
                {Math.round(((myRow.winRate ?? 0) * 100))}% Win Rate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {mode === "game" ? (
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Rating</span>
                <p className="font-mono text-base font-black text-white">⭐ {myRow.rating ?? 1000}</p>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Level & XP</span>
                <p className="font-mono text-base font-black text-white">Lvl {myRow.level ?? 1}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-white/50 hidden sm:inline flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
          </span>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setSortBy("wins")}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                sortBy === "wins" ? "bg-amber-400 text-slate-950 shadow" : "text-white/60 hover:text-white"
              }`}
            >
              Most Wins
            </button>
            <button
              type="button"
              onClick={() => setSortBy("winRate")}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                sortBy === "winRate" ? "bg-emerald-400 text-slate-950 shadow" : "text-white/60 hover:text-white"
              }`}
            >
              Win Rate %
            </button>
            {mode === "game" ? (
              <button
                type="button"
                onClick={() => setSortBy("rating")}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  sortBy === "rating" ? "bg-amber-400 text-slate-950 shadow" : "text-white/60 hover:text-white"
                }`}
              >
                Rating
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSortBy("level")}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  sortBy === "level" ? "bg-emerald-400 text-slate-950 shadow" : "text-white/60 hover:text-white"
                }`}
              >
                Level / XP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Ranking Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-wider text-white/50">
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4">Record & Ratio</th>
                <th className="py-3.5 px-4 text-center">Win Rate</th>
                {mode === "game" ? (
                  <>
                    <th className="py-3.5 px-4 text-right">Rating</th>
                    <th className="py-3.5 px-4 text-right">Best Score</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-4 text-right">Level & XP</th>
                    <th className="py-3.5 px-4 text-right">Coins</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={mode === "game" ? 6 : 6} className="py-12 text-center">
                    <div className="mx-auto max-w-sm space-y-3">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 border border-white/10 mx-auto text-2xl">
                        🏆
                      </div>
                      <p className="text-base font-bold text-white">No Match Records Found</p>
                      <p className="text-xs text-white/50">
                        {search
                          ? `No player matching "${search}" found in this leaderboard.`
                          : "Be the first player to win a match and claim the #1 spot on this leaderboard!"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, index) => {
                  const rank = row.rank ?? index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const isMe = row.userId === currentUserId;

                  const wins = row.wins ?? row.totalWins ?? 0;
                  const played = row.gamesPlayed ?? row.totalGamesPlayed ?? 0;
                  const losses = row.losses ?? Math.max(0, played - wins);
                  const rate = Math.round(((row.winRate ?? (played > 0 ? wins / played : 0)) * 100));

                  return (
                    <tr
                      key={row.userId ?? `${row.username}-${index}`}
                      className={`transition-colors hover:bg-white/[0.04] ${
                        isMe ? "bg-emerald-500/10 font-bold" : ""
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-3 px-4 text-center">
                        {isTop1 ? (
                          <span className="inline-grid h-8 w-8 place-items-center rounded-xl bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                            🥇
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-grid h-8 w-8 place-items-center rounded-xl bg-slate-300 text-slate-950 font-black shadow-[0_0_12px_rgba(203,213,225,0.4)]">
                            🥈
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-grid h-8 w-8 place-items-center rounded-xl bg-amber-700 text-white font-black shadow-[0_0_10px_rgba(180,83,9,0.4)]">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-sm font-black text-white/50">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Player Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-800 border border-white/15 overflow-hidden">
                              {row.avatarUrl ? (
                                <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-black text-emerald-400 text-sm">
                                  {(row.displayName || row.username || "P")[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            {isTop1 ? (
                              <Crown className="absolute -top-2 -right-1 h-4 w-4 text-amber-400 drop-shadow" />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
                                {row.displayName || row.username}
                              </span>
                              {isMe ? (
                                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.2 text-[9px] font-black text-emerald-300 uppercase tracking-wider">
                                  YOU
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-white/40 font-mono">
                              @{row.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Record & Mini Win Bar */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-baseline gap-1.5 font-mono text-xs">
                            <span className="font-black text-emerald-300">{wins}W</span>
                            <span className="text-white/40">·</span>
                            <span className="font-bold text-rose-300/80">{losses}L</span>
                            <span className="text-[10px] text-white/40">({played} matches)</span>
                          </div>
                          {/* Mini Ratio Bar */}
                          <div className="h-1.5 w-24 sm:w-32 bg-rose-500/30 rounded-full overflow-hidden mt-1 flex">
                            <div
                              className="h-full bg-emerald-400 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Win Rate Percentage */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-black shadow-sm ${
                            rate >= 60
                              ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                              : rate >= 40
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "bg-white/10 text-white/60 border border-white/10"
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>

                      {/* Rating / Score (Game Mode) */}
                      {mode === "game" ? (
                        <>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm font-black text-amber-300">
                              ⭐ {row.rating ?? 1000}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-xs font-bold text-white/70">
                              {row.bestScore ?? 0} pts
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Level & XP (Global Mode) */}
                          <td className="py-3 px-4 text-right">
                            <div>
                              <span className="font-mono text-xs font-black text-emerald-300">
                                Lvl {row.level ?? 1}
                              </span>
                              <p className="text-[10px] font-mono text-white/40">
                                {(row.xp ?? 0).toLocaleString()} XP
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-xs font-black text-amber-300 flex items-center justify-end gap-1">
                              🪙 {(row.coins ?? 0).toLocaleString()}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
