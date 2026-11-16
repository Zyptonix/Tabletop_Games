"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dice5,
  Gamepad2,
  LockKeyhole,
  LogIn,
  Shuffle,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@tabletop/shared";

interface LoginPanelProps {
  onSuccess?: (user: AuthUser) => void;
  redirectPath?: string | null;
  initialMode?: "login" | "register" | "guest";
}

const FUN_GUEST_NAMES = [
  "ShadowAce",
  "CyberDice",
  "ApexWolf",
  "LuckyAce",
  "TurboRider",
  "BlazeKing",
  "CosmicKnight",
  "MysticHero",
  "ViperStar",
  "QuantumJoker",
  "IronShield",
  "NeonRider",
];

export function LoginPanel({
  onSuccess,
  redirectPath = "/dashboard",
  initialMode = "login",
}: LoginPanelProps = {}) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [mode, setMode] = useState<"login" | "register" | "guest">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function rollRandomName() {
    const randomName =
      FUN_GUEST_NAMES[Math.floor(Math.random() * FUN_GUEST_NAMES.length)];
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    setGuestName(`${randomName}${randomSuffix}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const cleanUsername = username.trim();
        if (!cleanUsername || !password) {
          setError("Please enter your username and password.");
          setLoading(false);
          return;
        }

        const result = await api.login({ username: cleanUsername, password });
        setUser(result.user);
        if (onSuccess) {
          onSuccess(result.user);
        } else if (redirectPath) {
          router.replace(redirectPath);
        }
      } else if (mode === "register") {
        const cleanUsername = username.trim();
        const cleanDisplayName = displayName.trim();
        const cleanEmail = email.trim();

        if (!cleanUsername || !password) {
          setError("Username and password are required.");
          setLoading(false);
          return;
        }

        const result = await api.register({
          username: cleanUsername,
          password,
          displayName: cleanDisplayName || cleanUsername,
          email: cleanEmail || null,
        });

        setUser(result.user);
        if (onSuccess) {
          onSuccess(result.user);
        } else if (redirectPath) {
          router.replace(redirectPath);
        }
      } else if (mode === "guest") {
        const cleanName = guestName.trim();
        if (!cleanName) {
          setError("Please choose a nickname or hit the 🎲 roll button.");
          setLoading(false);
          return;
        }

        const result = await api.guestLogin({ displayName: cleanName });
        setUser(result.user);
        if (onSuccess) {
          onSuccess(result.user);
        } else if (redirectPath) {
          router.replace(redirectPath);
        }
      }
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05080b] px-4 py-8 text-white grid place-items-center">
      {/* Ambient Lighting & Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-5%,rgba(16,185,129,0.18),transparent_70%),radial-gradient(ellipse_60%_50%_at_90%_90%,rgba(14,165,233,0.10),transparent_65%),radial-gradient(ellipse_50%_50%_at_10%_80%,rgba(245,158,11,0.06),transparent_60%)]"
      />

      {/* Subtle Game Table Grid Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:3.5rem_3.5rem]"
      />

      {/* Tasteful Artistic Vector Silhouettes representing our ready games */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        {/* Top Left: Fanned Playing Cards Silhouette (UNO / 29 / Poker) */}
        <svg
          className="absolute -left-12 -top-12 h-80 w-80 text-emerald-500/10 transition-opacity duration-1000 hidden md:block"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Card 1 */}
          <rect
            x="20"
            y="40"
            width="80"
            height="120"
            rx="8"
            transform="rotate(-15 60 100)"
            className="fill-emerald-950/20"
          />
          {/* Card 2 */}
          <rect
            x="50"
            y="30"
            width="80"
            height="120"
            rx="8"
            transform="rotate(5 90 90)"
            className="fill-emerald-950/30"
          />
          {/* Card Suit: Spades */}
          <path
            d="M90 75 C85 65 70 70 70 82 C70 94 90 105 90 105 C90 105 110 94 110 82 C110 70 95 65 90 75 Z"
            fill="currentColor"
          />
          <path d="M88 102 L92 102 L95 112 L85 112 Z" fill="currentColor" />
        </svg>

        {/* Top Right: Classical Chess Knight & Pawn (Chess) */}
        <svg
          className="absolute -right-8 top-12 h-72 w-72 text-cyan-500/10 hidden md:block"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          {/* Chess Knight Profile */}
          <path
            d="M35 85 L65 85 L62 75 C60 70 58 65 65 55 C70 47 68 35 60 30 C56 22 48 18 42 20 C38 22 36 26 32 30 C28 34 25 45 28 52 C30 57 32 60 35 65 Z"
            className="fill-cyan-950/15"
          />
          <circle cx="48" cy="32" r="2.5" fill="currentColor" />
          <path d="M38 45 L48 42" stroke="currentColor" strokeWidth="1.5" />
          {/* Base */}
          <rect x="30" y="85" width="40" height="6" rx="2" fill="currentColor" />
        </svg>

        {/* Bottom Left: 3D Isometric Dice (Snakes & Ladders / Board Games) */}
        <svg
          className="absolute -left-6 bottom-16 h-64 w-64 text-amber-500/10 hidden md:block"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          {/* Top Face */}
          <polygon points="50,15 80,32 50,49 20,32" className="fill-amber-950/20" />
          <circle cx="50" cy="32" r="2" fill="currentColor" />
          {/* Left Face */}
          <polygon points="20,32 50,49 50,85 20,68" className="fill-amber-950/30" />
          <circle cx="30" cy="45" r="2" fill="currentColor" />
          <circle cx="40" cy="72" r="2" fill="currentColor" />
          {/* Right Face */}
          <polygon points="50,49 80,32 80,68 50,85" className="fill-amber-950/10" />
          <circle cx="65" cy="55" r="2" fill="currentColor" />
          <circle cx="65" cy="75" r="2" fill="currentColor" />
          <circle cx="65" cy="40" r="2" fill="currentColor" />
        </svg>

        {/* Bottom Right: Radar Crosshair & Naval Grid (Battleship) */}
        <svg
          className="absolute -right-10 -bottom-10 h-80 w-80 text-emerald-500/10 hidden md:block"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="100" cy="100" r="80" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="55" />
          <circle cx="100" cy="100" r="30" />
          <line x1="20" y1="100" x2="180" y2="100" strokeWidth="1" />
          <line x1="100" y1="20" x2="100" y2="180" strokeWidth="1" />
          <circle cx="120" cy="80" r="3" fill="currentColor" />
          <circle cx="75" cy="130" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <Gamepad2 className="h-7 w-7 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
            </span>
          </div>

          <h1 className="mt-3.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Tabletop Arena
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Realtime multiplayer lounge for card, board, and strategy showdowns
          </p>
        </div>

        {/* Auth Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1114]/90 p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {/* Subtle Top Glow Line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />

          {/* Clean Segmented Tab Switcher: Sign In First, then Register, then Guest */}
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/50 p-1">
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mode === "guest"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
              onClick={() => {
                setMode("guest");
                setError(null);
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Guest
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* 1. SIGN IN FORM (FIRST & DEFAULT) */}
            {mode === "login" && (
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-300">
                    Username
                  </label>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                    autoFocus
                    className="h-11 rounded-xl border-white/15 bg-black/50 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="h-11 rounded-xl border-white/15 bg-black/50 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* 2. REGISTER FORM */}
            {mode === "register" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-300">
                    Username
                  </label>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    required
                    minLength={2}
                    maxLength={30}
                    autoFocus
                    className="h-10 rounded-xl border-white/15 bg-black/50 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-300">
                    Display Name <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Nickname shown in games"
                    autoComplete="nickname"
                    maxLength={30}
                    className="h-10 rounded-xl border-white/15 bg-black/50 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Choose a password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={3}
                    maxLength={200}
                    className="h-10 rounded-xl border-white/15 bg-black/50 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* 3. GUEST PLAY FORM (SLEEK & FAST) */}
            {mode === "guest" && (
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Nickname
                    </label>
                    <button
                      type="button"
                      onClick={rollRandomName}
                      className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <Shuffle className="h-3 w-3" />
                      Roll Random
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="e.g. ShadowAce, CyberDice"
                      required
                      maxLength={24}
                      autoFocus
                      className="h-11 rounded-xl border-white/15 bg-black/50 pr-11 text-sm font-bold text-white placeholder:text-slate-500 focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={rollRandomName}
                      title="Generate Random Nickname"
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300 transition hover:bg-emerald-500/35 cursor-pointer"
                    >
                      <Dice5 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-center text-[0.72rem] text-slate-400">
                  Instant access to multiplayer lobbies. No password needed.
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-200">
                {error}
              </p>
            )}

            {/* Main Action Button */}
            <Button
              type="submit"
              className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-black text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                "Connecting..."
              ) : mode === "login" ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> SIGN IN TO ARENA
                </>
              ) : mode === "register" ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> CREATE ACCOUNT
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4 fill-current" /> JUMP IN AS GUEST
                </>
              )}
            </Button>

            {/* Subtle Switcher Link */}
            {mode === "login" && (
              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Want to play immediately? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("guest");
                    setError(null);
                  }}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
                >
                  Instant Guest Play
                </button>
              </div>
            )}

            {mode === "guest" && (
              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
