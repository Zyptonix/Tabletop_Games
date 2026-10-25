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

const CARD_SUIT_ORDER: Record<TwentyNineSuit, number> = { spades: 0, clubs: 1, hearts: 2, diamonds: 3 };
const CARD_RANK_ORDER: Record<string, number> = { J: 0, "9": 1, A: 2, "10": 3, K: 4, Q: 5, "8": 6, "7": 7 };
const CARD_TRICK_STRENGTH: Record<string, number> = { J: 8, "9": 7, A: 6, "10": 5, K: 4, Q: 3, "8": 2, "7": 1 };

function currentWinningCardId(state: PublicTwentyNineState): string | null {
  if (state.currentTrick.length === 0) return null;
  const ledSuit = state.currentTrick[0]!.card.suit;
  const trumpSuit = state.trumpRevealed ? state.trumpSuit : null;
  let best = state.currentTrick[0]!;
  const strength = (entry: (typeof state.currentTrick)[number]) => {
    if (trumpSuit && entry.card.suit === trumpSuit) return 100 + (CARD_TRICK_STRENGTH[entry.card.rank] ?? 0);
    if (entry.card.suit === ledSuit) return 50 + (CARD_TRICK_STRENGTH[entry.card.rank] ?? 0);
    return 0;
  };
  for (const candidate of state.currentTrick.slice(1)) {
    if (strength(candidate) > strength(best)) best = candidate;
  }
  return best.card.id;
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

/* twenty-nine-card-sprite-polish-v1 */
function cardSpriteCandidates(rank: string, suit: TwentyNineSuit): string[] {
  const filename = `${rank}_of_${suit}.png`;
  // Support the canonical folder plus common existing Twenty-Nine/29 sprite folder layouts.
  return [
    `/game-assets/twenty-nine/cards/${filename}`,
    `/game-assets/twenty-nine/${filename}`,
    `/game-assets/twenty-nine/sprites/${filename}`,
    `/game-assets/29/cards/${filename}`,
    `/game-assets/29/${filename}`
  ];
}

function CardSprite({ rank, suit, className = "" }: { rank: string; suit: TwentyNineSuit; className?: string }) {
  const filename = `${rank}_of_${suit}.png`;
  const candidates = useMemo(() => cardSpriteCandidates(rank, suit), [rank, suit]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [filename]);

  if (candidateIndex >= candidates.length) return null;
  return (
    <img
      src={candidates[candidateIndex]}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("pointer-events-none select-none", className)}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

function CardFace({ card, small = false, muted = false }: { card: TwentyNineCard; small?: boolean; muted?: boolean }) {
  const suit = suitInfo(card.suit);
  return (
    <div className={cn(
      "twenty-nine-playing-card relative flex shrink-0 select-none flex-col justify-between overflow-hidden rounded-[0.62rem] border font-black",
      small ? "h-[6.1rem] w-[4.35rem] p-1.5" : "h-[9.3rem] w-[6.65rem] p-2.5",
      muted ? "border-white/15 bg-[#0c1618]" : "border-[#d9e4dc] bg-[linear-gradient(145deg,#fffef8,#dce8df)] text-[#101a18]"
    )}>
      {!muted ? <span className="pointer-events-none absolute -right-3 -top-4 h-14 w-14 rounded-full border border-black/5" /> : null}
      <div className="relative z-10 flex items-start justify-between gap-1">
        <span className={cn(small ? "text-sm" : "text-xl", muted && "text-white")}>{card.rank}</span>
        <SuitMark suit={card.suit} color={muted ? "#8ac8b2" : suit.color} size={small ? 16 : 23} />
      </div>
      <div className="relative z-10 grid flex-1 place-items-center">
        <SuitMark suit={card.suit} color={muted ? "#8ac8b2" : suit.color} size={small ? 31 : 48} />
      </div>
      <div className="relative z-10 flex items-end justify-between">
        <span className={cn(small ? "text-[0.62rem]" : "text-xs", muted ? "text-white/60" : "text-zinc-500")}>{card.points ? `${card.points} PT` : ""}</span>
        <span className={cn(small ? "text-sm" : "text-xl", muted && "text-white")}>{card.rank}</span>
      </div>
      {/* Sprite is layered over the procedural face; a missing image transparently falls back. */}
      <CardSprite rank={card.rank} suit={card.suit} className="absolute inset-0 z-20 h-full w-full object-fill" />
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

function ScoreCardBack() {
  return (
    <div className="twenty-nine-score-card-back relative h-full w-full overflow-hidden rounded-[0.62rem] border border-emerald-100/45 bg-[linear-gradient(145deg,#14533d,#06251d_54%,#03130f)] shadow-[0_9px_22px_rgba(0,0,0,.4)]">
      <div className="absolute inset-[5%] rounded-[0.48rem] border border-emerald-100/35" />
      <div className="absolute inset-[18%] rotate-45 rounded-[0.5rem] border border-emerald-100/55 bg-emerald-200/[0.07]" />
      <div className="absolute inset-[27%] rotate-45 rounded-[0.35rem] border border-emerald-100/35" />
      <div className="absolute inset-0 grid place-items-center text-emerald-50/85"><span className="text-xl font-black tracking-tight">29</span></div>
    </div>
  );
}

function ScoreCardFace({ suit, points, positive }: { suit: TwentyNineSuit; points: number; positive: boolean }) {
  const isRed = positive;
  const scoreText = points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "6";
  const ink = isRed ? "#bf1735" : "#121923";
  return (
    <div className="twenty-nine-score-card-face relative h-full w-full overflow-hidden rounded-[0.62rem] border border-white/80 bg-[#fffdf6] shadow-[0_8px_22px_rgba(0,0,0,.38)]" style={{ color: ink }}>
      <CardSprite rank="6" suit={suit} className="absolute inset-0 z-0 h-full w-full object-fill" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(145deg,rgba(255,255,255,.10),transparent_44%,rgba(0,0,0,.07))]" />
      <div className="relative z-20 flex items-start justify-between px-1.5 pt-1 text-xs font-black leading-none">
        <span>6</span><SuitMark suit={suit} color={ink} size={12} />
      </div>
      <div className="absolute inset-x-1 top-[32%] z-20 grid h-[36%] place-items-center rounded-md border border-white/25 bg-white/84 shadow-sm">
        <span className="text-[1.05rem] font-black leading-none tracking-tight">{scoreText}</span>
        <SuitMark suit={suit} color={ink} size={16} />
      </div>
      <div className="absolute bottom-1 right-1.5 z-20 rotate-180 text-xs font-black leading-none">6</div>
    </div>
  );
}

function TeamScore({ team, points, caption }: { team: number; points: number; caption: string }) {
  const isWest = team === 0;
  const absolute = Math.min(6, Math.abs(points));
  const positive = points > 0;
  const negative = points < 0;
  const accent = negative ? "#cbd5e1" : "#fb7185";
  return (
    <div className={cn(
      "flex min-w-[10.4rem] items-center gap-2 rounded-xl border px-2 py-1.5",
      isWest ? "border-emerald-200/20 bg-emerald-200/[0.045]" : "border-sky-200/20 bg-sky-200/[0.045]"
    )}>
      <div className="relative h-[4.65rem] w-[3.3rem] shrink-0" aria-label={`${caption}: ${points} game points`}>
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ x: positive ? -5 : negative ? -1 : -3, y: positive ? 2 : 0, rotate: positive ? -8 : -5, opacity: positive ? 1 : negative ? 0.2 : 0.35, scale: positive && absolute === 6 ? 1.04 : 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          <ScoreCardFace suit="hearts" points={positive ? points : 0} positive />
        </motion.div>
        <motion.div
          className="absolute inset-0 z-10"
          animate={{ x: negative ? 4 : positive ? 5 : 2, y: negative ? 1 : 3, rotate: negative ? 8 : 5, opacity: negative ? 1 : positive ? 0.2 : 0.35, scale: negative && absolute === 6 ? 1.04 : 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          <ScoreCardFace suit="spades" points={negative ? points : 0} positive={false} />
        </motion.div>
        <motion.div
          className="absolute inset-0 z-30"
          animate={{ opacity: points === 0 ? 1 : 0, rotate: points === 0 ? 0 : positive ? 28 : -28, x: points === 0 ? 0 : positive ? 56 : -56, y: points === 0 ? 0 : -15, scale: points === 0 ? 1 : 0.94 }}
          transition={{ type: "spring", stiffness: 250, damping: 22 }}
          aria-hidden="true"
        >
          <ScoreCardBack />
        </motion.div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.56rem] font-black uppercase tracking-[0.15em]", isWest ? "text-emerald-100/65" : "text-sky-100/65")}>{caption}</p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <strong className="text-xl font-black leading-none text-white">{points > 0 ? `+${points}` : points}</strong>
          <span className="text-[0.58rem] font-bold text-white/35">/ ±6</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1" aria-label={`${absolute} of 6 points`}>
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="h-1.5 flex-1 rounded-full transition-colors" style={{ backgroundColor: index < absolute ? accent : "rgba(255,255,255,.12)" }} />
          ))}
        </div>
        <p className="mt-1 text-[0.53rem] font-bold text-white/35">{points === 0 ? "Score card hidden" : positive ? (absolute === 6 ? "🏆 +6 · WIN" : `❤️ +${absolute} progress`) : absolute === 6 ? "♠ −6 · LOSS" : `♠ −${absolute} progress`}</p>
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
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  const me = state.players.find((player) => player.userId === currentUserId);
  const sortedHand = useMemo(() => (me?.hand ?? []).slice().sort((left, right) => {
    const suitDelta = CARD_SUIT_ORDER[left.suit] - CARD_SUIT_ORDER[right.suit];
    if (suitDelta !== 0) return suitDelta;
    const rankDelta = (CARD_RANK_ORDER[left.rank] ?? 99) - (CARD_RANK_ORDER[right.rank] ?? 99);
    if (rankDelta !== 0) return rankDelta;
    return left.id.localeCompare(right.id);
  }), [me?.hand]);
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
  const activeWinningCardId = useMemo(() => currentWinningCardId(state), [state.currentTrick, state.trumpRevealed, state.trumpSuit]);

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
    const player = state.players.find((item) => item.userId === playerId);
    const isTakingTrick = Boolean(card && card.id === activeWinningCardId);
    const isActive = state.currentPlayerId === playerId;
    return (
      <div key={playerId} className={cn("relative flex min-w-0 flex-col items-center gap-1.5", isTakingTrick && "twenty-nine-winning-play") }>
        <div className={cn(
          "max-w-full truncate rounded-full border px-2 py-1 text-[0.61rem] font-black",
          isActive ? "border-emerald-100/40 bg-emerald-200/10 text-emerald-50" : "border-white/[0.08] bg-black/20 text-white/55"
        )}>{player?.displayName ?? "Player"}{playerId === currentUserId ? " · You" : ""}</div>
        <div className="relative flex h-[9.45rem] w-[6.75rem] items-center justify-center">
          <AnimatePresence mode="wait">
            {card ? (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: -15, rotate: 0, scale: 0.84 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -7 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: "easeOut" }}
                className={cn("relative", isTakingTrick && "rounded-xl ring-2 ring-amber-200/85 shadow-[0_0_30px_rgba(252,211,77,.3)]")}
              >
                <CardFace card={card} />
              </motion.div>
            ) : (
              <motion.div key={`${playerId}-empty`} initial={{ opacity: 0 }} animate={{ opacity: 0.48 }} className="grid h-[9.3rem] w-[6.65rem] place-items-center rounded-xl border border-dashed border-emerald-100/20 bg-black/[0.12] text-center text-[0.55rem] font-black uppercase tracking-[0.16em] text-white/25">Awaiting<br />card</motion.div>
            )}
          </AnimatePresence>
        </div>
        {card ? <span className={cn("rounded-full px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.15em]", isTakingTrick ? "border border-amber-100/35 bg-amber-200/10 text-amber-100" : "text-white/25")}>{isTakingTrick ? "👑 Taking trick" : "Played"}</span> : <span className="text-[0.52rem] font-bold text-white/20">Not played</span>}
      </div>
    );
  }

  return (
    <div className="twenty-nine-shell fixed inset-0 z-10 h-[100dvh] min-h-0 w-screen overflow-hidden text-white" style={{ backgroundImage: "linear-gradient(180deg,rgba(2,8,6,.56),rgba(2,8,6,.74)),url(/game-assets/twenty-nine/arcade-background-v1.webp)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="twenty-nine-grain pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 p-2">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#04110f]/45 px-3 py-2 shadow-[0_10px_34px_rgba(0,0,0,.2)]">
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
          <main className="flex min-h-0 flex-col gap-2">
            <section ref={tableRef} className="twenty-nine-table relative min-h-0 flex-1 overflow-hidden rounded-[1.1rem] border border-emerald-100/[0.08] shadow-[inset_0_0_56px_rgba(0,0,0,.24)]">
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

              <div className="absolute right-[2.5%] top-[2.8%] z-30 flex items-center gap-2 rounded-xl border border-emerald-100/15 bg-[#02110d]/75 px-3 py-2 shadow-lg backdrop-blur-sm">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-100/15 bg-emerald-300/[0.08] text-emerald-100">🃏</div>
                <div><span className="block text-[0.5rem] font-black uppercase tracking-[0.22em] text-emerald-100/45">Current trick</span><strong className="text-sm font-black text-white">{String(turnIndex).padStart(2, "0")} <span className="text-[0.6rem] text-white/35">/ 08</span></strong></div>
              </div>

              <div className={cn("absolute left-1/2 top-[48%] z-10 w-[min(56rem,64%)] -translate-x-1/2 -translate-y-1/2", "twenty-nine-trick-rail") }>
                <div className={cn("grid items-start justify-items-center gap-2", singleHandCaller ? "grid-cols-3" : "grid-cols-4")}>
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

            <section ref={handRef} className="relative shrink-0 overflow-visible rounded-xl border border-white/[0.07] bg-[#04120f]/45 px-3 pb-2 pt-2 shadow-none">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100/15 bg-emerald-300/[0.08] text-emerald-100"><Crown className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-black">{me?.displayName ?? "Your hand"}</p><p className="text-[0.58rem] font-bold uppercase tracking-[0.17em] text-white/35">{sittingOutSingleHand ? "Partner playing alone" : me?.team === 0 ? "Team Emerald" : "Team Sapphire"} · {(me?.hand?.length ?? 0) + (state.privateSeventhCard ? 1 : 0)} cards</p></div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[0.63rem] font-bold text-white/48"><Shield className="h-3.5 w-3.5" /> Follow suit when possible</div>
              </div>
              <AnimatePresence initial={false}>
                {state.phase === "bidding" && isMyTurn && !sittingOutSingleHand ? (
                  <motion.div
                    key={`bid-prompt-${state.handNumber}-${state.currentBid ?? "open"}`}
                    className="twenty-nine-bid-prompt absolute -top-[4.75rem] left-1/2 z-[70] flex w-[min(96%,46rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-100/35 bg-[linear-gradient(105deg,rgba(92,54,8,.96),rgba(28,21,9,.97)_55%,rgba(10,13,12,.97))] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,.45),0_0_28px_rgba(251,191,36,.13)]"
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    role="status"
                    aria-live="polite"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-100/25 bg-amber-200/10 text-amber-100"><Swords className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.23em] text-amber-100/70">🎯 Your turn to bid</p>
                      <p className="mt-0.5 truncate text-sm font-black text-white">{state.currentBid === null ? `Open the auction · minimum ${lowestLegalBid ?? 16}` : `Current bid ${state.currentBid} · ${state.highestBidderId ? playerName(state, state.highestBidderId, currentUserId) : "No bidder yet"}`}</p>
                      <p className="mt-0.5 text-[0.62rem] font-semibold text-white/55">Choose your bid, say Ditto, or pass in the controls below.</p>
                    </div>
                    <div className="hidden shrink-0 rounded-xl border border-amber-100/20 bg-black/20 px-3 py-2 text-center sm:block"><span className="block text-[0.5rem] font-black uppercase tracking-wider text-amber-100/45">Hand</span><strong className="text-lg font-black text-amber-100">{state.handNumber}</strong></div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {sittingOutSingleHand ? <div className="flex min-h-[7.7rem] flex-col items-center justify-center gap-2 rounded-xl border border-violet-200/10 bg-violet-300/[0.035] px-4 py-3 text-center"><div className="flex -space-x-3">{Array.from({ length: Math.min(me?.hand?.length ?? 0, 8) }).map((_, index) => <div key={index} className="origin-bottom" style={{ transform: `rotate(${(index - 3.5) * 2}deg)` }}><CardBack small /></div>)}</div><p className="text-xs font-black text-violet-100">You're sitting out this hand.</p><p className="max-w-md text-[0.68rem] font-semibold text-white/45">Your teammate must win all eight tricks alone. Your cards stay out of play.</p></div> : <div className="twenty-nine-hand-row flex min-h-[10.2rem] items-end justify-center gap-0 overflow-x-auto overflow-y-visible px-2 pb-2 pt-1 [scrollbar-width:thin] [scrollbar-color:rgba(52,211,153,.25)_transparent]">
                {sortedHand.map((card, index) => {
                  const canPlay = legalPlayIds.has(card.id) && isMyTurn && state.phase === "playing";
                  const fanOffset = index - (sortedHand.length - 1) / 2;
                  const fanRotate = fanOffset * (sortedHand.length >= 7 ? 1.25 : 0.9);
                  const fanLift = Math.abs(fanOffset) * 1.15;
                  const hoverMotion = !reduceMotion ? { y: canPlay ? -23 : -12, rotate: fanRotate + (fanOffset < 0 ? -1.2 : 1.2), scale: canPlay ? 1.11 : 1.05, zIndex: 100 } : null;
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      disabled={!canPlay}
                      onClick={() => play(card)}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: canPlay ? 1 : 0.9, y: -fanLift, rotate: fanRotate, scale: canPlay ? 1.015 : 1 }}
                      {...(hoverMotion ? { whileHover: hoverMotion } : {})}
                      {...(canPlay ? { whileTap: { scale: 0.96 } } : {})}
                      transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                      className={cn("relative shrink-0 rounded-xl text-left outline-none transition", canPlay ? "cursor-pointer ring-1 ring-emerald-200/65 shadow-[0_0_24px_rgba(52,211,153,.18)]" : "cursor-default opacity-90")}
                      style={{ marginLeft: index === 0 ? 0 : "-0.62rem", transformOrigin: "50% 100%", zIndex: 10 + index }}
                      title={canPlay ? "Play this card" : "Your card"}
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
