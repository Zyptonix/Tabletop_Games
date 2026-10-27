"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

export type PowerNoticeTone =
  | "plus_10"
  | "plus_6"
  | "plus_4"
  | "plus_2"
  | "reverse_plus_4"
  | "reverse"
  | "skip"
  | "skip_all"
  | "discard_all"
  | "roulette"
  | "seven_swap"
  | "zero_pass"
  | "eliminated"
  | "uno"
  | "draw"
  | "special";

interface PowerNotice {
  id: string;
  hugeTitle: string;
  subtitle: string;
  tone: PowerNoticeTone;
  targetPlayerId?: string | undefined;
  seatEffect?: PowerSeatEffect | undefined;
  createdAt: string;
}

interface ToneConfig {
  color: string;
  glow: string;
  soft: string;
  asset: string;
  isCustomCardImg?: boolean;
}

const TONE_CONFIGS: Record<PowerNoticeTone, ToneConfig> = {
  plus_10: {
    color: "#ff1744",
    glow: "rgba(255, 23, 68, 0.85)",
    soft: "rgba(255, 23, 68, 0.35)",
    asset: "/assets/uno/cards/no_mercy/wild/wild_plus10.png",
    isCustomCardImg: true
  },
  plus_6: {
    color: "#ff6d00",
    glow: "rgba(255, 109, 0, 0.85)",
    soft: "rgba(255, 109, 0, 0.35)",
    asset: "/assets/uno/cards/no_mercy/wild/wild_plus6.png",
    isCustomCardImg: true
  },
  plus_4: {
    color: "#ffab00",
    glow: "rgba(255, 171, 0, 0.82)",
    soft: "rgba(255, 171, 0, 0.32)",
    asset: "/uno-assets/draw-penalty.svg"
  },
  plus_2: {
    color: "#00e5ff",
    glow: "rgba(0, 229, 255, 0.82)",
    soft: "rgba(0, 229, 255, 0.3)",
    asset: "/uno-assets/draw-penalty.svg"
  },
  reverse_plus_4: {
    color: "#d500f9",
    glow: "rgba(213, 0, 249, 0.85)",
    soft: "rgba(213, 0, 249, 0.35)",
    asset: "/assets/uno/cards/no_mercy/wild/wild_reverse_plus4.png",
    isCustomCardImg: true
  },
  reverse: {
    color: "#2979ff",
    glow: "rgba(41, 121, 255, 0.82)",
    soft: "rgba(41, 121, 255, 0.32)",
    asset: "/uno-assets/reverse.svg"
  },
  skip: {
    color: "#ff5252",
    glow: "rgba(255, 82, 82, 0.82)",
    soft: "rgba(255, 82, 82, 0.32)",
    asset: "/uno-assets/skip.svg"
  },
  skip_all: {
    color: "#ff1744",
    glow: "rgba(255, 23, 68, 0.88)",
    soft: "rgba(255, 23, 68, 0.35)",
    asset: "/assets/uno/cards/no_mercy/wild/wild_skip_all.png",
    isCustomCardImg: true
  },
  discard_all: {
    color: "#ff9100",
    glow: "rgba(255, 145, 0, 0.82)",
    soft: "rgba(255, 145, 0, 0.32)",
    asset: "/uno-assets/discard-all.svg"
  },
  roulette: {
    color: "#aa00ff",
    glow: "rgba(170, 0, 255, 0.85)",
    soft: "rgba(170, 0, 255, 0.35)",
    asset: "/assets/uno/cards/no_mercy/wild/wild_roulette.png",
    isCustomCardImg: true
  },
  seven_swap: {
    color: "#00e676",
    glow: "rgba(0, 230, 118, 0.82)",
    soft: "rgba(0, 230, 118, 0.32)",
    asset: "/uno-assets/hand-swap.svg"
  },
  zero_pass: {
    color: "#1de9b6",
    glow: "rgba(29, 233, 182, 0.82)",
    soft: "rgba(29, 233, 182, 0.32)",
    asset: "/uno-assets/hand-pass.svg"
  },
  eliminated: {
    color: "#ff1744",
    glow: "rgba(255, 23, 68, 0.92)",
    soft: "rgba(255, 23, 68, 0.42)",
    asset: "/uno-assets/elimination.svg"
  },
  uno: {
    color: "#ffd600",
    glow: "rgba(255, 214, 0, 0.9)",
    soft: "rgba(255, 214, 0, 0.4)",
    asset: "/uno-assets/cards-swirl.svg"
  },
  draw: {
    color: "#ffab00",
    glow: "rgba(255, 171, 0, 0.8)",
    soft: "rgba(255, 171, 0, 0.3)",
    asset: "/uno-assets/draw-penalty.svg"
  },
  special: {
    color: "#30d158",
    glow: "rgba(48, 209, 88, 0.8)",
    soft: "rgba(48, 209, 88, 0.3)",
    asset: "/uno-assets/cards-swirl.svg"
  }
};

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

      setNotices((current) => [...current, notice].slice(-2));
      if (notice.targetPlayerId && notice.seatEffect) {
        onSeatEffect?.(notice.targetPlayerId, notice.seatEffect);
      }

      const duration = notice.tone.includes("plus") || notice.tone === "roulette" ? 2200 : 1850;
      const timeout = window.setTimeout(
        () => setNotices((current) => current.filter((item) => item.id !== notice.id)),
        duration
      );
      timeoutRef.current.push(timeout);
    }
  }, [currentUserId, events, onSeatEffect, players]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[52] grid place-items-center overflow-hidden">
      <div className="relative flex -translate-y-8 flex-col items-center">
        <AnimatePresence mode="popLayout">
          {notices.map((notice) => {
            const config = TONE_CONFIGS[notice.tone] ?? TONE_CONFIGS.special;

            return (
              <motion.div
                key={notice.id}
                layout
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.82, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.12, filter: "blur(12px)" }}
                transition={{ duration: reduceMotion ? 0.14 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-center justify-center p-6 text-center select-none"
              >
                {/* Seamless Radial Lens Vignette - Zero hard rectangular box edges */}
                <div
                  className="pointer-events-none absolute -inset-24 uno-organic-callout"
                  style={{
                    background: `radial-gradient(ellipse at 50% 50%, ${config.soft} 0%, rgba(0, 0, 0, 0.45) 45%, transparent 75%)`,
                    filter: "blur(22px)"
                  }}
                />

                {/* Expanding Color-Coded Shockwave Ripple across table canvas */}
                {!reduceMotion ? (
                  <motion.div
                    className="pointer-events-none absolute rounded-full border-2"
                    style={{ borderColor: config.color }}
                    initial={{ width: 60, height: 60, opacity: 0.85, scale: 0.4 }}
                    animate={{ width: 440, height: 440, opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.85, ease: "easeOut" }}
                  />
                ) : null}

                {/* Animated Holographic Icon / Card Emblem */}
                <motion.div
                  initial={reduceMotion ? { opacity: 1 } : { scale: 0.65, rotate: -12, opacity: 0 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                          scale: [0.75, 1.18, 1],
                          rotate: notice.tone === "reverse" ? [-90, 15, 0] : [ -12, 6, 0 ],
                          opacity: 1
                        }
                  }
                  transition={{ duration: 0.42, ease: "easeOut" }}
                  className="relative z-10 mb-2 flex items-center justify-center"
                >
                  {config.isCustomCardImg ? (
                    <img
                      src={config.asset}
                      alt=""
                      className="h-16 w-auto object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.45)] sm:h-20"
                    />
                  ) : (
                    <div
                      className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-black/45 p-2.5 shadow-2xl backdrop-blur-md sm:h-16 sm:w-16"
                      style={{ boxShadow: `0 0 34px ${config.glow}` }}
                    >
                      <img
                        src={config.asset}
                        alt=""
                        className="h-full w-full object-contain filter drop-shadow-md"
                      />
                    </div>
                  )}
                </motion.div>

                {/* Massive Primary Typography (e.g. +10, REVERSE, SKIP ALL, ROULETTE) */}
                <h1
                  className="relative z-10 font-black tracking-tight leading-none text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                  style={{
                    textShadow: `0 0 28px ${config.glow}, 0 0 55px ${config.glow}`
                  }}
                >
                  {notice.hugeTitle}
                </h1>

                {/* Sleek Subtitle (e.g. to (PlayerName) / Turn Direction Inverted) */}
                <p
                  className="relative z-10 mt-2.5 text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.24em] text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                >
                  {notice.subtitle}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function normalizePowerEvent(
  event: GameEvent,
  players: PublicPlayerLabel[],
  currentUserId: string | null
): PowerNotice | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  const type = event.type;
  const playerId = getString(payload.playerId);
  const targetPlayerId = getString(payload.targetPlayerId);
  const skippedPlayerId = getString(payload.skippedPlayerId) ?? targetPlayerId ?? playerId;
  const amount = getNumber(payload.pendingAmount) ?? getNumber(payload.amount);
  const addedAmount = getNumber(payload.addedAmount);
  const source = getString(payload.source);
  const targetName = playerName(targetPlayerId ?? skippedPlayerId, players, currentUserId);
  const actorName = playerName(playerId, players, currentUserId);

  // Wild Draw 4 Reverse / Penalty stack
  if (type.endsWith(":penalty_stack")) {
    const penaltyAmount = addedAmount ?? amount ?? 4;

    if (source === "wild_draw_four_reverse") {
      return {
        id: event.id,
        hugeTitle: "REVERSE +4",
        subtitle: `to ${targetName} · Direction Inverted`,
        tone: "reverse_plus_4",
        targetPlayerId,
        seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: "+4", detail: "Reverse" } : undefined,
        createdAt: event.createdAt
      };
    }

    if (penaltyAmount >= 10 || source === "wild_draw_ten") {
      return {
        id: event.id,
        hugeTitle: "+10",
        subtitle: `to ${targetName}`,
        tone: "plus_10",
        targetPlayerId,
        seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: "+10", detail: "Stack" } : undefined,
        createdAt: event.createdAt
      };
    }

    if (penaltyAmount === 6 || source === "wild_draw_six") {
      return {
        id: event.id,
        hugeTitle: "+6",
        subtitle: `to ${targetName}`,
        tone: "plus_6",
        targetPlayerId,
        seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: "+6", detail: "Stack" } : undefined,
        createdAt: event.createdAt
      };
    }

    if (penaltyAmount === 4 || source === "wild_draw_four" || source === "draw_four") {
      return {
        id: event.id,
        hugeTitle: "+4",
        subtitle: `to ${targetName}`,
        tone: "plus_4",
        targetPlayerId,
        seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: "+4", detail: "Stack" } : undefined,
        createdAt: event.createdAt
      };
    }

    if (penaltyAmount === 2 || source === "draw_two") {
      return {
        id: event.id,
        hugeTitle: "+2",
        subtitle: `to ${targetName}`,
        tone: "plus_2",
        targetPlayerId,
        seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: "+2", detail: "Stack" } : undefined,
        createdAt: event.createdAt
      };
    }

    return {
      id: event.id,
      hugeTitle: `+${penaltyAmount}`,
      subtitle: `to ${targetName}${amount && amount > penaltyAmount ? ` · Total +${amount}` : ""}`,
      tone: "draw",
      targetPlayerId,
      seatEffect: targetPlayerId ? { id: event.id, kind: "draw", label: `+${penaltyAmount}` } : undefined,
      createdAt: event.createdAt
    };
  }

  // Skip
  if (type.endsWith(":skip") || type.endsWith(":offline_skip") || type.endsWith(":timeout_skip")) {
    return {
      id: event.id,
      hugeTitle: "SKIPPED",
      subtitle: `${targetName}'s turn passed`,
      tone: "skip",
      targetPlayerId: skippedPlayerId,
      seatEffect: { id: event.id, kind: "skip", label: "SKIP" },
      createdAt: event.createdAt
    };
  }

  // Skip All (Comeback card)
  if (type.endsWith(":comeback")) {
    return {
      id: event.id,
      hugeTitle: "SKIP ALL",
      subtitle: `${actorName} keeps the turn`,
      tone: "skip_all",
      createdAt: event.createdAt
    };
  }

  // Reverse
  if (type.endsWith(":reverse")) {
    return {
      id: event.id,
      hugeTitle: "REVERSE",
      subtitle: "Turn Direction Inverted",
      tone: "reverse",
      createdAt: event.createdAt
    };
  }

  // Discard All
  if (type.endsWith(":discard_all")) {
    const color = getString(payload.color) ?? "matching";
    const discarded = getNumber(payload.count);
    return {
      id: event.id,
      hugeTitle: "DISCARD ALL",
      subtitle: `${actorName} dumped ${discarded ?? "all"} ${color} cards`,
      tone: "discard_all",
      createdAt: event.createdAt
    };
  }

  // Color Roulette
  if (type.endsWith(":roulette") || type.endsWith(":roulette_pending")) {
    const color = getString(payload.chosenColor);
    const count = getNumber(payload.cardsDrawn) ?? getNumber(payload.actuallyDrawn);
    return {
      id: event.id,
      hugeTitle: "ROULETTE",
      subtitle: color
        ? `${targetName} drawing until ${color}`
        : count
          ? `${targetName} drew ${count} cards`
          : `${targetName} targeted`,
      tone: "roulette",
      targetPlayerId,
      seatEffect: targetPlayerId ? { id: event.id, kind: "roulette", label: "ROULETTE" } : undefined,
      createdAt: event.createdAt
    };
  }

  // 7-Swap
  if (type.endsWith(":seven_swap")) {
    const fromId = getString(payload.fromPlayerId);
    const toId = getString(payload.toPlayerId);
    const fromName = playerName(fromId, players, currentUserId);
    const toName = playerName(toId, players, currentUserId);
    return {
      id: event.id,
      hugeTitle: "HAND SWAP",
      subtitle: `${fromName} ⇄ ${toName}`,
      tone: "seven_swap",
      createdAt: event.createdAt
    };
  }

  // 0-Pass
  if (type.endsWith(":zero_pass")) {
    const direction = getString(payload.directionLabel) ?? (payload.direction === -1 ? "Counter-Clockwise" : "Clockwise");
    return {
      id: event.id,
      hugeTitle: "PASS ALL",
      subtitle: `Everyone passed hands ${direction}`,
      tone: "zero_pass",
      createdAt: event.createdAt
    };
  }

  // Elimination (Mercy Rule KO at 25 cards)
  if (type.endsWith(":eliminated")) {
    const countAtElimination = getNumber(payload.handCount);
    return {
      id: event.id,
      hugeTitle: "MERCY KO!",
      subtitle: countAtElimination !== undefined ? `${actorName} reached ${countAtElimination} cards` : `${actorName} is eliminated`,
      tone: "eliminated",
      targetPlayerId: playerId,
      createdAt: event.createdAt
    };
  }

  // UNO Call
  if (type.endsWith(":called")) {
    return {
      id: event.id,
      hugeTitle: "UNO!",
      subtitle: `${actorName} down to 1 card!`,
      tone: "uno",
      createdAt: event.createdAt
    };
  }

  return null;
}

function playerName(
  userId: string | undefined,
  players: PublicPlayerLabel[],
  currentUserId: string | null
): string {
  if (!userId) return "Player";
  if (userId === currentUserId) return "You";
  return players.find((player) => player.userId === userId)?.displayName ?? "Player";
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
