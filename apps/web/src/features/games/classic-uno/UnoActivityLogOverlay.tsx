"use client";

import { useMemo, useState } from "react";
import type { GameEvent } from "@tabletop/game-core";

type PlayerLabel = { userId: string; displayName: string };
type EventKind = "play" | "swap" | "pass" | "discard" | "penalty" | "roulette" | "reverse" | "skip" | "elimination" | "victory" | "draw" | "system";
type ActivityRow = { id: string; createdAt: string; kind: EventKind; title: string; detail?: string | undefined };
type Obj = Record<string, unknown>;

const visuals: Record<EventKind, { asset: string; label: string; border: string; iconBg: string; text: string; tag: string }> = {
  play: { asset: "card-play", label: "CARD PLAY", border: "rgba(248,113,113,.7)", iconBg: "rgba(244,63,94,.12)", text: "text-rose-100", tag: "text-rose-200 bg-rose-400/10 border-rose-300/20" },
  swap: { asset: "hand-swap", label: "HAND SWAP", border: "rgba(192,132,252,.8)", iconBg: "rgba(168,85,247,.13)", text: "text-violet-100", tag: "text-violet-200 bg-violet-400/10 border-violet-300/20" },
  pass: { asset: "hand-pass", label: "HAND PASS", border: "rgba(45,212,191,.8)", iconBg: "rgba(20,184,166,.12)", text: "text-teal-100", tag: "text-teal-200 bg-teal-400/10 border-teal-300/20" },
  discard: { asset: "discard-all", label: "DISCARD ALL", border: "rgba(251,191,36,.82)", iconBg: "rgba(245,158,11,.12)", text: "text-amber-100", tag: "text-amber-200 bg-amber-400/10 border-amber-300/20" },
  penalty: { asset: "draw-penalty", label: "DRAW PENALTY", border: "rgba(251,146,60,.82)", iconBg: "rgba(249,115,22,.12)", text: "text-orange-100", tag: "text-orange-200 bg-orange-400/10 border-orange-300/20" },
  roulette: { asset: "roulette-hit", label: "ROULETTE", border: "rgba(129,140,248,.82)", iconBg: "rgba(99,102,241,.13)", text: "text-indigo-100", tag: "text-indigo-200 bg-indigo-400/10 border-indigo-300/20" },
  reverse: { asset: "reverse", label: "REVERSE", border: "rgba(96,165,250,.82)", iconBg: "rgba(59,130,246,.13)", text: "text-sky-100", tag: "text-sky-200 bg-sky-400/10 border-sky-300/20" },
  skip: { asset: "skip", label: "SKIP", border: "rgba(251,113,133,.8)", iconBg: "rgba(244,63,94,.12)", text: "text-pink-100", tag: "text-pink-200 bg-pink-400/10 border-pink-300/20" },
  elimination: { asset: "elimination", label: "ELIMINATION", border: "rgba(248,113,113,.9)", iconBg: "rgba(220,38,38,.16)", text: "text-red-100", tag: "text-red-200 bg-red-400/10 border-red-300/20" },
  victory: { asset: "victory", label: "MATCH RESULT", border: "rgba(251,191,36,.85)", iconBg: "rgba(245,158,11,.14)", text: "text-amber-50", tag: "text-amber-100 bg-amber-400/10 border-amber-300/20" },
  draw: { asset: "cards-drawn", label: "DRAW", border: "rgba(125,211,252,.78)", iconBg: "rgba(14,165,233,.13)", text: "text-sky-100", tag: "text-sky-200 bg-sky-400/10 border-sky-300/20" },
  system: { asset: "activity", label: "MATCH", border: "rgba(148,163,184,.65)", iconBg: "rgba(148,163,184,.09)", text: "text-slate-100", tag: "text-slate-200 bg-slate-400/10 border-slate-300/20" }
};

