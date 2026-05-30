"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ProfileData {
  xp?: number;
  level?: number;
  coins?: number;
  totalGamesPlayed?: number;
  totalWins?: number;
}

export function ProfileSummary({ profile }: { profile: ProfileData | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-5">
        {[
          ["Level", profile?.level ?? 1],
          ["XP", profile?.xp ?? 0],
          ["Coins", profile?.coins ?? 0],
          ["Played", profile?.totalGamesPlayed ?? 0],
          ["Wins", profile?.totalWins ?? 0]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-zinc-50 p-3">
            <p className="text-2xl font-black text-zinc-950">{value}</p>
            <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
