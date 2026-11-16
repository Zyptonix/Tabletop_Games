"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent, PublicTwentyNineState, TwentyNineSuit } from "@tabletop/game-core";
import { SuitMark, TWENTY_NINE_SUITS_INFO } from "./TwentyNineCard";
import { cn } from "@/lib/utils/cn";

interface NormalizedEvent {
  id: string;
  badge: string;
  hugeTitle: string;
  subtitle: string;
  tone: "amber" | "rose" | "emerald" | "sky" | "violet";
  icon?: string | undefined;
  suit?: TwentyNineSuit | undefined;
  multiplier?: number | undefined;
  durationMs: number;
}

function playerName(
  state: PublicTwentyNineState,
  playerId: string | null | undefined,
  currentUserId: string | null
): string {
  if (!playerId) return "Player";
  if (playerId === currentUserId) return "You";
  return state.players.find((player) => player.userId === playerId)?.displayName ?? "Player";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTwentyNineEvent(
  event: GameEvent,
  state: PublicTwentyNineState,
  currentUserId: string | null
): NormalizedEvent | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  const actorId = typeof payload.playerId === "string" ? payload.playerId : null;
  const actor = playerName(state, actorId, currentUserId);
  const value = typeof payload.value === "number" ? payload.value : null;

  switch (event.type) {
    case "twenty-nine:bid":
      return {
        id: event.id,
        badge: `AUCTION BID · ${actor.toUpperCase()}`,
        hugeTitle: `${actor}: BID ${value ?? ""}`,
        subtitle: `${actor} raised the contract to ${value}!`,
        tone: "amber",
        durationMs: 2500
      };

    case "twenty-nine:ditto":
      return {
        id: event.id,
        badge: `ACHII · ${actor.toUpperCase()}`,
        hugeTitle: `${actor}: ACHII!`,
        subtitle: `${actor} matched the bid with Achii (Ditto)!`,
        tone: "violet",
        durationMs: 2600
      };

    case "twenty-nine:pass_bid":
      return {
        id: event.id,
        badge: `PASS · ${actor.toUpperCase()}`,
        hugeTitle: `${actor}: PASSED`,
        subtitle: `${actor} passed the bid to the next player.`,
        tone: "sky",
        durationMs: 1800
      };

    case "twenty-nine:double":
      return {
        id: event.id,
        badge: `DOUBLE · ${actor.toUpperCase()}`,
        hugeTitle: `${actor}: DOUBLE! ×2`,
        subtitle: `${actor} doubled the contract stakes!`,
        tone: "rose",
        multiplier: 2,
        durationMs: 3000
      };

    case "twenty-nine:redouble":
      return {
        id: event.id,
        badge: `REDOUBLE · ${actor.toUpperCase()}`,
        hugeTitle: `${actor}: REDOUBLE! ×4`,
        subtitle: `${actor} redoubled to ×4 contract stakes!`,
        tone: "rose",
        multiplier: 4,
        durationMs: 3200
      };

    case "twenty-nine:trump_revealed": {
      const rawSuit = typeof payload.trumpSuit === "string" ? (payload.trumpSuit as TwentyNineSuit) : state.trumpSuit;
      const suitName = rawSuit ? TWENTY_NINE_SUITS_INFO[rawSuit]?.label : "Trump";
      return {
        id: event.id,
        badge: "TRUMP REVEALED",
        hugeTitle: `${suitName.toUpperCase()} TRUMP!`,
        subtitle: `${actor} revealed the trump suit!`,
        tone: "emerald",
        suit: rawSuit ?? undefined,
        durationMs: 3200
      };
    }

    case "twenty-nine:pair": {
      const team = typeof payload.team === "number" ? (payload.team === 0 ? "RED" : "BLUE") : "CONTRACT";
      return {
        id: event.id,
        badge: "ROYAL MARRIAGE",
        hugeTitle: "MARRIAGE! (±4)",
        subtitle: `Team ${team} showed King & Queen! Target adjusted by 4.`,
        tone: "violet",
        durationMs: 3000
      };
    }

    case "twenty-nine:single_hand_declared":
      return {
        id: event.id,
        badge: "SOLO CHALLENGE",
        hugeTitle: "SINGLE HAND! (±3)",
        subtitle: `${actor} declared Single Hand and plays alone!`,
        tone: "violet",
        durationMs: 3400
      };

    case "twenty-nine:trick_won": {
      const winnerId = typeof payload.winnerPlayerId === "string" ? payload.winnerPlayerId : null;
      const winner = state.players.find((player) => player.userId === winnerId);
      const teamName = winner?.team === 0 ? "TEAM RED" : winner?.team === 1 ? "TEAM BLUE" : "PLAYER";
      const number = typeof payload.trickNumber === "number" ? payload.trickNumber : state.completedTricks.length;
      const points = typeof payload.points === "number" ? payload.points : 0;
      return {
        id: event.id,
        badge: `TRICK ${number} OF 8`,
        hugeTitle: `${teamName} WINS TRICK`,
        subtitle: `${playerName(state, winnerId, currentUserId)} captured trick ${number} (+${points} pts)`,
        tone: winner?.team === 0 ? "rose" : "sky",
        durationMs: 2200
      };
    }

    case "twenty-nine:hand_scored": {
      const result = state.lastHandResult;
      if (!result) return null;
      const winnerTeam = result.succeeded ? result.declarerTeam : result.declarerTeam === 0 ? 1 : 0;
      const winnerTeamName = winnerTeam === 0 ? "TEAM RED" : "TEAM BLUE";
      const target = result.contractTarget;
      const points = result.teamPoints[String(result.declarerTeam) as "0" | "1"] ?? 0;
      const change = result.scoreChange > 0 ? `+${result.scoreChange}` : `${result.scoreChange}`;

      return {
        id: event.id,
        badge: `HAND #${result.handNumber} SCORED`,
        hugeTitle: `${winnerTeamName} (${change})`,
        subtitle: result.succeeded
          ? `Contract succeeded! Captured ${points} pts (Target: ${target}).`
          : `Contract defeated! Only captured ${points} pts (Target: ${target}).`,
        tone: result.succeeded ? "emerald" : "rose",
        durationMs: 3600
      };
    }

    case "twenty-nine:game_over": {
      const winnerTeam = typeof payload.winnerTeam === "number" ? payload.winnerTeam : state.winnerTeam;
      const winnerName = winnerTeam === 0 ? "TEAM RED" : "TEAM BLUE";
      return {
        id: event.id,
        badge: "MATCH OVER",
        hugeTitle: `${winnerName} VICTORIOUS!`,
        subtitle: event.message ?? "The match has reached the target score!",
        tone: "amber",
        durationMs: 4000
      };
    }

    default:
      return null;
  }
}

