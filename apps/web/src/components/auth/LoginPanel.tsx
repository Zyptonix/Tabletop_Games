"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPanel() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.login({ username, password });
      setUser(result.user);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-zinc-950 text-white">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-black text-zinc-950">Tabletop Arena</h1>
          <p className="text-sm text-zinc-600">Private friends-only server</p>
        </div>
      </div>
      <div className="space-y-3">
        <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" autoComplete="username" />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
        />
      </div>
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      <Button type="submit" className="mt-5 w-full" disabled={loading}>
        <LogIn className="h-4 w-4" />
        {loading ? "Signing in" : "Sign in"}
      </Button>
    </motion.form>
  );
}
