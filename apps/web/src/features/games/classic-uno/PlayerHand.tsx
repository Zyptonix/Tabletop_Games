"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnoDeclaredColor } from "@tabletop/game-core";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
    <div className="relative mx-auto w-full max-w-[74rem] overflow-visible">
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-black uppercase tracking-wide text-amber-200">
        <span>Your hand</span>
        <span>{hand.length} cards</span>
      </div>

      <div
        ref={handFrameRef}
        className="relative min-h-[10.75rem] overflow-hidden rounded-[1.25rem] border border-amber-300/15 bg-black/28 px-4 pb-4 pt-6 shadow-[inset_0_18px_60px_rgb(0_0_0_/_0.32)]"
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

      <Dialog open={Boolean(targetCardId)} title="Swap Hands" onClose={() => setTargetCardId(null)}>
        <div className="space-y-2">
          {availableTargets.map((target) => (
            <Button
              key={target.userId}
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (targetCardId) {
                  onPlay({ cardId: targetCardId, targetPlayerId: target.userId });
                }
                setTargetCardId(null);
              }}
            >
              {target.displayName}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}