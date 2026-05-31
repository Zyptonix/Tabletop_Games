"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

type SeatRefMap = Map<string, HTMLElement>;
type DrawReason = "normal_draw" | "draw_until_playable" | "penalty" | "stack_penalty" | "roulette";

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
  revealedCards?: RenderableCard[] | undefined;
  chosenColor?: string | undefined;
  matchedCardId?: string | undefined;
  pendingAmount?: number | undefined;
  actuallyDrawn?: number | undefined;
  createdAt: string;
}

interface DrawAnimation extends NormalizedDrawEvent {
  playerName: string;
  from: Point;
  to: Point;
  visibleCards: number;
  overflowCount: number;
}

const MAX_FLYING_CARDS = 12;
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
    if (!container) return;

    for (const event of events) {
      if (processedRef.current.has(event.id)) continue;
      processedRef.current.add(event.id);

      const normalized = normalizeDrawEvent(event);
      if (!normalized || normalized.count <= 0 || isTooOld(normalized.createdAt)) continue;

      const targetPlayer = players.find((player) => player.userId === normalized.playerId);
      const from = getElementCenter(drawPileRef.current, container) ?? getContainerCenter(container);
      const destinationElement =
        normalized.playerId === currentUserId ? handDockRef.current : seatRefs.current.get(normalized.playerId);
      const to = getElementCenter(destinationElement ?? null, container) ?? getContainerCenter(container);
      const visibleCards = reduceMotion
        ? 0
        : Math.min(normalized.reason === "roulette" ? normalized.count : MAX_FLYING_CARDS, normalized.count);

      const animation: DrawAnimation = {
        ...normalized,
        playerName: normalized.playerId === currentUserId ? "You" : targetPlayer?.displayName ?? "A player",
        from,
        to,
        visibleCards,
        overflowCount: Math.max(0, normalized.count - visibleCards)
      };

      setAnimations((current) => [...current, animation].slice(-8));

      const staggerMs = reduceMotion ? 0 : visibleCards * 65;
      const timeout = window.setTimeout(
        () => setAnimations((current) => current.filter((item) => item.id !== animation.id)),
        (reduceMotion ? 1300 : 1900) + staggerMs
      );
      timeoutRef.current.push(timeout);
    }
  }, [containerRef, currentUserId, drawPileRef, events, handDockRef, players, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[44] overflow-hidden">
      <AnimatePresence>
        {animations.map((animation) => (
          <div key={animation.id}>
            {Array.from({ length: animation.visibleCards }).map((_, index) => {
              const isRoulette = animation.reason === "roulette";
              const card = isRoulette ? animation.revealedCards?.[index] : undefined;
              const isMatchedCard = isRoulette && card?.id === animation.matchedCardId;
              const midX = (animation.from.x + animation.to.x) / 2 + (index % 2 === 0 ? -30 : 30);
              const midY = Math.min(animation.from.y, animation.to.y) - 95 - index * 3;
              const delay = animation.count > MAX_FLYING_CARDS ? index * 0.045 : index * 0.07;

              return (
                <motion.div
                  key={`${animation.id}-${index}`}
                  className="absolute left-0 top-0"
                  initial={{ x: animation.from.x - 26, y: animation.from.y - 38, rotate: -8, scale: 0.78, opacity: 0 }}
                  animate={{
                    x: [animation.from.x - 26, midX - 26, animation.to.x - 20],
                    y: [animation.from.y - 38, midY - 38, animation.to.y - 30],
                    rotate: [-8, index % 2 === 0 ? 14 : -16, index % 2 === 0 ? 7 : -7],
                    scale: [0.78, 0.92, 0.42],
                    opacity: [0, 1, 0.92, 0]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ delay, duration: 0.82, ease: [0.19, 0.88, 0.25, 1] }}
                >
                  <div
                    className={
                      isMatchedCard
                        ? "drop-shadow-[0_0_34px_rgb(163_230_53_/_0.75)]"
                        : isRoulette
                          ? "drop-shadow-[0_0_28px_rgb(45_140_255_/_0.52)]"
                          : "drop-shadow-[0_0_22px_rgb(45_140_255_/_0.42)]"
                    }
                  >
                    <UnoCard faceDown compact theme={theme} className="h-[4.75rem] w-[3.2rem] rounded-xl ring-1 ring-white/20" />
                  </div>
                </motion.div>
              );
            })}

            <motion.div
              className="absolute rounded-2xl border border-white/12 bg-black/70 px-3 py-2 text-center text-xs font-black text-white shadow-[0_0_28px_rgb(0_0_0_/_0.45)] backdrop-blur-xl"
              style={{ left: animation.to.x - 64, top: animation.to.y - 96 }}
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, -4, -8], scale: [0.92, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.55, delay: reduceMotion ? 0 : 0.38 }}
            >
              <span className="block text-[0.62rem] uppercase tracking-[0.18em] text-white/50">
                {animation.reason === "roulette" ? "Roulette" : animation.reason.includes("penalty") ? "Penalty" : "Draw"}
              </span>
              <span style={{ color: colorToken(animation.chosenColor ?? currentColor) }}>{drawMessage(animation)}</span>
              {animation.overflowCount > 0 ? (
                <span className="mt-1 block rounded-full border border-sky-200/15 bg-sky-400/10 px-2 py-0.5 text-[0.64rem] text-sky-100">
                  +{animation.overflowCount} more
                </span>
              ) : null}
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function normalizeDrawEvent(event: GameEvent): NormalizedDrawEvent | null {
  if (!isDrawEventType(event.type)) return null;

  const payload = isRecord(event.payload) ? event.payload : {};
  const actorPlayerId = getString(payload.playerId);
  const targetPlayerId = getString(payload.targetPlayerId);
  const playerId = event.type.includes("roulette") ? targetPlayerId ?? actorPlayerId : actorPlayerId ?? targetPlayerId;
  const actuallyDrawn = getNumber(payload.actuallyDrawn);
  const count = actuallyDrawn ?? getNumber(payload.count) ?? getNumber(payload.amount) ?? 0;
  if (!playerId || count <= 0) return null;

  const reason = drawReason(event.type, getString(payload.source));
  const revealedCards = Array.isArray(payload.revealedCards) ? (payload.revealedCards as RenderableCard[]) : undefined;
  const cards = Array.isArray(payload.cards) ? (payload.cards as RenderableCard[]) : undefined;

  return {
    id: event.id,
    playerId,
    count,
    reason,
    color: getString(payload.color),
    revealedCards: reason === "roulette" ? revealedCards ?? cards : undefined,
    chosenColor: getString(payload.chosenColor),
    matchedCardId: getString(payload.matchedCardId),
    pendingAmount: getNumber(payload.pendingAmount),
    actuallyDrawn,
    createdAt: event.createdAt
  };
}

function isDrawEventType(type: string): boolean {
  return [
    "uno:draw",
    "uno:draw_two",
    "uno:wild_draw_four",
    "uno:cards_drawn",
    "uno-no-mercy:draw",
    "uno-no-mercy:penalty_resolved",
    "uno-no-mercy:cards_drawn",
    "uno-no-mercy:color_roulette_resolved"
  ].includes(type);
}

function drawReason(type: string, source?: string): DrawReason {
  if (source === "roulette" || type.includes("roulette")) return "roulette";
  if (source === "draw_until_playable") return "draw_until_playable";
  if (source === "stack" || source === "stack_penalty" || type.includes("penalty")) return "stack_penalty";
  if (type.includes("draw_two") || type.includes("draw_four")) return "penalty";
  return "normal_draw";
}

function drawMessage(animation: DrawAnimation): string {
  const noun = animation.count === 1 ? "card" : "cards";
  if (animation.reason === "roulette" && animation.chosenColor) {
    return `${animation.playerName} drew ${animation.count} ${noun} for ${animation.chosenColor}`;
  }
  return `${animation.playerName} drew ${animation.count} ${noun}`;
}

function isTooOld(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > EVENT_MAX_AGE_MS;
}

function getElementCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top - containerRect.top + rect.height / 2
  };
}

function getContainerCenter(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

function colorToken(color: string): string {
  const colorMap: Record<string, string> = {
    red: "rgb(254, 202, 202)",
    yellow: "rgb(254, 240, 138)",
    green: "rgb(187, 247, 208)",
    blue: "rgb(186, 230, 253)"
  };
  return colorMap[color] ?? "rgb(186, 230, 253)";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
