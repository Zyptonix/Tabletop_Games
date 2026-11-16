/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coins,
  Gamepad2,
  LogOut,
  Radio,
  Shield,
  Sparkles,
  Trophy,
  UserRound
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  wide = false
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  async function logout() {
    await api.logout();
    setUser(null);
    router.replace("/");
  }

  /**
   * Wide mode is used by active game rooms.
   * For active games, the game itself owns the full screen layout,
   * so we intentionally remove the normal white site header and page padding.
   */
  if (wide) {
    return (
      <main className="tt-game-viewport h-dvh overflow-hidden bg-[#020604] text-white">
        {children}
      </main>
    );
  }

  // Parse avatar emoji or first initial
  const displayName = user?.displayName || "Player";
  const firstChar = Array.from(displayName)[0] || "P";
  const isEmojiAvatar = /\p{Extended_Pictographic}/u.test(firstChar);
  const avatarLetter = isEmojiAvatar ? firstChar : displayName.slice(0, 1).toUpperCase();
  const cleanName = isEmojiAvatar ? displayName.replace(firstChar, "").trim() : displayName;
  const isGuest = user?.isGuest || user?.username?.startsWith("guest_");

  return (
    <div className="min-h-screen bg-[#070b0e] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-emerald-500/20 bg-[#091014]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo & Live Status */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 font-black text-white transition-opacity hover:opacity-95"
            >
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-transform duration-200 group-hover:scale-105">
                <Gamepad2 className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border border-zinc-950" />
                </span>
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base tracking-tight font-black uppercase text-white">
                    Tabletop
                  </span>
                  <span className="text-base tracking-tight font-black uppercase text-emerald-400">
                    Arena
                  </span>
                </div>
                <span className="text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">
                  Multiplayer Hub
                </span>
              </div>
            </Link>

            {/* Live Server Indicator Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-300 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Arena Live</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              href="/dashboard"
            >
              <Gamepad2 className="h-4 w-4 text-emerald-400" />
              Games
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              href="/leaderboards"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              Leaderboards
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              href="/profile"
            >
              <UserRound className="h-4 w-4 text-sky-400" />
              Profile
            </Link>
            {user?.role === "ADMIN" ? (
              <Link
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-900/40"
                href="/admin"
              >
                <Shield className="h-4 w-4 text-rose-400" />
                Admin
              </Link>
            ) : null}
          </nav>

          {/* User Profile Capsule & Actions */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2">
                {/* Gamer Capsule */}
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5 pr-3 shadow-inner">
                  {/* Avatar Icon */}
                  <div className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950 to-slate-900 text-sm font-black text-emerald-300 shadow-sm">
                    {avatarLetter}
                  </div>

                  {/* Name and Level */}
                  <div className="hidden flex-col sm:flex">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[100px] truncate text-xs font-black text-white">
                        {cleanName || displayName}
                      </span>
                      {user.role === "ADMIN" ? (
                        <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[0.6rem] font-black uppercase text-rose-300">
                          Admin
                        </span>
                      ) : isGuest ? (
                        <span className="rounded bg-slate-700/60 px-1 py-0.2 text-[0.6rem] font-bold uppercase text-slate-300">
                          Guest
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[0.6rem] font-black uppercase text-emerald-300">
                          Pro
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-400">
                      <span className="text-emerald-400">Lv. {user.level ?? 1}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-amber-300">
                        <Coins className="h-2.5 w-2.5" />
                        {(user.coins ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Logout"
                  onClick={logout}
                  className="h-9 w-9 rounded-xl border border-white/10 text-slate-400 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link
                href="/"
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto px-4 py-6 sm:px-6",
          wide ? "max-w-[104rem] px-2 py-3 sm:px-4 sm:py-5" : "max-w-7xl"
        )}
      >
        {children}
      </main>
    </div>
  );
}
