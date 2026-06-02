"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LeaderboardRow {
  userId?: string;
  username?: string;
  displayName?: string;
  xp?: number;
  level?: number;
  coins?: number;
  wins?: number;
  gamesPlayed?: number;
  losses?: number;
  winRate?: number;
  rating?: number;
  avatarUrl?: string | null;
}

export function LeaderboardTable({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">Player</th>
                <th className="py-2">Level</th>
                <th className="py-2">XP</th>
                <th className="py-2">Coins</th>
                <th className="py-2">Wins</th>
                <th className="py-2">Played</th>
                <th className="py-2">Win %</th>
                <th className="py-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.userId ?? `${row.username}-${index}`} className="border-t border-zinc-100">
                  <td className="py-3 font-black">{index + 1}</td>
                  <td className="py-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : null}
                      {row.displayName ?? row.username}
                    </span>
                  </td>
                  <td className="py-3">{row.level ?? "-"}</td>
                  <td className="py-3">{row.xp ?? "-"}</td>
                  <td className="py-3">{row.coins ?? "-"}</td>
                  <td className="py-3">{row.wins ?? "-"}</td>
                  <td className="py-3">{row.gamesPlayed ?? "-"}</td>
                  <td className="py-3">{typeof row.winRate === "number" ? `${Math.round(row.winRate * 100)}%` : "-"}</td>
                  <td className="py-3">{row.rating ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
