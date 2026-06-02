"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";

interface PublicPlayerLabel {
  userId: string;
  displayName: string;
}

export type PowerSeatEffectKind = "skip" | "offline" | "draw" | "roulette";

export interface PowerSeatEffect {
  id: string;
  kind: PowerSeatEffectKind;
  label: string;
  detail?: string | undefined;
}

interface PowerNotice {
  id: string;
  title: string;
  subtitle?: string | undefined;
  tone: "skip" | "reverse" | "draw" | "roulette" | "special";
  targetPlayerId?: string | undefined;
  seatEffect?: PowerSeatEffect | undefined;
  createdAt: string;
}

const EVENT_MAX_AGE_MS = 12_000;

export function PowerEventOverlay({
  events,
  players,
  currentUserId,
  onSeatEffect
}: {
  events: GameEvent[];
  players: PublicPlayerLabel[];
  currentUserId: string | null;
  onSeatEffect?: ((playerId: string, effect: PowerSeatEffect) => void) | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const processedRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number[]>([]);
  const [notices, setNotices] = useState<PowerNotice[]>([]);

  useEffect(() => {
    return () => {
      for (const timeout of timeoutRef.current) {
        window.clearTimeout(timeout);
      }
      timeoutRef.current = [];
    };
  }, []);

  useEffect(() => {
    for (const event of events) {
      if (processedRef.current.has(event.id)) continue;
      processedRef.current.add(event.id);

      const notice = normalizePowerEvent(event, players, currentUserId);
      if (!notice || isTooOld(notice.createdAt)) continue;

      setNotices((current) => [...current, notice].slice(-3));
      if (notice.targetPlayerId && notice.seatEffect) {
        onSeatEffect?.(notice.targetPlayerId, notice.seatEffect);
      }

      const timeout = window.setTimeout(
        () => setNotices((current) => current.filter((item) => item.id !== notice.id)),
        notice.tone === "draw" ? 2400 : 1900
      );
      timeoutRef.current.push(timeout);
    }
  }, [currentUserId, events, onSeatEffect, players]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[52] grid place-items-center overflow-hidden">
      <div className="relative flex -translate-y-10 flex-col items-center gap-3">
        <AnimatePresence mode="popLayout">
          {notices.map((notice) => (
            <motion.div
              key={notice.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.82, rotateX: reduceMotion ? 0 : -16 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -18, scale: 0.9 }}
              transition={{ duration: reduceMotion ? 0.18 : 0.34, ease: [0.18, 0.9, 0.22, 1] }}
              className="relative min-w-[min(82vw,28rem)] overflow-hidden rounded-[1.75rem] border px-7 py-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-2xl"
              style={noticeStyle(notice.tone)}
            >
              <motion.div
                className="absolute inset-0 opacity-70"
                {...(reduceMotion
                  ? {}
                  : {
                      animate: { opacity: [0.35, 0.72, 0.35], scale: [0.98, 1.04, 0.98] },
                      transition: { duration: 1.05, repeat: Infinity, ease: "easeInOut" as const }
                    })}
                style={noticeGlowStyle(notice.tone)}
              />
              <div className="relative z-10">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.32em] text-white/55">Table event</p>
                <p className="mt-1 text-3xl font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] sm:text-5xl">
                  {notice.title}
                </p>
                {notice.subtitle ? <p className="mt-2 text-sm font-bold text-white/70 sm:text-base">{notice.subtitle}</p> : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function normalizePowerEvent(event: GameEvent, players: PublicPlayerLabel[], currentUserId: string | null): PowerNotice | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  const type = event.type;
  const source = getString(payload.source);
  const playerId = getString(payload.playerId);
  const targetPlayerId = getString(payload.targetPlayerId);
  const skippedPlayerId = getString(payload.skippedPlayerId) ?? targetPlayerId ?? playerId;
  const count = getNumber(payload.actuallyDrawn) ?? getNumber(payload.count) ?? getNumber(payload.amount);
  const amount = getNumber(payload.pendingAmount) ?? getNumber(payload.amount);
  const addedAmount = getNumber(payload.addedAmount);

  if (type.endsWith(":offline_skip")) {
    const name = playerName(skippedPlayerId, players, currentUserId);
    return {
      id: event.id,
      title: `${name} skipped offline`,
      subtitle: "Seat reserved. Turn moved on.",
      tone: "skip",
      targetPlayerId: skippedPlayerId,
      seatEffect: { id: event.id, kind: "offline", label: "SKIP", detail: "Offline" },
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":skip")) {
    const name = playerName(skippedPlayerId, players, currentUserId);
    return {
      id: event.id,
      title: `${name} skipped`,
      tone: "skip",
      targetPlayerId: skippedPlayerId,
      seatEffect: { id: event.id, kind: "skip", label: "SKIP" },
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":reverse")) {
    return {
      id: event.id,
      title: "Reversed",
      subtitle: "Turn direction changed",
      tone: "reverse",
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":penalty_stack") && amount && amount > 0) {
    return {
      id: event.id,
      title: `Draw ${amount}`,
      subtitle: addedAmount && addedAmount > 0 ? `+${addedAmount} stacked` : "Draw stack active",
      tone: "draw",
      targetPlayerId,
      seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: `+${amount}`, detail: "Stack" } : undefined,
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":cards_drawn") && count && (count >= 4 || source === "stack_penalty" || source === "roulette")) {
    const name = playerName(playerId ?? targetPlayerId, players, currentUserId);
    return {
      id: event.id,
      title: `${name} drew ${count}`,
      subtitle: source === "roulette" ? "Roulette draw" : "Cards drawn",
      tone: source === "roulette" ? "roulette" : "draw",
      targetPlayerId: playerId ?? targetPlayerId,
      seatEffect: playerId || targetPlayerId ? { id: event.id, kind: source === "roulette" ? "roulette" : "draw", label: `+${count}` } : undefined,
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":roulette") || type.endsWith(":roulette_pending")) {
    const name = playerName(targetPlayerId, players, currentUserId);
    return {
      id: event.id,
      title: "Roulette",
      subtitle: count && count > 0 ? `${name} drew ${count} card${count === 1 ? "" : "s"}` : `${name} is targeted`,
      tone: "roulette",
      targetPlayerId,
      seatEffect: targetPlayerId ? { id: event.id, kind: "roulette", label: "ROULETTE" } : undefined,
      createdAt: event.createdAt
    };
  }

  if (type.endsWith(":zero_pass")) {
    return { id: event.id, title: "Hands passed", subtitle: "Everyone rotated hands", tone: "special", createdAt: event.createdAt };
  }

  if (type.endsWith(":seven_swap")) {
    return { id: event.id, title: "Hands swapped", subtitle: "7 swap activated", tone: "special", createdAt: event.createdAt };
  }

  if (type.endsWith(":discard_all")) {
    const name = playerName(playerId, players, currentUserId);
    return { id: event.id, title: "Discard all", subtitle: `${name} cleared a color`, tone: "special", createdAt: event.createdAt };
  }

  if (type.endsWith(":comeback")) {
    const name = playerName(playerId, players, currentUserId);
    return { id: event.id, title: "Skip all", subtitle: `${name} keeps the turn`, tone: "skip", createdAt: event.createdAt };
  }

  return null;
}

function playerName(userId: string | undefined, players: PublicPlayerLabel[], currentUserId: string | null): string {
  if (!userId) return "Player";
  if (userId === currentUserId) return "You";
  return players.find((player) => player.userId === userId)?.displayName ?? "Player";
}

function noticeStyle(tone: PowerNotice["tone"]): MotionStyle {
  const styles: Record<PowerNotice["tone"], MotionStyle> = {
    skip: {
      borderColor: "rgba(248,113,113,0.42)",
      background: "linear-gradient(135deg,rgba(45,12,18,0.92),rgba(8,7,9,0.86))",
      boxShadow: "0 0 58px rgba(239,68,68,0.30),0 28px 90px rgba(0,0,0,0.68)"
    },
    reverse: {
      borderColor: "rgba(45,140,255,0.46)",
      background: "linear-gradient(135deg,rgba(6,21,45,0.94),rgba(4,8,15,0.86))",
      boxShadow: "0 0 68px rgba(45,140,255,0.36),0 28px 90px rgba(0,0,0,0.68)"
    },
    draw: {
      borderColor: "rgba(251,191,36,0.48)",
      background: "linear-gradient(135deg,rgba(49,29,5,0.94),rgba(10,8,4,0.88))",
      boxShadow: "0 0 68px rgba(245,158,11,0.34),0 28px 90px rgba(0,0,0,0.68)"
    },
    roulette: {
      borderColor: "rgba(168,85,247,0.48)",
      background: "linear-gradient(135deg,rgba(40,16,70,0.94),rgba(3,8,18,0.88))",
      boxShadow: "0 0 72px rgba(168,85,247,0.32),0 28px 90px rgba(0,0,0,0.68)"
    },
    special: {
      borderColor: "rgba(52,211,153,0.42)",
      background: "linear-gradient(135deg,rgba(7,43,31,0.94),rgba(4,10,8,0.88))",
      boxShadow: "0 0 62px rgba(16,185,129,0.30),0 28px 90px rgba(0,0,0,0.68)"
    }
  };
  return styles[tone];
}

function noticeGlowStyle(tone: PowerNotice["tone"]): MotionStyle {
  const colors: Record<PowerNotice["tone"], string> = {
    skip: "radial-gradient(circle at 50% 50%,rgba(248,113,113,0.28),transparent 62%)",
    reverse: "radial-gradient(circle at 50% 50%,rgba(45,140,255,0.30),transparent 64%)",
    draw: "radial-gradient(circle at 50% 50%,rgba(251,191,36,0.28),transparent 64%)",
    roulette: "radial-gradient(circle at 50% 50%,rgba(168,85,247,0.30),transparent 64%)",
    special: "radial-gradient(circle at 50% 50%,rgba(52,211,153,0.26),transparent 64%)"
  };
  return { background: colors[tone] };
}

function isTooOld(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > EVENT_MAX_AGE_MS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
