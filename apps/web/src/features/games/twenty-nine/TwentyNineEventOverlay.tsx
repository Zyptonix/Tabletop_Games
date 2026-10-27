"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent, PublicTwentyNineState, TwentyNineSuit } from "@tabletop/game-core";
import { SuitMark, TWENTY_NINE_SUITS_INFO } from "./TwentyNineCard";

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
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
        badge: "AUCTION BID",
        hugeTitle: `BID ${value ?? "PLACED"}`,
        subtitle: `${actor} raised the contract to ${value}!`,
        tone: "amber",
        durationMs: 2400
      };

    case "twenty-nine:ditto":
      return {
        id: event.id,
        badge: "AUCTION DITTO",
        hugeTitle: `DITTO ${value ?? ""}!`,
        subtitle: `${actor} matched the bid with Ditto!`,
        tone: "violet",
        durationMs: 2400
      };

    case "twenty-nine:pass_bid":
      return {
        id: event.id,
        badge: "AUCTION PASS",
        hugeTitle: "PASS",
        subtitle: `${actor} passed the bid to the next player.`,
        tone: "sky",
        durationMs: 1900
      };

    case "twenty-nine:double":
      return {
        id: event.id,
        badge: "STAKES RAISED",
        hugeTitle: "DOUBLE! ×2",
        subtitle: `${actor} doubled the contract stakes!`,
        tone: "rose",
        multiplier: 2,
        durationMs: 2800
      };

    case "twenty-nine:redouble":
      return {
        id: event.id,
        badge: "HIGH STAKES",
        hugeTitle: "REDOUBLE! ×4",
        subtitle: `${actor} redoubled to ×4 contract stakes!`,
        tone: "rose",
        multiplier: 4,
        durationMs: 3000
      };

    case "twenty-nine:trump_revealed": {
      const rawSuit = typeof payload.trumpSuit === "string" ? (payload.trumpSuit as TwentyNineSuit) : state.trumpSuit;
      const suitName = rawSuit ? TWENTY_NINE_SUITS_INFO[rawSuit]?.label : "Trump";
      return {
        id: event.id,
        badge: "TRUMP REVEALED",
        hugeTitle: `${suitName.toUpperCase()} TRUMP`,
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
        badge: "ROYAL PAIR",
        hugeTitle: "PAIR DECLARED",
        subtitle: `Team ${team} showed King & Queen! Target adjusted by 4.`,
        tone: "violet",
        durationMs: 2800
      };
    }

    case "twenty-nine:single_hand_declared":
      return {
        id: event.id,
        badge: "SOLO CHALLENGE",
        hugeTitle: "SINGLE HAND!",
        subtitle: `${actor} declared Single Hand and plays alone!`,
        tone: "violet",
        durationMs: 3200
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
        hugeTitle: `${teamName} TAKES TRICK`,
        subtitle: `${playerName(state, winnerId, currentUserId)} captured trick ${number} (+${points} pts)`,
        tone: winner?.team === 0 ? "rose" : "sky",
        durationMs: 2400
      };
    }

    case "twenty-nine:hand_scored": {
      const result = state.lastHandResult;
      if (!result) return null;
      const winnerTeam = result.succeeded ? result.declarerTeam : result.declarerTeam === 0 ? 1 : 0;
      const winnerTeamName = winnerTeam === 0 ? "TEAM RED" : "TEAM BLUE";
      const biddingTeamName = result.declarerTeam === 0 ? "Red" : "Blue";
      const target = result.contractTarget;
      const points = result.teamPoints[String(result.declarerTeam) as "0" | "1"] ?? 0;
      const change = result.scoreChange > 0 ? `+${result.scoreChange}` : `${result.scoreChange}`;

      return {
        id: event.id,
        badge: "HAND SCORED",
        hugeTitle: `${winnerTeamName} WINS HAND`,
        subtitle: `Team ${biddingTeamName} needed ${target} pts, took ${points} pts · Game pts: ${change}`,
        tone: winnerTeam === 0 ? "rose" : "sky",
        durationMs: 3600
      };
    }

    case "twenty-nine:game_over": {
      const winner = state.winnerTeam;
      const winnerLabel = winner === 0 ? "TEAM RED" : winner === 1 ? "TEAM BLUE" : "DRAW";
      return {
        id: event.id,
        badge: "MATCH RESULT",
        hugeTitle: `${winnerLabel} WINS!`,
        subtitle: winner !== null ? `${winnerLabel} reached the victory score!` : "Match ended in a tie.",
        tone: winner === 0 ? "rose" : winner === 1 ? "sky" : "amber",
        durationMs: 4400
      };
    }

    default:
      return null;
  }
}

