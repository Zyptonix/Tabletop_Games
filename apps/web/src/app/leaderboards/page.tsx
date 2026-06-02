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
  const [noMercyRows, setNoMercyRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    void api.xpLeaderboard().then((result) => setXpRows(result.leaderboard as LeaderboardRow[]));
    void api.gameWinsLeaderboard("classic-uno").then((result) => setUnoRows(result.leaderboard as LeaderboardRow[]));
    void api.gameWinsLeaderboard("uno-no-mercy").then((result) => setNoMercyRows(result.leaderboard as LeaderboardRow[]));
  }, []);

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-3">
        <LeaderboardTable title="Global XP and Coins" rows={xpRows} />
        <LeaderboardTable title="Classic UNO Wins" rows={unoRows} />
        <LeaderboardTable title="No Mercy Wins" rows={noMercyRows} />
      </div>
    </AppShell>
  );
}
