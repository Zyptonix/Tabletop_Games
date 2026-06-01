"use client";

import { useEffect, useState } from "react";
import { Image, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type { ProfileData } from "./ProfileSummary";

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/thumbs/svg?seed=tabletop-red&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=tabletop-blue&backgroundColor=c0e8ff",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=tabletop-green&backgroundColor=c0ffd8",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=tabletop-gold&backgroundColor=ffe8a3"
];

export function ProfileEditor({ profile, onSaved }: { profile: ProfileData | null; onSaved: (profile: ProfileData) => void }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [displayName, setDisplayName] = useState(user?.displayName ?? profile?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? profile?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? profile?.displayName ?? "");
    setAvatarUrl(user?.avatarUrl ?? profile?.avatarUrl ?? "");
  }, [profile, user?.avatarUrl, user?.displayName]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.updateProfile({
        displayName,
        avatarUrl: avatarUrl.trim().length > 0 ? avatarUrl.trim() : null
      });
      setUser(result.user);
      onSaved(result.profile as ProfileData);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="grid justify-items-center gap-3">
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 text-2xl font-black text-emerald-900 shadow-inner">
            {avatarUrl ? <img src={avatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" /> : <Image className="h-8 w-8" />}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAvatarUrl("")}> 
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-zinc-700">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm font-semibold outline-none focus:border-emerald-600"
              maxLength={40}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-zinc-700">Avatar image URL</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/my-avatar.png"
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm font-semibold outline-none focus:border-emerald-600"
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_AVATARS.map((src) => (
                <button
                  key={src}
                  type="button"
                  className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 transition hover:-translate-y-0.5 hover:border-emerald-500"
                  onClick={() => setAvatarUrl(src)}
                  aria-label="Use avatar preset"
                >
                  <img src={src} alt="Avatar preset" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={saving || displayName.trim().length === 0} onClick={() => void saveProfile()}>
              <Save className="h-4 w-4" />
              {saving ? "Saving" : "Save Profile"}
            </Button>
            {message ? <p className="text-sm font-semibold text-zinc-600">{message}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}