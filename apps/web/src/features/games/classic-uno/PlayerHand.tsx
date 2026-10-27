"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnoDeclaredColor } from "@tabletop/game-core";
import {
  AlertCircle,
  ArrowLeftRight,
  Bot,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenderableCard } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";
import { UnoCard } from "./UnoCard";
import { UnoColorPicker } from "./UnoColorPicker";
import { getPlayCardActions, isPlayableCard } from "./unoActionUtils";
import type { CardThemeId } from "./cardThemes";

const colorOrder: Record<string, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
  wild: 4
};

const valueOrder: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  skip: 10,
  reverse: 11,
  draw_two: 12,
  draw_four: 13,
  comeback: 14,
  discard_all: 15,
  wild: 16,
  wild_draw_four: 17,
  wild_draw_four_reverse: 18,
  wild_draw_six: 19,
  wild_draw_ten: 20,
  roulette: 21
};

export interface TargetPlayer {
  userId: string;
  displayName: string;
  handCount?: number | undefined;
  unoCalled?: boolean | undefined;
  eliminated?: boolean | undefined;
  avatarUrl?: string | null | undefined;
  isBot?: boolean | undefined;
  connected?: boolean | undefined;
  seat?: number | undefined;
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "P";
}

function sortHand(hand: RenderableCard[]): RenderableCard[] {
  return hand.slice().sort((left, right) => {
    const colorDelta = (colorOrder[left.color] ?? 99) - (colorOrder[right.color] ?? 99);
    if (colorDelta !== 0) return colorDelta;

    const valueDelta = (valueOrder[left.value] ?? 99) - (valueOrder[right.value] ?? 99);
    if (valueDelta !== 0) return valueDelta;

    return left.id.localeCompare(right.id);
  });
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(element.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function getHandDensity(cardCount: number, availableWidth: number) {
  const veryCrowded = cardCount >= 32;
  const compact = cardCount >= 28;

  const cardWidth = compact ? 64 : 96;

  const safeWidth = Math.max(availableWidth - 40, 320);
  const neededWithoutOverlap = cardCount * cardWidth;

  let overlap = -18;

  if (cardCount > 1 && neededWithoutOverlap > safeWidth) {
    overlap = Math.floor((safeWidth - neededWithoutOverlap) / (cardCount - 1));
  }

  const minOverlap = compact ? -52 : -78;
  const maxOverlap = cardCount >= 16 ? -18 : -10;
  overlap = Math.max(minOverlap, Math.min(maxOverlap, overlap));

  return {
    compact,
    veryCrowded,
    overlap,
    cardWidth,
    scale: veryCrowded ? 0.98 : 1,
    localExpand: veryCrowded ? 10 : cardCount >= 20 ? 8 : 5
  };
}

export function PlayerHand({
  hand,
  legalActions,
  theme,
  targetPlayers = [],
  onPlay,
  isMyTurn = false,
  myHandCount,
  isNoMercy = false
}: {
  hand: RenderableCard[];
  legalActions: unknown[];
  theme: CardThemeId;
  targetPlayers?: TargetPlayer[];
  onPlay: (payload: { cardId: string; declaredColor?: UnoDeclaredColor; targetPlayerId?: string }) => void;
  isMyTurn?: boolean;
  myHandCount?: number | undefined;
  isNoMercy?: boolean | undefined;
}) {
  const [colorCardId, setColorCardId] = useState<string | null>(null);
  const [targetCardId, setTargetCardId] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { ref: handFrameRef, width: handFrameWidth } = useElementWidth<HTMLDivElement>();
  const knownCardIdsRef = useRef<Set<string>>(new Set(hand.map((card) => card.id)));

  const sortedHand = useMemo(() => sortHand(hand), [hand]);

  const newCardIds = useMemo(
    () => new Set(hand.filter((card) => !knownCardIdsRef.current.has(card.id)).map((card) => card.id)),
    [hand]
  );

  const playableIds = useMemo(
    () => new Set(hand.filter((card) => isPlayableCard(legalActions, card)).map((card) => card.id)),
    [hand, legalActions]
  );

  const density = getHandDensity(sortedHand.length, handFrameWidth || 1100);

  const currentTargetActions = targetCardId
    ? getPlayCardActions(legalActions, targetCardId).filter((action) => action.targetPlayerId)
    : [];

  const availableTargets = targetPlayers.filter((target) =>
    currentTargetActions.some((action) => action.targetPlayerId === target.userId)
  );

  const myCardsCurrent = myHandCount ?? hand.length;
  // Once the 7 card is played to the table, 1 card leaves the player's hand:
  const afterPlayHandSize = Math.max(0, myCardsCurrent - 1);

  // Compute lowest card count among all available opponents for strategy highlight
  const opponentCounts = availableTargets
    .map((t) => t.handCount)
    .filter((count): count is number => typeof count === "number");

  const minOpponentCards = opponentCounts.length > 0 ? Math.min(...opponentCounts) : 999;

  useEffect(() => {
    knownCardIdsRef.current = new Set(hand.map((card) => card.id));
  }, [hand]);

  return (
    <div className="relative mx-auto w-full max-w-[59rem] overflow-visible xl:max-w-[65rem] 2xl:max-w-[72rem]">
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-black uppercase tracking-wide text-amber-200/90">
        <span>Your hand</span>
        <span>{hand.length} cards</span>
      </div>

      <div
        ref={handFrameRef}
        className={cn(
          "relative min-h-[10.6rem] overflow-visible rounded-[2rem] px-4 pb-4 pt-6 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06),0_-22px_70px_rgb(45_140_255_/_0.12),0_24px_90px_rgb(0_0_0_/_0.45)] backdrop-blur-sm",
          isMyTurn
            ? "bg-[linear-gradient(to_bottom,rgba(59,130,246,0.18),rgba(8,18,34,0.52)_34%,rgba(0,0,0,0.36))] ring-1 ring-sky-400/40"
            : "bg-[linear-gradient(to_bottom,rgb(255_255_255_/_0.035),rgb(0_0_0_/_0.08)_38%,rgb(0_0_0_/_0.28))]"
        )}
        style={
          isMyTurn
            ? {
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(96,165,250,0.28), 0 0 34px rgba(59,130,246,0.35), 0 24px 90px rgba(0,0,0,0.45)",
                transform: "rotate(-0.3deg)"
              }
            : undefined
        }
      >
        <div className="relative flex h-full items-end justify-center overflow-visible">
          <AnimatePresence initial={false}>
            {sortedHand.map((card, index) => {
              const playable = playableIds.has(card.id);
              const isNewCard = newCardIds.has(card.id);

              const playActions = getPlayCardActions(legalActions, card.id);
              const needsColor = playActions.some((action) => action.declaredColor);
              const needsTarget = playActions.some((action) => action.targetPlayerId);

              const distance = hoveredIndex === null ? 999 : Math.abs(index - hoveredIndex);

              let localOffset = 0;
              if (hoveredIndex !== null && sortedHand.length >= 20) {
                if (distance === 1) localOffset = index < hoveredIndex ? -density.localExpand : density.localExpand;
                if (distance === 2) localOffset = index < hoveredIndex ? -density.localExpand * 0.55 : density.localExpand * 0.55;
              }

              const marginLeft = index === 0 ? 0 : density.overlap + localOffset;
              const baseLift = playable ? -18 : 0;
              const hoverLift = playable ? -44 : -22;

              return (
                <motion.div
                  key={card.id}
                  initial={
                    isNewCard
                      ? { opacity: 0, x: -110, y: -160, scale: 0.72, rotate: -6 }
                      : { opacity: 0, y: 14, scale: 0.96, rotate: 0 }
                  }
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: isMyTurn && playable ? baseLift - 6 : baseLift,
                    scale: playable ? (isMyTurn ? 1.07 : 1.05) : density.scale,
                    rotate: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -80,
                    scale: 0.78,
                    rotate: 0
                  }}
                  whileHover={{
                    y: hoverLift,
                    scale: playable ? (density.compact ? 1.24 : 1.2) : density.compact ? 1.12 : 1.08,
                    rotate: playable ? -2 : 0,
                    zIndex: 300
                  }}
                  transition={{ type: "spring", stiffness: 430, damping: 28, mass: 0.75 }}
                  className="relative"
                  style={{
                    marginLeft,
                    transformOrigin: "50% 100%",
                    zIndex: hoveredIndex === index ? 300 : playable ? 80 + index : index,
                    filter: playable && isMyTurn ? "drop-shadow(0 -4px 14px rgba(74, 222, 128, 0.45))" : undefined
                  }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex((current) => (current === index ? null : current))}
                >
                  <UnoCard
                    card={card}
                    playable={playable}
                    compact={density.compact}
                    theme={theme}
                    liftOnHover={false}
                    onClick={
                      playable
                        ? () => {
                            if (needsColor) {
                              setColorCardId(card.id);
                            } else if (needsTarget) {
                              setTargetCardId(card.id);
                            } else {
                              onPlay({ cardId: card.id });
                            }
                          }
                        : undefined
                    }
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {colorCardId ? (
        <UnoColorPicker
          onPick={(color) => {
            onPlay({ cardId: colorCardId, declaredColor: color });
            setColorCardId(null);
          }}
          onCancel={() => setColorCardId(null)}
        />
      ) : null}

      <AnimatePresence>
        {targetCardId ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Swap hands target picker"
              className="relative flex max-h-[88vh] w-[min(95vw,56rem)] flex-col overflow-hidden rounded-[2.2rem] border border-violet-400/30 bg-[linear-gradient(145deg,rgba(18,12,30,0.98),rgba(10,13,24,0.98)_55%,rgba(5,6,10,0.99))] text-white shadow-[0_25px_100px_rgba(0,0,0,0.88),0_0_60px_rgba(168,85,247,0.18)] backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              {/* Header */}
              <div className="relative shrink-0 border-b border-white/10 px-6 py-5 bg-white/[0.02]">
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-48 rounded-full bg-violet-600/15 blur-3xl" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-48 rounded-full bg-amber-500/10 blur-3xl" />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/20 text-violet-200 shadow-[0_0_24px_rgba(168,85,247,0.35)]">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-violet-300">
                          Hand Swap Power
                        </span>
                        <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-amber-300 border border-amber-300/30">
                          Card 7 Played
                        </span>
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                        Choose a Player to Swap Hands
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.15] hover:text-white"
                    aria-label="Close swap menu"
                    onClick={() => setTargetCardId(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status banner with your hand info & legend */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-md">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-white/50">Your hand right now:</span>
                    <span className="rounded-lg bg-white/10 px-2.5 py-0.5 font-black text-amber-200">
                      {myCardsCurrent} cards
                    </span>
                    <span className="text-white/40">➔</span>
                    <span className="font-semibold text-white/50">After playing 7:</span>
                    <span className="rounded-lg border border-violet-400/30 bg-violet-500/20 px-2.5 py-0.5 font-black text-violet-200">
                      {afterPlayHandSize} cards
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[0.68rem] font-bold text-white/60">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      Fewer cards (Advantage)
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                      More cards (Caution)
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponents List / Grid */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(168,85,247,0.6)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
                  {availableTargets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      {availableTargets.map((target) => {
                        const targetCards = typeof target.handCount === "number" ? target.handCount : 0;
                        const delta = targetCards - afterPlayHandSize;
                        const isLowest = targetCards === minOpponentCards && availableTargets.length > 1;
                        const isUnoAlert = targetCards === 1 || Boolean(target.unoCalled);
                        const isMercyRisk = Boolean(isNoMercy && targetCards >= 18);

                        let impactTag = {
                          color: "text-sky-300 border-sky-400/30 bg-sky-500/15",
                          icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
                          text: `±0 Cards`,
                          subtext: `Hand stays at ${targetCards} cards`
                        };

                        if (delta < 0) {
                          impactTag = {
                            color: "text-emerald-300 border-emerald-400/30 bg-emerald-500/15",
                            icon: <TrendingDown className="h-3.5 w-3.5" />,
                            text: `-${Math.abs(delta)} Cards`,
                            subtext: `Hand drops: ${afterPlayHandSize} ➔ ${targetCards}`
                          };
                        } else if (delta > 0) {
                          impactTag = {
                            color: "text-rose-300 border-rose-400/30 bg-rose-500/15",
                            icon: <TrendingUp className="h-3.5 w-3.5" />,
                            text: `+${delta} Cards`,
                            subtext: `Hand grows: ${afterPlayHandSize} ➔ ${targetCards}`
                          };
                        }

                        return (
                          <motion.button
                            key={target.userId}
                            type="button"
                            whileHover={{ y: -3, scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className={cn(
                              "group relative flex flex-col justify-between overflow-hidden rounded-[1.6rem] border p-4 text-left transition duration-200 focus:outline-none focus:ring-2",
                              isUnoAlert
                                ? "border-rose-500/50 hover:border-rose-400 bg-gradient-to-b from-rose-950/40 via-black/60 to-black/80 shadow-[0_8px_30px_rgba(244,63,94,0.18)] focus:ring-rose-400/50"
                                : isLowest
                                ? "border-amber-400/50 hover:border-amber-300 bg-gradient-to-b from-amber-950/35 via-black/60 to-black/80 shadow-[0_8px_30px_rgba(245,158,11,0.18)] focus:ring-amber-300/50"
                                : "border-white/12 hover:border-violet-400/50 bg-gradient-to-b from-white/[0.06] via-black/55 to-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.32)] focus:ring-violet-400/50"
                            )}
                            onClick={() => {
                              if (targetCardId) {
                                onPlay({ cardId: targetCardId, targetPlayerId: target.userId });
                              }
                              setTargetCardId(null);
                            }}
                          >
                            {/* Card Ambient Glow on Hover */}
                            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_50%_0%,rgba(168,85,247,0.14),transparent_70%)]" />

                            {/* Top Row: Avatar, Name, Seat & Badges */}
                            <div className="w-full">
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-inner">
                                      {target.avatarUrl ? (
                                        <img
                                          src={target.avatarUrl}
                                          alt={target.displayName}
                                          className="h-full w-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <span>{getInitials(target.displayName)}</span>
                                      )}
                                    </div>
                                    <span
                                      className={cn(
                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black",
                                        target.connected
                                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                          : "bg-neutral-500"
                                      )}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <span className="block truncate text-sm font-black text-white group-hover:text-amber-200 transition-colors">
                                      {target.displayName}
                                    </span>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-[0.62rem] font-bold text-white/50">
                                      <span>Seat {typeof target.seat === "number" ? target.seat + 1 : "?"}</span>
                                      {target.isBot ? (
                                        <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/20 px-1.5 py-0.2 text-[0.6rem] font-black text-sky-300 border border-sky-400/30">
                                          <Bot className="h-3 w-3 inline" /> BOT
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {isUnoAlert ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-400/60 bg-rose-500/25 px-2.5 py-1 text-[0.62rem] font-black text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse">
                                    <AlertCircle className="h-3 w-3 inline" /> UNO THREAT
                                  </span>
                                ) : isLowest ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/25 px-2.5 py-1 text-[0.62rem] font-black text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                                    <Sparkles className="h-3 w-3 inline" /> BEST SWAP
                                  </span>
                                ) : null}
                              </div>

                              {/* Middle Section: Card Count & Net Impact */}
                              <div
                                className={cn(
                                  "mt-3.5 rounded-2xl border p-3 transition-colors",
                                  isUnoAlert
                                    ? "border-rose-500/30 bg-rose-950/30"
                                    : isLowest
                                    ? "border-amber-400/30 bg-amber-950/25"
                                    : "border-white/10 bg-black/40"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-10 w-8 items-center justify-center rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-400/20 to-black/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                      <span className="text-sm font-black text-amber-100">{targetCards}</span>
                                    </div>
                                    <div>
                                      <div className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
                                        Opponent Has
                                      </div>
                                      <div className="text-base font-black text-white">
                                        {targetCards} {targetCards === 1 ? "Card" : "Cards"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
                                      Your Net Impact
                                    </div>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-black",
                                        impactTag.color
                                      )}
                                    >
                                      {impactTag.icon}
                                      {impactTag.text}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[0.65rem] font-bold text-white/60">
                                  <span>{impactTag.subtext}</span>
                                  {isMercyRisk ? (
                                    <span className="text-orange-300 font-extrabold">⚠️ Mercy close</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Bottom Action Button */}
                            <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-violet-400/30 bg-violet-600/20 px-3.5 py-2.5 text-xs font-black text-violet-100 transition duration-150 group-hover:border-violet-300 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                              <span>SWAP HANDS</span>
                              <ArrowLeftRight className="h-4 w-4 transition-transform group-hover:rotate-180" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-12 text-center">
                      <AlertCircle className="h-10 w-10 text-white/40 mb-2" />
                      <p className="text-base font-black text-white">No Opponents Available</p>
                      <p className="text-xs text-white/55 mt-1">There are no active players to swap hands with.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
                <p className="text-xs font-semibold text-white/55">
                  💡 <span className="font-bold text-amber-200">Tip:</span> Swapping with a player on 1 card steals their winning position, while targeting the lowest card count maximizes your advantage!
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/[0.06] px-6 text-sm font-black text-white hover:bg-white/12"
                  onClick={() => setTargetCardId(null)}
                >
                  Cancel (Keep Hand)
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
