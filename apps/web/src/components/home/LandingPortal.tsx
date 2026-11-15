"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Flame,
  Gamepad2,
  KeyRound,
  LogIn,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Dialog } from "@/components/ui/dialog";
import { LoginPanel } from "@/components/auth/LoginPanel";

export function LandingPortal() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [quickPlayModalOpen, setQuickPlayModalOpen] = useState(false);
  const [joinCodeModalOpen, setJoinCodeModalOpen] = useState(false);

  // Quick Play form state
  const [guestName, setGuestName] = useState("");
  const [selectedGame, setSelectedGame] = useState<"uno-no-mercy" | "classic-uno">("uno-no-mercy");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    api
      .me()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // Unauthenticated visitor
      });
  }, [setUser]);

  async function handleLaunchGuestRoom(gameId: "uno-no-mercy" | "classic-uno") {
    if (user) {
      // User is already logged in, directly create room
      setLoading(true);
      setErrorMessage(null);
      try {
        const created = await api.createRoom({ gameId });
        router.push(`/rooms/${created.room.code}`);
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to create room.");
        setLoading(false);
      }
      return;
    }

    // Open quick guest creation modal
    setSelectedGame(gameId);
    setQuickPlayModalOpen(true);
  }

  async function submitGuestCreation(event: React.FormEvent) {
    event.preventDefault();
    if (!guestName.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const auth = await api.guestLogin({ displayName: guestName.trim() });
      setUser(auth.user);

      const created = await api.createRoom({ gameId: selectedGame });
      router.push(`/rooms/${created.room.code}`);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Failed to enter match.");
      setLoading(false);
    }
  }

  async function submitJoinCode(event: React.FormEvent) {
    event.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (!user) {
      if (!guestName.trim()) {
        setErrorMessage("Please enter a nickname.");
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const auth = await api.guestLogin({ displayName: guestName.trim() });
        setUser(auth.user);
        router.push(`/rooms/${cleanCode}`);
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : "Failed to enter room.");
        setLoading(false);
      }
      return;
    }

    router.push(`/rooms/${cleanCode}`);
  }

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-[#060a0d] text-white selection:bg-emerald-500/30">
      {/* Background Glow Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/15 via-cyan-500/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[500px] rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-[450px] w-[550px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/[0.08] bg-[#070e13]/80 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white sm:text-lg">Tabletop Arena</span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Multiplayer
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/25"
              >
                <span>Lounge ({user.displayName})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setJoinCodeModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Join with Code
                </button>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-black text-white transition hover:bg-white/15"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Quick Play */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:py-14 sm:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Zero Install · 100% Free · Play in Browser
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Play <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">UNO No Mercy</span> & Classic UNO
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Drop into private multiplayer lobbies with friends. No account required — pick a nickname, share a link, and start playing in seconds.
          </p>

          {/* Quick Action Center */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleLaunchGuestRoom("uno-no-mercy")}
              className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(244,63,94,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)]"
            >
              <Flame className="h-4 w-4" /> Host UNO No Mercy
            </button>
            <button
              type="button"
              onClick={() => handleLaunchGuestRoom("classic-uno")}
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(16,185,129,0.45)]"
            >
              <Play className="h-4 w-4" /> Host Classic UNO
            </button>
            <button
              type="button"
              onClick={() => setJoinCodeModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3.5 text-sm font-bold text-slate-200 backdrop-blur-sm transition hover:bg-white/[0.12]"
            >
              <KeyRound className="h-4 w-4 text-amber-400" /> Enter Room Code
            </button>
          </div>
        </div>

        {/* Featured Games Section */}
        <div className="mt-14 sm:mt-20">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white sm:text-xl">Featured Games</h2>
              <p className="text-xs text-slate-400">Available now for live multiplayer</p>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              Official Release
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* UNO No Mercy Card */}
            <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-[#12070a] to-[#1c0c11] p-6 shadow-[0_16px_50px_rgba(244,63,94,0.12)] transition duration-300 hover:border-rose-400/60 hover:shadow-[0_20px_60px_rgba(244,63,94,0.22)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300">
                  <Flame className="h-3.5 w-3.5" /> High Intensity
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-300">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> 2–10 Players
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">UNO No Mercy</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                The ultimate, cutthroat edition. Features +10 Wild Cards, Stacking, Color Roulette, Discard All, Hand Swaps, and instant player elimination at 25 cards!
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-rose-200">
                <span className="rounded-lg bg-rose-950/60 border border-rose-500/20 px-2.5 py-1">⚡ Stack Penalties</span>
                <span className="rounded-lg bg-rose-950/60 border border-rose-500/20 px-2.5 py-1">💥 25-Card Mercy Elimination</span>
                <span className="rounded-lg bg-rose-950/60 border border-rose-500/20 px-2.5 py-1">🎯 7 & 0 Hand Swaps</span>
              </div>

              <div className="mt-6 pt-4 border-t border-rose-500/20 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleLaunchGuestRoom("uno-no-mercy")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-rose-500"
                >
                  <Flame className="h-4 w-4" /> Start No Mercy Lobby
                </button>
              </div>
            </div>

            {/* Classic UNO Card */}
            <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#06120e] to-[#0c1e17] p-6 shadow-[0_16px_50px_rgba(16,185,129,0.1)] transition duration-300 hover:border-emerald-400/60 hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                  <Play className="h-3.5 w-3.5" /> Classic Rules
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-300">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> 2–10 Players
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">Classic UNO</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                The authentic family favorite. Match colors and numbers, unleash Skips and Reverses, call UNO on your last card, and race to empty your hand.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-200">
                <span className="rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1">🃏 Official Card Set</span>
                <span className="rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1">🔄 Turn Direction Flip</span>
                <span className="rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1">⏱️ Real-time Turn Timers</span>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-500/20 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleLaunchGuestRoom("classic-uno")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-emerald-500"
                >
                  <Play className="h-4 w-4" /> Start Classic UNO Lobby
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#081014]/70 p-4 backdrop-blur-sm">
            <span className="text-xl">📱</span>
            <h4 className="mt-2 text-sm font-black text-white">Mobile & Desktop Friendly</h4>
            <p className="mt-1 text-xs text-slate-400">Play seamlessly on phone, tablet, or PC without downloading any apps.</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#081014]/70 p-4 backdrop-blur-sm">
            <span className="text-xl">🔗</span>
            <h4 className="mt-2 text-sm font-black text-white">1-Click Group Sharing</h4>
            <p className="mt-1 text-xs text-slate-400">Copy room invite links straight into WhatsApp, Discord, or Messenger.</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#081014]/70 p-4 backdrop-blur-sm">
            <span className="text-xl">⏸️</span>
            <h4 className="mt-2 text-sm font-black text-white">Host Pause & Rejoin</h4>
            <p className="mt-1 text-xs text-slate-400">Match state is permanently preserved. Players can reconnect anytime.</p>
          </div>
        </div>
      </main>

      {/* Quick Guest Creation Modal */}
      <Dialog
        open={quickPlayModalOpen}
        title="⚡ Jump Into Match"
        onClose={() => setQuickPlayModalOpen(false)}
      >
        <form onSubmit={submitGuestCreation} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pick your nickname
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Maverick, Zozo, Alex"
              autoFocus
              required
              maxLength={25}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-xs text-slate-400">Selected Game:</span>
            <p className="mt-0.5 text-sm font-black text-emerald-300">
              {selectedGame === "uno-no-mercy" ? "🔥 UNO No Mercy" : "🃏 Classic UNO"}
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-400">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading || !guestName.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-black text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
          >
            {loading ? "Creating Room..." : "⚡ Launch Room"}
          </button>
        </form>
      </Dialog>

      {/* Join with Code Modal */}
      <Dialog
        open={joinCodeModalOpen}
        title="🔑 Join Room With Code"
        onClose={() => setJoinCodeModalOpen(false)}
      >
        <form onSubmit={submitJoinCode} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Room Code
            </label>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD"
              required
              maxLength={8}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-lg font-black uppercase tracking-widest text-amber-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {!user && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your Nickname
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name to join"
                required
                maxLength={25}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          )}

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-400">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading || !roomCodeInput.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-black text-white shadow-lg transition hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
          >
            {loading ? "Joining..." : "⚡ Enter Game Room"}
          </button>
        </form>
      </Dialog>

      {/* Sign In Modal */}
      <Dialog
        open={loginModalOpen}
        title="Sign In"
        onClose={() => setLoginModalOpen(false)}
      >
        <LoginPanel
          onSuccess={(authUser) => {
            setUser(authUser);
            setLoginModalOpen(false);
          }}
          redirectPath={null}
        />
      </Dialog>
    </div>
  );
}
