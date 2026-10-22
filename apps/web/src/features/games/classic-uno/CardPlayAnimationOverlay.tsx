"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

type SeatRefMap = Map<string, HTMLElement>;
interface Point { x: number; y: number }
interface PublicPlayerLabel { userId: string; displayName: string }
interface CardFlight {
  id: string;
  card: RenderableCard;
  from: Point;
  to: Point;
  playerName: string;
}

const EVENT_MAX_AGE_MS = 12_000;
const MAX_ACTIVE_FLIGHTS = 4;

/** Shows one lightweight visual proxy for each played card. It never mutates game state. */
export function CardPlayAnimationOverlay({
  events,
  players,
  currentUserId,
  theme,
  containerRef,
  handDockRef,
  seatRefs,
  discardPileRef
}: {
  events: GameEvent[];
  players: PublicPlayerLabel[];
  currentUserId: string | null;
  theme: CardThemeId;
  containerRef: RefObject<HTMLElement | null>;
  handDockRef: RefObject<HTMLElement | null>;
  seatRefs: RefObject<SeatRefMap>;
  discardPileRef: RefObject<HTMLElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const processedRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number[]>([]);
  const [flights, setFlights] = useState<CardFlight[]>([]);

  useEffect(() => () => {
    for (const timeout of timeoutRef.current) window.clearTimeout(timeout);
    timeoutRef.current = [];
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    for (const event of events) {
      if (!event.type.endsWith(":play_card") || processedRef.current.has(event.id)) continue;
      processedRef.current.add(event.id);
      if (Date.now() - new Date(event.createdAt).getTime() > EVENT_MAX_AGE_MS) continue;

      const payload = isRecord(event.payload) ? event.payload : {};
      const playerId = getString(payload.playerId);
      const card = toRenderableCard(payload.card);
      if (!playerId || !card) continue;

      const fromElement = playerId === currentUserId ? handDockRef.current : seatRefs.current.get(playerId) ?? null;
      const from = getCenter(fromElement, container) ?? getContainerCenter(container);
      const to = getCenter(discardPileRef.current, container) ?? getContainerCenter(container);
      const player = players.find((item) => item.userId === playerId);
      const flight: CardFlight = {
        id: event.id,
        card,
        from,
        to,
        playerName: playerId === currentUserId ? "You" : player?.displayName ?? "Player"
      };

      setFlights((current) => [...current, flight].slice(-MAX_ACTIVE_FLIGHTS));
      const timeout = window.setTimeout(
        () => setFlights((current) => current.filter((item) => item.id !== flight.id)),
        reduceMotion ? 420 : 900
      );
      timeoutRef.current.push(timeout);
    }

    if (processedRef.current.size > 800) {
      const keep = new Set(events.map((event) => event.id));
      processedRef.current = new Set([...processedRef.current].filter((id) => keep.has(id)));
    }
  }, [containerRef, currentUserId, discardPileRef, events, handDockRef, players, reduceMotion, seatRefs]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[58] overflow-hidden">
      <AnimatePresence initial={false}>
        {flights.map((flight) => {
          const midX = (flight.from.x + flight.to.x) / 2 + (flight.from.x < flight.to.x ? 18 : -18);
          const midY = Math.min(flight.from.y, flight.to.y) - 56;
          return (
            <motion.div
              key={flight.id}
              className="absolute left-0 top-0"
              initial={{ x: flight.from.x - 30, y: flight.from.y - 42, rotate: -12, scale: 0.72, opacity: 0 }}
              animate={reduceMotion
                ? { opacity: [0, 1, 0] }
                : {
                    x: [flight.from.x - 30, midX - 30, flight.to.x - 30],
                    y: [flight.from.y - 42, midY - 42, flight.to.y - 42],
                    rotate: [-12, 9, 0],
                    scale: [0.72, 1.04, 0.72],
                    opacity: [0, 1, 1, 0]
                  }}
              transition={{ duration: reduceMotion ? 0.28 : 0.72, ease: [0.18, 0.86, 0.24, 1] }}
            >
              <div style={{ boxShadow: "0 0 16px rgba(110, 231, 183, 0.24)" }}>
                <UnoCard card={flight.card} compact theme={theme} liftOnHover={false} className="h-[5.25rem] w-[3.65rem] rounded-xl ring-1 ring-white/25" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function toRenderableCard(value: unknown): RenderableCard | null {
  if (!isRecord(value)) return null;
  const id = getString(value.id);
  const color = getString(value.color);
  const cardValue = getString(value.value);
  if (!id || !cardValue || !color || !["red", "yellow", "green", "blue", "wild"].includes(color)) return null;
  const assetKey = getString(value.assetKey);
  return { id, color: color as RenderableCard["color"], value: cardValue, ...(assetKey ? { assetKey } : {}) };
}

function getCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return { x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top + rect.height / 2 };
}
function getContainerCenter(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
