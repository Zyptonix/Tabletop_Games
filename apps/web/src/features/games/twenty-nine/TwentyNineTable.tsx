"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Crown,
  Eye,
  Flag,
  Gavel,
  History,
  LogOut,
  MessageSquare,
  PanelLeft,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Lock,
  Unlock,
  X
} from "lucide-react";
import type {
  GameEvent,
  PublicTwentyNinePlayer,
  PublicTwentyNineState,
  TwentyNineAction,
  TwentyNineCard,
  TwentyNineHandResult,
  TwentyNinePlayedCard,
  TwentyNineSuit
} from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { GameFeedbackButton } from "@/components/feedback/GameFeedbackButton";
import { GamePauseButton } from "@/components/game/GamePauseButton";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { cn } from "@/lib/utils/cn";
import {
  SuitMark,
  TwentyNineCardFace,
  TwentyNineCardBack,
  TWENTY_NINE_SUITS_INFO
} from "./TwentyNineCard";
import { TwentyNineSeat } from "./TwentyNineSeat";
import { TwentyNineTrickArea, getWinningCardId, type PersistedCompletedTrick } from "./TwentyNineTrickArea";
import { TwentyNineHandScoringModal } from "./TwentyNineHandScoringModal";
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

      <div className="grid grid-cols-8 gap-1.5 w-full">
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
  onEndMatch,
  onReadyNextTrick,
  onConfirmSingleHand,
  onReadyNextHand,
  onPause,
  onResume
}: {
  room: RoomStateView;
  state: PublicTwentyNineState;
  legalActions: unknown[];
  gameEvents?: GameEvent[];
  currentUserId: string | null;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
  onReadyNextTrick?: () => void;
  onConfirmSingleHand?: () => void;
  onReadyNextHand?: () => void;
  onPause?: ((roomId: string) => void) | undefined;
  onResume?: ((roomId: string) => void) | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Map<string, HTMLElement>>(new Map());
  const processedEvents = useRef<Set<string>>(new Set());
  const timeoutRefs = useRef<number[]>([]);
  const [handHeight, setHandHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!handRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setHandHeight(entry.target.clientHeight);
    });
    ro.observe(handRef.current);
    return () => ro.disconnect();
  }, []);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [persistedTrick, setPersistedTrick] = useState<PersistedCompletedTrick | null>(null);
  const [activeHandResult, setActiveHandResult] = useState<TwentyNineHandResult | null>(null);
  const [declinedSingleHand, setDeclinedSingleHand] = useState(false);
  const [lastHandModalOpen, setLastHandModalOpen] = useState(false);
  const lastScoredHandNum = useRef<number | null>(null);

  // 4 Players: Always exactly 4
  const me = state.players.find((p) => p.userId === currentUserId);
  const opponents = useMemo(
    () => state.players.filter((p) => p.userId !== currentUserId),
    [state.players, currentUserId]
  );
  const partner = opponents.find((p) => me && p.team === me.team);
  const declarer = state.players.find((p) => p.userId === state.declarerId);
  const isViewerDeclarer = currentUserId === state.declarerId;

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

  const highestBidder = state.players.find((p) => p.userId === state.highestBidderId);
  const isViewerHighestBidder = currentUserId === state.highestBidderId;

  const getPlayerBidInfo = (p: PublicTwentyNinePlayer) => {
    if (state.phase !== "bidding") {
      return { isHighestBidder: false, hasPassed: false, bidStatus: undefined };
    }
    const isHighest = state.highestBidderId === p.userId;
    const hasPassed = state.passedPlayerIds.includes(p.userId);

    if (isHighest && state.currentBid !== null) {
      return {
        isHighestBidder: true,
        hasPassed: false,
        bidStatus: `${state.currentBid}`
      };
    }
    if (hasPassed) {
      return {
        isHighestBidder: false,
        hasPassed: true,
        bidStatus: "Passed"
      };
    }
    const recent = [...state.bidHistory].reverse().find((b) => b.playerId === p.userId);
    if (recent) {
      if (recent.kind === "bid" || recent.kind === "ditto") {
        return {
          isHighestBidder: false,
          hasPassed: false,
          bidStatus: `Outbid (${recent.value})`
        };
      }
    }
    if (p.isCurrentTurn) {
      return {
        isHighestBidder: false,
        hasPassed: false,
        bidStatus: "Bidding…"
      };
    }
    return { isHighestBidder: false, hasPassed: false, bidStatus: undefined };
  };

  const partnerBidInfo = partner ? getPlayerBidInfo(partner) : null;
  const westBidInfo = westPlayer ? getPlayerBidInfo(westPlayer) : null;
  const eastBidInfo = eastPlayer ? getPlayerBidInfo(eastPlayer) : null;
  const myBidInfo = me ? getPlayerBidInfo(me) : null;

  // Clear persistedTrick if a new trick begins with played cards
  useEffect(() => {
    if (state.currentTrick.length > 0) {
      setPersistedTrick(null);
    }
  }, [state.currentTrick.length]);

  // Track hand result updates to trigger the Hand Scoring Ceremony modal
  useEffect(() => {
    if (state.lastHandResult && state.lastHandResult.handNumber !== lastScoredHandNum.current) {
      lastScoredHandNum.current = state.lastHandResult.handNumber;
      setActiveHandResult(state.lastHandResult);
    }
  }, [state.lastHandResult]);

  // Reset single hand declined state per hand
  useEffect(() => {
    setDeclinedSingleHand(false);
  }, [state.handNumber]);

  // Manual advance trick handler (User-requested: cards stay on table until clicked)
  const handleNextTrick = () => {
    if (!persistedTrick) return;
    const container = tableRef.current;
    if (container) {
      const from = centerOf(container);
      const myTeam = me ? me.team : 0;
      const didMyTeamWin = persistedTrick.winnerTeam === myTeam;
      const center = centerOf(container);
      const to = {
        x: didMyTeamWin ? center.x + 180 : center.x - 180,
        y: center.y
      };

      const arrivals: Flight[] = persistedTrick.cards.map((played, index) => ({
        id: `collect-${persistedTrick.trickNumber}-${played.card.id}-${index}-${Date.now()}`,
        card: played.card,
        from: {
          x: from.x + (index - 1.5) * 14,
          y: from.y + (index % 2 === 0 ? 5 : -5)
        },
        to: { x: to.x + (index - 1.5) * 6, y: to.y },
        kind: "collect" as const,
        playerName: playerName(state, persistedTrick.winnerPlayerId, currentUserId),
        delay: index * 0.05
      }));

      const arrivalIds = new Set(arrivals.map((f) => f.id));
      setFlights((curr) => [...curr, ...arrivals].slice(-8));

      const flightTimeout = window.setTimeout(
        () => {
          setFlights((curr) => curr.filter((item) => !arrivalIds.has(item.id)));
          timeoutRefs.current = timeoutRefs.current.filter((item) => item !== flightTimeout);
        },
        reduceMotion ? 350 : 800
      );
      timeoutRefs.current.push(flightTimeout);
    }

    setPersistedTrick(null);
    onReadyNextTrick?.();
  };

  const handleDismissHandScoring = () => {
    setActiveHandResult(null);
    setPersistedTrick(null);
    onReadyNextHand?.();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && persistedTrick) {
        e.preventDefault();
        handleNextTrick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [persistedTrick]);

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

        const trickNum = typeof payload.trickNumber === "number" ? payload.trickNumber : state.completedTricks.length;
        const pts = typeof payload.points === "number" ? payload.points : 0;
        const typedPlayedCards = playedCards.filter(
          (p): p is TwentyNinePlayedCard => isRecord(p) && isRecord((p as any).card) && typeof (p as any).card.id === "string"
        );
        const winningCardId = getWinningCardId(typedPlayedCards, state.trumpSuit, state.trumpRevealed);

        // Keep 4 cards on table for manual advance with prominent winner announcement so players see what was played
        setPersistedTrick({
          cards: typedPlayedCards,
          winnerPlayerId: winnerId,
          winnerTeam: typeof payload.winnerTeam === "number" ? payload.winnerTeam : 0,
          points: pts,
          trickNumber: trickNum,
          winningCardId: winningCardId ?? typedPlayedCards[0]?.card.id ?? ""
        });
        continue;
      }

      if (event.type.endsWith(":hand_scored") || event.type.endsWith(":single_hand_scored")) {
        const handRes = (payload as any).handResult as TwentyNineHandResult | undefined;
        if (handRes) {
          setActiveHandResult(handRes);
        } else if (state.lastHandResult) {
          setActiveHandResult(state.lastHandResult);
        }
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
    onConfirmSingleHand?.();
  }

  const onlineCount = room.players.filter((p) => p.connected).length;
  const isDittoLegal = hasAction(legalActions, "ditto");

  return (
    <div className="twenty-nine-shell tt-game-viewport fixed inset-0 z-10 flex flex-col h-[100dvh] w-screen overflow-hidden text-white select-none">
      {/* Background Ambience & Grain */}
      <div className="twenty-nine-grain pointer-events-none absolute inset-0 z-0" />
      <div className="twenty-nine-orbit-outer z-0" />
      <div className="twenty-nine-orbit-inner z-0" />

      {/* TOP TRANSPARENT IN-GAME HEADER (Spans edge-to-edge, never overlapped) */}
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 sm:px-6 py-2 border-b border-white/[0.08] bg-black/35 backdrop-blur-md">
        {/* Left: Logo & Game Name + Match Stats Toggle Button */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_14px_rgba(52,211,153,0.3)]">
            <span className="text-sm font-black text-emerald-300">29</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black tracking-tight text-white">
              Twenty-Nine
            </h1>
            <p className="text-[0.58rem] font-bold uppercase tracking-wider text-white/40">
              Bangladesh Arena
            </p>
          </div>

          {/* Collapsible Stats Toggle Button */}
          <button
            type="button"
            onClick={() => setLeftSidebarOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-black transition cursor-pointer ml-1 sm:ml-2",
              leftSidebarOpen
                ? "border-amber-400/80 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                : "border-white/10 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white"
            )}
            title={leftSidebarOpen ? "Collapse Match Stats" : "Open Match Stats"}
          >
            <PanelLeft className="h-4 w-4" />
            <span className="hidden md:inline">Stats</span>
          </button>
        </div>

        {/* Center: In-Game Status Alert Plaque */}
        <div className="hidden md:flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 shadow-inner backdrop-blur-md">
          {/* Match Score (Total Points: Red vs Blue) */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-[0.68rem] font-black px-2 py-0.5 rounded-full border",
              state.teamGamePoints["0"] > 0
                ? "border-rose-400/50 bg-rose-950/70 text-rose-300"
                : "border-white/10 bg-white/5 text-white/70"
            )}>
              Red {state.teamGamePoints["0"] > 0 ? `+${state.teamGamePoints["0"]}` : state.teamGamePoints["0"]}
            </span>
            <span className="text-[0.58rem] text-white/30 font-bold">vs</span>
            <span className={cn(
              "text-[0.68rem] font-black px-2 py-0.5 rounded-full border",
              state.teamGamePoints["1"] > 0
                ? "border-sky-400/50 bg-sky-950/70 text-sky-300"
                : "border-white/10 bg-white/5 text-white/70"
            )}>
              Blue {state.teamGamePoints["1"] > 0 ? `+${state.teamGamePoints["1"]}` : state.teamGamePoints["1"]}
            </span>
          </div>

          <span className="h-3 w-px bg-white/20" />

          {/* Hand # Badge */}
          <span className="text-[0.68rem] font-black uppercase tracking-wider text-white/70">
            Hand #{state.handNumber}
          </span>

          <span className="h-3 w-px bg-white/20" />

          {/* Target */}
          <span className="text-xs font-black text-amber-300">
            Target: {state.contractTarget ?? state.currentBid ?? "—"}
            {state.multiplier > 1 ? (
              <span className="ml-1 text-[0.62rem] font-extrabold text-rose-400">
                ×{state.multiplier}
              </span>
            ) : null}
          </span>

          {/* Declarer & Winning Team */}
          {declarer ? (
            <>
              <span className="h-3 w-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <span className="text-[0.68rem] font-bold text-white/50">Declarer:</span>
                <span
                  className={cn(
                    "text-xs font-black",
                    declarer.team === 0 ? "text-rose-300" : "text-sky-300"
                  )}
                >
                  {declarer.displayName}{isViewerDeclarer ? " (You)" : ""}
                </span>
                <span
                  className={cn(
                    "text-[0.58rem] font-black uppercase px-2 py-0.5 rounded-full border",
                    declarer.team === 0
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                      : "bg-sky-500/20 text-sky-300 border-sky-400/30"
                  )}
                >
                  {declarer.team === 0 ? "Team Red" : "Team Blue"}
                </span>
              </div>
            </>
          ) : state.phase === "bidding" ? (
            highestBidder && state.currentBid !== null ? (
              <div className="flex items-center gap-1.5 font-bold">
                <span className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2.5 py-0.5 text-[0.62rem] font-black text-amber-300 shadow-sm">
                  <Crown className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  High Bid: {state.currentBid}
                </span>
                <span className="text-xs text-white">
                  by{" "}
                  <strong className={isViewerHighestBidder ? "text-emerald-300" : "text-white"}>
                    {highestBidder.displayName}{isViewerHighestBidder ? " (You)" : ""}
                  </strong>
                </span>
                <span
                  className={cn(
                    "text-[0.58rem] font-black uppercase px-2 py-0.5 rounded-full border",
                    highestBidder.team === 0
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                      : "bg-sky-500/20 text-sky-300 border-sky-400/30"
                  )}
                >
                  {highestBidder.team === 0 ? "Team Red" : "Team Blue"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Bidding Opened (Min: 16)</span>
              </div>
            )
          ) : null}

          {/* Trump Suit if revealed */}
          {state.trumpRevealed && state.trumpSuit ? (
            <>
              <span className="h-3 w-px bg-white/20" />
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[0.62rem] font-black text-emerald-200">
                <Unlock className="h-2.5 w-2.5 text-emerald-300" />
                <SuitMark suit={state.trumpSuit} size={11} />
                <span>{TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}</span>
              </span>
            </>
          ) : null}
        </div>

        {/* Right: Room ID Card & Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Dedicated Room ID Div */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 shadow-sm backdrop-blur-md">
            <div>
              <span className="block text-[0.5rem] font-black uppercase tracking-widest text-emerald-400">
                Room Code
              </span>
              <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-white">
                {room.code}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 transition hover:bg-emerald-500/35 hover:text-white active:scale-95"
              title="Copy Room Code"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
          <GamePauseButton
            room={room}
            currentUserId={currentUserId}
            onPause={onPause}
            onResume={onResume}
            variant="twenty-nine"
          />

          <GameFeedbackButton
            gameId="twenty-nine"
            gameName="Twenty-Nine"
            variant="twenty-nine"
          />

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/15 hover:text-white"
            title="Rules & Point Values"
          >
            <BookOpen className="h-4 w-4" />
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
      </div>
    </header>

      {/* MAIN BODY ROW: [COLLAPSIBLE LEFT SIDEBAR] --- [CENTER ARENA] --- [RIGHT CHAT DRAWER] */}
      <div className="relative z-10 flex flex-1 min-h-0 w-full overflow-hidden">
        {/* COLLAPSIBLE LEFT TELEMETRY SIDEBAR */}
        <AnimatePresence initial={false}>
          {leftSidebarOpen ? (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-72 shrink-0 flex flex-col justify-between border-r border-white/10 bg-black/80 shadow-2xl backdrop-blur-2xl p-3 z-20 overflow-y-auto gap-2.5"
            >
              {/* Header: Title + Close Button */}
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <PanelLeft className="h-4 w-4 text-amber-300" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Match Telemetry
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftSidebarOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
          {/* 1. MATCH RACE / GAME POINTS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
                Match Points
              </span>
              <span className="text-[0.62rem] font-bold text-white/40">Race to 6</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Red Team */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2">
                <div className="flex items-center justify-between text-[0.65rem] font-black">
                  <span className="text-rose-300">RED</span>
                  <span className="text-white text-sm font-black tabular-nums">
                    {state.teamGamePoints["0"] > 0 ? `+${state.teamGamePoints["0"]}` : state.teamGamePoints["0"]}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, (Math.max(0, state.teamGamePoints["0"]) / 6) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Blue Team */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 p-2">
                <div className="flex items-center justify-between text-[0.65rem] font-black">
                  <span className="text-sky-300">BLUE</span>
                  <span className="text-white text-sm font-black tabular-nums">
                    {state.teamGamePoints["1"] > 0 ? `+${state.teamGamePoints["1"]}` : state.teamGamePoints["1"]}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, (Math.max(0, state.teamGamePoints["1"]) / 6) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CARD POINTS (THIS HAND - 28 PTS MAX) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[0.65rem] font-black uppercase tracking-wider text-amber-300">
                  Card Points
                </span>
              </div>
              <span className="text-[0.6rem] font-bold text-white/40">28 Total Pts</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Team Red Points Bar */}
              <div className="rounded-xl border border-rose-500/25 bg-rose-950/40 p-2">
                <div className="flex items-center justify-between text-[0.65rem] font-black">
                  <span className="text-rose-300">TEAM RED</span>
                  <span className="text-white tabular-nums">
                    {state.capturedPointsByTeam["0"]}{" "}
                    <span className="text-[0.55rem] text-white/40">/28 pts</span>
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (state.capturedPointsByTeam["0"] / 28) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Team Blue Points Bar */}
              <div className="rounded-xl border border-sky-500/25 bg-sky-950/40 p-2">
                <div className="flex items-center justify-between text-[0.65rem] font-black">
                  <span className="text-sky-300">TEAM BLUE</span>
                  <span className="text-white tabular-nums">
                    {state.capturedPointsByTeam["1"]}{" "}
                    <span className="text-[0.55rem] text-white/40">/28 pts</span>
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (state.capturedPointsByTeam["1"] / 28) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {state.canSkipHand ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1.5 text-[0.68rem] font-black text-emerald-200 shadow-md">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                  Target reached!
                </span>
                {hasAction(legalActions, "skip_hand") ? (
                  <button
                    type="button"
                    onClick={() => onAction("skip_hand")}
                    className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-0.5 font-black text-[0.62rem] transition active:scale-95 shadow-md"
                  >
                    Skip Hand ⏩
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* 2. HAND CONTRACT & TRUMP STATUS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[0.65rem] font-black uppercase tracking-wider text-amber-300">
                  Hand #{state.handNumber}
                </span>
              </div>
              {state.multiplier > 1 ? (
                <span className="text-[0.6rem] font-black text-rose-300 bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 rounded-full">
                  ×{state.multiplier} Stakes
                </span>
              ) : (
                <span className="text-[0.6rem] font-bold text-white/40">1× Standard</span>
              )}
            </div>

            {/* Target & Declarer Row */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5">
              <div>
                <span className="block text-[0.52rem] font-black uppercase tracking-widest text-amber-200/70">
                  Target
                </span>
                <span className="text-sm font-black text-amber-300">
                  {state.contractTarget ?? state.currentBid ?? "—"}
                </span>
              </div>
              {declarer ? (
                <div className="text-right">
                  <span className="block text-[0.52rem] font-black uppercase tracking-widest text-white/40">
                    Trump Setter
                  </span>
                  <span
                    className={cn(
                      "text-xs font-black truncate max-w-[8rem] block",
                      declarer.team === 0 ? "text-rose-300" : "text-sky-300"
                    )}
                    title={declarer.displayName}
                  >
                    {declarer.displayName} {isViewerDeclarer ? "(You)" : ""}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Trump Suit Card */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.55rem] font-black uppercase tracking-widest text-white/50">
                  Trump Status
                </span>
                {state.trumpRevealed ? (
                  <span className="flex items-center gap-1 text-[0.58rem] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    <Unlock className="h-2.5 w-2.5" /> REVEALED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[0.58rem] font-black text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                    <Lock className="h-2.5 w-2.5" /> CONCEALED
                  </span>
                )}
              </div>

              {state.singleHandPlayerId ? (
                <div className="text-xs font-black text-violet-300 flex items-center gap-1.5 mt-0.5">
                  <Swords className="h-3.5 w-3.5" /> Single Hand (Solo Play)
                </div>
              ) : state.trumpRevealed && state.trumpSuit ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <SuitMark suit={state.trumpSuit} size={18} />
                  <div>
                    <span className="text-xs font-black text-emerald-300 block">
                      {TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label} Active
                    </span>
                    <span className="text-[0.55rem] text-emerald-400/70">
                      Trump active for all players
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                    <Lock className="h-3 w-3 text-amber-300" />
                    <span>
                      {isViewerDeclarer && state.trumpSuit
                        ? `You set: ${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}`
                        : "Hidden Trump Card"}
                    </span>
                  </div>
                  <span className="text-[0.55rem] text-white/40 block mt-0.5">
                    {isViewerDeclarer ? "Hidden until revealed" : "Ask if void in lead suit"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TRICKS WON (8 SLOTS DUAL VISUALIZER) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
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

          {/* 4. LAST HAND REVIEW ACTION */}
          <div className="pt-1">
            {state.lastHandResult ? (
              <button
                type="button"
                onClick={() => setLastHandModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-600/20 py-2.5 px-3 text-xs font-black uppercase tracking-wider text-amber-200 hover:from-amber-500/30 hover:to-amber-600/30 transition shadow-lg w-full active:scale-95 cursor-pointer"
                title="Review Last Hand Results"
              >
                <History className="h-4 w-4 text-amber-300" />
                <span>Review Last Hand</span>
              </button>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] py-2 px-3 text-center text-[0.6rem] text-white/30 italic">
                First hand in progress
              </div>
            )}
          </div>
        </motion.aside>
          ) : null}
        </AnimatePresence>

        {/* Floating Toggle Button when Collapsed */}
        {!leftSidebarOpen ? (
          <button
            type="button"
            onClick={() => setLeftSidebarOpen(true)}
            className="absolute left-2.5 top-3 z-30 flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/80 px-2.5 py-1.5 text-[0.68rem] font-black text-amber-300 shadow-xl backdrop-blur-md transition hover:bg-black/90 hover:border-amber-400/50 cursor-pointer"
            title="Open Match Statistics"
          >
            <PanelLeft className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Stats</span>
          </button>
        ) : null}

        {/* MAIN ARENA COLUMN - 100% Open Space, No Rectangular Table Enclosure */}
        <div className="relative z-10 flex flex-1 min-w-0 flex-col justify-between p-1.5 sm:p-2.5 transition-all duration-300 overflow-hidden">
          {/* OPEN PLAY ARENA */}
          <main
            ref={tableRef}
            className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center p-1 sm:p-2 overflow-hidden select-none"
          >
            {/* TOP (NORTH) PARTNER SEAT - Shifted Top-Left so vertical center is 100% open */}
            {partner ? (
              <div
                ref={(el) => registerSeat(partner.userId, el)}
                className="absolute top-2.5 sm:top-3.5 left-40 sm:left-48 lg:left-60 z-20 pointer-events-auto"
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
                    bidStatus={partnerBidInfo?.bidStatus}
                    isHighestBidder={partnerBidInfo?.isHighestBidder}
                    hasPassed={partnerBidInfo?.hasPassed}
                  />
                </div>
              ) : null}

              {/* WEST OPPONENT SEAT - Embedded inside stadium felt left perimeter */}
              {westPlayer ? (
                <div
                  ref={(el) => registerSeat(westPlayer.userId, el)}
                  className="absolute left-3 sm:left-5 lg:left-8 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                >
                  <TwentyNineSeat
                    player={westPlayer}
                    roomPlayer={room.players.find((p) => p.userId === westPlayer.userId)}
                    roleLabel="⚔️ Opponent"
                    isDealer={state.dealerPlayerId === westPlayer.userId}
                    isDeclarer={state.declarerId === westPlayer.userId}
                    isSingleHand={state.singleHandPlayerId === westPlayer.userId}
                    bidStatus={westBidInfo?.bidStatus}
                    isHighestBidder={westBidInfo?.isHighestBidder}
                    hasPassed={westBidInfo?.hasPassed}
                  />
                </div>
              ) : null}

              {/* EAST OPPONENT SEAT - Embedded inside stadium felt right perimeter */}
              {eastPlayer ? (
                <div
                  ref={(el) => registerSeat(eastPlayer.userId, el)}
                  className="absolute right-3 sm:right-5 lg:right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                >
                  <TwentyNineSeat
                    player={eastPlayer}
                    roomPlayer={room.players.find((p) => p.userId === eastPlayer.userId)}
                    roleLabel="⚔️ Opponent"
                    isDealer={state.dealerPlayerId === eastPlayer.userId}
                    isDeclarer={state.declarerId === eastPlayer.userId}
                    isSingleHand={state.singleHandPlayerId === eastPlayer.userId}
                    bidStatus={eastBidInfo?.bidStatus}
                    isHighestBidder={eastBidInfo?.isHighestBidder}
                    hasPassed={eastBidInfo?.hasPassed}
                  />
                </div>
              ) : null}

              {/* INTERACTIVE TRUMP SET & DOUBLING DIALOGUE (Screenshot 1) */}
              <AnimatePresence>
                {state.phase === "doubling" ? (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute z-50 rounded-3xl border-4 border-[#8a5326] bg-gradient-to-b from-[#5c3012] via-[#3d1e0a] to-[#241105] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-center text-white max-w-sm w-full mx-4 backdrop-blur-md"
                  >
                    <div className="text-base sm:text-lg font-black text-amber-200">
                      {declarer?.displayName ?? "Declarer"} Set Trump
                    </div>
                    <div className="text-sm font-bold text-white/90 mt-1">
                      Target Point: <span className="text-amber-300 font-extrabold">{state.contractTarget ?? state.currentBid}</span>
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">
                      Trump Type: {state.selectedTrumpMode === "seventh" ? "7th Card" : "Hand Suit"}
                    </div>
                    {state.multiplier > 1 ? (
                      <div className="mt-1 text-xs font-black text-rose-300">
                        Stakes: ×{state.multiplier}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-center gap-3">
                      {isMyTurn && hasAction(legalActions, "double") ? (
                        <button
                          type="button"
                          onClick={() => onAction("double")}
                          className="rounded-xl border border-rose-400 bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-lg hover:bg-rose-500 active:scale-95 transition"
                        >
                          Double (×2)
                        </button>
                      ) : null}

                      {isMyTurn && hasAction(legalActions, "pass_double") ? (
                        <button
                          type="button"
                          onClick={() => onAction("pass_double")}
                          className="rounded-xl border border-amber-400/80 bg-amber-600 px-6 py-2 text-xs font-black text-white shadow-lg hover:bg-amber-500 active:scale-95 transition"
                        >
                          OK
                        </button>
                      ) : isMyTurn && hasAction(legalActions, "continue_contract") ? (
                        <button
                          type="button"
                          onClick={() => onAction("continue_contract")}
                          className="rounded-xl border border-amber-400/80 bg-amber-600 px-6 py-2 text-xs font-black text-white shadow-lg hover:bg-amber-500 active:scale-95 transition"
                        >
                          OK
                        </button>
                      ) : (
                        <div className="text-xs text-white/50 italic animate-pulse">
                          Waiting for {currentTurnName}…
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* INTERACTIVE SINGLE HAND PROMPT DIALOGUE (Screenshot 2) */}
              <AnimatePresence>
                {state.phase === "playing" && state.completedTricks.length === 0 && state.currentTrick.length === 0 && hasAction(legalActions, "declare_single_hand") && !declinedSingleHand ? (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute z-50 rounded-3xl border-4 border-[#8a5326] bg-gradient-to-b from-[#5c3012] via-[#3d1e0a] to-[#241105] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-center text-white max-w-sm w-full mx-4 backdrop-blur-md"
                  >
                    <div className="text-base sm:text-lg font-black text-white">
                      Do you want to play Single Hand?
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      You must win all 8 tricks alone without a trump suit (±3 game points).
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          onAction("declare_single_hand");
                          onConfirmSingleHand?.();
                        }}
                        className="rounded-xl border border-emerald-400 bg-emerald-600 px-6 py-2 text-xs font-black text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeclinedSingleHand(true);
                          onConfirmSingleHand?.();
                        }}
                        className="rounded-xl border border-white/20 bg-white/10 px-6 py-2 text-xs font-black text-white shadow-lg hover:bg-white/20 active:scale-95 transition"
                      >
                        No
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* CENTER TRICK ARENA (Enlarged Compass Cards, Points & Crown) */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <TwentyNineTrickArea
                  trick={state.currentTrick}
                  state={state}
                  currentUserId={currentUserId}
                  persistedCompletedTrick={persistedTrick}
                  onRevealTrump={() => onAction("reveal_trump")}
                  canRevealTrump={hasAction(legalActions, "reveal_trump")}
                  onNextTrick={handleNextTrick}
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

              {/* EVENT POPUP OVERLAY (Positioned directly above the hand cards, anchored to the right) */}
              <TwentyNineEventOverlay
                gameEvents={gameEvents}
                state={state}
                currentUserId={currentUserId}
              />

              {/* HAND SCORING CEREMONY MODAL (Centered directly on Table Felt) */}
              <TwentyNineHandScoringModal
                result={activeHandResult}
                state={state}
                currentUserId={currentUserId}
                onDismiss={handleDismissHandScoring}
              />

              {/* LAST HAND REVIEW MODAL (Centered directly on Table Felt) */}
              {lastHandModalOpen && state.lastHandResult ? (
                <TwentyNineHandScoringModal
                  result={state.lastHandResult}
                  state={state}
                  currentUserId={currentUserId}
                  onDismiss={() => setLastHandModalOpen(false)}
                  isReview
                />
              ) : null}
            </main>

        {/* BOTTOM DOCK: ACTIONS & PLAYER'S HAND */}
        <footer className="shrink-0 flex flex-col items-center gap-2">
          {/* CONTEXTUAL ACTION BAR */}
          <div className="z-30 flex flex-wrap items-center justify-center gap-2">
            {/* AUCTION BIDDING BAR */}
            {state.phase === "bidding" && isMyTurn && !sittingOutSingleHand ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-400/40 bg-black/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
                {/* Winning Bid Status Banner */}
                <div className="flex items-center justify-between w-full border-b border-white/10 pb-1.5 gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
                      Winning Bid:
                    </span>
                    {highestBidder && state.currentBid !== null ? (
                      <span className="flex items-center gap-1 font-black text-amber-300">
                        <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <strong className="text-sm">{state.currentBid}</strong> by{" "}
                        <span className={highestBidder.userId === currentUserId ? "text-emerald-300" : "text-white"}>
                          {highestBidder.userId === currentUserId
                            ? "You (Leading!)"
                            : `${highestBidder.displayName} (${highestBidder.team === 0 ? "Team Red" : "Team Blue"})`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold">
                        None yet · Minimum: <strong>16</strong>
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-amber-300 animate-pulse">
                    Your Turn to Bid
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
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
                        : "Ditto is only available to match an opposing team's bid"
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
                {hasAction(legalActions, "skip_hand") ? (
                  <button
                    type="button"
                    onClick={() => onAction("skip_hand")}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-[0_0_24px_rgba(52,211,153,0.5)] transition hover:brightness-110 active:scale-95 animate-pulse"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Target Reached · Skip Hand ⏩
                  </button>
                ) : null}
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

            {/* YOUR TURN FLOATING PROMPT (Screenshot 5) */}
            {isMyTurn && state.phase === "playing" ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: [1, 1.06, 1], opacity: 1 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-1 text-xs font-black uppercase tracking-wider shadow-[0_0_22px_rgba(251,191,36,0.85)] ring-2",
                  state.trumpRevealed &&
                  state.trumpRevealerPlayerId === currentUserId &&
                  state.completedTricks.length === state.trumpRevealTrickNumber &&
                  state.trumpSuit &&
                  sortedHand.some((c) => c.suit === state.trumpSuit)
                    ? "border-amber-200 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 ring-amber-300 shadow-[0_0_28px_rgba(251,146,60,0.9)] animate-pulse"
                    : "border-amber-300/90 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 ring-amber-200"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-current animate-spin" />
                <span>
                  {state.trumpRevealed &&
                  state.trumpRevealerPlayerId === currentUserId &&
                  state.completedTricks.length === state.trumpRevealTrickNumber &&
                  state.trumpSuit &&
                  sortedHand.some((c) => c.suit === state.trumpSuit)
                    ? "Must Play Trump ⚡"
                    : "Your Turn"}
                </span>
              </motion.div>
            ) : null}

            {/* WAITING FOR ANOTHER PLAYER INDICATOR */}
            {!isMyTurn && state.phase !== "finished" && !hasAction(legalActions, "declare_single_hand") ? (
              state.phase === "bidding" ? (
                <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/80 px-4 py-1.5 text-xs font-bold text-white/80 shadow-lg backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  {highestBidder && state.currentBid !== null ? (
                    <span>
                      High Bid: <strong className="text-amber-300">{state.currentBid}</strong> by <strong className="text-white">{isViewerHighestBidder ? "You (Leading!)" : highestBidder.displayName}</strong> ({highestBidder.team === 0 ? "Red" : "Blue"}) · Waiting for <span className="text-amber-200">{currentTurnName}</span> to bid…
                    </span>
                  ) : (
                    <span>
                      Bidding Opened (Min: 16) · Waiting for <span className="text-amber-200">{currentTurnName}</span> to bid…
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-1 text-xs font-bold text-white/50 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Waiting for {currentTurnName}…</span>
                </div>
              )
            ) : null}
          </div>

          {/* Bottom Dock Row: [Player Hand Fan] */}
          <div className="flex w-full items-end justify-center max-w-4xl">
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
                  {myBidInfo?.isHighestBidder ? (
                    <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2 py-0.5 text-[0.62rem] font-black uppercase text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                      <Crown className="h-3 w-3 fill-black text-black shrink-0" />
                      Winning Bid ({state.currentBid})
                    </span>
                  ) : myBidInfo?.hasPassed ? (
                    <span className="rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[0.62rem] font-black uppercase text-white/40">
                      Passed
                    </span>
                  ) : myBidInfo?.bidStatus ? (
                    <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[0.62rem] font-bold text-white/70">
                      {myBidInfo.bidStatus}
                    </span>
                  ) : null}
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">
                    {(me?.hand?.length ?? 0) + (state.privateSeventhCard ? 1 : 0)} cards in hand
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-white/50 text-[0.68rem]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>
                    {state.trumpRevealed &&
                    state.trumpRevealerPlayerId === currentUserId &&
                    state.completedTricks.length === state.trumpRevealTrickNumber &&
                    state.trumpSuit &&
                    sortedHand.some((c) => c.suit === state.trumpSuit)
                      ? "You revealed trump · Must play a trump card!"
                      : "Follow lead suit when possible"}
                  </span>
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

              {/* Clickable Transparent Veil to Advance to Next Trick */}
              <AnimatePresence>
                {persistedTrick ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleNextTrick}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-black/80 backdrop-blur-md border-2 border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.35)] cursor-pointer transition hover:bg-black/70 group select-none p-3"
                  >
                    <div className="flex items-center gap-2 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-wider drop-shadow-md">
                      <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
                      <span>
                        Trick {persistedTrick.trickNumber} Won by {playerName(state, persistedTrick.winnerPlayerId, currentUserId)} (+{persistedTrick.points} pts)
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 px-6 py-2 text-xs font-black uppercase tracking-wider text-black shadow-lg ring-2 ring-amber-300/60 group-hover:scale-105 group-active:scale-95 transition-transform">
                      <span>Next Trick</span>
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </div>

                    <span className="text-[0.62rem] font-semibold text-white/50 mt-1.5">
                      Click anywhere on your hand or press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono text-[0.6rem] text-amber-200">Space</kbd> to continue
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
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
      </div>

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
                    Bids range 16 to 28. Bidding proceeds clockwise in head-to-head duels. Opponents can raise or match with Ditto until one passes. Last remaining bidder sets the contract.
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