const TONE_THEMES = {
  amber: {
    border: "border-amber-400",
    bg: "bg-[linear-gradient(135deg,rgba(245,158,11,0.92),rgba(146,64,14,0.85)_45%,rgba(0,0,0,0.88)_100%)]",
    glow: "rgba(245, 158, 11, 0.8)",
    badgeBg: "bg-amber-400 text-slate-950",
    textGlow: "drop-shadow-[0_0_16px_rgba(251,191,36,0.85)]",
    shadow: "shadow-[0_0_36px_rgba(245,158,11,0.6),0_18px_40px_rgba(0,0,0,0.8)]"
  },
  rose: {
    border: "border-rose-500",
    bg: "bg-[linear-gradient(135deg,rgba(225,29,72,0.92),rgba(136,19,55,0.85)_45%,rgba(0,0,0,0.88)_100%)]",
    glow: "rgba(244, 63, 94, 0.8)",
    badgeBg: "bg-rose-500 text-white",
    textGlow: "drop-shadow-[0_0_16px_rgba(244,63,94,0.85)]",
    shadow: "shadow-[0_0_36px_rgba(244,63,94,0.6),0_18px_40px_rgba(0,0,0,0.8)]"
  },
  emerald: {
    border: "border-emerald-400",
    bg: "bg-[linear-gradient(135deg,rgba(16,185,129,0.92),rgba(6,78,59,0.85)_45%,rgba(0,0,0,0.88)_100%)]",
    glow: "rgba(52, 211, 153, 0.8)",
    badgeBg: "bg-emerald-400 text-slate-950",
    textGlow: "drop-shadow-[0_0_16px_rgba(52,211,153,0.85)]",
    shadow: "shadow-[0_0_36px_rgba(52,211,153,0.6),0_18px_40px_rgba(0,0,0,0.8)]"
  },
  sky: {
    border: "border-sky-400",
    bg: "bg-[linear-gradient(135deg,rgba(2,132,199,0.92),rgba(12,74,110,0.85)_45%,rgba(0,0,0,0.88)_100%)]",
    glow: "rgba(56, 189, 248, 0.8)",
    badgeBg: "bg-sky-400 text-slate-950",
    textGlow: "drop-shadow-[0_0_16px_rgba(56,189,248,0.85)]",
    shadow: "shadow-[0_0_36px_rgba(56,189,248,0.6),0_18px_40px_rgba(0,0,0,0.8)]"
  },
  violet: {
    border: "border-violet-400",
    bg: "bg-[linear-gradient(135deg,rgba(168,85,247,0.92),rgba(88,28,135,0.85)_45%,rgba(0,0,0,0.88)_100%)]",
    glow: "rgba(168, 85, 247, 0.85)",
    badgeBg: "bg-violet-400 text-slate-950",
    textGlow: "drop-shadow-[0_0_18px_rgba(168,85,247,0.85)]",
    shadow: "shadow-[0_0_36px_rgba(168,85,247,0.6),0_18px_40px_rgba(0,0,0,0.8)]"
  }
};

