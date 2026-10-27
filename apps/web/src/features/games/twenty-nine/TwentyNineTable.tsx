"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Copy,
  Crown,
  Eye,
  Flag,
  LogOut,
  MessageSquare,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X
} from "lucide-react";
import type {
  GameEvent,
  PublicTwentyNinePlayer,
  PublicTwentyNineState,
  TwentyNineAction,
  TwentyNineCard,
  TwentyNineSuit
} from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { cn } from "@/lib/utils/cn";
import {
  SuitMark,
  TwentyNineCardFace,
  TwentyNineCardBack,
  TWENTY_NINE_SUITS_INFO
} from "./TwentyNineCard";
import { TwentyNineSeat } from "./TwentyNineSeat";
import { TwentyNineTrickArea } from "./TwentyNineTrickArea";
import { TwentyNineHUD } from "./TwentyNineHUD";
import { TwentyNineEventOverlay } from "./TwentyNineEventOverlay";

type Point = { x: number; y: number };
type Flight = {
  id: string;
  card: TwentyNineCard;
  from: Point;
  to: Point;
  kind: "play" | "collect";
  playerName: string;
  delay?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function actionsOfType(
  legalActions: unknown[],
  type: TwentyNineAction["type"]
): TwentyNineAction[] {
  return legalActions.filter(
    (item): item is TwentyNineAction => isRecord(item) && item.type === type
  );
}

function hasAction(legalActions: unknown[], type: TwentyNineAction["type"]): boolean {
  return actionsOfType(legalActions, type).length > 0;
}

function playerName(
  state: PublicTwentyNineState,
  playerId: string | null | undefined,
  currentUserId: string | null
): string {
  if (!playerId) return "Player";
  if (playerId === currentUserId) return "You";
  return state.players.find((p) => p.userId === playerId)?.displayName ?? "Player";
}

function getCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  return {
    x: rect.left - bounds.left + rect.width / 2,
    y: rect.top - bounds.top + rect.height / 2
  };
}

function centerOf(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

const CARD_SUIT_ORDER: Record<TwentyNineSuit, number> = {
  spades: 0,
  clubs: 1,
  hearts: 2,
  diamonds: 3
};

const CARD_RANK_ORDER: Record<string, number> = {
  J: 0,
  "9": 1,
  A: 2,
  "10": 3,
  K: 4,
  Q: 5,
  "8": 6,
  "7": 7
};

function formatEventLog(
  event: GameEvent,
  state: PublicTwentyNineState,
  currentUserId: string | null
): { label: string; tone: "emerald" | "sky" | "amber" | "violet" | "rose" | "muted" } | null {
  const payload = isRecord(event.payload) ? event.payload : {};

  if (event.type === "twenty-nine:card_played") {
    const card = isRecord(payload.card) ? payload.card : {};
    const cardText = `${String(card.rank ?? "")} of ${String(card.suit ?? "")}`;
    return {
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} played ${cardText}`,
      tone: "sky"
    };
  }
  if (event.type === "twenty-nine:bid") {
    return {
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} bid ${String(payload.value ?? "")}`,
      tone: "amber"
    };
  }
  if (event.type === "twenty-nine:ditto") {
    return {
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} called Ditto (${String(payload.value ?? "")})`,
      tone: "violet"
    };
  }
  if (event.type === "twenty-nine:pass_bid") {
    return {
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} passed the bid`,
      tone: "muted"
    };
  }
  if (event.type === "twenty-nine:trump_revealed") {
    return {
      label: `Trump revealed: ${String(payload.trumpSuit ?? state.trumpSuit ?? "revealed")}`,
      tone: "emerald"
    };
  }
  if (event.type === "twenty-nine:pair") {
    return {
      label: `Pair declared! Target adjusted by 4`,
      tone: "violet"
    };
  }
  if (event.type === "twenty-nine:trick_won") {
    const winnerId = String(payload.winnerPlayerId ?? "");
    const winnerTeam = state.players.find((p) => p.userId === winnerId)?.team;
    return {
      label: `${playerName(state, winnerId, currentUserId)} captured trick ${String(payload.trickNumber ?? "")} (+${String(payload.points ?? 0)} pts)`,
      tone: winnerTeam === 0 ? "rose" : "sky"
    };
  }
  if (event.type === "twenty-nine:single_hand_declared") {
    return {
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} declared Single Hand (±3)`,
      tone: "violet"
    };
  }
  if (event.type === "twenty-nine:double" || event.type === "twenty-nine:redouble") {
    return {
      label: `Stakes multiplied to ×${state.multiplier}!`,
      tone: "rose"
    };
  }
  if (event.type === "twenty-nine:hand_scored") {
    return {
      label: `Hand #${state.handNumber} concluded and scored.`,
      tone: "amber"
    };
  }
  if (event.type === "twenty-nine:game_over") {
    return {
      label: event.message ?? "Match finished!",
      tone: "amber"
    };
  }
  if (event.type.startsWith("twenty-nine:") && event.message) {
    return { label: event.message, tone: "muted" };
  }
  return null;
}