const TONE_CONFIGS = {
  amber: {
    color: "#fbbf24",
    glow: "rgba(245, 158, 11, 0.8)",
    soft: "rgba(245, 158, 11, 0.25)"
  },
  rose: {
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.85)",
    soft: "rgba(244, 63, 94, 0.25)"
  },
  emerald: {
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.85)",
    soft: "rgba(52, 211, 153, 0.25)"
  },
  sky: {
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.8)",
    soft: "rgba(56, 189, 248, 0.25)"
  },
  violet: {
    color: "#c084fc",
    glow: "rgba(168, 85, 247, 0.85)",
    soft: "rgba(168, 85, 247, 0.25)"
  }
};

export function TwentyNineEventOverlay({
  gameEvents,
  state,
  currentUserId
}: {
  gameEvents: GameEvent[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const [currentSpotlight, setCurrentSpotlight] = useState<NormalizedEvent | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set(gameEvents.map((e) => e.id)));
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const unseen = gameEvents.filter((event) => !processedIdsRef.current.has(event.id));
    if (unseen.length === 0) return;

    for (const event of unseen) {
      processedIdsRef.current.add(event.id);
    }

    const now = Date.now();
    const candidates = unseen
      .filter((event) => {
        const createdAt = new Date(event.createdAt).getTime();
        return Number.isFinite(createdAt) && now - createdAt >= -1000 && now - createdAt <= 12000;
      })
      .map((event) => normalizeTwentyNineEvent(event, state, currentUserId))
      .filter((item): item is NormalizedEvent => item !== null);

    const newest = candidates[candidates.length - 1];
    if (!newest) return;

    setCurrentSpotlight(newest);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setCurrentSpotlight((curr) => (curr?.id === newest.id ? null : curr));
      timeoutRef.current = null;
    }, newest.durationMs);
  }, [gameEvents, state, currentUserId]);

  const tone = currentSpotlight ? TONE_CONFIGS[currentSpotlight.tone] ?? TONE_CONFIGS.amber : TONE_CONFIGS.amber;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        {currentSpotlight ? (
          <motion.div
            key={currentSpotlight.id}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.12, filter: "blur(12px)" }}
            transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* Soft Radial Glow Halo - NO dark opaque rectangular box blocking the table */}
            <div
              className="pointer-events-none absolute -inset-24"
              style={{
                background: `radial-gradient(ellipse at 50% 50%, ${tone.soft} 0%, rgba(0, 0, 0, 0.4) 45%, transparent 75%)`,
                filter: "blur(24px)"
              }}
            />

            {/* Expanding Shockwave Ripple across table */}
            {!reduceMotion ? (
              <motion.div
                className="pointer-events-none absolute rounded-full border-2"
                style={{ borderColor: tone.color }}
                initial={{ width: 60, height: 60, opacity: 0.9, scale: 0.4 }}
                animate={{ width: 440, height: 440, opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
              />
            ) : null}

            {/* Badge Pill */}
            <span
              className="relative z-10 mb-2 rounded-full border px-3 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.24em] shadow-lg backdrop-blur-md"
              style={{
                borderColor: tone.color,
                backgroundColor: tone.soft,
                color: "#fff"
              }}
            >
              {currentSpotlight.badge}
            </span>

            {/* Huge Suit Emblem (if trump revealed) */}
            {currentSpotlight.suit ? (
              <motion.div
                className="relative z-10 my-1 flex items-center justify-center"
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: [0.75, 1.18, 1], rotate: 0 }}
                transition={{ duration: 0.4 }}
              >
                <SuitMark
                  suit={currentSpotlight.suit}
                  color={
                    currentSpotlight.suit === "hearts" || currentSpotlight.suit === "diamonds"
                      ? "#fb7185"
                      : "#34d399"
                  }
                  size={68}
                />
              </motion.div>
            ) : null}

            {/* Massive Glowing Title (Like UNO No Mercy) */}
            <h1
              className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
              style={{
                textShadow: `0 0 28px ${tone.glow}, 0 0 55px ${tone.glow}`
              }}
            >
              {currentSpotlight.hugeTitle}
            </h1>

            {/* Subtitle Details */}
            <p className="relative z-10 mt-2 max-w-md text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {currentSpotlight.subtitle}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
