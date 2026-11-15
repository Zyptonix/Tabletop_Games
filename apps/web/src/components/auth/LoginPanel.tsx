"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Sparkles, UserPlus, Zap } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@tabletop/shared";

interface LoginPanelProps {
  onSuccess?: (user: AuthUser) => void;
  redirectPath?: string | null;
  initialMode?: "guest" | "login" | "register";
}

export function LoginPanel({
  onSuccess,
  redirectPath = "/dashboard",
  initialMode = "guest"
}: LoginPanelProps = {}) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [mode, setMode] = useState<"guest" | "login" | "register">(initialMode);
  const [guestName, setGuestName] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "guest") {
        const cleanName = guestName.trim();
        if (!cleanName) {
          setError("Please enter a nickname.");
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
      } else if (mode === "register") {
        const result = await api.register({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          email: email.trim() || null,
          password
        });

        const login = await api.login({
          username: result.user.username,
          password
        });

        setUser(login.user);
        if (onSuccess) {
          onSuccess(login.user);
        } else if (redirectPath) {
          router.replace(redirectPath);
        }
      } else {
        const result = await api.login({ username, password });
        setUser(result.user);
        if (onSuccess) {
          onSuccess(result.user);
        } else if (redirectPath) {
          router.replace(redirectPath);
        }
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#090d12] px-4 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111821] p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Tabletop Arena</h1>
            <p className="text-xs font-semibold text-emerald-400/80">Multiplayer Game Platform</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition-all ${
              mode === "guest"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => {
              setMode("guest");
              setError(null);
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Play
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition-all ${
              mode === "login"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
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
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition-all ${
              mode === "register"
                ? "bg-emerald-500 text-zinc-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Register
          </button>
        </div>

        {mode === "guest" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                Choose a Nickname
              </label>
              <Input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="e.g. Zarif, Haimee, Zozo"
                required
                maxLength={30}
                autoFocus
              />
            </div>
            <p className="text-[0.72rem] text-slate-400">
              No password needed. Jump straight into the dashboard and join or host matches instantly!
            </p>
          </div>
        )}

        {mode === "login" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Username</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Password</label>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
                maxLength={200}
              />
            </div>
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Username</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Display Name</label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name shown in game"
                autoComplete="name"
                required
                maxLength={40}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Email (Optional)</label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Password</label>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choose a password"
                type="password"
                autoComplete="new-password"
                required
                minLength={1}
                maxLength={200}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3.5 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="mt-5 w-full bg-emerald-600 font-black text-white hover:bg-emerald-500"
          disabled={loading}
        >
          {loading ? (
            "Please wait..."
          ) : mode === "guest" ? (
            <>
              <Zap className="mr-1.5 h-4 w-4" /> Jump Into Dashboard
            </>
          ) : mode === "register" ? (
            <>
              <UserPlus className="mr-1.5 h-4 w-4" /> Create Account
            </>
          ) : (
            <>
              <LogIn className="mr-1.5 h-4 w-4" /> Sign In
            </>
          )}
        </Button>
      </form>
    </main>
  );
}