function TrickProgressWidget({
  team,
  count,
  caption
}: {
  team: number;
  count: number;
  caption: string;
}) {
  const clampedCount = Math.max(0, Math.min(8, count));
  const redTeam = team === 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-1.5 backdrop-blur-md shadow-lg",
        redTeam ? "border-rose-400/30 bg-rose-950/70" : "border-sky-400/30 bg-sky-950/70"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className={cn(
            "text-[0.62rem] font-black uppercase tracking-wider",
            redTeam ? "text-rose-200" : "text-sky-200"
          )}
        >
          {caption}
        </span>
        <strong className="text-xs font-black tabular-nums text-white">
          {clampedCount}
          <span className="text-[0.58rem] text-white/40">/8</span>
        </strong>
      </div>

      <div className="grid grid-cols-8 gap-1 w-36 sm:w-40">
        {Array.from({ length: 8 }, (_, index) => {
          const earned = index < clampedCount;
          return (
            <div
              key={`${team}-trick-${index}`}
              className={cn(
                "relative aspect-[0.715] min-w-0 overflow-hidden rounded-[0.2rem] transition-all",
                earned
                  ? redTeam
                    ? "ring-1 ring-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    : "ring-1 ring-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                  : "border border-dashed border-white/20 bg-white/[0.04]"
              )}
            >
              {earned ? (
                <TwentyNineCardBack small className="h-full w-full rounded-[0.2rem] border-0 shadow-none" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TwentyNineTable({
  room,
  state,
  legalActions,
  gameEvents = [],
  currentUserId,
  onAction,
  onChat,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicTwentyNineState;
  legalActions: unknown[];
  gameEvents?: GameEvent[];
  currentUserId: string | null;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Map<string, HTMLElement>>(new Map());
  const processedEvents = useRef<Set<string>>(new Set());
  const timeoutRefs = useRef<number[]>([]);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  // 4 Players: Always exactly 4
  const me = state.players.find((p) => p.userId === currentUserId);
  const opponents = useMemo(
    () => state.players.filter((p) => p.userId !== currentUserId),
    [state.players, currentUserId]
  );
  const partner = opponents.find((p) => me && p.team === me.team);

  // Relative seating: 0 = local, 1 = right, 2 = partner, 3 = left
  const westPlayer = useMemo(() => {
    if (!me) return null;
    return opponents.find((p) => p.team !== me.team && (p.seat - me.seat + 4) % 4 === 3) ?? null;
  }, [opponents, me]);

  const eastPlayer = useMemo(() => {
    if (!me) return null;
    return opponents.find((p) => p.team !== me.team && (p.seat - me.seat + 4) % 4 === 1) ?? null;
  }, [opponents, me]);

  const isMyTurn = state.currentPlayerId === currentUserId;
  const currentTurnName = playerName(state, state.currentPlayerId, currentUserId);

  const singleHandCaller = state.players.find((p) => p.userId === state.singleHandPlayerId) ?? null;
  const sittingOutSingleHand = Boolean(
    singleHandCaller && me && me.userId !== singleHandCaller.userId && me.team === singleHandCaller.team
  );

  // Hand cards sorted cleanly
  const sortedHand = useMemo(() => {
    return (me?.hand ?? []).slice().sort((a, b) => {
      const suitDiff = CARD_SUIT_ORDER[a.suit] - CARD_SUIT_ORDER[b.suit];
      if (suitDiff !== 0) return suitDiff;
      const rankDiff = (CARD_RANK_ORDER[a.rank] ?? 99) - (CARD_RANK_ORDER[b.rank] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    });
  }, [me?.hand]);

  // Legal actions
  const legalPlayIds = useMemo(
    () =>
      new Set(
        actionsOfType(legalActions, "play_card").map((a) =>
          a.type === "play_card" ? a.cardId : ""
        )
      ),
    [legalActions]
  );

  const legalBidValues = useMemo(
    () =>
      actionsOfType(legalActions, "bid")
        .flatMap((a) => (a.type === "bid" ? [a.value] : []))
        .sort((a, b) => a - b),
    [legalActions]
  );
  const lowestLegalBid = legalBidValues[0] ?? null;
  const highestLegalBid = legalBidValues[legalBidValues.length - 1] ?? null;

  const selectedBidValue =
    lowestLegalBid !== null && highestLegalBid !== null
      ? Math.min(highestLegalBid, Math.max(lowestLegalBid, selectedBid ?? lowestLegalBid))
      : null;

  useEffect(() => {
    if (lowestLegalBid === null || highestLegalBid === null) {
      setSelectedBid(null);
      return;
    }
    setSelectedBid((curr) =>
      curr === null ? lowestLegalBid : Math.min(highestLegalBid, Math.max(lowestLegalBid, curr))
    );
  }, [lowestLegalBid, highestLegalBid]);

  // Activity log rows
  const formattedLog = useMemo(
    () =>
      gameEvents
        .map((event) => ({ event, row: formatEventLog(event, state, currentUserId) }))
        .filter((entry): entry is { event: GameEvent; row: NonNullable<ReturnType<typeof formatEventLog>> } => entry.row !== null)
        .slice(-30)
        .reverse(),
    [gameEvents, state, currentUserId]
  );

  useEffect(() => {
    return () => {
      for (const t of timeoutRefs.current) window.clearTimeout(t);
      timeoutRefs.current = [];
    };
  }, []);

  // Card Flight Animations
  useEffect(() => {
    const container = tableRef.current;
    if (!container) return;

    for (const event of gameEvents) {
      if (processedEvents.current.has(event.id)) continue;
      processedEvents.current.add(event.id);

      if (Date.now() - new Date(event.createdAt).getTime() > 10000) continue;
      const payload = isRecord(event.payload) ? event.payload : {};

      if (event.type.endsWith(":card_played")) {
        const cardData = isRecord(payload.card) ? payload.card : null;
        const playerId = typeof payload.playerId === "string" ? payload.playerId : null;
        if (!cardData || !playerId || typeof cardData.id !== "string") continue;

        const card = cardData as unknown as TwentyNineCard;
        const fromElement =
          playerId === currentUserId ? handRef.current : seatRefs.current.get(playerId) ?? null;
        const from = getCenter(fromElement, container) ?? centerOf(container);
        const to = centerOf(container);
        const name = playerName(state, playerId, currentUserId);

        const flight: Flight = {
          id: event.id,
          card,
          from,
          to,
          kind: "play",
          playerName: name
        };

        setFlights((curr) => [...curr, flight].slice(-8));
        const timeout = window.setTimeout(
          () => {
            setFlights((curr) => curr.filter((item) => item.id !== flight.id));
            timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeout);
          },
          reduceMotion ? 350 : 800
        );
        timeoutRefs.current.push(timeout);
        continue;
      }

      if (event.type.endsWith(":trick_won")) {
        const winnerId = typeof payload.winnerPlayerId === "string" ? payload.winnerPlayerId : null;
        const playedCards = Array.isArray(payload.cards) ? payload.cards : [];
        if (!winnerId || playedCards.length === 0) continue;

        const from = centerOf(container);
        const to =
          getCenter(seatRefs.current.get(winnerId) ?? null, container) ?? centerOf(container);

        const arrivals: Flight[] = playedCards.slice(0, 4).flatMap((played, index) => {
          if (!isRecord(played) || !isRecord(played.card)) return [];
          const cardData = played.card;
          if (typeof cardData.id !== "string") return [];
          return [
            {
              id: `${event.id}-${index}-${cardData.id}`,
              card: cardData as unknown as TwentyNineCard,
              from: {
                x: from.x + (index - 1.5) * 12,
                y: from.y + (index % 2 === 0 ? 4 : -4)
              },
              to: { x: to.x + (index - 1.5) * 6, y: to.y },
              kind: "collect" as const,
              playerName: playerName(state, winnerId, currentUserId),
              delay: reduceMotion ? 0 : 0.5
            }
          ];
        });

        if (arrivals.length === 0) continue;
        const arrivalIds = new Set(arrivals.map((f) => f.id));
        setFlights((curr) => [...curr, ...arrivals].slice(-8));

        const timeout = window.setTimeout(
          () => {
            setFlights((curr) => curr.filter((item) => !arrivalIds.has(item.id)));
            timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeout);
          },
          reduceMotion ? 400 : 1400
        );
        timeoutRefs.current.push(timeout);
      }
    }
  }, [gameEvents, currentUserId, reduceMotion, state]);

  function registerSeat(playerId: string, el: HTMLDivElement | null) {
    if (el) seatRefs.current.set(playerId, el);
    else seatRefs.current.delete(playerId);
  }

  function play(card: TwentyNineCard) {
    if (!legalPlayIds.has(card.id)) return;
    onAction("play_card", { cardId: card.id });
  }

  const onlineCount = room.players.filter((p) => p.connected).length;
  const isDittoLegal = hasAction(legalActions, "ditto");

  return (
    <div className="twenty-nine-shell tt-game-viewport fixed inset-0 z-10 flex h-[100dvh] w-screen overflow-hidden text-white select-none">
      {/* Background Ambience & Grain */}
      <div className="twenty-nine-grain pointer-events-none absolute inset-0 z-0" />
      <div className="twenty-nine-orbit-outer z-0" />
      <div className="twenty-nine-orbit-inner z-0" />

      {/* MAIN ARENA COLUMN - Resizes smoothly when chat panel opens */}
      <div className="relative z-10 flex flex-1 min-w-0 flex-col justify-between p-2.5 sm:p-3 transition-all duration-300">
        {/* TOP HEADER */}
        <header className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 shadow-2xl backdrop-blur-xl">
          {/* Logo & Game Title */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <span className="text-base font-black text-emerald-300">29</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
                  Twenty-Nine
                </h1>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[0.62rem] font-black text-emerald-300">
                  Hand #{state.handNumber}
                </span>
              </div>
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/40">
                Bangladesh Arena · 4 Players
              </p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/15 hover:text-white"
              title="Rules & Point Values"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/15 hover:text-white"
              title="Copy Room Code"
            >
              <Copy className="h-4 w-4" />
            </button>

            {/* Toggle Side Drawer (Chat & Log) */}
            <button
              type="button"
              onClick={() => setSidePanelOpen((v) => !v)}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-xl border transition",
                sidePanelOpen
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                  : "border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/15 hover:text-white"
              )}
              title="Activity Log & Chat"
            >
              <MessageSquare className="h-4 w-4" />
              {formattedLog.length > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[0.55rem] font-black text-black">
                  {Math.min(formattedLog.length, 9)}
                </span>
              ) : null}
            </button>

            {/* End Match (Host only) */}
            {onEndMatch && room.effectiveHostUserId === currentUserId ? (
              <button
                type="button"
                onClick={() => onEndMatch(room.id)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                title="End Match"
              >
                <Flag className="h-4 w-4" />
              </button>
            ) : null}

            {/* Leave Room */}
            <button
              type="button"
              onClick={() => globalThis.location.assign("/dashboard")}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/50 transition hover:bg-white/15 hover:text-white"
              title="Leave Room"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* TOP HUD SCOREBOARD */}
        <div className="mt-1.5 shrink-0">
          <TwentyNineHUD state={state} currentUserId={currentUserId} />
        </div>

        {/* CENTER ARENA: FELT STADIUM TABLE */}
        <main
          ref={tableRef}
          className="twenty-nine-stadium-table relative my-1.5 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[2.5rem] p-3 overflow-hidden"
        >
          {/* North Partner Seat - Placed more towards the middle (left ~32%) so it doesn't overlap with Left Seat or Center Trick */}
          {partner ? (
            <div
              ref={(el) => registerSeat(partner.userId, el)}
              className="absolute top-3 left-[28%] sm:left-[32%] -translate-x-1/2 z-20"
            >
              <TwentyNineSeat
                player={partner}
                roomPlayer={room.players.find((p) => p.userId === partner.userId)}
                roleLabel="🤝 Teammate"
                isDealer={state.dealerPlayerId === partner.userId}
                isDeclarer={state.declarerId === partner.userId}
                isSingleHand={state.singleHandPlayerId === partner.userId}
                isSittingOut={
                  singleHandCaller !== null &&
                  singleHandCaller.userId !== partner.userId &&
                  singleHandCaller.team === partner.team
                }
              />
            </div>
          ) : null}

          {/* West Left Opponent Seat */}
          {westPlayer ? (
            <div
              ref={(el) => registerSeat(westPlayer.userId, el)}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20"
            >
              <TwentyNineSeat
                player={westPlayer}
                roomPlayer={room.players.find((p) => p.userId === westPlayer.userId)}
                roleLabel="⚔️ Opponent"
                isDealer={state.dealerPlayerId === westPlayer.userId}
                isDeclarer={state.declarerId === westPlayer.userId}
                isSingleHand={state.singleHandPlayerId === westPlayer.userId}
              />
            </div>
          ) : null}

          {/* East Right Opponent Seat */}
          {eastPlayer ? (
            <div
              ref={(el) => registerSeat(eastPlayer.userId, el)}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20"
            >
              <TwentyNineSeat
                player={eastPlayer}
                roomPlayer={room.players.find((p) => p.userId === eastPlayer.userId)}
                roleLabel="⚔️ Opponent"
                isDealer={state.dealerPlayerId === eastPlayer.userId}
                isDeclarer={state.declarerId === eastPlayer.userId}
                isSingleHand={state.singleHandPlayerId === eastPlayer.userId}
              />
            </div>
          ) : null}

          {/* CENTER TRICK ARENA (Enlarged Compass Cards, Points & Crown) */}
          <div className="relative z-10">
            <TwentyNineTrickArea
              trick={state.currentTrick}
              state={state}
              currentUserId={currentUserId}
            />
          </div>

          {/* Flight Animations Overlay */}
          <AnimatePresence initial={false}>
            {flights.map((flight) => {
              const midX = (flight.from.x + flight.to.x) / 2;
              const midY =
                Math.min(flight.from.y, flight.to.y) - (flight.kind === "collect" ? 40 : 60);

              return (
                <motion.div
                  key={flight.id}
                  className="pointer-events-none absolute left-0 top-0 z-[60] drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
                  initial={{
                    x: flight.from.x - 28,
                    y: flight.from.y - 40,
                    scale: 0.75,
                    opacity: 0,
                    rotate: -10
                  }}
                  animate={
                    reduceMotion
                      ? { opacity: [0, 1, 0] }
                      : {
                          x: [flight.from.x - 28, midX - 28, flight.to.x - 28],
                          y: [flight.from.y - 40, midY - 40, flight.to.y - 40],
                          scale: [0.75, 1.05, 0.7],
                          rotate: [-10, 8, 0],
                          opacity: [0, 1, 1, 0]
                        }
                  }
                  exit={{ opacity: 0 }}
                  transition={{
                    delay: flight.delay ?? 0,
                    duration: reduceMotion ? 0.3 : 0.75,
                    ease: [0.18, 0.86, 0.24, 1]
                  }}
                >
                  <TwentyNineCardFace card={flight.card} size="sm" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </main>

        {/* BOTTOM DOCK: ACTIONS & PLAYER'S HAND */}
        <footer className="shrink-0 flex flex-col items-center gap-2">
          {/* CONTEXTUAL ACTION BAR */}
          <div className="z-30 flex flex-wrap items-center justify-center gap-2">
            {/* AUCTION BIDDING BAR */}
            {state.phase === "bidding" && isMyTurn && !sittingOutSingleHand ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/40 bg-black/85 px-4 py-2 shadow-2xl backdrop-blur-xl">
                {selectedBidValue !== null && lowestLegalBid !== null && highestLegalBid !== null ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedBidValue <= lowestLegalBid}
                      onClick={() => setSelectedBid(Math.max(lowestLegalBid, selectedBidValue - 1))}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg font-black text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      −
                    </button>

                    <div className="px-3 text-center">
                      <span className="block text-[0.6rem] font-black uppercase tracking-widest text-amber-300/70">
                        Bid Value
                      </span>
                      <span className="text-xl font-black text-amber-300 leading-tight">
                        {selectedBidValue}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={selectedBidValue >= highestLegalBid}
                      onClick={() => setSelectedBid(Math.min(highestLegalBid, selectedBidValue + 1))}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg font-black text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => onAction("bid", { value: selectedBidValue })}
                      className="rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-black text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] transition hover:scale-105 active:scale-95"
                    >
                      Bid {selectedBidValue}
                    </button>
                  </div>
                ) : null}

                {/* PROMINENT DITTO BUTTON (Always visible; enabled when legal) */}
                <button
                  type="button"
                  disabled={!isDittoLegal}
                  onClick={() => onAction("ditto")}
                  title={
                    isDittoLegal
                      ? `Call Ditto to match the current bid (${state.currentBid})`
                      : state.currentBid === null
                      ? "Ditto is only available to match an opponent's existing bid"
                      : "Ditto is only available for the opening team to match an opposing bid"
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black transition",
                    isDittoLegal
                      ? "border-violet-400/60 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.55)] hover:scale-105 active:scale-95 cursor-pointer"
                      : "border-white/10 bg-white/[0.04] text-white/35 cursor-not-allowed"
                  )}
                >
                  <span>🤝 Ditto</span>
                  {state.currentBid !== null ? (
                    <span className="text-[0.68rem] opacity-80">({state.currentBid})</span>
                  ) : null}
                </button>

                {/* PASS BUTTON */}
                <button
                  type="button"
                  onClick={() => onAction("pass_bid")}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white/80 transition hover:bg-white/20 active:scale-95"
                >
                  Pass
                </button>
              </div>
            ) : null}

            {/* TRUMP SELECTION BUTTONS */}
            {state.phase === "trump" && isMyTurn ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/40 bg-black/85 px-4 py-2 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 mr-1">
                  Choose Trump:
                </span>
                {(["spades", "hearts", "diamonds", "clubs"] as TwentyNineSuit[]).map((suit) => {
                  const info = TWENTY_NINE_SUITS_INFO[suit];
                  return (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => onAction("choose_trump_suit", { suit })}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-black text-white transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95"
                    >
                      <SuitMark suit={suit} size={18} />
                      <span>{info?.label}</span>
                    </button>
                  );
                })}

                {hasAction(legalActions, "choose_seventh_trump") ? (
                  <button
                    type="button"
                    onClick={() => onAction("choose_seventh_trump")}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>7th Card Trump</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* DOUBLING & REDOUBLING */}
            {state.phase === "doubling" && isMyTurn ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-500/40 bg-black/85 px-4 py-2 shadow-2xl backdrop-blur-xl">
                {!state.doubleByPlayerId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onAction("pass_double")}
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/20"
                    >
                      Pass Double
                    </button>
                    <button
                      type="button"
                      onClick={() => onAction("double")}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-400/60 bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-black text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95"
                    >
                      <Swords className="h-4 w-4" />
                      Double Stakes (×2)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onAction("continue_contract")}
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/20"
                    >
                      Continue ×2
                    </button>
                    <button
                      type="button"
                      onClick={() => onAction("redouble")}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-400/60 bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-black text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95"
                    >
                      <Swords className="h-4 w-4" />
                      Redouble (×4)
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {/* IN-GAME PLAYING ACTIONS */}
            {state.phase === "playing" ? (
              <div className="flex flex-wrap items-center gap-2">
                {hasAction(legalActions, "reveal_trump") && isMyTurn ? (
                  <button
                    type="button"
                    onClick={() => onAction("reveal_trump")}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-400/60 bg-emerald-600/30 px-4 py-2 text-xs font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.4)] transition hover:bg-emerald-600/50 active:scale-95"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Trump
                  </button>
                ) : null}

                {hasAction(legalActions, "declare_pair") ? (
                  <button
                    type="button"
                    onClick={() => onAction("declare_pair")}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-600/30 px-4 py-2 text-xs font-black text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.4)] transition hover:bg-amber-600/50 active:scale-95"
                  >
                    <Crown className="h-4 w-4" />
                    Declare Pair (±4)
                  </button>
                ) : null}

                {hasAction(legalActions, "declare_single_hand") ? (
                  <button
                    type="button"
                    onClick={() => onAction("declare_single_hand")}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-400/60 bg-violet-600/30 px-4 py-2 text-xs font-black text-violet-200 shadow-[0_0_18px_rgba(168,85,247,0.4)] transition hover:bg-violet-600/50 active:scale-95"
                  >
                    <Crown className="h-4 w-4" />
                    Single Hand (±3)
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* WAITING FOR ANOTHER PLAYER INDICATOR */}
            {!isMyTurn && state.phase !== "finished" && !hasAction(legalActions, "declare_single_hand") ? (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-1 text-xs font-bold text-white/50 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Waiting for {currentTurnName}…</span>
              </div>
            ) : null}
          </div>

          {/* Bottom Dock Row: [Tricks Won Tracker] -- [Player Hand Fan] -- [Card Points Panel] */}
          <div className="flex w-full items-end justify-center gap-2.5 sm:gap-3.5 max-w-[96rem]">
            {/* Left Side: Dedicated Tricks Won Panel (Red & Blue 8 Slots) */}
            <div className="hidden lg:flex flex-col justify-between shrink-0 rounded-2xl border border-white/10 bg-black/75 p-3 shadow-2xl backdrop-blur-xl w-[14rem] sm:w-[15.5rem] self-stretch">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/60">
                  Tricks Won (8 Max)
                </span>
                <span className="text-[0.62rem] font-black text-emerald-400">
                  {state.completedTricks.length}/8 Done
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <TrickProgressWidget team={0} count={state.tricksWonByTeam["0"]} caption="Team Red" />
                <TrickProgressWidget team={1} count={state.tricksWonByTeam["1"]} caption="Team Blue" />
              </div>
            </div>

            {/* Center: Local Player Hand Fan (Enlarged Cards) */}
            <section
              ref={handRef}
              className="relative z-40 flex flex-1 min-w-0 max-w-4xl flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/75 px-4 py-2 shadow-2xl backdrop-blur-xl"
            >
              {/* Local Player Info Bar */}
              <div className="mb-1 flex w-full items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full shadow-md",
                      me?.team === 0 ? "bg-rose-400 shadow-rose-500/50" : "bg-sky-400 shadow-sky-500/50"
                    )}
                  />
                  <span className="font-black text-white">{me?.displayName ?? "Your Hand"}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">
                    {(me?.hand?.length ?? 0) + (state.privateSeventhCard ? 1 : 0)} cards in hand
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-white/50 text-[0.68rem]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Follow lead suit when possible</span>
                </div>
              </div>

              {/* Cards Fan or Sitting Out */}
              {sittingOutSingleHand ? (
                <div className="flex min-h-[7rem] flex-col items-center justify-center p-3 text-center">
                  <p className="text-sm font-black text-violet-200">
                    Sitting out — Partner is playing Single Hand alone!
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Teammate must win all 8 tricks alone. Your hand stays out of play.
                  </p>
                </div>
              ) : (
                <div className="relative flex min-h-[10.5rem] items-end justify-center overflow-visible pb-1 pt-3">
                  {sortedHand.map((card, index) => {
                    const canPlay = legalPlayIds.has(card.id) && isMyTurn && state.phase === "playing";
                    const offset = index - (sortedHand.length - 1) / 2;
                    const rotateDeg = offset * 2.5;
                    const translateY = Math.abs(offset) * 3;

                    return (
                      <motion.button
                        key={card.id}
                        type="button"
                        disabled={!canPlay}
                        onClick={() => play(card)}
                        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: canPlay ? -15 - translateY : -translateY,
                          rotate: rotateDeg,
                          scale: canPlay ? 1.05 : 1
                        }}
                        {...(canPlay && !reduceMotion
                          ? { whileHover: { y: -38, scale: 1.15, rotate: 0, zIndex: 120 } }
                          : {})}
                        {...(canPlay ? { whileTap: { scale: 0.95 } } : {})}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "relative shrink-0 text-left outline-none transition-shadow",
                          canPlay ? "cursor-pointer" : "cursor-default"
                        )}
                        style={{
                          marginLeft: index === 0 ? 0 : "-2.2rem",
                          zIndex: 10 + index
                        }}
                        title={canPlay ? `Play ${card.rank} of ${card.suit}` : `${card.rank} of ${card.suit}`}
                      >
                        <TwentyNineCardFace
                          card={card}
                          size="lg"
                          playable={canPlay}
                          muted={!canPlay && state.phase === "playing" && isMyTurn}
                        />
                      </motion.button>
                    );
                  })}

                  {/* 7th Trump Hidden Card */}
                  {state.privateSeventhCard &&
                  state.phase === "playing" &&
                  state.completedTricks.length === 7 &&
                  (me?.hand?.length ?? 0) === 0 ? (
                    <motion.button
                      type="button"
                      onClick={() => play(state.privateSeventhCard!)}
                      className="relative cursor-pointer ring-2 ring-amber-400 rounded-2xl ml-2"
                    >
                      <TwentyNineCardFace card={state.privateSeventhCard} size="lg" playable />
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[0.62rem] font-black text-black shadow-lg">
                        7TH TRUMP
                      </span>
                    </motion.button>
                  ) : null}

                  {!sortedHand.length && state.phase !== "finished" && !sittingOutSingleHand ? (
                    <div className="py-8 text-xs font-bold text-white/40">
                      Your cards will appear here after the deal.
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {/* Right Side: Card Points & Contract Telemetry */}
            <div className="hidden lg:flex flex-col justify-between shrink-0 rounded-2xl border border-white/10 bg-black/75 p-3 shadow-2xl backdrop-blur-xl w-[14rem] sm:w-[15.5rem] self-stretch">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/60">
                  Card Points (28 Pts)
                </span>
                <span className="text-[0.62rem] font-black text-amber-300">
                  Target: {state.contractTarget ?? state.currentBid ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between rounded-xl border border-rose-500/25 bg-rose-950/50 px-2.5 py-1.5">
                  <span className="text-[0.68rem] font-black text-rose-300">TEAM RED</span>
                  <span className="text-sm font-black text-white">
                    {state.capturedPointsByTeam["0"]} <span className="text-[0.6rem] text-white/40">/28</span>
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-sky-500/25 bg-sky-950/50 px-2.5 py-1.5">
                  <span className="text-[0.68rem] font-black text-sky-300">TEAM BLUE</span>
                  <span className="text-sm font-black text-white">
                    {state.capturedPointsByTeam["1"]} <span className="text-[0.6rem] text-white/40">/28</span>
                  </span>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 text-[0.62rem] text-white/50">
                <span>Stakes: <strong className="text-amber-300 font-extrabold">×{state.multiplier}</strong></span>
                <span>Score: <strong className="text-white font-bold">{state.teamGamePoints["0"]} vs {state.teamGamePoints["1"]}</strong></span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* RESIZING CHAT & ACTIVITY SIDEBAR (Flex child so board resizes!) */}
      <AnimatePresence initial={false}>
        {sidePanelOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 330, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-20 flex h-full shrink-0 flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-3.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Match Activity & Chat</h3>
              </div>
              <button
                type="button"
                onClick={() => setSidePanelOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hand Activity Feed */}
            <div className="flex flex-col border-b border-white/10 p-3 max-h-[14rem] overflow-y-auto">
              <span className="text-[0.6rem] font-black uppercase tracking-wider text-white/40 mb-2">
                Hand Log
              </span>
              <div className="space-y-1.5">
                {formattedLog.length ? (
                  formattedLog.map(({ event, row }) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[0.68rem]"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          row.tone === "emerald"
                            ? "bg-emerald-400"
                            : row.tone === "amber"
                            ? "bg-amber-400"
                            : row.tone === "violet"
                            ? "bg-violet-400"
                            : row.tone === "rose"
                            ? "bg-rose-400"
                            : row.tone === "sky"
                            ? "bg-sky-400"
                            : "bg-white/30"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-white/80">
                        {row.label}
                      </span>
                      <time className="shrink-0 text-[0.55rem] text-white/30">
                        {new Date(event.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </time>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/30 py-2">No activity recorded yet.</p>
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="flex-1 overflow-hidden">
              {onChat ? (
                <RoomChat
                  roomId={room.id}
                  messages={room.chat}
                  onSend={onChat}
                  onlineCount={onlineCount}
                />
              ) : (
                <div className="p-4 text-xs text-white/40">Chat is offline.</div>
              )}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* CINEMATIC ORGANIC EVENT OVERLAY (UNO No Mercy Style, non-blocking) */}
      <TwentyNineEventOverlay
        gameEvents={gameEvents}
        state={state}
        currentUserId={currentUserId}
      />

      {/* RULES MODAL */}
      <AnimatePresence>
        {rulesOpen ? (
          <motion.div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRulesOpen(false)}
          >
            <motion.div
              className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-emerald-400/30 bg-[linear-gradient(145deg,#031d16,#01110c)] p-6 shadow-2xl text-white"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg font-black">Twenty-Nine (29) Rules</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="font-black text-emerald-300">Card Strengths & Points</h4>
                  <p className="mt-1 text-white/70">
                    J (3 pts) &gt; 9 (2 pts) &gt; A (1 pt) &gt; 10 (1 pt) &gt; K (0) &gt; Q (0) &gt; 8 (0) &gt; 7 (0). Total in deck = 28 card points.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="font-black text-amber-300">Bidding Auction & Ditto</h4>
                  <p className="mt-1 text-white/70">
                    Bids range 16 to 28. Opening team has priority to match an opponent's bid using Ditto. Highest bidder sets contract.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="font-black text-sky-300">Trump Selection & Reveal</h4>
                  <p className="mt-1 text-white/70">
                    Declarer secretly chooses a trump suit or requests the 7th card. When unable to follow suit, players can reveal trump before playing.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="font-black text-violet-300">Pairs & Single Hand</h4>
                  <p className="mt-1 text-white/70">
                    King + Queen of trump adjusts the contract by 4. Single Hand caller must win all 8 tricks alone without trump for ±3 game points.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/30"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* FINAL MATCH FINISH CARD */}
      {state.phase === "finished" && state.winnerTeam !== null ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative flex w-full max-w-md flex-col items-center rounded-3xl border p-6 text-center shadow-2xl backdrop-blur-2xl",
              state.winnerTeam === 0
                ? "border-rose-400/60 bg-[linear-gradient(145deg,#2e0513,#0e0207)] shadow-[0_0_80px_rgba(244,63,94,0.4)]"
                : "border-sky-400/60 bg-[linear-gradient(145deg,#051e36,#020a14)] shadow-[0_0_80px_rgba(56,189,248,0.4)]"
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/10 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <Trophy className="h-8 w-8" />
            </div>

            <span className="mt-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/50">
              Match Complete
            </span>

            <h2 className="mt-1 text-3xl font-black text-white">
              {state.winnerTeam === 0 ? "TEAM RED WINS!" : "TEAM BLUE WINS!"}
            </h2>

            <div className="mt-4 flex w-full items-center justify-around rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div>
                <span className="block text-[0.6rem] font-black uppercase tracking-wider text-rose-300">
                  Team Red
                </span>
                <span className="text-2xl font-black text-white">
                  {state.teamGamePoints["0"]}
                </span>
              </div>
              <span className="font-bold text-white/20">VS</span>
              <div>
                <span className="block text-[0.6rem] font-black uppercase tracking-wider text-sky-300">
                  Team Blue
                </span>
                <span className="text-2xl font-black text-white">
                  {state.teamGamePoints["1"]}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => globalThis.location.assign("/dashboard")}
              className="mt-5 w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs font-black text-white transition hover:bg-white/20"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
