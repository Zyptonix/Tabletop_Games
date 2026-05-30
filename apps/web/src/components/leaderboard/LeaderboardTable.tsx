"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LeaderboardRow {
  userId?: string;
  username?: string;
  displayName?: string;
  xp?: number;
  level?: number;
  wins?: number;
  gamesPlayed?: number;
  rating?: number;
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
                <th className="py-2">Wins</th>
                <th className="py-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.userId ?? `${row.username}-${index}`} className="border-t border-zinc-100">
                  <td className="py-3 font-black">{index + 1}</td>
                  <td className="py-3 font-semibold">{row.displayName ?? row.username}</td>
                  <td className="py-3">{row.level ?? "-"}</td>
                  <td className="py-3">{row.xp ?? "-"}</td>
                  <td className="py-3">{row.wins ?? "-"}</td>
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