export function TwentyNineEventOverlay({
  gameEvents,
  state,
  currentUserId,
  isElevated = false,
  className
}: {
  gameEvents: GameEvent[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  isElevated?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [currentSpotlight, setCurrentSpotlight] = useState<NormalizedEvent | null>(null);
  const queueRef = useRef<NormalizedEvent[]>([]);
  const isPlayingRef = useRef(false);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  // Enqueue new events
  useEffect(() => {
    if (!gameEvents || gameEvents.length === 0) return;

    for (const evt of gameEvents) {
      if (processedEventIdsRef.current.has(evt.id)) continue;
      processedEventIdsRef.current.add(evt.id);

      const normalized = normalizeTwentyNineEvent(evt, state, currentUserId);
      if (normalized) {
        queueRef.current.push(normalized);
      }
    }

    if (!isPlayingRef.current && queueRef.current.length > 0) {
      playNext();
    }
  }, [gameEvents, state, currentUserId]);

  const playNext = () => {
    const next = queueRef.current.shift();
    if (!next) {
      isPlayingRef.current = false;
      setCurrentSpotlight(null);
      return;
    }

    isPlayingRef.current = true;
    setCurrentSpotlight(next);

    setTimeout(() => {
      playNext();
    }, next.durationMs);
  };

  const tone = currentSpotlight ? TONE_THEMES[currentSpotlight.tone] : TONE_THEMES.amber;

  return (
    <div
      className={cn(
        "pointer-events-none fixed sm:absolute z-50 flex items-center justify-center left-1/2 -translate-x-1/2 transition-all duration-300",
        isElevated ? "bottom-[18.5rem] sm:bottom-[19.5rem]" : "bottom-[13rem] sm:bottom-[13.5rem]",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {currentSpotlight ? (
          <motion.div
            key={currentSpotlight.id}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.75, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, y: -16, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={cn(
              "relative flex flex-col items-center text-center rounded-[1.6rem] border-2 px-5 py-2.5 select-none min-w-[15rem] max-w-sm backdrop-blur-2xl",
              tone.border,
              tone.bg,
              tone.shadow
            )}
          >
            {/* Ambient Pulsing Shockwave Glow */}
            <motion.div
              className="pointer-events-none absolute -inset-3 rounded-[2.2rem] blur-2xl opacity-80"
              style={{ background: tone.glow }}
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.97, 1.05, 0.97] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Header Badge */}
            <div className="relative z-10 flex items-center gap-1.5 mb-1">
              {currentSpotlight.suit ? (
                <SuitMark suit={currentSpotlight.suit} size={16} className="drop-shadow" />
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.16em] shadow-sm",
                  tone.badgeBg
                )}
              >
                {currentSpotlight.badge}
              </span>
            </div>

            {/* Huge Punchy Title (UNO Style) */}
            <h3
              className={cn(
                "relative z-10 text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight",
                tone.textGlow
              )}
            >
              {currentSpotlight.hugeTitle}
            </h3>

            {/* Subtitle Description */}
            <p className="relative z-10 mt-0.5 max-w-[240px] text-[0.72rem] font-semibold text-white/90 leading-snug drop-shadow-sm">
              {currentSpotlight.subtitle}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
