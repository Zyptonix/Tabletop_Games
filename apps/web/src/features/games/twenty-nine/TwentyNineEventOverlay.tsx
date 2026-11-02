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
        hugeTitle: result.succeeded ? `${winnerTeamName} WINS HAND` : "CONTRACT DEFEATED (SET)",
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
  currentUserId,
  className
}: {
  gameEvents: GameEvent[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  className?: string;
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
    <div
      className={cn(
        /* =========================================================================
           POPUP ANIMATION OVERLAY POSITIONING:
           Anchored directly above the local player's hand cards and to the right.
           To manually tweak:
             - Vertical position: change `bottom-3` (e.g. `bottom-1`, `bottom-6`, `bottom-10`)
             - Horizontal position: change `right-4 sm:right-6 md:right-8` (e.g. `right-2`, `right-12`)
           ========================================================================= */
        "pointer-events-none absolute bottom-3 right-20 sm:right-24 md:right-26 z-[70] flex flex-col items-end overflow-visible select-none",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {currentSpotlight ? (
          <motion.div
            key={currentSpotlight.id}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.88, y: 14, x: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, y: 8, filter: "blur(6px)" }}
            transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-end text-right rounded-2xl border border-white/15 bg-black/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl max-w-xs sm:max-w-sm select-none"
          >
            {/* Soft Ambient Glow */}
            <div
              className="pointer-events-none absolute -inset-1 rounded-2xl opacity-60"
              style={{
                background: `radial-gradient(circle at 85% 50%, ${tone.soft} 0%, transparent 70%)`,
                filter: "blur(10px)"
              }}
            />

            {/* Compact Shockwave Ripple */}
            {!reduceMotion ? (
              <motion.div
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border"
                style={{ borderColor: tone.color }}
                initial={{ width: 24, height: 24, opacity: 0.8, scale: 0.5 }}
                animate={{ width: 120, height: 120, opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            ) : null}

            {/* Header Badge & Suit Pill */}
            <div className="relative z-10 flex items-center gap-1.5 mb-1">
              {currentSpotlight.suit ? (
                <SuitMark
                  suit={currentSpotlight.suit}
                  color={
                    currentSpotlight.suit === "hearts" || currentSpotlight.suit === "diamonds"
                      ? "#fb7185"
                      : "#34d399"
                  }
                  size={18}
                />
              ) : null}
              <span
                className="rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.16em] shadow-sm backdrop-blur-md"
                style={{
                  borderColor: tone.color,
                  backgroundColor: tone.soft,
                  color: "#fff"
                }}
              >
                {currentSpotlight.badge}
              </span>
            </div>

            {/* Popup Title:
                Adjust font size here: `text-base sm:text-lg md:text-xl` */}
            <h3
              className="relative z-10 text-base sm:text-lg md:text-xl font-black tracking-tight leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
              style={{
                textShadow: `0 0 16px ${tone.glow}`
              }}
            >
              {currentSpotlight.hugeTitle}
            </h3>

            {/* Subtitle Details:
                Adjust font size here: `text-[0.68rem] sm:text-xs` */}
            <p className="relative z-10 mt-0.5 max-w-[260px] sm:max-w-[320px] text-[0.68rem] sm:text-xs font-semibold text-white/85 tracking-wide drop-shadow-sm leading-snug">
              {currentSpotlight.subtitle}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
