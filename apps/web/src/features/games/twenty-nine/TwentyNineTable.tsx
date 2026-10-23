"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Copy, Crown, Eye, Flag, LogOut, Shield, Sparkles, Swords, Trophy } from "lucide-react";
import type { GameEvent, PublicTwentyNineState, TwentyNineAction, TwentyNineCard, TwentyNineSuit } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { cn } from "@/lib/utils/cn";

type Position = "top" | "left" | "right" | "bottom";
type Point = { x: number; y: number };
type Flight = { id: string; card: TwentyNineCard; from: Point; to: Point; kind: "play" | "collect"; playerName: string; delay?: number };

const SUITS: Array<{ suit: TwentyNineSuit; color: string; label: string }> = [
  { suit: "spades", color: "#111b18", label: "Spades" },
  { suit: "hearts", color: "#d83f58", label: "Hearts" },
  { suit: "diamonds", color: "#d83f58", label: "Diamonds" },
  { suit: "clubs", color: "#111b18", label: "Clubs" }
];

function suitInfo(suit: TwentyNineSuit) {
  return SUITS.find((item) => item.suit === suit) ?? SUITS[0]!;
}

/** Inline vector suit marks avoid missing font-glyph fallbacks on clubs/spades. */
function SuitMark({ suit, color, size = 24 }: { suit: TwentyNineSuit; color: string; size?: number }) {
  const paths: Record<TwentyNineSuit, string> = {
    spades: "M24 3 C19 11 5 17 5 28 C5 37 14 40 21 33 C20 39 18 43 14 45 H34 C30 43 28 39 27 33 C34 40 43 37 43 28 C43 17 29 11 24 3 Z",
    hearts: "M24 43 C20 39 5 27 5 16 C5 7 16 4 24 14 C32 4 43 7 43 16 C43 27 28 39 24 43 Z",
    diamonds: "M24 3 C30 13 39 22 43 24 C36 31 29 39 24 45 C19 39 12 31 5 24 C12 17 19 9 24 3 Z",
    clubs: "M24 5 C15 5 11 16 18 22 C8 17 3 23 3 29 C3 38 15 40 22 32 C21 39 18 43 14 45 H34 C30 43 27 39 26 32 C33 40 45 38 45 29 C45 23 40 17 30 22 C37 16 33 5 24 5 Z"
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" width={size} height={size} className="inline-block shrink-0" style={{ color }}><path d={paths[suit]} fill="currentColor" /></svg>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positionFor(playerId: string, state: PublicTwentyNineState, currentUserId: string | null): Position {
  if (playerId === currentUserId) return "bottom";
  const me = state.players.find((player) => player.userId === currentUserId);
  const player = state.players.find((item) => item.userId === playerId);
  if (!me || !player) return "top";
  if (me.team === player.team) return "top";
  const delta = (player.seat - me.seat + 4) % 4;
  return delta === 1 ? "right" : "left";
}

function getCenter(element: HTMLElement | null, container: HTMLElement): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const bounds = container.getBoundingClientRect();
  return { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + rect.height / 2 };
}

function centerOf(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

function actionsOfType(legalActions: unknown[], type: TwentyNineAction["type"]): TwentyNineAction[] {
  return legalActions.filter((item): item is TwentyNineAction => isRecord(item) && item.type === type);
}

function hasAction(legalActions: unknown[], type: TwentyNineAction["type"]): boolean {
  return actionsOfType(legalActions, type).length > 0;
}

function playerName(state: PublicTwentyNineState, playerId: string | null | undefined, currentUserId: string | null): string {
  if (!playerId) return "Player";
  if (playerId === currentUserId) return "You";
  return state.players.find((player) => player.userId === playerId)?.displayName ?? "Player";
}

function formatEvent(event: GameEvent, state: PublicTwentyNineState, currentUserId: string | null): { label: string; tone: string } | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  if (event.type === "twenty-nine:card_played") {
    const card = isRecord(payload.card) ? payload.card : {};
    const cardText = `${String(card.rank ?? "card")} of ${String(card.suit ?? "unknown")}`;
    return { label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} played ${cardText}`, tone: "sky" };
  }
  if (event.type === "twenty-nine:bid") return { label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} bid ${String(payload.value ?? "")}`, tone: "amber" };
  if (event.type === "twenty-nine:ditto") return { label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} said Ditto at ${String(payload.value ?? "")}`, tone: "violet" };
  if (event.type === "twenty-nine:pass_bid") return { label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} passed the bid`, tone: "muted" };
  if (event.type === "twenty-nine:trump_revealed") return { label: `Trump revealed: ${String(payload.trumpSuit ?? "unknown")}`, tone: "emerald" };
  if (event.type === "twenty-nine:pair") return { label: `Team ${Number(payload.team) + 1} declared the pair · target ${String(payload.contractTarget ?? "")}`, tone: "violet" };
  if (event.type === "twenty-nine:trick_won") return { label: `${playerName(state, String(payload.winnerPlayerId ?? ""), currentUserId)} won trick ${String(payload.trickNumber ?? "")} (+${String(payload.points ?? 0)})`, tone: "emerald" };
  if (event.type === "twenty-nine:single_hand_declared") return { label: event.message ?? `${playerName(state, String(payload.playerId ?? ""), currentUserId)} declared Single Hand`, tone: "violet" };
  if (event.type === "twenty-nine:single_hand_scored") return { label: event.message ?? "Single Hand result", tone: payload.succeeded === true ? "emerald" : "rose" };
  if (event.type === "twenty-nine:hand_scored") return { label: event.message ?? "Hand scored", tone: "amber" };
  if (event.type === "twenty-nine:double" || event.type === "twenty-nine:redouble") return { label: event.message ?? "Contract stakes changed", tone: "rose" };
  if (event.type === "twenty-nine:deal_cancelled") return { label: event.message ?? "Deal cancelled", tone: "rose" };
  if (event.type === "twenty-nine:game_over") return { label: event.message ?? "Match finished", tone: "amber" };
  if (event.type.startsWith("twenty-nine:")) return event.message ? { label: event.message, tone: "muted" } : null;
  return null;
}