export function UnoActivityLogOverlay({
  events,
  players,
  currentUserId
}: {
  events: GameEvent[];
  players: PlayerLabel[];
  currentUserId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const rows = useMemo(() => buildRows(events, players, currentUserId), [events, players, currentUserId]);
  const latest = rows[0];

  return (
    <section
      aria-label="Match activity log"
      className={`relative flex w-full shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-sky-200/10 bg-cover shadow-[0_16px_44px_rgba(0,0,0,.28)] backdrop-blur-xl ${expanded ? "h-[min(36vh,300px)] min-h-[172px]" : "h-[3.7rem]"}`}
      style={{ backgroundImage: "linear-gradient(145deg, rgba(7,15,29,.84), rgba(4,9,18,.94)), url(\"/uno-assets/textures/panel-glass.svg\")" }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-sky-200/15 bg-sky-400/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
            <img src="/uno-assets/activity.svg" alt="" width="26" height="26" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.19em] text-sky-100/95">Match activity</p>
            <p className="truncate text-[10px] font-medium text-white/40">{latest?.title ?? "Plays and power effects"}</p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse match activity" : "Expand match activity"}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.045] px-2 text-[10px] font-bold text-white/70 transition hover:border-sky-200/25 hover:bg-sky-300/[0.08] hover:text-white"
        >
          <span className="tabular-nums">{rows.length}</span>
          <span className="text-sky-200/80">{expanded ? "−" : "+"}</span>
        </button>
      </header>

      {expanded ? (
        <div role="log" aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2 [scrollbar-color:rgba(125,211,252,.22)_transparent] [scrollbar-width:thin]">
          {rows.length ? rows.map((row) => {
            const visual = visuals[row.kind];
            return (
              <article
                key={row.id}
                className="group relative flex gap-2 overflow-hidden rounded-xl border border-white/[0.055] bg-[#07101d]/80 px-2 py-2 transition-colors hover:border-white/[0.13] hover:bg-white/[0.045]"
                style={{ borderLeftWidth: 2, borderLeftColor: visual.border }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center self-start rounded-[.72rem] border border-white/[0.075]" style={{ background: visual.iconBg }}>
                  <img src={`/uno-assets/${visual.asset}.svg`} alt="" width="32" height="32" loading="lazy" decoding="async" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`min-w-0 flex-1 text-[11px] font-extrabold leading-[1.35] ${visual.text}`}>{row.title}</p>
                    <time className="shrink-0 pt-px text-[9px] font-semibold tabular-nums text-white/35">{formatClock(row.createdAt)}</time>
                  </div>
                  {row.detail ? <p className="mt-1 text-[10px] font-medium leading-snug text-slate-300/65">{row.detail}</p> : null}
                  <div className="mt-1.5">
                    <span className={`inline-flex rounded-md border px-1.5 py-[2px] text-[8px] font-black tracking-[.12em] ${visual.tag}`}>{visual.label}</span>
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1.5 px-4 text-center">
              <img src="/uno-assets/activity.svg" width="34" height="34" alt="" className="opacity-65" />
              <p className="text-[11px] font-bold text-white/65">Nothing has happened yet</p>
              <p className="text-[10px] text-white/35">Card plays and power effects will show here.</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function buildRows(events: GameEvent[], players: PlayerLabel[], currentUserId: string | null): ActivityRow[] {
  const names = new Map(players.map((player) => [player.userId, player.displayName]));
  const name = (id: unknown): string => {
    if (typeof id !== "string" || !id) return "a player";
    if (id === currentUserId) return "You";
    return names.get(id) ?? "a player";
  };
  const all = events.slice(-80);

  return all.flatMap((event, index): ActivityRow[] => {
    const payload = isRecord(event.payload) ? event.payload : {};
    const type = event.type;
    const createdAt = String(event.createdAt ?? "");
    const actorId = str(payload.actorPlayerId) ?? str(payload.playerId) ?? str(payload.fromPlayerId);
    const priorActorId = findRecentPlayedBy(all, index);
    const inferredActorId = actorId ?? priorActorId;
    const targetId = str(payload.targetPlayerId) ?? str(payload.skippedPlayerId) ?? str(payload.toPlayerId);
    const actor = name(inferredActorId);
    const target = name(targetId);
    const count = num(payload.actuallyDrawn) ?? num(payload.count) ?? num(payload.drawnCount);
    const eventMessage = typeof event.message === "string" ? event.message : "";
    let row: ActivityRow | null = null;

    if (type.endsWith(":play_card")) {
      const card = isRecord(payload.card) ? payload.card : {};
      const color = str(card.color) ?? str(payload.color);
      const value = str(card.value) ?? str(card.rank) ?? str(payload.cardName);
      const cardTitle = formatCard(color, value);
      row = { id: event.id, createdAt, kind: "play", title: `${actor} played ${cardTitle ?? "a card"}`, detail: cardTitle ? (eventMessage && !eventMessage.includes(cardTitle) ? eventMessage : undefined) : eventMessage || undefined };
    } else if (type.endsWith(":seven_swap")) {
      const from = name(payload.fromPlayerId);
      const to = name(payload.toPlayerId);
      const fromCount = num(payload.fromCount);
      const toCount = num(payload.toCount);
      const details = fromCount !== null && toCount !== null ? `${fromCount} cards ↔ ${toCount} cards` : eventMessage || "The two hands exchanged places";
      row = { id: event.id, createdAt, kind: "swap", title: `${from} swapped hands with ${to}`, detail: details };
    } else if (type.endsWith(":zero_pass")) {
      const transfers = Array.isArray(payload.transfers) ? payload.transfers.filter(isRecord) : [];
      const direction = str(payload.directionLabel) ?? (payload.direction === -1 ? "counterclockwise" : "clockwise");
      const transferSummary = transfers.length ? `${transfers.length} hand transfers · ${direction}` : direction;
      row = { id: event.id, createdAt, kind: "pass", title: "Everyone passed their hands", detail: transferSummary };
    } else if (type.endsWith(":discard_all")) {
      const discarded = num(payload.count);
      const color = titleCase(str(payload.color) ?? "matching-color");
      row = { id: event.id, createdAt, kind: "discard", title: `${name(payload.playerId)} discarded all${discarded !== null ? ` ${discarded}` : ""} ${color} card${discarded === 1 ? "" : "s"}`, detail: "The matching cards swept into the discard pile" };
    } else if (type.endsWith(":penalty_stack")) {
      const added = num(payload.addedAmount);
      const total = num(payload.pendingAmount) ?? num(payload.amount);
      const targetText = targetId ? ` · ${target} is next` : "";
      row = { id: event.id, createdAt, kind: "penalty", title: `${name(payload.playerId)} stacked ${added !== null ? `+${added}` : "a draw penalty"}`, detail: `${total !== null ? `Penalty is now ${total} cards` : (eventMessage || "Draw penalty increased")}${targetText}` };
    } else if (type.endsWith(":penalty_resolved")) {
      const amount = num(payload.actuallyDrawn) ?? num(payload.count) ?? num(payload.pendingAmount) ?? num(payload.amount);
      row = { id: event.id, createdAt, kind: "draw", title: `${name(payload.playerId)} drew ${amount ?? "penalty"} card${amount === 1 ? "" : "s"}`, detail: "Draw stack resolved" };
    } else if (type.endsWith(":roulette_pending")) {
      row = { id: event.id, createdAt, kind: "roulette", title: `${actor} hit ${target} with Color Roulette`, detail: "Target chooses a color, then draws until matching it" };
    } else if (type.endsWith(":roulette_color_chosen")) {
      const color = titleCase(str(payload.chosenColor) ?? "color");
      row = { id: event.id, createdAt, kind: "roulette", title: `${target} chose ${color} for Color Roulette`, detail: `${actor} launched the roulette effect` };
    } else if (type.endsWith(":roulette_reveal")) {
      const card = isRecord(payload.revealedCard) ? payload.revealedCard : isRecord(payload.card) ? payload.card : {};
      const cardColor = titleCase(str(card.color) ?? "unknown");
      const chosenColor = titleCase(str(payload.chosenColor) ?? "chosen");
      const matched = payload.matched === true;
      const revealedCard = formatCard(str(card.color), str(card.value)) ?? `${cardColor} card`;
      row = { id: event.id, createdAt, kind: "roulette", title: `${target} revealed ${revealedCard}`, detail: matched ? `Matched ${chosenColor} — roulette stops` : `Needed ${chosenColor} · draw continues` };
    } else if (type.endsWith(":roulette")) {
      const drawn = num(payload.actuallyDrawn) ?? num(payload.count);
      const chosenColor = titleCase(str(payload.chosenColor) ?? "chosen color");
      row = { id: event.id, createdAt, kind: "roulette", title: `${actor} hit ${target} with Color Roulette`, detail: `${target} drew ${drawn ?? "several"} card${drawn === 1 ? "" : "s"} · matched ${chosenColor}` };
    } else if (type.endsWith(":cards_drawn")) {
      // The detailed roulette/stack rows above carry the context; still log normal and roulette draws with their source.
      if (payload.source === "stack_penalty" || payload.source === "roulette") {
        // The corresponding penalty_resolved / roulette event already records the whole outcome.
        // Suppress this duplicate summary but keep roulette_reveal entries from step-by-step play.
        return [];
      } else {
        row = { id: event.id, createdAt, kind: "draw", title: `${name(payload.playerId ?? payload.targetPlayerId)} drew ${count ?? "some"} card${count === 1 ? "" : "s"}`, detail: str(payload.source) === "normal_draw" ? "Drew from the deck" : undefined };
      }
    } else if (type.endsWith(":draw")) {
      // cards_drawn follows this event in No Mercy; suppress the duplicate entry.
      return [];
    } else if (type.endsWith(":reverse")) {
      row = { id: event.id, createdAt, kind: "reverse", title: `${actor === "a player" ? "Turn direction" : `${actor} reversed direction`}`, detail: eventMessage && eventMessage !== "Turn direction reversed." ? eventMessage : "Clockwise ↔ counterclockwise" };
    } else if (type.endsWith(":skip") || type.endsWith(":offline_skip") || type.endsWith(":timeout_skip")) {
      const skippedId = str(payload.skippedPlayerId) ?? str(payload.playerId) ?? targetId;
      const skippedName = name(skippedId);
      const normalSkip = type.endsWith(":skip") && !type.endsWith(":offline_skip") && !type.endsWith(":timeout_skip");
      row = { id: event.id, createdAt, kind: "skip", title: normalSkip && skippedId && inferredActorId && skippedId !== inferredActorId ? `${actor} skipped ${skippedName}` : `${skippedName} was skipped`, detail: type.endsWith(":offline_skip") ? "Turn skipped while player was offline" : type.endsWith(":timeout_skip") ? "Turn skipped after the timer expired" : eventMessage || "Skip effect resolved" };
    } else if (type.endsWith(":comeback")) {
      row = { id: event.id, createdAt, kind: "skip", title: `${name(payload.playerId)} played Skip All`, detail: "Everyone else was skipped · the same player keeps the turn" };
    } else if (type.endsWith(":eliminated")) {
      const handCount = num(payload.handCount);
      row = { id: event.id, createdAt, kind: "elimination", title: `${name(payload.playerId)} was eliminated`, detail: handCount !== null ? `Reached ${handCount} cards · moved to the mercy pile` : eventMessage || "Removed from the match" };
    } else if (type.endsWith(":game_over") || type.endsWith(":finished")) {
      const winnerId = str(payload.winnerUserId) ?? str(payload.playerId);
      row = { id: event.id, createdAt, kind: "victory", title: winnerId ? `${name(winnerId)} won the match` : "Match finished", detail: eventMessage || "Final results are ready" };
    } else if (type.endsWith(":uno_called") || type.endsWith(":call_uno")) {
      row = { id: event.id, createdAt, kind: "play", title: `${name(payload.playerId)} called UNO`, detail: eventMessage || "One card remaining" };
    } else if (type.endsWith(":uno_penalty") || type.endsWith(":missed_uno")) {
      row = { id: event.id, createdAt, kind: "penalty", title: `${name(payload.playerId)} missed UNO`, detail: eventMessage || "UNO penalty applied" };
    } else if (eventMessage) {
      const kind: EventKind = type.includes("penalty") ? "penalty" : type.includes("roulette") ? "roulette" : "system";
      row = { id: event.id, createdAt, kind, title: eventMessage, detail: undefined };
    }

    return row ? [row] : [];
  }).slice(-35).reverse();
}

function findRecentPlayedBy(events: GameEvent[], beforeIndex: number): string | undefined {
  const current = events[beforeIndex];
  const currentTime = current ? new Date(String(current.createdAt)).getTime() : Number.NaN;
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event?.type.endsWith(":play_card")) continue;
    const time = new Date(String(event.createdAt)).getTime();
    if (Number.isFinite(currentTime) && Number.isFinite(time) && currentTime - time > 12_000) return undefined;
    const payload = isRecord(event.payload) ? event.payload : {};
    return str(payload.playerId);
  }
  return undefined;
}

function formatCard(color: string | undefined, value: string | undefined): string | undefined {
  if (!value) return color ? `${titleCase(color)} card` : undefined;
  const normalized = value.toLowerCase();
  const valueLabels: Record<string, string> = {
    draw_two: "+2", draw_four: "+4", wild_draw_four: "Wild +4", wild_draw_four_reverse: "Wild +4 Reverse",
    wild_draw_six: "Wild +6", wild_draw_ten: "Wild +10", roulette: "Color Roulette", reverse: "Reverse",
    skip: "Skip", comeback: "Skip All", discard_all: "Discard All", wild: "Wild"
  };
  const label = valueLabels[normalized] ?? value;
  if (color && color !== "wild" && /^\d$/.test(value)) return `${titleCase(color)} ${label}`;
  if (color && color !== "wild" && ["skip", "reverse", "draw_two", "discard_all"].includes(normalized)) return `${titleCase(color)} ${label}`;
  return label;
}

function formatClock(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function titleCase(value: string): string { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function isRecord(value: unknown): value is Obj { return typeof value === "object" && value !== null; }
function str(value: unknown): string | undefined { return typeof value === "string" && value.length ? value : undefined; }
function num(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
