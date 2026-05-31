"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnoDeclaredColor } from "@tabletop/game-core";
import { Button } from "@/components/ui/button";
import type { RenderableCard } from "@/lib/cards";
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

interface TargetPlayer {
  userId: string;
  displayName: string;
  eliminated?: boolean | undefined;
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

  /**
   * UnoCard normal width is about 96px on desktop.
   * UnoCard compact width is 64px.
   * We use compact for huge hands so 50+ cards can still fit.
   */
  const cardWidth = compact ? 64 : 96;

  const safeWidth = Math.max(availableWidth - 40, 320);
  const neededWithoutOverlap = cardCount * cardWidth;

  let overlap = -18;

  if (cardCount > 1 && neededWithoutOverlap > safeWidth) {
    overlap = Math.floor((safeWidth - neededWithoutOverlap) / (cardCount - 1));
  }

  /**
   * Clamp overlap so the hand never becomes unreadably stacked.
   * Compact cards allow a less aggressive overlap.
   */
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
  onPlay
}: {
  hand: RenderableCard[];
  legalActions: unknown[];
  theme: CardThemeId;
  targetPlayers?: TargetPlayer[];
  onPlay: (payload: { cardId: string; declaredColor?: UnoDeclaredColor; targetPlayerId?: string }) => void;
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
        className="relative min-h-[10.6rem] overflow-visible rounded-[2rem]  bg-[linear-gradient(to_bottom,rgb(255_255_255_/_0.035),rgb(0_0_0_/_0.08)_38%,rgb(0_0_0_/_0.28))] px-4 pb-4 pt-6 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06),0_-22px_70px_rgb(45_140_255_/_0.12),0_24px_90px_rgb(0_0_0_/_0.45)] backdrop-blur-sm"
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

              /**
               * When the hand is crowded, hovering one card opens only the nearby area.
               * This keeps the whole hand inside the frame but still makes hovered cards readable.
               */
              let localOffset = 0;
              if (hoveredIndex !== null && sortedHand.length >= 20) {
                if (distance === 1) localOffset = index < hoveredIndex ? -density.localExpand : density.localExpand;
                if (distance === 2) localOffset = index < hoveredIndex ? -density.localExpand * 0.55 : density.localExpand * 0.55;
              }

              const marginLeft = index === 0 ? 0 : density.overlap + localOffset;
              const baseLift = playable ? -14 : 0;
              const hoverLift = playable ? -34 : -18;

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
                    y: baseLift,
                    scale: density.scale,
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
                    scale: density.compact ? 1.12 : 1.07,
                    rotate: 0,
                    zIndex: 300
                  }}
                  transition={{ type: "spring", stiffness: 430, damping: 34, mass: 0.82 }}
                  className="relative"
                  style={{
                    marginLeft,
                    transformOrigin: "50% 100%",
                    zIndex: hoveredIndex === index ? 300 : playable ? 80 + index : index
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
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/72 px-4 pb-4 pt-0 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Swap hands target picker"
              className="flex h-[min(76dvh,40rem)] w-[min(94vw,54rem)] -translate-y-[6vh] flex-col overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(9,10,12,0.98),rgba(20,16,10,0.96)_48%,rgba(0,0,0,0.98))] text-white shadow-[0_30px_110px_rgba(0,0,0,0.82),0_0_50px_rgba(245,158,11,0.13)]"
              style={{ marginTop: "-14vh" }}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-amber-200/80">
                    Swap Hands
                  </p>
                  <h2 className="mt-1 truncate text-xl font-black text-white">Choose a player</h2>
                  <p className="mt-1 text-sm font-semibold text-white/55">
                    Every active opponent is listed here. Scroll inside this panel for large lobbies.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xl font-black text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                  aria-label="Close swap target picker"
                  onClick={() => setTargetCardId(null)}
                >
                  ×
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-200/75">
                    Available targets
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-white/60">
                    Pick the player whose hand you want to swap with.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/55 p-2 pr-2 shadow-inner [scrollbar-color:rgba(245,158,11,0.75)_rgba(255,255,255,0.08)] [scrollbar-width:thin]">
                  {availableTargets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {availableTargets.map((target, index) => (
                        <button
                          key={target.userId}
                          type="button"
                          className="group flex min-h-[4.1rem] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.065] px-3 py-2.5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-amber-300/14 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
                          onClick={() => {
                            if (targetCardId) {
                              onPlay({ cardId: targetCardId, targetPlayerId: target.userId });
                            }
                            setTargetCardId(null);
                          }}
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/30 bg-black/70 text-xs font-black text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.18)]">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-white group-hover:text-amber-100">
                              {target.displayName}
                            </span>
                            <span className="mt-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/40">
                              Swap target
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-sm font-bold text-white/55">
                      No active players can be targeted right now.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 justify-end border-t border-white/10 px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/[0.06] px-5 text-white hover:bg-white/12"
                  onClick={() => setTargetCardId(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}