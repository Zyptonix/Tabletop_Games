"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Eye, Gavel, Lock, Sparkles, Trophy, Unlock } from "lucide-react";
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

  const winnerSlot = isHoldCompletedTrick && persistedCompletedTrick
    ? getCompassSlot(persistedCompletedTrick.winnerPlayerId, currentUserId, state.players)
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
      {/* MAIN TABLE ROW: Centered around the Grand Central Trick Table Oval */}
      <div className="relative flex items-center justify-center w-full">
        {/* GRAND CENTRAL TRICK OVAL ARENA (Maximized wide stadium oval taking up all free space) */}
        <div className="relative flex items-center justify-center w-[min(960px,92vw,calc(100vw-320px))] h-[min(480px,52dvh)] max-h-[calc(100vh-300px)] rounded-[9999px] shrink-0">
          {/* Grand Stadium Oval Felt Disc Background */}
          <div className="pointer-events-none absolute inset-0 m-auto rounded-[9999px] bg-[radial-gradient(ellipse_at_center,#4a260f_0%,#2e1506_55%,#160802_85%,#0a0301_100%)] border-4 border-amber-400/40 shadow-[inset_0_0_90px_rgba(0,0,0,0.95),0_25px_60px_rgba(0,0,0,0.85)]" />
          {/* Inner Golden Dashed Inlay */}
          <div className="pointer-events-none absolute inset-4 sm:inset-6 rounded-[9999px] border-2 border-dashed border-amber-300/30" />
          {/* Subtle Compass Points */}
          <span className="pointer-events-none absolute top-2 sm:top-3.5 text-[0.7rem] font-black text-amber-200/30 uppercase tracking-widest">N</span>
          <span className="pointer-events-none absolute bottom-2 sm:bottom-3.5 text-[0.7rem] font-black text-amber-200/30 uppercase tracking-widest">S</span>
          <span className="pointer-events-none absolute left-6 sm:left-10 text-[0.7rem] font-black text-amber-200/30 uppercase tracking-widest">W</span>
          <span className="pointer-events-none absolute right-6 sm:right-10 text-[0.7rem] font-black text-amber-200/30 uppercase tracking-widest">E</span>

          {/* Compass Cards (North moved further up, all 4 cards scaled up per user request) */}
          <SlotCardContainer
            slot="north"
            data={playedBySlot.get("north")}
            positionClass="-top-4 sm:-top-5 left-1/2 -translate-x-1/2"
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
            positionClass="left-8 sm:left-14 lg:left-20 top-[38%] -translate-y-1/2"
            rotationClass="rotate-[-3deg]"
          />
          <SlotCardContainer
            slot="east"
            data={playedBySlot.get("east")}
            positionClass="right-8 sm:right-14 lg:right-20 top-[38%] -translate-y-1/2"
            rotationClass="rotate-[3deg]"
          />

          {/* PHYSICAL TRUMP PILE (Positioned along lower-west flank of table oval, completely clear of West seat card fan) */}
          {state.phase !== "bidding" ? (
            <div className="absolute -left-20 sm:-left-24 lg:-left-28 top-[75%] sm:top-[78%] -translate-y-1/2 z-20 flex flex-col items-center shrink-0 select-none pointer-events-auto">
              <div
                onClick={canRevealTrump && onRevealTrump ? onRevealTrump : undefined}
                className={cn(
                  "flex flex-col items-center shrink-0 select-none transition-transform",
                  canRevealTrump && "cursor-pointer hover:scale-105 group"
                )}
                title={
                  state.trumpRevealed && state.trumpSuit
                    ? `Active Trump: ${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}`
                    : canRevealTrump
                    ? "Click to ask / reveal Trump!"
                    : "Trump Card (Concealed on felt)"
                }
              >
                <div className="mb-1 flex items-center gap-1">
                  <span className="text-[0.6rem] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                    Trump
                  </span>
                  {state.trumpRevealed ? (
                    <span className="text-[0.52rem] font-black text-emerald-300 bg-emerald-500/20 px-1 rounded border border-emerald-400/40">
                      REVEALED
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-[0.52rem] font-black px-1 rounded border",
                        canRevealTrump
                          ? "text-amber-200 bg-amber-500/30 border-amber-400 animate-pulse ring-1 ring-amber-300"
                          : "text-amber-300/70 bg-amber-500/10 border-amber-400/30"
                      )}
                    >
                      CONCEALED
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "twenty-nine-felt-deck relative rounded-xl overflow-hidden shadow-2xl transition-all duration-300 flex items-center justify-center",
                    state.trumpRevealed
                      ? "border-2 border-emerald-400/90 bg-white ring-2 ring-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                      : "border-2 border-amber-400/80 ring-2 ring-amber-400/30 bg-[#210f04]",
                    canRevealTrump && "ring-2 ring-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.6)] animate-pulse"
                  )}
                >
                  {state.trumpRevealed && state.trumpSuit ? (
                    /* Revealed Trump Card Face */
                    <div className="relative flex flex-col items-center justify-center p-2 text-center h-full w-full bg-gradient-to-br from-white via-slate-50 to-emerald-50">
                      <SuitMark suit={state.trumpSuit} size={28} />
                      <span className="mt-0.5 text-[0.62rem] sm:text-xs font-black text-slate-950 uppercase tracking-tight leading-none">
                        {TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}
                      </span>
                      <span className="text-[0.5rem] font-extrabold uppercase text-emerald-600 mt-0.5">
                        Trump
                      </span>
                    </div>
                  ) : (
                    /* Concealed Trump Card Back with Lock Overlay */
                    <div className="relative h-full w-full">
                      <TwentyNineCardBack className="h-full w-full rounded-xl border-0" />
                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-1">
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-300 drop-shadow" />
                        {canRevealTrump ? (
                          <span className="mt-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 text-[0.52rem] font-black uppercase text-black shadow-md group-hover:scale-105 transition-transform">
                            REVEAL ⚡
                          </span>
                        ) : (
                          <span className="mt-1 text-[0.52rem] font-bold text-amber-200/80 uppercase">
                            Concealed
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* TABLE CENTERPIECE: Bidding Center during bidding, or clean spacious felt during play */}
          {state.phase === "bidding" ? (
            <TwentyNineBiddingCenter state={state} currentUserId={currentUserId} />
          ) : activeTrick.length > 0 && currentTrickPoints > 0 ? (
            <div className="pointer-events-none relative z-10 flex items-center gap-1.5 rounded-full bg-black/70 border border-amber-400/40 px-3.5 py-1 backdrop-blur-md shadow-lg">
              <span className="text-sm font-black text-amber-300">
                +{currentTrickPoints} pts
              </span>
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/50">
                in trick
              </span>
            </div>
          ) : null}

          {/* Directional Arrow pointing towards the winning player's seat */}
          <AnimatePresence>
            {isHoldCompletedTrick && persistedCompletedTrick && winnerSlot ? (
              winnerSlot === "south" ? (
                <motion.div
                  key="arrow-south"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: [0, 8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className={cn(
                    "absolute bottom-[-1.5rem] sm:bottom-[-2.2rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 font-black text-sm",
                    didMyTeamWinTrick
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  )}
                >
                  <ArrowDown className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              ) : winnerSlot === "north" ? (
                <motion.div
                  key="arrow-north"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: [0, -8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className={cn(
                    "absolute top-[-1.5rem] sm:top-[-2.2rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 font-black text-sm",
                    didMyTeamWinTrick
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  )}
                >
                  <ArrowUp className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              ) : winnerSlot === "west" ? (
                <motion.div
                  key="arrow-west"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: [0, -8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className={cn(
                    "absolute left-[-1.5rem] sm:left-[-2.2rem] top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 font-black text-sm",
                    didMyTeamWinTrick
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  )}
                >
                  <ArrowLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              ) : (
                <motion.div
                  key="arrow-east"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: [0, 8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className={cn(
                    "absolute right-[-1.5rem] sm:right-[-2.2rem] top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 font-black text-sm",
                    didMyTeamWinTrick
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  )}
                >
                  <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
                </motion.div>
              )
            ) : null}
          </AnimatePresence>
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

      {/* Card Face with organic rotation - Enlarged to size="xl" & Scaled Up */}
      <div className={cn("relative transition-transform duration-300 scale-110 sm:scale-[1.18]", rotationClass)}>
        <TwentyNineCardFace card={entry.card} size="xl" isWinning={isWinning} />
        {isWinning ? (
          <div className="absolute top-full mt-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400 bg-amber-950/90 px-3 py-0.5 text-[0.62rem] font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(251,191,36,0.7)]">
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
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/80 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
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
                  {entry.kind === "pass" ? "Pass" : entry.kind === "ditto" ? `Achii (Ditto) (${entry.value})` : `${entry.value}`}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
