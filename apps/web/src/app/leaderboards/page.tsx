"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

export default function LeaderboardsPage() {
  useAuth({ required: true });
  const [xpRows, setXpRows] = useState<LeaderboardRow[]>([]);
  const [unoRows, setUnoRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    void api.xpLeaderboard().then((result) => setXpRows(result.leaderboard as LeaderboardRow[]));
    void api.gameWinsLeaderboard("classic-uno").then((result) => setUnoRows(result.leaderboard as LeaderboardRow[]));
  }, []);

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-2">
        <LeaderboardTable title="Global XP" rows={xpRows} />
        <LeaderboardTable title="Classic UNO Wins" rows={unoRows} />
      </div>
    </AppShell>
  );
}
