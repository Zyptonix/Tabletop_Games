"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

type Point = { x: number; y: number };
type PlayerLabel = { userId: string; displayName: string };
type SeatRefs = Map<string, HTMLElement>;
type DiscardMotion = { id: string; from: Point; to: Point; color: string; count: number; playerName: string };

const colorGlow: Record<string, string> = {
  red: "rgba(248, 75, 75, 0.72)",
  yellow: "rgba(250, 204, 21, 0.72)",
  green: "rgba(52, 211, 153, 0.72)",
  blue: "rgba(96, 165, 250, 0.72)",
  wild: "rgba(226, 232, 240, 0.62)"
};

export function DiscardAllAnimationOverlay({
  events,
  players,
  currentUserId,
  theme,
  containerRef,
  seatRefs,
  handDockRef,
  discardPileRef
}: {
  events: GameEvent[];
  players: PlayerLabel[];
  currentUserId: string | null;
  theme: CardThemeId;
  containerRef: RefObject<HTMLElement | null>;
  seatRefs: RefObject<SeatRefs>;
  handDockRef: RefObject<HTMLElement | null>;
  discardPileRef: RefObject<HTMLElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const processed = useRef(new Set<string>());
  const timeouts = useRef<number[]>([]);
  const [motions, setMotions] = useState<DiscardMotion[]>([]);

  useEffect(() => () => {
    for (const timeout of timeouts.current) window.clearTimeout(timeout);
    timeouts.current = [];
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    for (const event of events) {
      if (processed.current.has(event.id)) continue;
      processed.current.add(event.id);
      if (!event.type.endsWith(":discard_all") || Date.now() - new Date(event.createdAt).getTime() > 12_000) continue;
      const payload = isRecord(event.payload) ? event.payload : {};
      const playerId = typeof payload.playerId === "string" ? payload.playerId : "";
      const rawColor = typeof payload.color === "string" ? payload.color : "wild";
      const color = rawColor in colorGlow ? rawColor : "wild";
      const count = typeof payload.count === "number" && Number.isFinite(payload.count) ? payload.count : 0;
      const source = playerId === currentUserId ? handDockRef.current : seatRefs.current.get(playerId) ?? null;
      const animation: DiscardMotion = {
        id: event.id,
        from: getCenter(source, container) ?? centerOf(container),
        to: getCenter(discardPileRef.current, container) ?? centerOf(container),
        color,
        count,
        playerName: playerId === currentUserId ? "You" : players.find((player) => player.userId === playerId)?.displayName ?? "A player"
      };

      setMotions((current) => [...current, animation].slice(-3));
      const timeout = window.setTimeout(() => setMotions((current) => current.filter((item) => item.id !== animation.id)), reduceMotion ? 450 : 1050);
      timeouts.current.push(timeout);
    }
  }, [containerRef, currentUserId, discardPileRef, events, handDockRef, players, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      <AnimatePresence initial={false}>
        {motions.map((item) => (
          <motion.div
            key={item.id}
            className="absolute left-0 top-0"
            initial={{ x: item.from.x - 26, y: item.from.y - 36, opacity: 0, scale: 0.82, rotate: -10 }}
            animate={reduceMotion
              ? { x: item.from.x - 26, y: item.from.y - 36, opacity: [0, 1, 0], scale: 0.86, rotate: 0 }
              : { x: [item.from.x - 26, (item.from.x + item.to.x) / 2 - 26, item.to.x - 26], y: [item.from.y - 36, Math.min(item.from.y, item.to.y) - 76, item.to.y - 30], opacity: [0, 1, 1, 0], scale: [0.82, 1.02, 0.88], rotate: [-10, 7, 0] }}
            transition={{ duration: reduceMotion ? 0.4 : 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            aria-hidden="true"
          >
            <div className="relative h-[5.1rem] w-[4.3rem]" style={{ filter: `drop-shadow(0 0 12px ${colorGlow[item.color]})` }}>
              <div className="absolute left-0 top-2 rotate-[-12deg] opacity-80"><UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-16 w-[2.65rem] rounded-lg" /></div>
              <div className="absolute left-2 top-1 rotate-[-3deg] opacity-95"><UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-16 w-[2.65rem] rounded-lg" /></div>
              <div className="absolute left-4 top-0 rotate-[8deg]"><UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-16 w-[2.65rem] rounded-lg" /></div>
              <div className="absolute -bottom-0.5 -right-1 rounded-full border border-white/30 bg-black/90 px-2 py-1 text-[10px] font-black text-white">{item.count} cards</div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-black/80 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">{item.playerName} · Discard All</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const base = container.getBoundingClientRect();
  return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 };
}
function centerOf(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
