"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Trophy } from "lucide-react";
import type {
  PublicTwentyNinePlayer,
  PublicTwentyNineState,
  TwentyNineCard,
  TwentyNinePlayedCard,
  TwentyNineSuit
} from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
import { SuitMark, TwentyNineCardFace, TWENTY_NINE_SUITS_INFO } from "./TwentyNineCard";

const CARD_TRICK_STRENGTH: Record<string, number> = {
  J: 8,
  "9": 7,
  A: 6,
  "10": 5,
  K: 4,
  Q: 3,
  "8": 2,
  "7": 1
};

export interface PersistedCompletedTrick {
  cards: TwentyNinePlayedCard[];
  winnerPlayerId: string;
  winnerTeam: number;
  points: number;
  trickNumber: number;
  winningCardId: string;
}

export function getWinningCardId(
  trick: TwentyNinePlayedCard[],
  trumpSuit: TwentyNineSuit | null,
  trumpRevealed: boolean
): string | null {
  if (trick.length === 0) return null;
  const ledSuit = trick[0]!.card.suit;
  const activeTrump = trumpRevealed ? trumpSuit : null;
  let best = trick[0]!;

  const strength = (entry: TwentyNinePlayedCard) => {
    if (activeTrump && entry.card.suit === activeTrump) {
      return 100 + (CARD_TRICK_STRENGTH[entry.card.rank] ?? 0);
    }
    if (entry.card.suit === ledSuit) {
      return 50 + (CARD_TRICK_STRENGTH[entry.card.rank] ?? 0);
    }
    return 0;
  };

  for (const candidate of trick.slice(1)) {
    if (strength(candidate) > strength(best)) {
      best = candidate;
    }
  }

  return best.card.id;
}

export function getCompassSlot(
  playerId: string,
  currentUserId: string | null,
  players: PublicTwentyNinePlayer[]
): "south" | "north" | "west" | "east" {
  if (playerId === currentUserId) return "south";
  const me = players.find((p) => p.userId === currentUserId);
  const player = players.find((p) => p.userId === playerId);
  if (!me || !player) return "north";
  if (me.team === player.team) return "north";
  const delta = (player.seat - me.seat + 4) % 4;
  return delta === 1 ? "east" : "west";
}

