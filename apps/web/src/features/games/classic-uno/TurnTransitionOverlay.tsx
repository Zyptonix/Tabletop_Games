"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type SeatRefMap = Map<string, HTMLElement>;

interface Point {
  x: number;
  y: number;
}

interface TurnAnimation {
  id: number;
  to: Point;
  color: string;
}

const colorTokens: Record<string, string> = {
  red: "#ff3b30",
  yellow: "#ffc928",
  green: "#1ed760",
  blue: "#2d8cff"
};

export function TurnTransitionOverlay({
  currentPlayerId,
  previousPlayerId,
  currentColor,
  containerRef,
  seatRefs
}: {
  currentPlayerId: string | null;
  previousPlayerId: string | null;
  currentColor: string;
  containerRef: RefObject<HTMLElement | null>;
  seatRefs: RefObject<SeatRefMap>;
}) {
  const reduceMotion = useReducedMotion();
  const sequenceRef = useRef(0);
  const [animation, setAnimation] = useState<TurnAnimation | null>(null);

  useEffect(() => {
    if (!currentPlayerId) {
      return;
    }

    const container = containerRef.current;
    const nextSeat = seatRefs.current.get(currentPlayerId);
    if (!container || !nextSeat) {
      return;
    }

    const nextPoint = getElementCenter(nextSeat, container);

    sequenceRef.current += 1;
    setAnimation({
      id: sequenceRef.current,
      to: nextPoint,
      color: colorTokens[currentColor] ?? "#38bdf8"
    });
  }, [containerRef, currentColor, currentPlayerId, previousPlayerId, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      <AnimatePresence mode="wait">
        {animation ? (
          <motion.div
            key={`pulse-${animation.id}`}
            className="absolute"
            style={{ x: animation.to.x - 30, y: animation.to.y - 30 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: "easeOut" }}
          >
            <motion.div
              className="h-16 w-16 rounded-full border"
              style={{
                borderColor: animation.color,
                boxShadow: `0 0 16px ${animation.color}, inset 0 0 12px ${animation.color}`
              }}
              initial={{ opacity: 0.7, scale: 0.85 }}
              animate={{ opacity: [0.8, 0.45, 0], scale: [0.9, 1.12, 1.25] }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.14 : 0.42, ease: "easeOut" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function getElementCenter(element: HTMLElement, container: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top - containerRect.top + rect.height / 2
  };
}