"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, LogIn, Trophy, Users, UserPlus, Wifi } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

export function LoginPanel() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = mode === "login"
        ? await api.login({ username: username.trim(), password })
        : await api.register({ username: username.trim(), password, ...(displayName.trim() ? { displayName: displayName.trim() } : {}) });
      setUser(result.user);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : mode === "login" ? "Couldn't sign you in. Check the server and your details." : "Couldn't create the account. Try a different username.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#10171d] shadow-[0_32px_100px_rgba(0,0,0,0.42)] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative flex min-h-[28rem] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.19),transparent_36%),linear-gradient(145deg,#0e211e,#0b1117_64%,#14202a)] p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full border border-emerald-300/10" />
        <div className="pointer-events-none absolute -right-2 -top-2 h-32 w-32 rounded-full border border-emerald-300/10" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Gamepad2 className="h-6 w-6" /></span>
          <div><p className="text-lg font-black tracking-tight text-white">Tabletop Arena</p><p className="text-xs font-semibold uppercase tracking-[.22em] text-emerald-200/60">Friends-only edition</p></div>
        </div>
        <div className="relative z-10 py-12 lg:py-16">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-emerald-200"><Wifi className="h-3.5 w-3.5" /> Your LAN. Your people.</p>
          <h1 className="max-w-xl text-4xl font-black leading-[1.03] tracking-tight text-white sm:text-5xl">One room.<br /><span className="text-emerald-300">Too much</span> betrayal.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300/75 sm:text-base">UNO, wild rematches, friendly trash talk and a leaderboard your group actually cares about.</p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/8 bg-white/[.035] p-3"><Users className="mb-3 h-4 w-4 text-emerald-300" /><p className="text-xl font-black text-white">2–10</p><p className="mt-1 text-[11px] font-semibold text-slate-400">Players</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[.035] p-3"><Trophy className="mb-3 h-4 w-4 text-amber-300" /><p className="text-xl font-black text-white">Local</p><p className="mt-1 text-[11px] font-semibold text-slate-400">Leaderboard</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[.035] p-3"><LockKeyhole className="mb-3 h-4 w-4 text-sky-300" /><p className="text-xl font-black text-white">LAN</p><p className="mt-1 text-[11px] font-semibold text-slate-400">No cloud</p></div>
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500"><span>● Runs on your host PC</span><span>● PostgreSQL saves scores</span><span>● No Docker required</span></div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <p className="text-xs font-black uppercase tracking-[.24em] text-emerald-300">Pull up a chair</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{mode === "login" ? "Welcome back." : "Join the table."}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{mode === "login" ? "Sign in with your local player account." : "Make a player account in seconds. No admin invite needed."}</p>

          <div className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={24} autoComplete="username" placeholder="e.g. uno_menace" className="h-12 w-full rounded-xl border border-white/10 bg-[#0a1015] px-4 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/10" /></label>
            {mode === "register" ? <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Display name <span className="normal-case tracking-normal text-slate-600">(optional)</span></span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="nickname" placeholder={username || "What your friends see"} className="h-12 w-full rounded-xl border border-white/10 bg-[#0a1015] px-4 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/10" /></label> : null}
            <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Password</span><input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={1} maxLength={200} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "register" ? "A simple password is fine" : "Your password"} className="h-12 w-full rounded-xl border border-white/10 bg-[#0a1015] px-4 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/10" /></label>
          </div>
          {mode === "register" ? <p className="mt-3 text-xs leading-5 text-slate-500">Passwords can be simple for this private LAN game, but don’t reuse your work or personal account password.</p> : null}
          {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm font-semibold text-rose-200">{error}</p> : null}
          <button type="submit" disabled={loading} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#06110d] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60">{mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{loading ? "One sec…" : mode === "login" ? "Enter the arena" : "Create my player"}</button>
          <div className="mt-6 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/8" />OR<span className="h-px flex-1 bg-white/8" /></div>
          <p className="mt-5 text-center text-sm text-slate-400">{mode === "login" ? "New to this group?" : "Already have a player?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="ml-1 font-black text-emerald-300 underline-offset-4 hover:underline">{mode === "login" ? "Make an account" : "Sign in"}</button></p>
        </form>
      </div>
    </section>
  );
}
