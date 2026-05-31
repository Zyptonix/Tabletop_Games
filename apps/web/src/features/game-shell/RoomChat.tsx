"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ChatMessageView } from "@tabletop/shared";
import { ChevronDown, ChevronUp, Send, ScrollText, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REACTION_PREFIX } from "@/features/games/classic-uno/ReactionOverlay";

const QUICK_REACTIONS = [
  { emoji: "\u{1F602}", label: "Laugh" },
  { emoji: "\u{1F480}", label: "Skull" },
  { emoji: "\u{1F525}", label: "Fire" },
  { emoji: "\u{1F44F}", label: "Clap" },
  { emoji: "\u{1F642}", label: "Smile" },
  { emoji: "\u{1F60E}", label: "Cool" },
  { emoji: "\u{2764}\u{FE0F}", label: "Heart" }
];

function isReactionMessage(message: ChatMessageView) {
  return typeof message.body === "string" && message.body.startsWith(REACTION_PREFIX);
}

function isSystemMessage(message: ChatMessageView) {
  return message.type === "system";
}

function getAuthorName(message: ChatMessageView) {
  return message.displayName || "Unknown";
}

function getAuthorInitials(message: ChatMessageView) {
  return getAuthorName(message).slice(0, 2).toUpperCase();
}

function formatTime(value: string | number | Date | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function RoomChat({
  roomId,
  messages,
  onSend,
  onlineCount
}: {
  roomId: string;
  messages: ChatMessageView[];
  onSend: (roomId: string, body: string) => void;
  onlineCount?: number;
}) {
  const [body, setBody] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const visibleChat = useMemo(
    () => messages.filter((message) => !isSystemMessage(message) && !isReactionMessage(message)),
    [messages]
  );

  const gameLog = useMemo(() => messages.filter((message) => isSystemMessage(message)), [messages]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    onSend(roomId, trimmed);
    setBody("");
  }

  function sendReaction(emoji: string) {
    onSend(roomId, `${REACTION_PREFIX}${emoji}`);
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-black/62 text-white shadow-[0_30px_100px_rgb(0_0_0_/_0.45)] backdrop-blur-xl">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgb(52_211_153_/_0.9)]" />
            <h2 className="text-lg font-black leading-none tracking-wide text-white">Chat</h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-white/45">
            {typeof onlineCount === "number" ? `${onlineCount} online` : "Room feed"}
          </p>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Collapse chat"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 [scrollbar-width:thin] [scrollbar-color:#22c55e_#020604]">
        {visibleChat.length === 0 ? (
          <div className="grid h-full min-h-24 place-items-center text-center">
            <div>
              <Smile className="mx-auto h-7 w-7 text-white/25" />
              <p className="mt-2 text-sm font-bold text-white/45">No messages yet</p>
              <p className="mt-1 text-xs text-white/30">Start the table talk.</p>
            </div>
          </div>
        ) : (
          visibleChat.slice(-50).map((message) => (
            <article key={message.id} className="group rounded-2xl px-1 py-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[0.65rem] font-black text-white/80">
                    {getAuthorInitials(message)}
                  </div>
                  <p className="truncate text-sm font-black text-emerald-300">{getAuthorName(message)}</p>
                </div>
                <time className="shrink-0 text-[0.65rem] font-semibold text-white/30">{formatTime(message.createdAt)}</time>
              </div>
              <p className="ml-9 mt-1 break-words text-sm leading-relaxed text-white/76">{message.body || ""}</p>
            </article>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction.label}
              type="button"
              className="grid h-7 w-7 place-items-center rounded-xl text-base transition hover:scale-110 hover:bg-white/10"
              onClick={() => sendReaction(reaction.emoji)}
              aria-label={`React ${reaction.label}`}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={submit}>
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Type a message..."
            className="h-10 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-2xl bg-white/10 text-white hover:bg-emerald-400 hover:text-zinc-950"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <section className="shrink-0 border-t border-white/10 bg-white/[0.025]">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
          onClick={() => setLogOpen((current) => !current)}
        >
          <span className="flex items-center gap-2 text-sm font-black text-white/80">
            <ScrollText className="h-4 w-4 text-white/45" />
            Game log
          </span>
          {logOpen ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
        </button>

        {logOpen ? (
          <div className="max-h-40 space-y-1 overflow-y-auto border-t border-white/10 px-4 py-3 [scrollbar-width:thin] [scrollbar-color:#22c55e_#020604]">
            {gameLog.length === 0 ? (
              <p className="text-xs font-semibold text-white/35">No system events yet.</p>
            ) : (
              gameLog.slice(-30).map((message) => (
                <p key={message.id} className="text-xs leading-relaxed text-white/42">
                  {message.body || "System event"}
                </p>
              ))
            )}
          </div>
        ) : null}
      </section>
    </aside>
  );
}