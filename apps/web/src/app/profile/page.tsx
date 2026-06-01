"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileSummary, type ProfileData } from "@/components/profile/ProfileSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/api/client";

export default function ProfilePage() {
  useAuth({ required: true });
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void api.profile().then((result) => {
      setProfile(result.profile as ProfileData | null);
      setStats(result.stats as Record<string, unknown>[]);
    });
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <ProfileEditor profile={profile} onSaved={setProfile} />
        <ProfileSummary profile={profile} />
        <Card>
          <CardHeader>
            <CardTitle>Game Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.map((stat) => (
              <div key={`${stat.gameId}`} className="rounded-md border border-zinc-200 p-3">
                <p className="font-black">{String(stat.gameId)}</p>
                <p className="text-sm text-zinc-600">
                  {String(stat.gamesPlayed ?? 0)} played · {String(stat.wins ?? 0)} wins · rating {String(stat.rating ?? 1000)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
