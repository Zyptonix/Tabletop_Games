"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, Swords, Trophy, Flame } from "lucide-react";
import type { GameEvent, PublicTwentyNineState, TwentyNineSuit } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
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

function playerName(state: PublicTwentyNineState, playerId: string | null | undefined, currentUserId: string | null): string {
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
        durationMs: 2800
      };

    case "twenty-nine:ditto":
      return {
        id: event.id,
        badge: "AUCTION DITTO",
        hugeTitle: `DITTO ${value ?? ""}!`,
        subtitle: `${actor} called Ditto, matching the bid!`,
        tone: "violet",
        durationMs: 2800
      };

    case "twenty-nine:pass_bid":
      return {
        id: event.id,
        badge: "AUCTION PASS",
        hugeTitle: "PASS",
        subtitle: `${actor} passed the bid to the next player.`,
        tone: "sky",
        durationMs: 2200
      };

    case "twenty-nine:double":
      return {
        id: event.id,
        badge: "STAKES RAISED",
        hugeTitle: "CONTRACT DOUBLED (×2)",
        subtitle: `${actor} doubled the contract stakes!`,
        tone: "rose",
        multiplier: 2,
        durationMs: 3200
      };

    case "twenty-nine:redouble":
      return {
        id: event.id,
        badge: "HIGH STAKES",
        hugeTitle: "REDOUBLE! (×4)",
        subtitle: `${actor} redoubled the contract to ×4 stakes!`,
        tone: "rose",
        multiplier: 4,
        durationMs: 3400
      };

    case "twenty-nine:trump_revealed": {
      const rawSuit = typeof payload.trumpSuit === "string" ? (payload.trumpSuit as TwentyNineSuit) : state.trumpSuit;
      const suitName = rawSuit ? TWENTY_NINE_SUITS_INFO[rawSuit]?.label : "Trump";
      return {
        id: event.id,
        badge: "TRUMP REVEALED",
        hugeTitle: `${suitName.toUpperCase()} TRUMP`,
        subtitle: `Trump has been revealed! You may now play trump cards.`,
        tone: "emerald",
        suit: rawSuit ?? undefined,
        durationMs: 3800
      };
    }

    case "twenty-nine:pair": {
      const team = typeof payload.team === "number" ? (payload.team === 0 ? "RED" : "BLUE") : "CONTRACT";
      return {
        id: event.id,
        badge: "ROYAL PAIR",
        hugeTitle: "PAIR DECLARED",
        subtitle: `Team ${team} showed the King & Queen! Target adjusted by 4.`,
        tone: "violet",
        durationMs: 3200
      };
    }

    case "twenty-nine:single_hand_declared":
      return {
        id: event.id,
        badge: "SOLO CHALLENGE",
        hugeTitle: "SINGLE HAND!",
        subtitle: `${actor} declared Single Hand and must win all 8 tricks alone!`,
        tone: "violet",
        durationMs: 3500
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
        subtitle: `${playerName(state, winnerId, currentUserId)} captured trick ${number} (+${points} card pts)!`,
        tone: winner?.team === 0 ? "rose" : "sky",
        durationMs: 2900
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
        badge: "HAND RESOLUTION",
        hugeTitle: `${winnerTeamName} WINS HAND`,
        subtitle: `Team ${biddingTeamName} needed ${target} pts and captured ${points} pts · Game points: ${change}`,
        tone: winnerTeam === 0 ? "rose" : "sky",
        durationMs: 4200
      };
    }

    case "twenty-nine:game_over": {
      const winner = state.winnerTeam;
      const winnerLabel = winner === 0 ? "TEAM RED" : winner === 1 ? "TEAM BLUE" : "DRAW";
      return {
        id: event.id,
        badge: "MATCH RESULT",
        hugeTitle: `${winnerLabel} WINS!`,
        subtitle: winner !== null ? `${winnerLabel} has reached the target victory score!` : "Match ended in a tie.",
        tone: winner === 0 ? "rose" : winner === 1 ? "sky" : "amber",
        durationMs: 5000
      };
    }

    default:
      return null;
  }
}

export function TwentyNineEventOverlay({
  gameEvents,
  state,
  currentUserId
}: {
  gameEvents: GameEvent[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
}) {
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

  const toneVisuals = {
    amber: {
      border: "border-amber-400/50",
      glow: "shadow-[0_0_80px_rgba(245,158,11,0.35)]",
      badge: "border-amber-400/60 bg-amber-500/20 text-amber-200",
      halo: "bg-amber-400/20"
    },
    rose: {
      border: "border-rose-400/50",
      glow: "shadow-[0_0_80px_rgba(244,63,94,0.35)]",
      badge: "border-rose-400/60 bg-rose-500/20 text-rose-200",
      halo: "bg-rose-400/20"
    },
    emerald: {
      border: "border-emerald-400/50",
      glow: "shadow-[0_0_80px_rgba(52,211,153,0.35)]",
      badge: "border-emerald-400/60 bg-emerald-500/20 text-emerald-200",
      halo: "bg-emerald-400/20"
    },
    sky: {
      border: "border-sky-400/50",
      glow: "shadow-[0_0_80px_rgba(56,189,248,0.35)]",
      badge: "border-sky-400/60 bg-sky-500/20 text-sky-200",
      halo: "bg-sky-400/20"
    },
    violet: {
      border: "border-violet-400/50",
      glow: "shadow-[0_0_80px_rgba(168,85,247,0.35)]",
      badge: "border-violet-400/60 bg-violet-500/20 text-violet-200",
      halo: "bg-violet-400/20"
    }
  };

  return (
    <AnimatePresence>
      {currentSpotlight ? (
        <motion.div
          key={currentSpotlight.id}
          className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center p-4 backdrop-blur-[6px] bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={cn(
              "relative flex max-w-xl flex-col items-center overflow-hidden rounded-[2.5rem] border bg-[linear-gradient(145deg,rgba(18,12,28,0.98),rgba(10,13,24,0.98)_55%,rgba(5,6,10,0.99))] px-8 py-8 text-center text-white shadow-2xl",
              toneVisuals[currentSpotlight.tone].border,
              toneVisuals[currentSpotlight.tone].glow
            )}
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -20 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            {/* Ambient Background Aura */}
            <div
              className={cn(
                "pointer-events-none absolute -inset-10 rounded-full blur-3xl opacity-50",
                toneVisuals[currentSpotlight.tone].halo
              )}
            />

            {/* Badge */}
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.22em] shadow-md",
                toneVisuals[currentSpotlight.tone].badge
              )}
            >
              {currentSpotlight.badge}
            </span>

            {/* Huge Suit Emblem (if trump revealed) */}
            {currentSpotlight.suit ? (
              <motion.div
                className="my-3 flex items-center justify-center"
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <SuitMark
                  suit={currentSpotlight.suit}
                  color={
                    currentSpotlight.suit === "hearts" || currentSpotlight.suit === "diamonds"
                      ? "#fb7185"
                      : "#34d399"
                  }
                  size={76}
                />
              </motion.div>
            ) : null}

            {/* Huge Title */}
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {currentSpotlight.hugeTitle}
            </h2>

            {/* Subtitle / Details */}
            <p className="mt-2.5 max-w-md text-sm font-semibold leading-relaxed text-slate-200">
              {currentSpotlight.subtitle}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
