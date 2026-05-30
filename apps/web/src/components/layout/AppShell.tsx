"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Trophy, UserRound, Gamepad2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
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
    return <main className="min-h-screen overflow-hidden bg-[#020604] text-white">{children}</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-zinc-950">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-700 text-white">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <span>Tabletop Arena</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link className="rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" href="/leaderboards">
              <Trophy className="mr-2 inline h-4 w-4" />
              Leaderboards
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" href="/profile">
              <UserRound className="mr-2 inline h-4 w-4" />
              Profile
            </Link>
            {user?.role === "ADMIN" ? (
              <Link className="rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" href="/admin">
                <Shield className="mr-2 inline h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-semibold text-zinc-600 sm:inline">{user?.displayName}</span>
            <Button type="button" variant="ghost" size="icon" aria-label="Logout" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className={cn("mx-auto px-4 py-6", wide ? "max-w-[104rem] px-2 py-3 sm:px-4 sm:py-5" : "max-w-7xl")}>{children}</main>
    </div>
  );
}