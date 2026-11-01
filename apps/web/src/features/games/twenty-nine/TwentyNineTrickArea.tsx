"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Crown, Eye, Lock, Sparkles, Trophy, Unlock } from "lucide-react";
import type {
  PublicTwentyNinePlayer,
  PublicTwentyNineState,
  TwentyNineCard,
  TwentyNinePlayedCard,
  TwentyNineSuit
} from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";
import {
  SuitMark,
  TwentyNineCardBack,
  TwentyNineCardFace,
  TWENTY_NINE_SUITS_INFO
} from "./TwentyNineCard";

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
  onRevealTrump,
  canRevealTrump = false,
  className
}: {
  trick: TwentyNinePlayedCard[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  persistedCompletedTrick?: PersistedCompletedTrick | null;
  onRevealTrump?: () => void;
  canRevealTrump?: boolean;
  className?: string;
}) {
  const me = state.players.find((p) => p.userId === currentUserId);
  const myTeam = me ? me.team : 0;
  const opponentTeam = myTeam === 0 ? 1 : 0;

  const myTeamTricks = state.tricksWonByTeam[String(myTeam) as "0" | "1"] ?? 0;
  const opponentTricks = state.tricksWonByTeam[String(opponentTeam) as "0" | "1"] ?? 0;
  const myTeamPoints = state.capturedPointsByTeam[String(myTeam) as "0" | "1"] ?? 0;
  const opponentPoints = state.capturedPointsByTeam[String(opponentTeam) as "0" | "1"] ?? 0;

  const isViewerDeclarer = currentUserId === state.declarerId;

  // Hold completed trick so players can inspect all 4 cards
  const isHoldCompletedTrick = trick.length === 0 && Boolean(persistedCompletedTrick);
  const activeTrick = isHoldCompletedTrick && persistedCompletedTrick ? persistedCompletedTrick.cards : trick;

  const winningCardId = useMemo(() => {
    if (isHoldCompletedTrick && persistedCompletedTrick?.winningCardId) {
      return persistedCompletedTrick.winningCardId;
    }
    return getWinningCardId(activeTrick, state.trumpSuit, state.trumpRevealed);
  }, [activeTrick, state.trumpSuit, state.trumpRevealed, isHoldCompletedTrick, persistedCompletedTrick]);

  const ledSuit = activeTrick[0]?.card.suit ?? null;
  const currentTrickPoints = isHoldCompletedTrick && persistedCompletedTrick
    ? persistedCompletedTrick.points
    : activeTrick.reduce((sum, entry) => sum + (entry.card.points ?? 0), 0);

  const winnerPlayer = isHoldCompletedTrick && persistedCompletedTrick
    ? state.players.find((p) => p.userId === persistedCompletedTrick.winnerPlayerId)
    : null;

  const didMyTeamWinTrick = isHoldCompletedTrick && persistedCompletedTrick
    ? persistedCompletedTrick.winnerTeam === myTeam
    : false;

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
        "relative flex flex-col items-center justify-center w-full max-w-5xl select-none",
        className
      )}
    >
      {/* Top Trick Status Pill */}
      <div className="mb-2 z-20 flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/75 px-3.5 py-1 text-xs font-black shadow-xl backdrop-blur-md">
        <span className="text-amber-300">
          Trick {isHoldCompletedTrick && persistedCompletedTrick ? persistedCompletedTrick.trickNumber : state.completedTricks.length + 1} of 8
        </span>
        {ledSuit ? (
          <>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1 text-white">
              <SuitMark suit={ledSuit} size={14} />
              <span>Lead: {TWENTY_NINE_SUITS_INFO[ledSuit]?.label}</span>
            </div>
          </>
        ) : null}
        {currentTrickPoints > 0 ? (
          <>
            <span className="text-white/20">|</span>
            <span className="text-amber-300">+{currentTrickPoints} pts</span>
          </>
        ) : null}
      </div>

      {/* MAIN TABLE ROW: [Opponent Deck] --- [Trump Slot] --- [Center Trick Area] --- [Your Team Deck] */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-6 md:gap-8 w-full">
        {/* 1. OPPONENT CAPTURED DECK */}
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-rose-300">
            Opponent
          </span>
          <div className="twenty-nine-felt-deck relative rounded-lg border border-white/20 overflow-hidden shadow-2xl transition hover:scale-105">
            <TwentyNineCardBack className="h-full w-full rounded-lg" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1 text-center">
              <span className="text-[0.6rem] sm:text-[0.68rem] font-black text-rose-200">
                {opponentTricks} Tricks
              </span>
              <span className="text-[0.55rem] font-bold text-white/50">
                {opponentPoints} pts
              </span>
            </div>
          </div>
        </div>

        {/* 2. PHYSICAL TRUMP CARD ON TABLE FELT */}
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
            {state.trumpRevealed ? <Unlock className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3 text-amber-300" />}
            Trump
          </span>

          <div
            onClick={canRevealTrump && onRevealTrump ? onRevealTrump : undefined}
            className={cn(
              "twenty-nine-felt-deck relative rounded-lg border overflow-hidden shadow-2xl transition duration-300",
              state.trumpRevealed
                ? "border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.5)] ring-2 ring-emerald-300"
                : "border-amber-400/50 shadow-lg",
              canRevealTrump && "cursor-pointer hover:scale-110 hover:border-amber-300 animate-pulse ring-2 ring-amber-400"
            )}
            title={
              state.trumpRevealed && state.trumpSuit
                ? `Trump: ${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}`
                : isViewerDeclarer && state.trumpSuit
                ? `You set: ${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label} (Concealed from others)`
                : canRevealTrump
                ? "Click to ask/reveal Trump!"
                : "Trump card (Concealed)"
            }
          >
            {/* If Trump is Revealed: Show the authentic card face or suit */}
            {state.trumpRevealed && state.trumpSuit ? (
              <div className="h-full w-full bg-white flex flex-col items-center justify-center p-1 relative">
                <SuitMark suit={state.trumpSuit} size={28} />
                <span className="text-[0.65rem] font-black text-neutral-900 leading-tight">
                  {TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}
                </span>
                <span className="text-[0.5rem] font-black uppercase tracking-widest text-emerald-700 mt-0.5">
                  ACTIVE
                </span>
              </div>
            ) : (
              /* If Trump is Concealed: Show card back */
              <div className="relative h-full w-full">
                <TwentyNineCardBack className="h-full w-full rounded-lg" />
                {/* Peek badge for Declarer so they know what they set */}
                {isViewerDeclarer && state.trumpSuit ? (
                  <div className="absolute inset-x-0 bottom-0 bg-black/85 py-1 px-0.5 flex flex-col items-center justify-center border-t border-amber-400/40">
                    <div className="flex items-center gap-1 text-[0.6rem] font-black text-amber-300">
                      <SuitMark suit={state.trumpSuit} size={12} />
                      <span>{TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}</span>
                    </div>
                    <span className="text-[0.45rem] font-bold text-white/50 uppercase tracking-tighter">
                      (Secret)
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                    <Lock className="h-4 w-4 text-amber-300 drop-shadow-md" />
                  </div>
                )}

                {/* Prompt if local player can reveal */}
                {canRevealTrump ? (
                  <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                    <span className="rounded bg-amber-400 px-1 text-[0.55rem] font-black text-black">
                      REVEAL
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* 3. CENTER TRICK FORMATION */}
        <div className="relative flex items-center justify-center w-[13rem] sm:w-[16rem] md:w-[18rem] h-[13rem] sm:h-[15rem] md:h-[17rem]">
          {/* Subtle felt target marker */}
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-amber-300/15" />

          {/* Compass Cards */}
          <SlotCardContainer
            slot="north"
            data={playedBySlot.get("north")}
            positionClass="top-1 left-1/2 -translate-x-1/2"
            rotationClass="rotate-[2deg]"
          />
          <SlotCardContainer
            slot="south"
            data={playedBySlot.get("south")}
            positionClass="bottom-1 left-1/2 -translate-x-1/2"
            rotationClass="rotate-[-2deg]"
          />
          <SlotCardContainer
            slot="west"
            data={playedBySlot.get("west")}
            positionClass="left-1 top-1/2 -translate-y-1/2"
            rotationClass="rotate-[-5deg]"
          />
          <SlotCardContainer
            slot="east"
            data={playedBySlot.get("east")}
            positionClass="right-1 top-1/2 -translate-y-1/2"
            rotationClass="rotate-[4deg]"
          />

          {/* Empty Table Center Prompt */}
          {activeTrick.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-3">
              <span className="text-2xl opacity-40">🃏</span>
              <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/40 mt-1">
                {state.phase === "playing" ? "Lead a Card" : "Waiting"}
              </span>
            </div>
          ) : null}

          {/* Winner Banner & Directional Arrow when Trick Settles */}
          <AnimatePresence>
            {isHoldCompletedTrick && persistedCompletedTrick ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-40 flex flex-col items-center justify-center rounded-xl border border-amber-300/80 bg-black/90 px-3.5 py-2 shadow-[0_0_30px_rgba(251,191,36,0.6)] backdrop-blur-xl text-center"
              >
                <div className="flex items-center gap-1 text-[0.6rem] font-black uppercase tracking-widest text-amber-300">
                  <Crown className="h-3.5 w-3.5 text-amber-300 animate-bounce" />
                  <span>Trick Won</span>
                </div>
                <span className={cn(
                  "text-xs sm:text-sm font-black truncate max-w-[10rem]",
                  didMyTeamWinTrick ? "text-sky-300" : "text-rose-300"
                )}>
                  {winnerPlayer?.displayName ?? "Player"}
                </span>
                <span className="text-[0.65rem] font-extrabold text-amber-300">
                  +{persistedCompletedTrick.points} pts
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Directional Arrow (Screenshot 4 style!) */}
          <AnimatePresence>
            {isHoldCompletedTrick && persistedCompletedTrick ? (
              didMyTeamWinTrick ? (
                /* Arrow pointing RIGHT to Your Team */
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: [0, 8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="absolute right-[-1.5rem] sm:right-[-2.2rem] top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 text-sky-400 font-black text-sm drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                >
                  <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              ) : (
                /* Arrow pointing LEFT to Opponent */
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: [0, -8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="absolute left-[-1.5rem] sm:left-[-2.2rem] top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 text-rose-400 font-black text-sm drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                >
                  <ArrowLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              )
            ) : null}
          </AnimatePresence>
        </div>

        {/* 4. YOUR TEAM CAPTURED DECK */}
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-sky-300">
            Your Team
          </span>
          <div className="twenty-nine-felt-deck relative rounded-lg border border-white/20 overflow-hidden shadow-2xl transition hover:scale-105">
            <TwentyNineCardBack className="h-full w-full rounded-lg" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1 text-center">
              <span className="text-[0.6rem] sm:text-[0.68rem] font-black text-sky-200">
                {myTeamTricks} Tricks
              </span>
              <span className="text-[0.55rem] font-bold text-white/50">
                {myTeamPoints} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotCardContainer({
  slot,
  data,
  positionClass,
  rotationClass
}: {
  slot: "south" | "north" | "west" | "east";
  data?: { entry: TwentyNinePlayedCard; player?: PublicTwentyNinePlayer | undefined; isWinning: boolean } | undefined;
  positionClass: string;
  rotationClass: string;
}) {
  if (!data) return null;

  const { entry, player, isWinning } = data;
  const isRed = player?.team === 0;

  return (
    <motion.div
      key={`${slot}-${entry.card.id}`}
      initial={{ opacity: 0, scale: 0.7, y: slot === "south" ? 30 : slot === "north" ? -30 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn("absolute z-20 flex flex-col items-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]", positionClass)}
    >
      {/* Player Label Pill */}
      <div
        className={cn(
          "mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider shadow-md backdrop-blur-md border",
          isRed
            ? "border-rose-400/50 bg-rose-950/85 text-rose-200"
            : "border-sky-400/50 bg-sky-950/85 text-sky-200"
        )}
      >
        <span>{player?.displayName ?? "Player"}</span>
        {isWinning ? <Crown className="h-3 w-3 text-amber-300" /> : null}
      </div>

      {/* Card Face with organic rotation */}
      <div className={cn("relative transition-transform duration-300", rotationClass)}>
        <TwentyNineCardFace card={entry.card} size="sm" isWinning={isWinning} />
        {isWinning ? (
          <div className="absolute top-full mt-1 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.2 text-[0.52rem] font-black uppercase tracking-widest text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.9)]">
            👑 WINNING
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
