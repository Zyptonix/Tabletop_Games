"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clipboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinRoomPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (clean) {
        setCode(clean);
        setError(null);
      }
    } catch {
      setError("Clipboard access denied. Please type the code manually.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter a room code.");
      return;
    }
    if (cleanCode.length < 3) {
      setError("Room codes are usually 4 to 6 characters.");
      return;
    }
    router.push(`/rooms/${cleanCode}`);
  }

  return (
    <div className="space-y-4 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#091114] p-5 shadow-xl">
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label
              htmlFor="room-code-input"
              className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-300"
            >
              Enter Room Code
            </label>
            <div className="relative flex items-center">
              <Input
                id="room-code-input"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase().slice(0, 6));
                  if (error) setError(null);
                }}
                placeholder="e.g. ABCD"
                maxLength={6}
                autoFocus
                className="h-14 rounded-xl border-white/20 bg-black/60 text-center font-mono text-2xl font-black uppercase tracking-[0.3em] text-emerald-300 placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={pasteClipboard}
                title="Paste from clipboard"
                className="absolute right-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.14] hover:text-white"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Paste</span>
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-bold text-rose-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-black text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] cursor-pointer"
          >
            <LogIn className="mr-2 h-4 w-4" />
            ENTER TABLE
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-center text-xs text-slate-400">
            Ask the room host for their 4–6 character invite code.
          </p>
        </form>
      </div>
    </div>
  );
}
