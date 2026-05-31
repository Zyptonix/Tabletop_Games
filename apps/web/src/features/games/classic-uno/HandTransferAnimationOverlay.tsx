"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GameEvent } from "@tabletop/game-core";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

type SeatRefMap = Map<string, HTMLElement>;

interface Point {
  x: number;
  y: number;
}

interface PublicPlayerLabel {
  userId: string;
  displayName: string;
}

interface NormalizedZeroPass {
  id: string;
  type: "zero_pass";
  direction: 1 | -1;
  transfers: Array<{ fromPlayerId: string; toPlayerId: string; count: number }>;
  createdAt: string;
}

interface NormalizedSevenSwap {
  id: string;
  type: "seven_swap";
  fromPlayerId: string;
  toPlayerId: string;
  fromCount: number;
  toCount: number;
  createdAt: string;
}

type HandTransferEvent = NormalizedZeroPass | NormalizedSevenSwap;

interface AnimatingTransfer {
  id: string;
  from: Point;
  to: Point;
  fromPlayerName: string;
  toPlayerName: string;
  cardCount: number;
  direction: 1 | -1;
  kind: "zero_pass" | "seven_swap";
}

const EVENT_MAX_AGE_MS = 12_000;

export function HandTransferAnimationOverlay({
  events,
  players,
  containerRef,
  seatRefs,
  handDockRef,
  currentUserId,
  theme
}: {
  events: GameEvent[];
  players: PublicPlayerLabel[];
  containerRef: RefObject<HTMLElement | null>;
  seatRefs: RefObject<SeatRefMap>;
  handDockRef: RefObject<HTMLElement | null>;
  currentUserId: string | null;
  theme: CardThemeId;
}) {
  const reduceMotion = useReducedMotion();
  const processedRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number[]>([]);
  const [animations, setAnimations] = useState<AnimatingTransfer[]>([]);

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

      const transferEvent = normalizeTransferEvent(event);
      if (!transferEvent || isTooOld(transferEvent.createdAt)) continue;

      const nextAnimations = buildTransferAnimations({
        transferEvent,
        players,
        container,
        seatRefs: seatRefs.current,
        handDock: handDockRef.current,
        currentUserId
      });

      if (nextAnimations.length === 0) continue;

      setAnimations((current) => [...current, ...nextAnimations].slice(-18));

      const timeout = window.setTimeout(
        () => {
          const ids = new Set(nextAnimations.map((animation) => animation.id));
          setAnimations((current) => current.filter((item) => !ids.has(item.id)));
        },
        reduceMotion ? 900 : 1450
      );
      timeoutRef.current.push(timeout);
    }
  }, [containerRef, currentUserId, events, handDockRef, players, reduceMotion, seatRefs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[43] overflow-hidden">
      <AnimatePresence>
        {animations.map((animation) => {
          const midX = (animation.from.x + animation.to.x) / 2;
          const midY = Math.min(animation.from.y, animation.to.y) - (animation.kind === "seven_swap" ? 86 : 58);
          const sideNudge = animation.direction === 1 ? 34 : -34;

          return (
            <motion.div
              key={animation.id}
              className="absolute left-0 top-0"
              initial={{
                x: animation.from.x - 36,
                y: animation.from.y - 34,
                rotate: animation.direction * -8,
                scale: 0.78,
                opacity: 0
              }}
              animate={{
                x: [animation.from.x - 36, midX + sideNudge - 36, animation.to.x - 36],
                y: [animation.from.y - 34, midY - 34, animation.to.y - 34],
                rotate: [animation.direction * -8, animation.direction * 10, animation.direction * 4],
                scale: [0.78, 0.98, 0.84],
                opacity: [0, 1, 1, 0]
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: reduceMotion ? 0.72 : 1.12, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="relative h-24 w-[4.5rem] drop-shadow-[0_0_30px_rgb(45_140_255_/_0.36)]">
                <div className="absolute left-0 top-2 rotate-[-10deg] opacity-90">
                  <UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-20 w-[3.4rem] rounded-lg" />
                </div>
                <div className="absolute left-2 top-1 rotate-[1deg] opacity-95">
                  <UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-20 w-[3.4rem] rounded-lg" />
                </div>
                <div className="absolute left-4 top-0 rotate-[10deg]">
                  <UnoCard faceDown compact theme={theme} liftOnHover={false} className="h-20 w-[3.4rem] rounded-lg" />
                </div>

                <div className="absolute -bottom-1 right-0 rounded-full border border-white/25 bg-black/82 px-2 py-1 text-[0.66rem] font-black text-white shadow-[0_8px_18px_rgb(0_0_0_/_0.45)] backdrop-blur-md">
                  {animation.cardCount}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function buildTransferAnimations({
  transferEvent,
  players,
  container,
  seatRefs,
  handDock,
  currentUserId
}: {
  transferEvent: HandTransferEvent;
  players: PublicPlayerLabel[];
  container: HTMLElement;
  seatRefs: SeatRefMap;
  handDock: HTMLElement | null;
  currentUserId: string | null;
}): AnimatingTransfer[] {
  if (transferEvent.type === "zero_pass") {
    return transferEvent.transfers.map((transfer) =>
      makeAnimation({
        id: `${transferEvent.id}-${transfer.fromPlayerId}-${transfer.toPlayerId}`,
        kind: "zero_pass",
        fromPlayerId: transfer.fromPlayerId,
        toPlayerId: transfer.toPlayerId,
        count: transfer.count,
        direction: transferEvent.direction,
        players,
        container,
        seatRefs,
        handDock,
        currentUserId
      })
    );
  }

  return [
    makeAnimation({
      id: `${transferEvent.id}-a`,
      kind: "seven_swap",
      fromPlayerId: transferEvent.fromPlayerId,
      toPlayerId: transferEvent.toPlayerId,
      count: transferEvent.fromCount,
      direction: 1,
      players,
      container,
      seatRefs,
      handDock,
      currentUserId
    }),
    makeAnimation({
      id: `${transferEvent.id}-b`,
      kind: "seven_swap",
      fromPlayerId: transferEvent.toPlayerId,
      toPlayerId: transferEvent.fromPlayerId,
      count: transferEvent.toCount,
      direction: -1,
      players,
      container,
      seatRefs,
      handDock,
      currentUserId
    })
  ];
}

function makeAnimation({
  id,
  kind,
  fromPlayerId,
  toPlayerId,
  count,
  direction,
  players,
  container,
  seatRefs,
  handDock,
  currentUserId
}: {
  id: string;
  kind: "zero_pass" | "seven_swap";
  fromPlayerId: string;
  toPlayerId: string;
  count: number;
  direction: 1 | -1;
  players: PublicPlayerLabel[];
  container: HTMLElement;
  seatRefs: SeatRefMap;
  handDock: HTMLElement | null;
  currentUserId: string | null;
}): AnimatingTransfer {
  const fromElement = fromPlayerId === currentUserId ? handDock : seatRefs.get(fromPlayerId) ?? null;
  const toElement = toPlayerId === currentUserId ? handDock : seatRefs.get(toPlayerId) ?? null;
  const fromPlayer = players.find((player) => player.userId === fromPlayerId);
  const toPlayer = players.find((player) => player.userId === toPlayerId);

  return {
    id,
    from: getElementCenter(fromElement, container) ?? getContainerCenter(container),
    to: getElementCenter(toElement, container) ?? getContainerCenter(container),
    fromPlayerName: fromPlayer?.displayName ?? "Player",
    toPlayerName: toPlayer?.displayName ?? "Player",
    cardCount: count,
    direction,
    kind
  };
}

function normalizeTransferEvent(event: GameEvent): HandTransferEvent | null {
  if (!isTransferEventType(event.type)) return null;
  const payload = isRecord(event.payload) ? event.payload : {};

  if (event.type.includes("zero")) {
    const transfers = Array.isArray(payload.transfers) ? normalizeTransfers(payload.transfers) : [];
    if (transfers.length === 0) return null;

    return {
      id: event.id,
      type: "zero_pass",
      direction: normalizeDirection(payload.direction),
      transfers,
      createdAt: event.createdAt
    };
  }

  const fromPlayerId = getString(payload.fromPlayerId);
  const toPlayerId = getString(payload.toPlayerId);
  if (!fromPlayerId || !toPlayerId) return null;

  return {
    id: event.id,
    type: "seven_swap",
    fromPlayerId,
    toPlayerId,
    fromCount: getNumber(payload.fromCount) ?? 0,
    toCount: getNumber(payload.toCount) ?? 0,
    createdAt: event.createdAt
  };
}

function isTransferEventType(type: string): boolean {
  return [
    "uno:zero_pass",
    "uno:zero_hands_passed",
    "uno:seven_swap",
    "uno:seven_hands_swapped",
    "uno-no-mercy:zero_pass",
    "uno-no-mercy:zero_hands_passed",
    "uno-no-mercy:seven_swap",
    "uno-no-mercy:seven_hands_swapped"
  ].includes(type);
}

function normalizeTransfers(value: unknown[]): Array<{ fromPlayerId: string; toPlayerId: string; count: number }> {
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const fromPlayerId = getString(item.fromPlayerId);
    const toPlayerId = getString(item.toPlayerId);
    const count = getNumber(item.count) ?? getNumber(item.cardCount) ?? 0;
    return fromPlayerId && toPlayerId ? [{ fromPlayerId, toPlayerId, count }] : [];
  });
}

function normalizeDirection(value: unknown): 1 | -1 {
  if (value === -1 || value === "counterclockwise") return -1;
  return 1;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
