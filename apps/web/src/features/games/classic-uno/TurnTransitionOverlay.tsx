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
  from: Point | null;
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
    const previousSeat = previousPlayerId ? seatRefs.current.get(previousPlayerId) : null;
    const previousPoint = previousSeat ? getElementCenter(previousSeat, container) : null;

    sequenceRef.current += 1;
    setAnimation({
      id: sequenceRef.current,
      from: reduceMotion ? null : previousPoint,
      to: nextPoint,
      color: colorTokens[currentColor] ?? "#38bdf8"
    });
  }, [containerRef, currentColor, currentPlayerId, previousPlayerId, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      <AnimatePresence mode="popLayout">
        {animation ? (
          <motion.div key={`pulse-${animation.id}`} className="absolute" style={{ x: animation.to.x - 32, y: animation.to.y - 32 }}>
            <motion.div
              className="h-16 w-16 rounded-full border-2"
              style={{ borderColor: animation.color, boxShadow: `0 0 30px ${animation.color}, inset 0 0 22px ${animation.color}` }}
              initial={{ opacity: 0.8, scale: 0.25 }}
              animate={{ opacity: [0.75, 0.45, 0], scale: [0.35, 1.35, 1.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: "easeOut", delay: animation.from ? 0.42 : 0 }}
            />
          </motion.div>
        ) : null}

        {animation?.from ? (
          <motion.div
            key={`orb-${animation.id}`}
            className="absolute h-5 w-5 rounded-full"
            style={{
              backgroundColor: animation.color,
              boxShadow: `0 0 16px ${animation.color}, 0 0 42px ${animation.color}, 0 0 80px ${animation.color}`
            }}
            initial={{ x: animation.from.x - 10, y: animation.from.y - 10, opacity: 0, scale: 0.65 }}
            animate={{
              x: [animation.from.x - 10, (animation.from.x + animation.to.x) / 2 - 10, animation.to.x - 10],
              y: [animation.from.y - 10, Math.min(animation.from.y, animation.to.y) - 82, animation.to.y - 10],
              opacity: [0, 1, 1, 0],
              scale: [0.65, 1.12, 0.92]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: [0.2, 0.82, 0.2, 1] }}
          >
            <span
              className="absolute -inset-8 rounded-full blur-xl"
              style={{ backgroundColor: animation.color, opacity: 0.32 }}
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