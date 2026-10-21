"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPanel() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [registering, setRegistering] = useState(false);
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
      if (registering) {
        const result = await api.register({
          username: username.trim(),
          displayName: displayName.trim(),
          email: email.trim() || null,
          password
        });

        // Registration creates the account. Sign in using the normal
        // login endpoint so the existing session-cookie flow is preserved.
        const login = await api.login({
          username: result.user.username,
          password
        });

        setUser(login.user);
      } else {
        const result = await api.login({ username, password });
        setUser(result.user);
      }

      router.replace("/dashboard");
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
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#111821] p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-700 text-white">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-black">Tabletop Arena</h1>
            <p className="text-sm text-slate-400">Private friends-only server</p>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-bold">
          {registering ? "Create an account" : "Sign in"}
        </h2>

        <div className="space-y-3">
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
          />

          {registering && (
            <>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display name"
                autoComplete="name"
                required
                maxLength={40}
              />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email (optional)"
                type="email"
                autoComplete="email"
              />
            </>
          )}

          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            required
            minLength={1}
            maxLength={200}
          />
        </div>

        {registering && (
          <p className="mt-2 text-xs text-slate-400">
            Choose any non-empty password, including a short one such as 123.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-5 w-full" disabled={loading}>
          {registering ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Please wait..." : registering ? "Create account" : "Sign in"}
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          onClick={() => {
            setRegistering((value) => !value);
            setError(null);
          }}
        >
          {registering
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
    </main>
  );
}