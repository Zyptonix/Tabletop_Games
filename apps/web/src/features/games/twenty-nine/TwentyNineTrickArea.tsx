"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
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
  className
}: {
  trick: TwentyNinePlayedCard[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  className?: string;
}) {
  const winningCardId = useMemo(
    () => getWinningCardId(trick, state.trumpSuit, state.trumpRevealed),
    [trick, state.trumpSuit, state.trumpRevealed]
  );

  const ledSuit = trick[0]?.card.suit ?? null;
  const trickNumber = state.completedTricks.length + 1;
  const currentTrickPoints = trick.reduce((sum, entry) => sum + (entry.card.points ?? 0), 0);

  // Group played cards by compass slot
  const playedBySlot = useMemo(() => {
    const map = new Map<
      "south" | "north" | "west" | "east",
      { entry: TwentyNinePlayedCard; player?: PublicTwentyNinePlayer | undefined; isWinning: boolean }
    >();

    trick.forEach((entry) => {
      const slot = getCompassSlot(entry.playerId, currentUserId, state.players);
      const player = state.players.find((p) => p.userId === entry.playerId);
      map.set(slot, {
        entry,
        player,
        isWinning: entry.card.id === winningCardId
      });
    });

    return map;
  }, [trick, currentUserId, state.players, winningCardId]);

  return (
    <div
      className={cn(
        "relative flex h-[18rem] w-[26rem] max-w-full flex-col items-center justify-center rounded-3xl",
        className
      )}
    >
      {/* Center Table Aura & Concentric Ring */}
      <div className="pointer-events-none absolute inset-2 rounded-full border border-emerald-400/15 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_70%)] shadow-inner" />
      <div className="pointer-events-none absolute h-40 w-40 rounded-full border border-white/[0.06] animate-[spin_60s_linear_infinite]" />

      {/* Top Banner: Trick #, Lead Suit & Trick Points */}
      <div className="absolute -top-3 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3 py-1 shadow-lg backdrop-blur-md">
        <span className="text-[0.62rem] font-black uppercase tracking-wider text-emerald-300">
          Trick {trickNumber}/8
        </span>

        {ledSuit ? (
          <>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1 text-[0.68rem] font-black text-white">
              <SuitMark suit={ledSuit} size={13} />
              <span>Lead: {TWENTY_NINE_SUITS_INFO[ledSuit]?.label}</span>
            </div>
          </>
        ) : null}

        {currentTrickPoints > 0 ? (
          <>
            <span className="text-white/20">|</span>
            <span className="text-[0.62rem] font-black text-amber-300">
              +{currentTrickPoints} pts
            </span>
          </>
        ) : null}
      </div>

      {/* Compass Formation of Cards */}
      <div className="relative flex h-full w-full items-center justify-center">
        {/* North Card (Partner) */}
        <SlotCardContainer
          slot="north"
          data={playedBySlot.get("north")}
          positionClass="top-2 left-1/2 -translate-x-1/2"
        />

        {/* South Card (You) */}
        <SlotCardContainer
          slot="south"
          data={playedBySlot.get("south")}
          positionClass="bottom-2 left-1/2 -translate-x-1/2"
        />

        {/* West Card (Left Opponent) */}
        <SlotCardContainer
          slot="west"
          data={playedBySlot.get("west")}
          positionClass="left-3 top-1/2 -translate-y-1/2"
        />

        {/* East Card (Right Opponent) */}
        <SlotCardContainer
          slot="east"
          data={playedBySlot.get("east")}
          positionClass="right-3 top-1/2 -translate-y-1/2"
        />

        {/* Center Empty State Prompt */}
        {trick.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <span className="text-2xl opacity-60">🃏</span>
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
      initial={{ opacity: 0, scale: 0.7, y: slot === "south" ? 20 : slot === "north" ? -20 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn("absolute z-20 flex flex-col items-center", positionClass)}
    >
      {/* Player Label Pill */}
      <div
        className={cn(
          "mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wider shadow-md backdrop-blur-md border",
          isRed
            ? "border-rose-400/40 bg-rose-950/80 text-rose-200"
            : "border-sky-400/40 bg-sky-950/80 text-sky-200"
        )}
      >
        <span>{player?.displayName ?? "Player"}</span>
        {isWinning ? <Crown className="h-2.5 w-2.5 text-amber-300" /> : null}
      </div>

      {/* Card Face */}
      <div className="relative">
        <TwentyNineCardFace card={entry.card} size="sm" isWinning={isWinning} />
        {isWinning ? (
          <div className="absolute -top-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-300/60 bg-amber-400 px-1.5 py-0.2 text-[0.52rem] font-black uppercase tracking-widest text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.8)]">
            Winning
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
