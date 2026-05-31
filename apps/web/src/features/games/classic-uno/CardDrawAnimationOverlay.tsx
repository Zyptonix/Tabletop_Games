"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

type SeatRefMap = Map<string, HTMLElement>;

type DrawReason = "manual" | "penalty" | "roulette" | "deck_recycle";

interface Point {
  x: number;
  y: number;
}

interface PublicPlayerLabel {
  userId: string;
  displayName: string;
}

interface NormalizedDrawEvent {
  id: string;
  playerId: string;
  count: number;
  reason: DrawReason;
  color?: string | undefined;
  createdAt: string;
}

interface DrawAnimation extends NormalizedDrawEvent {
  playerName: string;
  from: Point;
  to: Point;
  visibleCards: number;
}

const MAX_FLYING_CARDS = 10;
const EVENT_MAX_AGE_MS = 12_000;

export function CardDrawAnimationOverlay({
  events,
  players,
  currentUserId,
  currentColor,
  theme,
  containerRef,
  drawPileRef,
  handDockRef,
  seatRefs
}: {
  events: GameEvent[];
  players: PublicPlayerLabel[];
  currentUserId: string | null;
  currentColor: string;
  theme: CardThemeId;
  containerRef: RefObject<HTMLElement | null>;
  drawPileRef: RefObject<HTMLElement | null>;
  handDockRef: RefObject<HTMLElement | null>;
  seatRefs: RefObject<SeatRefMap>;
}) {
  const reduceMotion = useReducedMotion();
  const processedRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number[]>([]);
  const [animations, setAnimations] = useState<DrawAnimation[]>([]);

  useEffect(() => {
    return () => {
      for (const timeout of timeoutRef.current) {
        window.clearTimeout(timeout);
      }
      timeoutRef.current = [];
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    for (const event of events) {
      if (processedRef.current.has(event.id)) {
        continue;
      }
      processedRef.current.add(event.id);

      const normalized = normalizeDrawEvent(event);
      if (!normalized || normalized.count <= 0 || isTooOld(normalized.createdAt)) {
        continue;
      }

      const targetPlayer = players.find((player) => player.userId === normalized.playerId);
      const from = getElementCenter(drawPileRef.current, container) ?? getContainerCenter(container);
      const destinationElement = normalized.playerId === currentUserId ? handDockRef.current : seatRefs.current.get(normalized.playerId);
      const to = getElementCenter(destinationElement ?? null, container) ?? getContainerCenter(container);
      const animation: DrawAnimation = {
        ...normalized,
        playerName: normalized.playerId === currentUserId ? "You" : targetPlayer?.displayName ?? "A player",
        from,
        to,
        visibleCards: reduceMotion ? 0 : Math.min(MAX_FLYING_CARDS, normalized.count)
      };

      setAnimations((current) => [...current, animation].slice(-6));
      const timeout = window.setTimeout(() => {
        setAnimations((current) => current.filter((item) => item.id !== animation.id));
      }, reduceMotion ? 1700 : 2200 + animation.visibleCards * 70);
      timeoutRef.current.push(timeout);
    }
  }, [containerRef, currentUserId, drawPileRef, events, handDockRef, players, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[44] overflow-hidden">
      <AnimatePresence>
        {animations.map((animation) => (
          <div key={animation.id}>
            {Array.from({ length: animation.visibleCards }).map((_, index) => {
              const midX = (animation.from.x + animation.to.x) / 2 + (index % 2 === 0 ? -28 : 28);
              const midY = Math.min(animation.from.y, animation.to.y) - 95 - index * 3;
              const delay = index * 0.065;
              return (
                <motion.div
                  key={`${animation.id}-${index}`}
                  className="absolute left-0 top-0"
                  initial={{ x: animation.from.x - 26, y: animation.from.y - 38, rotate: -8, scale: 0.78, opacity: 0 }}
                  animate={{
                    x: [animation.from.x - 26, midX - 26, animation.to.x - 20],
                    y: [animation.from.y - 38, midY - 38, animation.to.y - 30],
                    rotate: [-8, index % 2 === 0 ? 14 : -16, index % 2 === 0 ? 7 : -7],
                    scale: [0.78, 0.9, 0.42],
                    opacity: [0, 1, 0.92, 0]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ delay, duration: 0.82, ease: [0.19, 0.88, 0.25, 1] }}
                >
                  <div className="drop-shadow-[0_0_22px_rgb(45_140_255_/_0.44)]">
                    <UnoCard faceDown compact theme={theme} className="h-[4.75rem] w-[3.2rem] rounded-xl ring-1 ring-white/20" />
                  </div>
                </motion.div>
              );
            })}

            <motion.div
              className="absolute rounded-2xl border border-white/12 bg-black/70 px-3 py-2 text-center text-xs font-black text-white shadow-[0_0_28px_rgb(0_0_0_/_0.45)] backdrop-blur-xl"
              style={{ x: animation.to.x - 64, y: animation.to.y - 86 }}
              initial={{ opacity: 0, y: animation.to.y - 70, scale: 0.92 }}
              animate={{ opacity: [0, 1, 1, 0], y: animation.to.y - 98, scale: [0.92, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.65, delay: reduceMotion ? 0 : 0.42 }}
            >
              <span className="block text-[0.62rem] uppercase tracking-[0.18em] text-white/50">Draw</span>
              <span style={{ color: colorToken(currentColor) }}>{drawMessage(animation)}</span>
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function normalizeDrawEvent(event: GameEvent): NormalizedDrawEvent | null {
  if (!isDrawEventType(event.type)) {
    return null;
  }

  const payload = isRecord(event.payload) ? event.payload : {};
  const playerId = getString(payload.playerId) ?? getString(payload.targetPlayerId);
  const count = getNumber(payload.count) ?? getNumber(payload.amount) ?? 0;
  if (!playerId || count <= 0) {
    return null;
  }

  return {
    id: event.id,
    playerId,
    count,
    reason: drawReason(event.type),
    color: getString(payload.color),
    createdAt: event.createdAt
  };
}

function isDrawEventType(type: string): boolean {
  return [
    "uno:draw",
    "uno:draw_two",
    "uno:wild_draw_four",
    "uno-no-mercy:draw",
    "uno-no-mercy:penalty_resolved",
    "uno-no-mercy:roulette"
  ].includes(type);
}

function drawReason(type: string): DrawReason {
  if (type.includes("roulette")) return "roulette";
  if (type.includes("draw_two") || type.includes("draw_four") || type.includes("penalty")) return "penalty";
  return "manual";
}

function drawMessage(animation: DrawAnimation): string {
  if (animation.reason === "roulette" && animation.color) {
    return `${animation.playerName} drew until ${animation.color}`;
  }
  return `${animation.playerName} drew ${animation.count} card${animation.count === 1 ? "" : "s"}`;
}

function getElementCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top - containerRect.top + rect.height / 2
  };
}

function getContainerCenter(container: HTMLElement): Point {
  return {
    x: container.clientWidth / 2,
    y: container.clientHeight / 2
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isTooOld(createdAt: string): boolean {
  const createdMs = Date.parse(createdAt);
  return Number.isFinite(createdMs) && Date.now() - createdMs > EVENT_MAX_AGE_MS;
}

function colorToken(color: string): string {
  return {
    red: "#ff8a80",
    yellow: "#ffe082",
    green: "#7dffa4",
    blue: "#7cc7ff"
  }[color] ?? "#7cc7ff";
}