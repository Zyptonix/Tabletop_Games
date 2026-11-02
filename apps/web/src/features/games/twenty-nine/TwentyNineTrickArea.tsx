"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Crown, Eye, Gavel, Lock, Sparkles, Trophy, Unlock } from "lucide-react";
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
  onNextTrick,
  className
}: {
  trick: TwentyNinePlayedCard[];
  state: PublicTwentyNineState;
  currentUserId: string | null;
  persistedCompletedTrick?: PersistedCompletedTrick | null;
  onRevealTrump?: () => void;
  canRevealTrump?: boolean;
  onNextTrick?: () => void;
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

  const redGamePoints = state.teamGamePoints["0"] ?? 0;
  const blueGamePoints = state.teamGamePoints["1"] ?? 0;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full max-w-6xl select-none my-auto",
        className
      )}
    >
      {/* Top Header Row: [Total Match Points] & [Trick Status Pill] */}
      <div className="mb-4 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Total Match Game Points (e.g. +1 / -1) */}
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/80 px-4 py-1 shadow-xl backdrop-blur-md">
          <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
            Match Score:
          </span>
          <div className="flex items-center gap-1.5 font-black">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span className="text-[0.68rem] text-rose-300 font-extrabold">Red</span>
            <span
              className={cn(
                "text-xs sm:text-sm font-black tabular-nums",
                redGamePoints > 0
                  ? "text-emerald-300"
                  : redGamePoints < 0
                  ? "text-rose-400"
                  : "text-white"
              )}
            >
              {redGamePoints > 0 ? `+${redGamePoints}` : redGamePoints}
            </span>
          </div>

          <span className="text-white/20 font-bold">vs</span>

          <div className="flex items-center gap-1.5 font-black">
            <span
              className={cn(
                "text-xs sm:text-sm font-black tabular-nums",
                blueGamePoints > 0
                  ? "text-emerald-300"
                  : blueGamePoints < 0
                  ? "text-rose-400"
                  : "text-white"
              )}
            >
              {blueGamePoints > 0 ? `+${blueGamePoints}` : blueGamePoints}
            </span>
            <span className="text-[0.68rem] text-sky-300 font-extrabold">Blue</span>
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </div>
        </div>

        {/* Current Trick Number / Auction Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/80 px-4 py-1 text-xs font-black shadow-xl backdrop-blur-md">
          {state.phase === "bidding" ? (
            <div className="flex items-center gap-1.5 text-amber-300">
              <Gavel className="h-3.5 w-3.5" />
              <span>Auction Phase · Hand #{state.handNumber}</span>
            </div>
          ) : (
            <span className="text-amber-300">
              Trick {isHoldCompletedTrick && persistedCompletedTrick ? persistedCompletedTrick.trickNumber : state.completedTricks.length + 1} of 8
            </span>
          )}
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
      </div>

      {/* MAIN TABLE ROW: Centered around the Central Trick Table Circle (Center Table is strictly 100% Dead-Center) */}
      <div className="relative flex items-center justify-center w-full">
        {/* 3. GRAND CENTRAL TRICK CIRCULAR FORMATION (Center Anchor) */}
        <div className="relative flex items-center justify-center w-[22rem] sm:w-[27rem] md:w-[31rem] lg:w-[35rem] h-[19rem] sm:h-[23rem] md:h-[26rem] lg:h-[29rem] shrink-0">
          {/* Grand Circular Felt Disc Background */}
          <div className="pointer-events-none absolute inset-0 m-auto rounded-full bg-[radial-gradient(circle_at_center,#44220c_0%,#2a1305_55%,#140702_85%,#090301_100%)] border-2 border-amber-400/35 shadow-[inset_0_0_60px_rgba(0,0,0,0.9),0_20px_50px_rgba(0,0,0,0.85)]" />
          {/* Inner Golden Dashed Inlay */}
          <div className="pointer-events-none absolute inset-3 sm:inset-4 rounded-full border border-dashed border-amber-300/25" />
          {/* Subtle Compass Points */}
          <span className="pointer-events-none absolute top-2 text-[0.65rem] font-black text-amber-200/25 uppercase tracking-widest">N</span>
          <span className="pointer-events-none absolute bottom-2 text-[0.65rem] font-black text-amber-200/25 uppercase tracking-widest">S</span>
          <span className="pointer-events-none absolute left-3 text-[0.65rem] font-black text-amber-200/25 uppercase tracking-widest">W</span>
          <span className="pointer-events-none absolute right-3 text-[0.65rem] font-black text-amber-200/25 uppercase tracking-widest">E</span>

          {/* Compass Cards (Large size="lg" cards for maximum visibility) */}
          <SlotCardContainer
            slot="north"
            data={playedBySlot.get("north")}
            positionClass="top-1 sm:top-2 left-1/2 -translate-x-1/2"
            rotationClass="rotate-[1deg]"
          />
          <SlotCardContainer
            slot="south"
            data={playedBySlot.get("south")}
            positionClass="bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2"
            rotationClass="rotate-[-1deg]"
          />
          <SlotCardContainer
            slot="west"
            data={playedBySlot.get("west")}
            positionClass="left-1 sm:left-3 top-1/2 -translate-y-1/2"
            rotationClass="rotate-[-4deg]"
          />
          <SlotCardContainer
            slot="east"
            data={playedBySlot.get("east")}
            positionClass="right-1 sm:right-3 top-1/2 -translate-y-1/2"
            rotationClass="rotate-[3deg]"
          />

          {/* Empty Table Center Prompt, Live Points Watermark, or Bidding Arena */}
          {activeTrick.length === 0 ? (
            state.phase === "bidding" ? (
              <TwentyNineBiddingCenter state={state} currentUserId={currentUserId} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-3 z-10">
                <span className="text-3xl opacity-35">🃏</span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-200/40 mt-1">
                  {state.phase === "playing" ? "Lead a Card" : "Waiting"}
                </span>
              </div>
            )
          ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
              <div className="flex flex-col items-center justify-center rounded-full bg-black/45 border border-white/10 h-16 w-16 backdrop-blur-sm shadow-inner">
                <span className="text-sm font-black text-amber-300 drop-shadow">
                  {currentTrickPoints > 0 ? `+${currentTrickPoints}` : "0"}
                </span>
                <span className="text-[0.52rem] font-extrabold uppercase tracking-widest text-white/40">
                  PTS
                </span>
              </div>
            </div>
          )}

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

          {/* LEFT FLANK: [Opponent Captured Deck] & [Trump Slot] (Anchored outside left edge of table circle) */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 sm:mr-5 md:mr-7 flex items-center gap-2.5 sm:gap-4 pointer-events-auto">
            {/* 1. OPPONENT CAPTURED DECK */}
            <div className="flex flex-col items-center shrink-0">
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
            <div className="flex flex-col items-center shrink-0">
              <div className="mb-1 flex items-center gap-1">
                <span className="text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  {state.trumpRevealed ? <Unlock className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3 text-amber-300" />}
                  Trump
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[0.52rem] font-black uppercase tracking-wider border",
                    state.trumpRevealed
                      ? "border-emerald-400/50 bg-emerald-950/80 text-emerald-300"
                      : "border-amber-400/50 bg-amber-950/80 text-amber-300"
                  )}
                >
                  {state.trumpRevealed ? "Revealed" : "Concealed"}
                </span>
              </div>

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
                    ? `You set: ${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label} (Concealed - Hidden from Table)`
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
                      <div className="absolute inset-x-0 bottom-0 bg-black/90 py-1 px-0.5 flex flex-col items-center justify-center border-t border-amber-400/50">
                        <div className="flex items-center gap-1 text-[0.6rem] font-black text-amber-300">
                          <SuitMark suit={state.trumpSuit} size={12} />
                          <span>{TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}</span>
                        </div>
                        <span className="text-[0.45rem] font-bold text-amber-300 uppercase tracking-tighter">
                          (Secret - Concealed)
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
          </div>

          {/* RIGHT FLANK: [Your Team Captured Deck] (Anchored outside right edge of table circle) */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 sm:ml-5 md:ml-7 flex items-center gap-2.5 sm:gap-4 pointer-events-auto">
            {/* 4. YOUR TEAM CAPTURED DECK */}
            <div className="flex flex-col items-center shrink-0">
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
        <TwentyNineCardFace card={entry.card} size="lg" isWinning={isWinning} />
        {isWinning ? (
          <div className="absolute top-full mt-1.5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-widest text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.9)]">
            👑 WINNING
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function TwentyNineBiddingCenter({
  state,
  currentUserId
}: {
  state: PublicTwentyNineState;
  currentUserId: string | null;
}) {
  const highestBidder = state.players.find((p) => p.userId === state.highestBidderId);
  const isMeLeading = highestBidder?.userId === currentUserId;
  const isRedLeading = highestBidder?.team === 0;

  const currentTurnPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const isMyTurn = currentTurnPlayer?.userId === currentUserId;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 sm:p-4 max-w-sm sm:max-w-md select-none">
      {/* Auction Phase Badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-amber-300 mb-2 shadow-sm">
        <Gavel className="h-3 w-3 text-amber-300" />
        <span>Auction in Progress</span>
      </div>

      {highestBidder && state.currentBid !== null ? (
        /* HIGHEST BIDDER SHOWCASE CARD */
        <motion.div
          key={state.currentBid}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border px-5 py-2.5 sm:px-7 sm:py-3.5 shadow-2xl backdrop-blur-md",
            isMeLeading
              ? "border-emerald-400/60 bg-gradient-to-b from-emerald-950/80 via-black/80 to-black/90 shadow-emerald-500/25"
              : isRedLeading
              ? "border-rose-400/60 bg-gradient-to-b from-rose-950/80 via-black/80 to-black/90 shadow-rose-500/25"
              : "border-sky-400/60 bg-gradient-to-b from-sky-950/80 via-black/80 to-black/90 shadow-sky-500/25"
          )}
        >
          {/* Glowing Ambient Glow */}
          <div
            className={cn(
              "pointer-events-none absolute -inset-2 rounded-2xl blur-xl opacity-30",
              isMeLeading ? "bg-emerald-400" : isRedLeading ? "bg-rose-500" : "bg-sky-400"
            )}
          />

          {/* Crown & Leader Tag */}
          <div className="flex items-center gap-1.5 text-xs font-black">
            <Crown className="h-4 w-4 fill-amber-400 text-amber-400 animate-bounce" />
            <span className="uppercase tracking-wider text-amber-300">Winning The Bid</span>
          </div>

          {/* Huge Bid Number */}
          <div className="flex items-baseline justify-center gap-1.5 my-1">
            <span className="text-4xl sm:text-5xl md:text-6xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_25px_rgba(245,158,11,0.7)]">
              {state.currentBid}
            </span>
            <span className="text-xs sm:text-sm font-extrabold uppercase text-amber-200/60">
              points
            </span>
          </div>

          {/* Winning Player Pill */}
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full shadow-sm",
                isRedLeading ? "bg-rose-500 shadow-rose-500/80" : "bg-sky-400 shadow-sky-400/80"
              )}
            />
            <span className="text-sm font-black text-white">
              {isMeLeading ? "You are Winning!" : `${highestBidder.displayName} is Winning`}
            </span>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.2 text-[0.58rem] font-black uppercase tracking-wider",
                isRedLeading
                  ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                  : "border-sky-400/50 bg-sky-500/20 text-sky-200"
              )}
            >
              {isRedLeading ? "Team Red" : "Team Blue"}
            </span>
          </div>
        </motion.div>
      ) : (
        /* NO BIDS YET / OPENING BID PROMPT */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 px-6 py-3 shadow-xl backdrop-blur-md">
          <span className="text-[0.68rem] font-black uppercase tracking-wider text-amber-300/80">
            Opening Bid Required
          </span>
          <div className="flex items-baseline justify-center gap-1.5 my-1">
            <span className="text-4xl sm:text-5xl font-black text-white/90">16</span>
            <span className="text-xs font-bold uppercase text-white/40">min</span>
          </div>
          <span className="text-xs text-white/50">
            Waiting for first bid…
          </span>
        </div>
      )}

      {/* Turn Indicator */}
      <div className="mt-2.5">
        {isMyTurn ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-400 px-4 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Your Turn to Bid or Pass!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3.5 py-1 text-xs font-bold text-white/60 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Turn: <strong className="text-white">{currentTurnPlayer?.displayName ?? "Player"}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Recent Bid History Ticker */}
      {state.bidHistory.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 max-w-xs sm:max-w-sm">
          {state.bidHistory.slice(-4).map((entry, idx) => {
            const p = state.players.find((pl) => pl.userId === entry.playerId);
            const pName = p?.userId === currentUserId ? "You" : p?.displayName ?? "Player";
            const isRed = p?.team === 0;
            const isLeader = entry.playerId === state.highestBidderId;

            return (
              <span
                key={idx}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.62rem] font-bold border flex items-center gap-1 shadow-sm",
                  entry.kind === "pass"
                    ? "border-white/10 bg-black/60 text-white/40"
                    : isLeader
                    ? "border-amber-400/80 bg-amber-500/25 text-amber-200 font-black shadow-amber-500/20"
                    : isRed
                    ? "border-rose-400/30 bg-rose-950/40 text-rose-300"
                    : "border-sky-400/30 bg-sky-950/40 text-sky-300"
                )}
              >
                {isLeader ? <Crown className="h-2.5 w-2.5 text-amber-300 shrink-0" /> : null}
                <span>{pName}:</span>
                <span className="font-black">
                  {entry.kind === "pass" ? "Pass" : entry.kind === "ditto" ? `Ditto (${entry.value})` : `${entry.value}`}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