function CardFace({ card, small = false, muted = false }: { card: TwentyNineCard; small?: boolean; muted?: boolean }) {
  const suit = suitInfo(card.suit);
  return (
    <div className={cn(
      "relative flex select-none flex-col justify-between overflow-hidden rounded-xl border font-black shadow-[0_9px_24px_rgba(0,0,0,0.42)]",
      small ? "h-[4.5rem] w-[3.15rem] p-1.5" : "h-[7.5rem] w-[5.2rem] p-2",
      muted ? "border-white/15 bg-[#0c1618]" : "border-[#d9e4dc] bg-[linear-gradient(145deg,#fffef8,#dce8df)] text-[#101a18]"
    )}>
      {!muted ? <span className="pointer-events-none absolute -right-3 -top-4 h-14 w-14 rounded-full border border-black/5" /> : null}
      <div className="relative z-10 flex items-start justify-between gap-1">
        <span className={cn(small ? "text-[0.82rem]" : "text-lg", muted && "text-white")}>{card.rank}</span>
        <SuitMark suit={card.suit} color={muted ? "#8ac8b2" : suit.color} size={small ? 14 : 22} />
      </div>
      <div className="relative z-10 grid flex-1 place-items-center">
        <SuitMark suit={card.suit} color={muted ? "#8ac8b2" : suit.color} size={small ? 28 : 44} />
      </div>
      <div className="relative z-10 flex items-end justify-between">
        <span className={cn(small ? "text-[0.6rem]" : "text-xs", muted ? "text-white/60" : "text-zinc-500")}>{card.points ? `${card.points} PT` : ""}</span>
        <span className={cn(small ? "text-[0.72rem]" : "text-base", muted && "text-white")}>{card.rank}</span>
      </div>
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-emerald-100/25 bg-[linear-gradient(145deg,#0b3229,#051a18)] shadow-[0_8px_18px_rgba(0,0,0,.36)]", small ? "h-12 w-8" : "h-16 w-11")}>
      <div className="absolute inset-1 rounded-lg border border-emerald-200/25" />
      <div className="absolute inset-[26%] rotate-45 rounded-[0.45rem] border border-emerald-200/60 bg-emerald-300/10" />
      <div className="absolute inset-0 grid place-items-center text-emerald-100/85"><span className={small ? "text-sm" : "text-lg"}>29</span></div>
    </div>
  );
}

function TeamScore({ team, points, caption }: { team: number; points: number; caption: string }) {
  const isWest = team === 0;
  return (
    <div className={cn("min-w-[8.5rem] rounded-2xl border px-3 py-2", isWest ? "border-emerald-300/20 bg-emerald-300/[0.07]" : "border-sky-300/20 bg-sky-300/[0.07]")}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-[0.58rem] font-black uppercase tracking-[0.2em]", isWest ? "text-emerald-200/65" : "text-sky-200/65")}>{caption}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", isWest ? "bg-emerald-300" : "bg-sky-300")} />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2"><strong className="text-2xl font-black leading-none text-white">{points > 0 ? `+${points}` : points}</strong><span className="text-[0.62rem] font-bold text-white/35">of ±6</span></div>
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
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  const me = state.players.find((player) => player.userId === currentUserId);
  const opponents = useMemo(() => state.players.filter((player) => player.userId !== currentUserId), [state.players, currentUserId]);
  const partner = opponents.find((player) => me && player.team === me.team);
  const enemyPlayers = opponents.filter((player) => !me || player.team !== me.team);
  const selfIsDeclarer = state.declarerId === currentUserId;
  const isMyTurn = state.currentPlayerId === currentUserId;
  const singleHandCaller = state.players.find((player) => player.userId === state.singleHandPlayerId) ?? null;
  const sittingOutSingleHand = Boolean(singleHandCaller && me && me.userId !== singleHandCaller.userId && me.team === singleHandCaller.team);
  const currentTurnName = playerName(state, state.currentPlayerId, currentUserId);
  const legalPlayIds = useMemo(() => new Set(actionsOfType(legalActions, "play_card").map((action) => action.type === "play_card" ? action.cardId : "")), [legalActions]);
  const legalBidValues = useMemo(
    () => actionsOfType(legalActions, "bid").flatMap((action) => action.type === "bid" ? [action.value] : []).sort((a, b) => a - b),
    [legalActions]
  );
  const lowestLegalBid = legalBidValues[0] ?? null;
  const highestLegalBid = legalBidValues[legalBidValues.length - 1] ?? null;
  const selectedBidValue = lowestLegalBid !== null && highestLegalBid !== null
    ? Math.min(highestLegalBid, Math.max(lowestLegalBid, selectedBid ?? lowestLegalBid))
    : null;
  const formattedLog = useMemo(() => gameEvents.map((event) => ({ event, row: formatEvent(event, state, currentUserId) })).filter((entry) => entry.row).slice(-28).reverse(), [gameEvents, state, currentUserId]);
  const onlineCount = room.players.filter((player) => player.connected).length;
  const currentTrickByPlayer = new Map(state.currentTrick.map((entry) => [entry.playerId, entry.card]));
  const turnIndex = state.completedTricks.length + 1;

  useEffect(() => () => {
    for (const timeout of timeoutRefs.current) window.clearTimeout(timeout);
    timeoutRefs.current = [];
  }, []);

  useEffect(() => {
    if (lowestLegalBid === null || highestLegalBid === null) {
      setSelectedBid(null);
      return;
    }
    setSelectedBid((current) => current === null
      ? lowestLegalBid
      : Math.min(highestLegalBid, Math.max(lowestLegalBid, current)));
  }, [lowestLegalBid, highestLegalBid]);

  useEffect(() => {
    const container = tableRef.current;
    if (!container) return;
    for (const event of gameEvents) {
      if (processedEvents.current.has(event.id)) continue;
      processedEvents.current.add(event.id);
      if (Date.now() - new Date(event.createdAt).getTime() > 10_000) continue;
      const payload = isRecord(event.payload) ? event.payload : {};

      if (event.type.endsWith(":card_played")) {
        const cardData = isRecord(payload.card) ? payload.card : null;
        const playerId = typeof payload.playerId === "string" ? payload.playerId : null;
        if (!cardData || !playerId || typeof cardData.id !== "string" || typeof cardData.suit !== "string" || typeof cardData.rank !== "string") continue;
        const card = cardData as unknown as TwentyNineCard;
        const fromElement = playerId === currentUserId ? handRef.current : seatRefs.current.get(playerId) ?? null;
        const from = getCenter(fromElement, container) ?? centerOf(container);
        const to = centerOf(container);
        const name = playerName(state, playerId, currentUserId);
        const flight: Flight = { id: event.id, card, from, to, kind: "play", playerName: name };
        setFlights((current) => [...current, flight].slice(-8));
        const timeout = window.setTimeout(() => {
          setFlights((current) => current.filter((item) => item.id !== flight.id));
          timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeout);
        }, reduceMotion ? 360 : 850);
        timeoutRefs.current.push(timeout);
        continue;
      }

      if (event.type.endsWith(":trick_won")) {
        const winnerId = typeof payload.winnerPlayerId === "string" ? payload.winnerPlayerId : null;
        const playedCards = Array.isArray(payload.cards) ? payload.cards : [];
        if (!winnerId || playedCards.length === 0) continue;
        const from = centerOf(container);
        const to = getCenter(seatRefs.current.get(winnerId) ?? null, container) ?? centerOf(container);
        const arrivals: Flight[] = playedCards.slice(0, 4).flatMap((played, index) => {
          if (!isRecord(played) || !isRecord(played.card)) return [];
          const cardData = played.card;
          if (typeof cardData.id !== "string" || typeof cardData.suit !== "string" || typeof cardData.rank !== "string") return [];
          return [{
            id: `${event.id}-${index}-${cardData.id}`,
            card: cardData as unknown as TwentyNineCard,
            from: { x: from.x + (index - 1.5) * 10, y: from.y + (index % 2 === 0 ? 3 : -3) },
            to: { x: to.x + (index - 1.5) * 5, y: to.y },
            kind: "collect" as const,
            playerName: playerName(state, winnerId, currentUserId),
            delay: reduceMotion ? 0 : 0.56
          }];
        });
        if (arrivals.length === 0) continue;
        const arrivalIds = new Set(arrivals.map((flight) => flight.id));
        setFlights((current) => [...current, ...arrivals].slice(-8));
        const timeout = window.setTimeout(() => {
          setFlights((current) => current.filter((item) => !arrivalIds.has(item.id)));
          timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeout);
        }, reduceMotion ? 400 : 1500);
        timeoutRefs.current.push(timeout);
      }
    }
    if (processedEvents.current.size > 700) {
      const currentIds = new Set(gameEvents.map((event) => event.id));
      processedEvents.current = new Set([...processedEvents.current].filter((id) => currentIds.has(id)));
    }
  }, [currentUserId, gameEvents, reduceMotion, state]);

  function registerSeat(playerId: string, element: HTMLDivElement | null) {
    if (element) seatRefs.current.set(playerId, element);
    else seatRefs.current.delete(playerId);
  }

  function play(card: TwentyNineCard) {
    if (!legalPlayIds.has(card.id)) return;
    onAction("play_card", { cardId: card.id });
  }

  function renderCardSlot(playerId: string) {
    const card = currentTrickByPlayer.get(playerId);
    const position = positionFor(playerId, state, currentUserId);
    const offsets: Record<Position, string> = {
      top: "left-1/2 top-[14%] -translate-x-1/2 -translate-y-1/2",
      left: "left-[24%] top-1/2 -translate-x-1/2 -translate-y-1/2",
      right: "left-[76%] top-1/2 -translate-x-1/2 -translate-y-1/2",
      bottom: "left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2"
    };
    return (
      <div key={playerId} className={cn("absolute z-20 transition-all duration-300", offsets[position])}>
        <AnimatePresence mode="wait">
          {card ? (
            <motion.div key={card.id} initial={{ opacity: 0, y: -12, rotate: position === "left" ? -9 : position === "right" ? 9 : 0, scale: 0.82 }} animate={{ opacity: 1, y: 0, rotate: position === "left" ? -6 : position === "right" ? 6 : 0, scale: 1 }} exit={{ opacity: 0, scale: 0.66, y: -8 }} transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: "easeOut" }}>
              <CardFace card={card} small />
            </motion.div>
          ) : (
            <motion.div key={`${playerId}-empty`} initial={{ opacity: 0 }} animate={{ opacity: 0.48 }} className="grid h-[4.5rem] w-[3.15rem] place-items-center rounded-xl border border-dashed border-white/10 bg-black/10 text-[0.55rem] font-black uppercase tracking-widest text-white/20">{state.phase === "playing" ? "Play" : ""}</motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="twenty-nine-shell relative min-h-[100dvh] overflow-hidden text-white">
      <div className="twenty-nine-grain pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1680px] flex-col gap-3 p-3 xl:p-4">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white/[0.09] bg-[#04110f]/80 px-4 py-3 shadow-[0_16px_42px_rgba(0,0,0,.26)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-100/20 bg-emerald-300/10 text-emerald-100"><span className="text-lg font-black">29</span></div>
            <div className="min-w-0"><p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-emerald-200/45">Bangladesh card table</p><h1 className="truncate text-lg font-black tracking-tight">Twenty-Nine <span className="text-emerald-200/50">/ Hand {state.handNumber}</span></h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TeamScore team={0} points={state.teamGamePoints["0"]} caption="Team emerald" />
            <TeamScore team={1} points={state.teamGamePoints["1"]} caption="Team sapphire" />
            <button type="button" onClick={() => setRulesOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Rules"><BookOpen className="h-4 w-4" /></button>
            <button type="button" onClick={() => navigator.clipboard.writeText(room.code)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Copy room code"><Copy className="h-4 w-4" /></button>
            <button type="button" onClick={() => globalThis.location.assign("/dashboard")} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Leave match" title="Leave match"><LogOut className="h-4 w-4" /></button>
            {onEndMatch && room.effectiveHostUserId === currentUserId ? <button type="button" onClick={() => onEndMatch(room.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/[0.07] text-rose-100/65 transition hover:bg-rose-400/15 hover:text-rose-50" aria-label="End match" title="End match"><Flag className="h-4 w-4" /></button> : null}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="flex min-h-0 flex-col gap-3">
            <section ref={tableRef} className="twenty-nine-table relative min-h-[28rem] flex-1 overflow-hidden rounded-[2.4rem] border border-emerald-100/[0.11] shadow-[inset_0_0_65px_rgba(0,0,0,.28),0_28px_72px_rgba(0,0,0,.28)]">
              <div className="twenty-nine-table-rim pointer-events-none absolute inset-[3%] rounded-[48%] border border-emerald-100/[0.16]" />
              <div className="twenty-nine-table-inner pointer-events-none absolute inset-[7%] rounded-[47%] border border-emerald-200/[0.07]" />
              <div className="twenty-nine-orbit twenty-nine-orbit-outer pointer-events-none absolute left-1/2 top-1/2 h-[min(75%,34rem)] aspect-[1.72/1] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-emerald-200/10" />
              <div className="twenty-nine-orbit twenty-nine-orbit-inner pointer-events-none absolute left-1/2 top-1/2 h-[min(61%,28rem)] aspect-[1.72/1] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/[0.09]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[27rem] max-w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-emerald-400/[0.035] blur-2xl" />

              {partner ? (
                <div ref={(el) => registerSeat(partner.userId, el)} className={cn("absolute left-1/2 top-[5%] z-10 -translate-x-1/2", partner.isCurrentTurn && "z-20")}>
                  <Seat playerName={partner.displayName} team={partner.team} count={partner.handCount} active={partner.isCurrentTurn} dealer={state.dealerPlayerId === partner.userId} />
                  {singleHandCaller && partner.userId !== singleHandCaller.userId && partner.team === singleHandCaller.team ? <span className="mt-1 block rounded-full border border-violet-200/20 bg-violet-300/10 px-2 py-1 text-center text-[0.5rem] font-black uppercase tracking-[0.2em] text-violet-100/70">Sitting out</span> : null}
                </div>
              ) : null}
              {enemyPlayers.map((player) => {
                const pos = positionFor(player.userId, state, currentUserId);
                return (
                  <div key={player.userId} ref={(el) => registerSeat(player.userId, el)} className={cn("absolute z-10", pos === "left" ? "left-[2.5%] top-1/2 -translate-y-1/2" : "right-[2.5%] top-1/2 -translate-y-1/2", player.isCurrentTurn && "z-20")}>
                    <Seat playerName={player.displayName} team={player.team} count={player.handCount} active={player.isCurrentTurn} dealer={state.dealerPlayerId === player.userId} vertical />
                  </div>
                );
              })}

              <div className="absolute left-1/2 top-1/2 z-10 w-[min(45rem,65%)] -translate-x-1/2 -translate-y-1/2">
                <div className="relative mx-auto aspect-[1.8/1] w-full rounded-[50%] border border-emerald-100/[0.14] bg-[radial-gradient(ellipse_at_center,rgba(7,45,35,.65),rgba(3,17,15,.38)_64%,transparent_72%)] shadow-[inset_0_0_55px_rgba(16,185,129,.05)]">
                  <div className="absolute inset-[7%] rounded-[50%] border border-dashed border-white/[0.06]" />
                  <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-white/[0.09] bg-[#03110f]/65 px-4 py-2.5 text-center shadow-lg backdrop-blur-sm">
                    <span className="text-[0.54rem] font-black uppercase tracking-[0.3em] text-emerald-100/40">Current trick</span>
                    <strong className="text-xl font-black text-white">{String(turnIndex).padStart(2, "0")} <span className="text-xs text-white/30">/ 08</span></strong>
                    <span className="max-w-[11rem] truncate text-[0.63rem] font-bold text-white/55">{state.phase === "playing" ? `${currentTurnName} to play` : phaseLabel(state.phase)}</span>
                  </div>
                  {state.players
                    .filter((player) => !singleHandCaller || player.userId === singleHandCaller.userId || player.team !== singleHandCaller.team)
                    .map((player) => renderCardSlot(player.userId))}
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-white/[0.09] bg-[#03100f]/75 px-3 py-2 shadow-lg backdrop-blur-sm">
                {state.phase === "bidding" ? <><span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-white/45">Current bid</span><strong className="text-lg font-black text-amber-100">{state.currentBid ?? "—"}</strong><span className="text-[0.6rem] font-bold text-white/35">{state.highestBidderId ? playerName(state, state.highestBidderId, currentUserId) : "No bid yet"}</span></> : null}
                {state.phase !== "bidding" ? state.singleHandPlayerId ? <><span className="rounded-md border border-violet-200/25 bg-violet-300/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.15em] text-violet-100">Single Hand</span><span className="text-[0.62rem] font-bold text-white/45">No trump · must win all 8 tricks · ±3</span></> : <><span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-white/40">Contract</span><strong className="text-lg font-black text-amber-100">{state.contractTarget ?? state.currentBid ?? "—"}</strong><span className="rounded-md border border-amber-100/15 bg-amber-200/[0.06] px-2 py-1 text-[0.58rem] font-black text-amber-100/70">×{state.multiplier}</span><span className="h-1 w-1 rounded-full bg-white/20" />{state.trumpRevealed && state.trumpSuit ? <span className="inline-flex items-center gap-1 font-bold text-emerald-100">Trump <SuitMark suit={state.trumpSuit} color="#a7f3d0" size={15} /> {state.trumpSuit}</span> : selfIsDeclarer && state.trumpSuit ? <span className="inline-flex items-center gap-1 font-bold text-violet-100">Your hidden trump <SuitMark suit={state.trumpSuit} color="#ddd6fe" size={15} /></span> : <span className="font-bold text-white/45">Trump concealed</span>}</> : null}
              </div>

              <AnimatePresence initial={false}>
                {flights.map((flight) => {
                  const midX = (flight.from.x + flight.to.x) / 2;
                  const midY = Math.min(flight.from.y, flight.to.y) - (flight.kind === "collect" ? 42 : 62);
                  return (
                    <motion.div key={flight.id} className={cn("pointer-events-none absolute left-0 top-0 z-[50]", flight.kind === "collect" && "drop-shadow-[0_0_15px_rgba(52,211,153,0.32)]")} initial={{ x: flight.from.x - 25, y: flight.from.y - 36, rotate: -12, scale: 0.74, opacity: 0 }} animate={reduceMotion ? { opacity: [0, 1, 0] } : { x: [flight.from.x - 25, midX - 25, flight.to.x - 25], y: [flight.from.y - 36, midY - 36, flight.to.y - 36], rotate: [-12, 11, 0], scale: [0.74, 1, 0.66], opacity: [0, 1, 1, 0] }} exit={{ opacity: 0 }} transition={{ delay: flight.delay ?? 0, duration: reduceMotion ? 0.26 : 0.72, ease: [0.18, 0.86, 0.24, 1] }}>
                      <CardFace card={flight.card} small />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </section>

            <section ref={handRef} className="relative shrink-0 overflow-hidden rounded-[1.65rem] border border-white/[0.09] bg-[#04120f]/86 px-4 pb-3 pt-3 shadow-[0_18px_48px_rgba(0,0,0,.24)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100/15 bg-emerald-300/[0.08] text-emerald-100"><Crown className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-black">{me?.displayName ?? "Your hand"}</p><p className="text-[0.58rem] font-bold uppercase tracking-[0.17em] text-white/35">{sittingOutSingleHand ? "Partner playing alone" : me?.team === 0 ? "Team Emerald" : "Team Sapphire"} · {(me?.hand?.length ?? 0) + (state.privateSeventhCard ? 1 : 0)} cards</p></div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[0.63rem] font-bold text-white/48"><Shield className="h-3.5 w-3.5" /> Follow suit when possible</div>
              </div>
              {sittingOutSingleHand ? <div className="flex min-h-[7.7rem] flex-col items-center justify-center gap-2 rounded-xl border border-violet-200/10 bg-violet-300/[0.035] px-4 py-3 text-center"><div className="flex -space-x-3">{Array.from({ length: Math.min(me?.hand?.length ?? 0, 8) }).map((_, index) => <div key={index} className="origin-bottom" style={{ transform: `rotate(${(index - 3.5) * 2}deg)` }}><CardBack small /></div>)}</div><p className="text-xs font-black text-violet-100">You're sitting out this hand.</p><p className="max-w-md text-[0.68rem] font-semibold text-white/45">Your teammate must win all eight tricks alone. Your cards stay out of play.</p></div> : <div className="flex min-h-[7.7rem] items-end justify-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(52,211,153,.25)_transparent]">
                {(me?.hand ?? []).map((card, index) => {
                  const canPlay = legalPlayIds.has(card.id) && isMyTurn && state.phase === "playing";
                  const hoverMotion = canPlay && !reduceMotion ? { y: -10, rotate: (index - ((me?.hand?.length ?? 1) - 1) / 2) * 1.4 } : null;
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      disabled={!canPlay}
                      onClick={() => play(card)}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: canPlay ? 1 : 0.78, y: 0 }}
                      {...(hoverMotion ? { whileHover: hoverMotion } : {})}
                      {...(canPlay ? { whileTap: { scale: 0.96 } } : {})}
                      transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                      className={cn("relative shrink-0 rounded-xl text-left outline-none transition", canPlay ? "cursor-pointer ring-2 ring-emerald-200/60 shadow-[0_0_20px_rgba(52,211,153,.12)]" : "cursor-not-allowed opacity-70", isMyTurn && state.phase === "playing" && canPlay && "-translate-y-1")}
                      title={canPlay ? "Play this card" : "Not playable now"}
                    >
                      <CardFace card={card} />
                      {canPlay ? <span className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(110,231,183,.65)]" /> : null}
                    </motion.button>
                  );
                })}
                {state.privateSeventhCard && state.phase === "playing" && state.completedTricks.length === 7 && (me?.hand?.length ?? 0) === 0 ? (
                  <motion.button type="button" onClick={() => play(state.privateSeventhCard!)} className="relative rounded-xl ring-2 ring-amber-200/60 shadow-[0_0_18px_rgba(251,191,36,.2)]"><CardFace card={state.privateSeventhCard} /><span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/25 bg-[#211807] px-2 py-0.5 text-[0.53rem] font-black uppercase tracking-widest text-amber-100">Seventh</span></motion.button>
                ) : null}
                {!me?.hand?.length && state.phase !== "finished" ? <div className="px-6 py-5 text-xs font-bold text-white/35">Your cards appear here.</div> : null}
              </div>}
            </section>

            <section className="shrink-0 rounded-[1.5rem] border border-white/[0.09] bg-[#04120f]/85 p-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-[0.58rem] font-black uppercase tracking-[0.24em] text-white/35">Your move</p><p className="mt-1 text-sm font-black text-white">{isMyTurn ? phaseLabel(state.phase) : `${currentTurnName} is acting`}</p></div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {state.phase === "bidding" && isMyTurn ? <>
                    {selectedBidValue !== null && lowestLegalBid !== null && highestLegalBid !== null ? (
                      <div className="flex items-center gap-1 rounded-xl border border-amber-100/15 bg-amber-200/[0.045] p-1">
                        <button type="button" aria-label="Lower bid" disabled={selectedBidValue <= lowestLegalBid} onClick={() => setSelectedBid(Math.max(lowestLegalBid, selectedBidValue - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-sm font-black text-white/65 disabled:opacity-25">−</button>
                        <div className="min-w-[3rem] px-1 text-center"><p className="text-[0.5rem] font-black uppercase tracking-[0.17em] text-amber-100/40">Bid</p><p className="text-lg font-black leading-tight text-amber-100">{selectedBidValue}</p></div>
                        <button type="button" aria-label="Raise bid" disabled={selectedBidValue >= highestLegalBid} onClick={() => setSelectedBid(Math.min(highestLegalBid, selectedBidValue + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-sm font-black text-white/65 disabled:opacity-25">+</button>
                        <ActionButton label={`Bid ${selectedBidValue}`} tone="gold" onClick={() => onAction("bid", { value: selectedBidValue })} />
                      </div>
                    ) : null}
                    {hasAction(legalActions, "ditto") ? <ActionButton label="Ditto" tone="violet" onClick={() => onAction("ditto")} /> : null}
                    {hasAction(legalActions, "pass_bid") ? <ActionButton label="Pass" tone="neutral" onClick={() => onAction("pass_bid")} /> : null}
                  </> : null}
                  {state.phase === "trump" && isMyTurn ? <>
                    {SUITS.map((item) => <button key={item.suit} type="button" onClick={() => onAction("choose_trump_suit", { suit: item.suit })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-black text-white/80 transition hover:border-emerald-200/35 hover:bg-emerald-300/10"><SuitMark suit={item.suit} color={item.suit === "spades" || item.suit === "clubs" ? "#a7f3d0" : item.color} size={18} /><span className="hidden sm:inline">{item.label}</span></button>)}
                    {hasAction(legalActions, "choose_seventh_trump") ? <ActionButton label="Seventh card" tone="violet" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => onAction("choose_seventh_trump")} /> : null}
                  </> : null}
                  {state.phase === "doubling" && isMyTurn && !state.doubleByPlayerId ? <><ActionButton label="Pass" tone="neutral" onClick={() => onAction("pass_double")} /><ActionButton label="Double" tone="rose" icon={<Swords className="h-3.5 w-3.5" />} onClick={() => onAction("double")} /></> : null}
                  {state.phase === "doubling" && isMyTurn && state.doubleByPlayerId ? <><ActionButton label="Continue ×2" tone="neutral" onClick={() => onAction("continue_contract")} /><ActionButton label="Redouble ×4" tone="rose" icon={<Swords className="h-3.5 w-3.5" />} onClick={() => onAction("redouble")} /></> : null}
                  {state.phase === "playing" && hasAction(legalActions, "declare_single_hand") ? <ActionButton label="Declare Single Hand · ±3" tone="violet" icon={<Crown className="h-3.5 w-3.5" />} onClick={() => onAction("declare_single_hand")} /> : null}
                  {state.phase === "playing" && isMyTurn && hasAction(legalActions, "reveal_trump") ? <ActionButton label="Reveal trump" tone="violet" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => onAction("reveal_trump")} /> : null}
                  {state.phase === "playing" && hasAction(legalActions, "declare_pair") ? <ActionButton label="Declare pair" tone="gold" icon={<Crown className="h-3.5 w-3.5" />} onClick={() => onAction("declare_pair")} /> : null}
                  {state.phase === "finished" ? <ActionButton label="Match complete" tone="gold" icon={<Trophy className="h-3.5 w-3.5" />} onClick={() => {}} disabled /> : null}
                  {!isMyTurn && state.phase !== "finished" && !hasAction(legalActions, "declare_single_hand") ? <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold text-white/45">Waiting for {currentTurnName}…</span> : null}
                </div>
              </div>
            </section>
          </main>

          <aside className="flex min-h-[25rem] flex-col gap-3 xl:max-h-[calc(100dvh-7.5rem)]">
            <section className="shrink-0 overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#04120f]/85 shadow-[0_16px_44px_rgba(0,0,0,.2)]">
              <button type="button" onClick={() => setLogCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200/15 bg-emerald-300/[0.08] text-emerald-100"><Flag className="h-3.5 w-3.5" /></span><div><p className="text-sm font-black">Hand activity</p><p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-white/35">Bidding · tricks · score</p></div></div><span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.6rem] font-black text-white/45">{formattedLog.length}</span></button>
              {!logCollapsed ? <div className="max-h-[16rem] space-y-1 overflow-y-auto p-2 [scrollbar-color:rgba(110,231,183,.2)_transparent] [scrollbar-width:thin]">{formattedLog.length ? formattedLog.map(({ event, row }) => <div key={event.id} className="flex gap-2 rounded-xl border border-white/[0.045] bg-white/[0.02] px-2.5 py-2"><span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", toneDot(row!.tone))} /><p className="min-w-0 text-[0.68rem] font-semibold leading-relaxed text-white/70">{row!.label}</p><time className="ml-auto shrink-0 pt-0.5 text-[0.52rem] font-bold tabular-nums text-white/25">{new Date(event.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>) : <div className="px-3 py-6 text-center text-xs font-semibold text-white/32">The auction and trick history will appear here.</div>}</div> : null}
            </section>

            <section className="grid shrink-0 grid-cols-2 gap-2 rounded-[1.4rem] border border-white/[0.09] bg-[#04120f]/80 p-3">
              <MiniStat label="Our card points" value={String(state.capturedPointsByTeam[String(me?.team ?? 0) as "0" | "1"])} tint="emerald" />
              <MiniStat label="Opposition" value={String(state.capturedPointsByTeam[String(me?.team === 0 ? 1 : 0) as "0" | "1"])} tint="sky" />
              <MiniStat label="Tricks won" value={String(state.tricksWonByTeam[String(me?.team ?? 0) as "0" | "1"])} tint="emerald" />
              <MiniStat label="Tricks left" value={String(Math.max(0, 8 - state.completedTricks.length))} tint="amber" />
            </section>

            <div className="min-h-[17rem] flex-1 overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#04120f]/85 shadow-[0_16px_44px_rgba(0,0,0,.2)]">{onChat ? <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={onlineCount} /> : <div className="p-4 text-sm text-white/40">Chat is unavailable.</div>}</div>
          </aside>
        </div>
      </div>

      <AnimatePresence>{rulesOpen ? <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRulesOpen(false)}><motion.div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-[1.8rem] border border-emerald-100/15 bg-[#061510] p-5 shadow-2xl" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: 0.98 }} onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-emerald-200" /><h2 className="text-xl font-black">29 — Quick rules</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><RuleTile title="Rank" body="J > 9 > A > 10 > K > Q > 8 > 7. The deck contains exactly 28 card points." /><RuleTile title="Partnerships" body="Four players, partners opposite. Play proceeds counterclockwise." /><RuleTile title="Auction" body="Deal four cards each; bid from 16 to 28. Raise, Ditto or Pass; partners can take over. Three passes end the auction." /><RuleTile title="Trump" body="Declarer chooses a hidden suit or calls for the seventh card. If unable to follow suit, reveal trump before discarding." /><RuleTile title="Pair" body="After trump is revealed, King + Queen of trump can adjust the target by four. Bids 16–18 are not reduced for your team." /><RuleTile title="Single Hand" body="Before the first card, any player may declare Single Hand. No trump is used; their partner sits out and the caller must win all eight tricks for +3, otherwise −3." /><RuleTile title="Contract" body="After eight tricks, the bidding team gains or loses 1, 2 or 4 game points. First to +6 wins; reaching −6 loses." /></div><p className="mt-4 text-xs font-semibold leading-relaxed text-white/35">House rules: 28 card points only (no last-trick bonus). Double/Redouble and seventh-card trump are enabled; Set is not used.</p><button type="button" onClick={() => setRulesOpen(false)} className="mt-4 rounded-xl border border-emerald-200/20 bg-emerald-200/10 px-4 py-2 text-sm font-black text-emerald-100">Got it</button></motion.div></motion.div> : null}</AnimatePresence>

      {state.phase === "finished" && state.winnerTeam !== null ? <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-black/20 p-4"><motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="pointer-events-auto w-full max-w-md rounded-[2rem] border border-amber-200/20 bg-[#061510]/95 p-6 text-center shadow-[0_24px_100px_rgba(0,0,0,.65)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-200/20 bg-amber-200/10 text-amber-100"><Trophy className="h-7 w-7" /></div><p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.3em] text-amber-100/50">Match complete</p><h2 className="mt-1 text-2xl font-black">Team {state.winnerTeam + 1} wins!</h2><p className="mt-2 text-sm font-semibold text-white/55">Emerald {state.teamGamePoints["0"]} · Sapphire {state.teamGamePoints["1"]}</p><p className="mt-4 text-xs text-white/35">Start a new room to play another match.</p></motion.div></div> : null}
    </div>
  );
}

function Seat({ playerName: name, team, count, active, dealer, vertical = false }: { playerName: string; team: number; count: number; active: boolean; dealer: boolean; vertical?: boolean }) {
  return (
    <div className={cn("w-[min(15rem,24vw)] rounded-[1.25rem] border px-3 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,.24)] transition-all duration-300", vertical && "w-[min(12rem,20vw)]", active ? "border-emerald-200/60 bg-[#08251e]/95 shadow-[0_0_26px_rgba(52,211,153,.12)]" : "border-white/10 bg-[#061510]/86")}>
      <div className="flex items-center gap-2.5"><div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-black", team === 0 ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-sky-200/25 bg-sky-300/10 text-sky-100")}>{name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{name}</p><p className="truncate text-[0.53rem] font-black uppercase tracking-[0.13em] text-white/35">{team === 0 ? "Team Emerald" : "Team Sapphire"}{dealer ? " · Dealer" : ""}</p></div>{active ? <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" /> : null}</div>
      <div className="mt-2 flex items-end justify-between gap-2"><div className="flex -space-x-3">{Array.from({ length: Math.min(count, vertical ? 4 : 5) }).map((_, index) => <div key={index} className="origin-bottom" style={{ transform: `rotate(${(index - 2) * 4}deg)` }}><CardBack small /></div>)}</div><span className="rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-[0.62rem] font-black text-white/60">{count} cards</span></div>
    </div>
  );
}

function ActionButton({ label, tone, onClick, disabled = false, icon }: { label: string; tone: "gold" | "violet" | "neutral" | "rose"; onClick: () => void; disabled?: boolean; icon?: React.ReactNode }) {
  const color = tone === "gold" ? "border-amber-200/30 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20" : tone === "violet" ? "border-violet-200/25 bg-violet-300/10 text-violet-100 hover:bg-violet-300/20" : tone === "rose" ? "border-rose-200/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20" : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/10";
  return <button type="button" disabled={disabled} onClick={onClick} className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40", color)}>{icon}{label}</button>;
}

function MiniStat({ label, value, tint }: { label: string; value: string; tint: "emerald" | "sky" | "amber" }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2"><p className="truncate text-[0.55rem] font-black uppercase tracking-[0.15em] text-white/35">{label}</p><p className={cn("mt-1 text-xl font-black", tint === "emerald" ? "text-emerald-100" : tint === "sky" ? "text-sky-100" : "text-amber-100")}>{value}</p></div>;
}

function RuleTile({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/70">{title}</p><p className="mt-1 text-sm font-medium leading-relaxed text-white/65">{body}</p></div>;
}

function toneDot(tone: string): string {
  if (tone === "emerald") return "bg-emerald-300";
  if (tone === "sky") return "bg-sky-300";
  if (tone === "amber") return "bg-amber-200";
  if (tone === "violet") return "bg-violet-300";
  if (tone === "rose") return "bg-rose-300";
  return "bg-white/25";
}

function phaseLabel(phase: PublicTwentyNineState["phase"]): string {
  if (phase === "bidding") return "Auction";
  if (phase === "trump") return "Choose trump";
  if (phase === "doubling") return "Double or continue";
  if (phase === "playing") return "Play a card";
  return "Match finished";
}