export function TwentyNineTrickArea({
  trick,
  state,
  currentUserId,
  persistedCompletedTrick,
  className
}: {
  trick: TwentyNinePlayedCard[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  persistedCompletedTrick?: PersistedCompletedTrick | null;
  className?: string;
}) {
  // If active trick is empty but a persisted completed trick exists, show completed trick for reading pause!
  const isHoldCompletedTrick = trick.length === 0 && Boolean(persistedCompletedTrick);
  const activeTrick = isHoldCompletedTrick && persistedCompletedTrick ? persistedCompletedTrick.cards : trick;

  const winningCardId = useMemo(() => {
    if (isHoldCompletedTrick && persistedCompletedTrick?.winningCardId) {
      return persistedCompletedTrick.winningCardId;
    }
    return getWinningCardId(activeTrick, state.trumpSuit, state.trumpRevealed);
  }, [activeTrick, state.trumpSuit, state.trumpRevealed, isHoldCompletedTrick, persistedCompletedTrick]);

  const ledSuit = activeTrick[0]?.card.suit ?? null;
  const trickNumber = isHoldCompletedTrick && persistedCompletedTrick
    ? persistedCompletedTrick.trickNumber
    : state.completedTricks.length + 1;
  const currentTrickPoints = isHoldCompletedTrick && persistedCompletedTrick
    ? persistedCompletedTrick.points
    : activeTrick.reduce((sum, entry) => sum + (entry.card.points ?? 0), 0);

  const winnerPlayer = isHoldCompletedTrick && persistedCompletedTrick
    ? state.players.find((p) => p.userId === persistedCompletedTrick.winnerPlayerId)
    : null;

  // Group played cards by compass slot
  const playedBySlot = useMemo(() => {
    const map = new Map<
      "south" | "north" | "west" | "east",
      { entry: TwentyNinePlayedCard; player?: PublicTwentyNinePlayer | undefined; isWinning: boolean }
    >();

    activeTrick.forEach((entry) => {
      const slot = getCompassSlot(entry.playerId, currentUserId, state.players);
      const player = state.players.find((p) => p.userId === entry.playerId);
      map.set(slot, {
        entry,
        player,
        isWinning: entry.card.id === winningCardId
      });
    });

    return map;
  }, [activeTrick, currentUserId, state.players, winningCardId]);

  return (
    <div
      className={cn(
        "relative flex h-[24rem] sm:h-[28rem] md:h-[31rem] w-[32rem] sm:w-[42rem] md:w-[48rem] max-w-full flex-col items-center justify-center rounded-3xl",
        className
      )}
    >
      {/* Center Table Aura & Concentric Rings */}
      <div className="pointer-events-none absolute inset-4 rounded-full border border-emerald-400/20 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.14),transparent_70%)] shadow-inner" />
      <div className="pointer-events-none absolute h-60 w-60 rounded-full border border-emerald-300/10 animate-[spin_60s_linear_infinite]" />
      <div className="pointer-events-none absolute h-40 w-40 rounded-full border border-dashed border-amber-300/15 animate-[spin_40s_linear_infinite_reverse]" />

      {/* Top Banner: Trick #, Lead Suit & Trick Points */}
      <div className="absolute top-0 z-30 flex items-center gap-2.5 rounded-full border border-white/20 bg-black/80 px-4 py-1.5 shadow-xl backdrop-blur-md">
        <span className="text-[0.68rem] font-black uppercase tracking-wider text-emerald-300">
          Trick {trickNumber}/8
        </span>

        {ledSuit ? (
          <>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <SuitMark suit={ledSuit} size={15} />
              <span>Lead: {TWENTY_NINE_SUITS_INFO[ledSuit]?.label}</span>
            </div>
          </>
        ) : null}

        {currentTrickPoints > 0 ? (
          <>
            <span className="text-white/20">|</span>
            <span className="text-xs font-black text-amber-300">
              +{currentTrickPoints} pts
            </span>
          </>
        ) : null}

        {isHoldCompletedTrick ? (
          <>
            <span className="text-white/20">|</span>
            <span className="text-[0.68rem] font-black uppercase tracking-wider text-amber-400 animate-pulse">
              Trick Settled
            </span>
          </>
        ) : null}
      </div>

      {/* Compass Formation of Cards */}
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Center Winner Plaque when in hold state so players can clearly read who won */}
        <AnimatePresence>
          {isHoldCompletedTrick && persistedCompletedTrick ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className="absolute z-40 flex flex-col items-center justify-center rounded-2xl border border-amber-400/80 bg-black/90 px-5 py-3 shadow-[0_0_35px_rgba(251,191,36,0.45)] backdrop-blur-xl text-center max-w-xs"
            >
              <div className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-widest text-amber-300">
                <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
                <span>Trick #{persistedCompletedTrick.trickNumber} Winner</span>
              </div>
              <div className="mt-1 text-base font-black text-white">
                <span
                  className={
                    persistedCompletedTrick.winnerTeam === 0 ? "text-rose-300" : "text-sky-300"
                  }
                >
                  {winnerPlayer?.displayName ?? "Player"}
                </span>{" "}
                <span className="text-xs text-white/60">
                  ({persistedCompletedTrick.winnerTeam === 0 ? "Team Red" : "Team Blue"})
                </span>
              </div>
              <div className="mt-0.5 text-xs font-black text-amber-300">
                +{persistedCompletedTrick.points} pts captured!
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* North Card (Partner) */}
        <SlotCardContainer
          slot="north"
          data={playedBySlot.get("north")}
          positionClass="top-4 left-1/2 -translate-x-1/2"
        />

        {/* South Card (You) */}
        <SlotCardContainer
          slot="south"
          data={playedBySlot.get("south")}
          positionClass="bottom-6 left-1/2 -translate-x-1/2"
        />

        {/* West Card (Left Opponent) */}
        <SlotCardContainer
          slot="west"
          data={playedBySlot.get("west")}
          positionClass="left-6 top-1/2 -translate-y-1/2"
        />

        {/* East Card (Right Opponent) */}
        <SlotCardContainer
          slot="east"
          data={playedBySlot.get("east")}
          positionClass="right-6 top-1/2 -translate-y-1/2"
        />

        {/* Center Empty State Prompt */}
        {activeTrick.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <span className="text-3xl opacity-70">🃏</span>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-white/60">
              {state.phase === "playing" ? "Waiting for Lead Card" : "Trick Inactive"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SlotCardContainer({
  slot,
  data,
  positionClass
}: {
  slot: "south" | "north" | "west" | "east";
  data?: { entry: TwentyNinePlayedCard; player?: PublicTwentyNinePlayer | undefined; isWinning: boolean } | undefined;
  positionClass: string;
}) {
  if (!data) return null;

  const { entry, player, isWinning } = data;
  const isRed = player?.team === 0;

  return (
    <motion.div
      key={`${slot}-${entry.card.id}`}
      initial={{ opacity: 0, scale: 0.7, y: slot === "south" ? 25 : slot === "north" ? -25 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn("absolute z-20 flex flex-col items-center", positionClass)}
    >
      {/* Player Label Pill */}
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider shadow-lg backdrop-blur-md border",
          isRed
            ? "border-rose-400/50 bg-rose-950/85 text-rose-200"
            : "border-sky-400/50 bg-sky-950/85 text-sky-200"
        )}
      >
        <span>{player?.displayName ?? "Player"}</span>
        {isWinning ? <Crown className="h-3 w-3 text-amber-300 animate-pulse" /> : null}
      </div>

      {/* Card Face (Bigger md size) */}
      <div className="relative">
        <TwentyNineCardFace card={entry.card} size="md" isWinning={isWinning} />
        {isWinning ? (
          <div className="absolute top-full mt-1.5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-widest text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-200">
            👑 WINNING CARD
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
