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
import { preloadTwentyNineCards } from "@/lib/playing-card-assets";
import { TwentyNineSeat } from "./TwentyNineSeat";
import { TwentyNineTrickArea, getWinningCardId, type PersistedCompletedTrick } from "./TwentyNineTrickArea";
import { TwentyNineHandScoringModal } from "./TwentyNineHandScoringModal";

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
      label: `${playerName(state, String(payload.playerId ?? ""), currentUserId)} called Achii (Ditto) (${String(payload.value ?? "")})`,
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
      label: `Marriage declared! Target adjusted by ±4`,
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

  // Preload and stash all 32 cards + card backs into memory so dealing/trick animations never hitch or pop in
  useEffect(() => {
    preloadTwentyNineCards();
  }, []);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [persistedTrick, setPersistedTrick] = useState<PersistedCompletedTrick | null>(null);
  const [activeHandResult, setActiveHandResult] = useState<TwentyNineHandResult | null>(null);
  const [declinedSingleHand, setDeclinedSingleHand] = useState(false);
  const [lastHandModalOpen, setLastHandModalOpen] = useState(false);
  const lastScoredHandNum = useRef<number | null>(null);

  // Cinematic Fullscreen Event Modals (Marriage, Doubling/Redoubling)
  const [marriageAnnouncement, setMarriageAnnouncement] = useState<{
    id: string;
    playerId: string;
    playerName: string;
    team: number;
    trumpSuit: TwentyNineSuit;
    contractTarget: number;
  } | null>(null);

  const [doubleAnnouncement, setDoubleAnnouncement] = useState<{
    id: string;
    kind: "double" | "redouble";
    multiplier: number;
    actorName: string;
  } | null>(null);

  const isInitialMount = useRef(true);
  const processedMajorEvents = useRef<Set<string>>(new Set());

  // Watch for major events: Marriage (Pair), Double, Redouble
  useEffect(() => {
    if (!gameEvents || gameEvents.length === 0) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      for (const event of gameEvents) {
        if (event?.id) processedMajorEvents.current.add(event.id);
      }
      return;
    }

    for (let i = 0; i < gameEvents.length; i++) {
      const event = gameEvents[i];
      if (!event || processedMajorEvents.current.has(event.id)) continue;
      processedMajorEvents.current.add(event.id);

      if (event.type === "twenty-nine:pair") {
        const payload = isRecord(event.payload) ? event.payload : {};
        const pId = typeof payload.playerId === "string" ? payload.playerId : "";
        const pName = playerName(state, pId, currentUserId);
        const tm = typeof payload.team === "number" ? payload.team : 0;
        const suit = state.trumpSuit ?? "spades";
        const target = typeof payload.contractTarget === "number" ? payload.contractTarget : (state.contractTarget ?? 16);
        setMarriageAnnouncement({
          id: event.id,
          playerId: pId,
          playerName: pName,
          team: tm,
          trumpSuit: suit,
          contractTarget: target
        });
        setTimeout(() => {
          setMarriageAnnouncement(null);
        }, 4500);
      }

      if (event.type === "twenty-nine:double" || event.type === "twenty-nine:redouble") {
        const payload = isRecord(event.payload) ? event.payload : {};
        const pId = typeof payload.playerId === "string" ? payload.playerId : "";
        const pName = playerName(state, pId, currentUserId);
        const isRed = event.type === "twenty-nine:redouble";
        setDoubleAnnouncement({
          id: event.id,
          kind: isRed ? "redouble" : "double",
          multiplier: isRed ? 4 : 2,
          actorName: pName
        });
        setTimeout(() => {
          setDoubleAnnouncement(null);
        }, 4500);
      }
    }
  }, [gameEvents, state.trumpSuit, state.contractTarget, currentUserId, state]);

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

  const myTeam = me ? me.team : 0;
  const opponentTeam = myTeam === 0 ? 1 : 0;
  const myTeamTricks = state.tricksWonByTeam[String(myTeam) as "0" | "1"] ?? 0;
  const opponentTricks = state.tricksWonByTeam[String(opponentTeam) as "0" | "1"] ?? 0;
  const myTeamPoints = state.capturedPointsByTeam[String(myTeam) as "0" | "1"] ?? 0;
  const opponentPoints = state.capturedPointsByTeam[String(opponentTeam) as "0" | "1"] ?? 0;
  const canRevealTrump = hasAction(legalActions, "reveal_trump") && isMyTurn;

  const highestBidder = state.players.find((p) => p.userId === state.highestBidderId);
  const isViewerHighestBidder = currentUserId === state.highestBidderId;

  const getPlayerBidInfo = (p: PublicTwentyNinePlayer) => {
    if (state.phase === "bidding") {
      const isHighest = state.highestBidderId === p.userId;
      const hasPassed = state.passedPlayerIds.includes(p.userId);
      const recent = [...state.bidHistory].reverse().find((b) => b.playerId === p.userId);

      if (isHighest && state.currentBid !== null) {
        const isAchii = recent?.kind === "ditto";
        return {
          isHighestBidder: true,
          hasPassed: false,
          bidStatus: isAchii ? `Achii (${state.currentBid})` : `${state.currentBid}`
        };
      }
      if (hasPassed) {
        return {
          isHighestBidder: false,
          hasPassed: true,
          bidStatus: "Passed"
        };
      }
      if (recent) {
        if (recent.kind === "ditto") {
          return {
            isHighestBidder: false,
            hasPassed: false,
            bidStatus: `Achii (${recent.value})`
          };
        }
        if (recent.kind === "bid") {
          return {
            isHighestBidder: false,
            hasPassed: false,
            bidStatus: `Bid ${recent.value}`
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
    }

    if (state.phase === "doubling") {
      if (state.doubleByPlayerId === p.userId) {
        return { isHighestBidder: false, hasPassed: false, bidStatus: "Double (×2)" };
      }
      if (state.passedPlayerIds.includes(p.userId)) {
        return { isHighestBidder: false, hasPassed: true, bidStatus: "Passed" };
      }
      if (p.isCurrentTurn) {
        return { isHighestBidder: false, hasPassed: false, bidStatus: "Thinking…" };
      }
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
      const winnerId = persistedTrick.winnerPlayerId;
      const winnerElement =
        winnerId === currentUserId ? handRef.current : seatRefs.current.get(winnerId) ?? null;
      const to = getCenter(winnerElement, container) ?? {
        x: persistedTrick.winnerTeam === (me?.team ?? 0) ? centerOf(container).x + 180 : centerOf(container).x - 180,
        y: centerOf(container).y
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

      if (event.type.endsWith(":deal_cancelled")) {
        if (state.lastHandResult) {
          setActiveHandResult(state.lastHandResult);
        }
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
        </div>

        {/* Center: In-Game Status Alert Plaque (Note #8: Integrated Trick Status Pill) */}
        <div className="hidden md:flex items-center gap-2.5 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 shadow-inner backdrop-blur-md">
          {/* Trick Number / Auction Status Pill */}
          {state.phase === "bidding" ? (
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Gavel className="h-3.5 w-3.5" />
              <span>Auction Phase · Hand #{state.handNumber}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-black">
              <span className="text-amber-300">
                Trick {state.completedTricks.length + 1} of 8
              </span>
              {state.currentTrick[0] ? (
                <>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1 text-white">
                    <SuitMark suit={state.currentTrick[0].card.suit} size={13} />
                    <span>Lead: {TWENTY_NINE_SUITS_INFO[state.currentTrick[0].card.suit]?.label}</span>
                  </div>
                </>
              ) : null}
              {state.currentTrick.reduce((sum, c) => sum + (c.card.points ?? 0), 0) > 0 ? (
                <>
                  <span className="text-white/20">|</span>
                  <span className="text-amber-300">
                    +{state.currentTrick.reduce((sum, c) => sum + (c.card.points ?? 0), 0)} pts
                  </span>
                </>
              ) : null}
            </div>
          )}

          <span className="h-3 w-px bg-white/20" />

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
        {/* OPEN STADIUM FELT ARENA */}

        {/* MAIN ARENA CANVAS - 100% Full Viewport Canvas */}
        <main
          ref={tableRef}
          className="relative z-10 flex flex-1 min-w-0 h-full w-full overflow-hidden select-none"
        >
            {/* 1. TOP-LEFT: HAND CONTRACT & TARGET (Free-standing widget on felt) */}
            <div className="absolute left-3 sm:left-10 top-3 sm:top-5 z-20 w-44 sm:w-52 scale-125 rounded-2xl border border-white/10 bg-black/75 p-2.5 sm:p-3 shadow-xl backdrop-blur-md pointer-events-auto">
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
                  <span className="text-[0.58rem] font-bold text-white/40">1× Std</span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="block text-[0.52rem] font-black uppercase tracking-widest text-amber-200/70">
                    Contract Target
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300">
                    {state.contractTarget ?? state.currentBid ?? "—"}
                  </span>
                </div>
                {declarer ? (
                  <div className="text-right">
                    <span className="block text-[0.52rem] font-black uppercase tracking-widest text-white/40">
                      Declarer
                    </span>
                    <span
                      className={cn(
                        "text-xs font-black truncate max-w-[6.5rem] block",
                        declarer.team === 0 ? "text-rose-300" : "text-sky-300"
                      )}
                      title={declarer.displayName}
                    >
                      {declarer.displayName} {isViewerDeclarer ? "(You)" : ""}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* TOP-RIGHT: TRUMP SUIT STATUS (Eye-Catching Golden Glow Panel) */}
            <div className="absolute right-3 sm:right-6 top-3 sm:top-5 z-20 w-56 sm:w-64 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-black/90 via-black/85 to-[#261506]/90 p-3 sm:p-3.5 shadow-[0_0_25px_rgba(251,191,36,0.25)] backdrop-blur-xl pointer-events-auto transition-all">
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-[0.68rem] font-black uppercase tracking-wider text-amber-200">
                    Trump Suit
                  </span>
                </div>
                {state.trumpRevealed ? (
                  <span className="flex items-center gap-1 text-[0.6rem] font-black text-emerald-300 bg-emerald-500/25 px-2 py-0.5 rounded-full border border-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse">
                    <Unlock className="h-3 w-3" /> REVEALED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[0.6rem] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                    <Lock className="h-3 w-3" /> CONCEALED
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                {state.singleHandPlayerId ? (
                  <div className="text-xs font-black text-violet-300 flex items-center gap-1.5 p-1 rounded-lg bg-violet-950/40 border border-violet-500/30">
                    <Swords className="h-4 w-4 text-violet-400" /> Single Hand (Solo)
                  </div>
                ) : state.trumpRevealed && state.trumpSuit ? (
                  <div className="flex items-center gap-2.5 p-1 rounded-xl bg-white/5 border border-white/10">
                    <div className="p-1.5 rounded-lg bg-white shadow-md">
                      <SuitMark suit={state.trumpSuit} size={26} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-emerald-300 block leading-tight">
                        {TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label}
                      </span>
                      <span className="text-[0.58rem] font-bold text-emerald-400/80">
                        Active trump for all tricks
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-amber-500/10 border border-amber-400/20">
                    <div className="p-2 rounded-lg bg-black/60 border border-amber-400/40">
                      <Lock className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white/90 block leading-tight">
                        {isViewerDeclarer && state.trumpSuit
                          ? `${TWENTY_NINE_SUITS_INFO[state.trumpSuit]?.label} (Secret)`
                          : "Hidden Trump Card"}
                      </span>
                      <span className="text-[0.56rem] font-semibold text-amber-200/60 block mt-0.5">
                        {isViewerDeclarer ? "You set this trump" : "Click felt card or ask when void"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TOP (NORTH) PARTNER SEAT - Shifted 400px to right per user request */}
            {partner ? (
              <div
                ref={(el) => registerSeat(partner.userId, el)}
                className="absolute top-2 sm:top-3.5 left-1/2 -translate-x-1/2 ml-[360px] xl:ml-[400px] z-20 pointer-events-auto"
              >
                <TwentyNineSeat
                  player={partner}
                  roomPlayer={room.players.find((p) => p.userId === partner.userId)}
                  className="scale-[1.2] origin-top"
                  roleLabel="🤝 Teammate"
                  isDealer={state.dealerPlayerId === partner.userId}
                  isDeclarer={state.declarerId === partner.userId}
                  contractTarget={state.declarerId === partner.userId ? (state.contractTarget ?? state.currentBid) : undefined}
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

            {/* WEST OPPONENT SEAT - Moved up to utilize open upper stadium space */}
            {westPlayer ? (
              <div
                ref={(el) => registerSeat(westPlayer.userId, el)}
                className="absolute left-3 sm:left-5 lg:left-8 top-[28%] sm:top-[29%] -translate-y-1/2 z-20 pointer-events-auto"
              >
                <TwentyNineSeat
                  player={westPlayer}
                  roomPlayer={room.players.find((p) => p.userId === westPlayer.userId)}
                  className="scale-[1.2] origin-left"
                  roleLabel="⚔️ Opponent"
                  isDealer={state.dealerPlayerId === westPlayer.userId}
                  isDeclarer={state.declarerId === westPlayer.userId}
                  contractTarget={state.declarerId === westPlayer.userId ? (state.contractTarget ?? state.currentBid) : undefined}
                  isSingleHand={state.singleHandPlayerId === westPlayer.userId}
                  bidStatus={westBidInfo?.bidStatus}
                  isHighestBidder={westBidInfo?.isHighestBidder}
                  hasPassed={westBidInfo?.hasPassed}
                  fanSide="right"
                />
              </div>
            ) : null}

            {/* BELOW WEST OPPONENT SEAT: [Opponent Captured Deck] ONLY (Trump is beside center play area) */}
            <div className="absolute left-3 sm:left-5 lg:left-8 top-[calc(28%+3.6rem)] sm:top-[calc(29%+3.8rem)] z-20 flex items-center gap-2.5 sm:gap-3.5 pointer-events-auto select-none">
              {/* OPPONENT CAPTURED DECK */}
              <div className="flex flex-col items-center shrink-0">
                <span className="mb-1 text-[0.6rem] sm:text-xs font-black uppercase tracking-wider text-rose-300">
                  Opponent Deck
                </span>
                <div className="twenty-nine-felt-deck relative rounded-xl border border-white/20 overflow-hidden shadow-2xl transition hover:scale-105">
                  <TwentyNineCardBack className="h-full w-full rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-1.5 text-center">
                    <span className="text-[0.65rem] sm:text-xs font-black text-rose-200">
                      {opponentTricks} Tricks
                    </span>
                    <span className="text-[0.55rem] sm:text-[0.62rem] font-bold text-white/60">
                      {opponentPoints} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* EAST OPPONENT SEAT - Moved up to utilize open upper stadium space */}
            {eastPlayer ? (
              <div
                ref={(el) => registerSeat(eastPlayer.userId, el)}
                className="absolute right-3 sm:right-5 lg:right-8 top-[28%] sm:top-[29%] -translate-y-1/2 z-20 pointer-events-auto"
              >
                <TwentyNineSeat
                  player={eastPlayer}
                  roomPlayer={room.players.find((p) => p.userId === eastPlayer.userId)}
                  className="scale-[1.2] origin-right"
                  roleLabel="⚔️ Opponent"
                  isDealer={state.dealerPlayerId === eastPlayer.userId}
                  isDeclarer={state.declarerId === eastPlayer.userId}
                  contractTarget={state.declarerId === eastPlayer.userId ? (state.contractTarget ?? state.currentBid) : undefined}
                  isSingleHand={state.singleHandPlayerId === eastPlayer.userId}
                  bidStatus={eastBidInfo?.bidStatus}
                  isHighestBidder={eastBidInfo?.isHighestBidder}
                  hasPassed={eastBidInfo?.hasPassed}
                  fanSide="left"
                />
              </div>
            ) : null}

            {/* BELOW EAST OPPONENT SEAT: [Your Team Captured Deck] */}
            <div className="absolute right-3 sm:right-5 lg:right-8 top-[calc(28%+3.6rem)] sm:top-[calc(29%+3.8rem)] z-20 flex items-center justify-end pointer-events-auto select-none">
              <div className="flex flex-col items-center shrink-0">
                <span className="mb-1 text-[0.6rem] sm:text-xs font-black uppercase tracking-wider text-sky-300">
                  Your Team Deck
                </span>
                <div className="twenty-nine-felt-deck relative rounded-xl border border-white/20 overflow-hidden shadow-2xl transition hover:scale-105">
                  <TwentyNineCardBack className="h-full w-full rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-1.5 text-center">
                    <span className="text-[0.65rem] sm:text-xs font-black text-sky-200">
                      {myTeamTricks} Tricks
                    </span>
                    <span className="text-[0.55rem] sm:text-[0.62rem] font-bold text-white/60">
                      {myTeamPoints} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

              {/* CENTER TRICK ARENA - Stably Anchored, Zero Movement, Clear of Bidding Menu */}
              <div className="absolute left-1/2 top-[38%] sm:top-[39%] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto">
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

              {/* FULLSCREEN CINEMATIC MARRIAGE (ROYAL PAIR) ANNOUNCEMENT */}
              <AnimatePresence>
                {marriageAnnouncement && (
                  <motion.div
                    key={marriageAnnouncement.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMarriageAnnouncement(null)}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md cursor-pointer select-none p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.8, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.8, y: 20 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="relative flex flex-col items-center text-center max-w-lg rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-[#2a1708] via-black to-black p-6 sm:p-8 shadow-[0_0_60px_rgba(251,191,36,0.5)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Crown & Badge */}
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/20 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <Crown className="h-4 w-4 fill-amber-300" />
                        <span>Royal Marriage Declared</span>
                      </div>

                      {/* KING AND QUEEN CARDS OF THE TRUMP SUIT */}
                      <div className="flex items-center justify-center gap-3 sm:gap-5 my-2">
                        <motion.div
                          animate={{ rotate: [-5, -3, -5], y: [0, -4, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          className="rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.6)] ring-2 ring-amber-300"
                        >
                          <TwentyNineCardFace
                            card={{ id: "marriage-k", rank: "K", suit: marriageAnnouncement.trumpSuit, points: 0 }}
                            size="xl"
                          />
                        </motion.div>
                        <motion.div
                          animate={{ rotate: [5, 3, 5], y: [0, -4, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                          className="rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.6)] ring-2 ring-amber-300"
                        >
                          <TwentyNineCardFace
                            card={{ id: "marriage-q", rank: "Q", suit: marriageAnnouncement.trumpSuit, points: 0 }}
                            size="xl"
                          />
                        </motion.div>
                      </div>

                      {/* Announcement Details */}
                      <h2 className="text-2xl sm:text-3xl font-black text-amber-300 mt-4 tracking-tight">
                        {marriageAnnouncement.playerName} Declared Marriage!
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm font-bold text-white/80">
                        {marriageAnnouncement.team === 0 ? "Team Red" : "Team Blue"} revealed the King & Queen of{" "}
                        <span className="text-amber-300">{TWENTY_NINE_SUITS_INFO[marriageAnnouncement.trumpSuit]?.label}</span>.
                      </p>

                      <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-2.5">
                        <span className="text-xs uppercase tracking-wider text-amber-200/70 font-black block">
                          Contract Target Adjusted
                        </span>
                        <span className="text-base sm:text-lg font-black text-white">
                          Target adjusted by ±4 → Target is now{" "}
                          <strong className="text-amber-300 text-xl">{marriageAnnouncement.contractTarget}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMarriageAnnouncement(null)}
                        className="mt-5 rounded-xl border border-white/20 bg-white/10 px-6 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                      >
                        Continue Playing
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* DOUBLING / REDOUBLING MODAL - COVERS ONLY THE MIDDLE PLAYING AREA (TABLE FELT) */}
              <AnimatePresence>
                {(state.phase === "doubling" || Boolean(doubleAnnouncement)) && (
                  <motion.div
                    key="doubling-modal"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="absolute left-1/2 top-[38%] sm:top-[39%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto w-[min(540px,calc(100vw-36px))] select-none"
                  >
                    <div className={cn(
                      "relative flex flex-col items-center text-center w-full rounded-3xl p-5 sm:p-6 backdrop-blur-2xl transition-all shadow-2xl",
                      doubleAnnouncement?.kind === "redouble" || state.multiplier === 4
                        ? "border-2 border-purple-400/90 bg-gradient-to-b from-[#2a093b]/95 via-black/95 to-black/95 shadow-[0_0_55px_rgba(168,85,247,0.5),0_15px_35px_rgba(0,0,0,0.85)] ring-2 ring-purple-400/40"
                        : "border-2 border-rose-500/80 bg-gradient-to-b from-[#2d0912]/95 via-black/95 to-black/95 shadow-[0_0_50px_rgba(244,63,94,0.45),0_15px_35px_rgba(0,0,0,0.85)] ring-2 ring-rose-500/30"
                    )}>
                      {/* Crossed Swords / Sparkles Glowing Icon */}
                      <div className="relative mb-2 flex items-center justify-center">
                        <div className={cn(
                          "absolute -inset-2.5 rounded-full blur-xl animate-pulse",
                          doubleAnnouncement?.kind === "redouble" || state.multiplier === 4 ? "bg-purple-500/40" : "bg-rose-500/30"
                        )} />
                        <div className={cn(
                          "relative grid h-12 w-12 place-items-center rounded-2xl border-2 shadow-lg",
                          doubleAnnouncement?.kind === "redouble" || state.multiplier === 4
                            ? "border-purple-300 bg-purple-950/80 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.7)]"
                            : "border-rose-400 bg-rose-950/80 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                        )}>
                          {doubleAnnouncement?.kind === "redouble" || state.multiplier === 4 ? (
                            <Sparkles className="h-6 w-6 text-purple-300 animate-spin" />
                          ) : (
                            <Swords className="h-6 w-6 text-rose-400 animate-bounce" />
                          )}
                        </div>
                      </div>

                      <span className={cn(
                        "text-[0.68rem] font-black uppercase tracking-widest mb-0.5",
                        doubleAnnouncement?.kind === "redouble" || state.multiplier === 4 ? "text-purple-300" : "text-rose-300"
                      )}>
                        {state.phase === "doubling"
                          ? state.doubleByPlayerId
                            ? "Redoubling Challenge"
                            : "Doubling Phase"
                          : doubleAnnouncement?.kind === "redouble"
                          ? "⚡ Redouble Declared! (×4 Stakes)"
                          : "Double Declared! (×2 Stakes)"}
                      </span>

                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {state.phase === "doubling"
                          ? state.doubleByPlayerId
                            ? `${state.players.find((p) => p.userId === state.doubleByPlayerId)?.displayName ?? "Opponent"} Doubled! (×2)`
                            : "Double the Stakes?"
                          : `${doubleAnnouncement?.actorName} ${doubleAnnouncement?.kind === "redouble" ? "Redoubled to ×4!" : "Doubled to ×2!"}`}
                      </h2>

                      {/* Contract & Declarer Summary Badge - Clear Bid Amount and Info */}
                      <div className="my-2.5 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-4 w-4 text-amber-300" />
                          <span className="text-white/50 text-[0.65rem] uppercase font-black">Contract:</span>
                          <strong className="text-amber-300 font-black text-sm">{state.contractTarget ?? state.currentBid ?? 16} pts</strong>
                        </div>
                        <span className="text-white/20">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/50 text-[0.65rem] uppercase font-black">Declarer:</span>
                          <span className={cn("font-black text-xs", declarer?.team === 0 ? "text-rose-300" : "text-sky-300")}>
                            {declarer?.displayName ?? "Declarer"}{isViewerDeclarer ? " (You)" : ""}
                          </span>
                        </div>
                        {state.doubleByPlayerId || doubleAnnouncement ? (
                          <>
                            <span className="text-white/20">|</span>
                            <span className={cn(
                              "font-black text-xs px-2 py-0.5 rounded-full border",
                              (doubleAnnouncement?.multiplier === 4 || state.multiplier === 4)
                                ? "border-purple-400 bg-purple-500/20 text-purple-300 animate-pulse"
                                : "border-rose-400 bg-rose-500/20 text-rose-300"
                            )}>
                              {(doubleAnnouncement?.multiplier === 4 || state.multiplier === 4) ? "Redoubled (×4)" : "Doubled (×2)"}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <p className="text-xs text-white/70 max-w-sm">
                        {state.phase === "doubling"
                          ? state.doubleByPlayerId
                            ? "The opposing team doubled the stakes! Will you accept and continue, or redouble to ×4 game points?"
                            : "Defending team may double the contract stakes to ×2."
                          : doubleAnnouncement?.kind === "redouble"
                          ? "Maximum stakes reached! Winning or losing team scores ×4 game points!"
                          : `Contract stakes multiplied to ${doubleAnnouncement?.multiplier ?? 2}× game points!`}
                      </p>

                      {/* Interactive Options for Player When isMyTurn in Doubling Phase */}
                      {state.phase === "doubling" && isMyTurn ? (
                        <div className="mt-4 flex flex-col gap-2.5 w-full">
                          {!state.doubleByPlayerId ? (
                            <div className="grid grid-cols-2 gap-3 w-full">
                              <button
                                type="button"
                                onClick={() => onAction("pass_double")}
                                className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 cursor-pointer"
                              >
                                Pass Double
                              </button>
                              <button
                                type="button"
                                onClick={() => onAction("double")}
                                className="flex items-center justify-center gap-2 rounded-xl border border-rose-400/80 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] transition active:scale-95 cursor-pointer"
                              >
                                <Swords className="h-4 w-4" />
                                Double (×2)
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 w-full">
                              <button
                                type="button"
                                onClick={() => onAction("continue_contract")}
                                className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 cursor-pointer"
                              >
                                Continue ×2
                              </button>
                              <button
                                type="button"
                                onClick={() => onAction("redouble")}
                                className="flex items-center justify-center gap-2 rounded-xl border border-purple-400/80 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(168,85,247,0.7)] transition active:scale-95 cursor-pointer"
                              >
                                <Sparkles className="h-4 w-4" />
                                Redouble (×4)
                              </button>
                            </div>
                          )}
                        </div>
                      ) : state.phase === "doubling" ? (
                        <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/60">
                          <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                          <span>Waiting for {currentTurnName} to decide…</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDoubleAnnouncement(null)}
                          className={cn(
                            "mt-4 rounded-xl border px-6 py-2 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 cursor-pointer shadow-lg",
                            doubleAnnouncement?.kind === "redouble"
                              ? "border-purple-400 bg-purple-600 hover:bg-purple-500 shadow-purple-600/40"
                              : "border-rose-400 bg-rose-600 hover:bg-rose-500 shadow-rose-600/40"
                          )}
                        >
                          Continue to Play
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SINGLE HAND PROMPT DIALOGUE (Positioned to the left of double popup when doubling is active, or centered above hand) */}
              <AnimatePresence>
                {state.phase === "playing" && state.completedTricks.length === 0 && state.currentTrick.length === 0 && hasAction(legalActions, "declare_single_hand") && !declinedSingleHand ? (
                  <motion.div
                    key="single-hand-prompt"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-[38%] sm:top-[39%] -translate-y-1/2 left-3 sm:left-5 xl:left-auto xl:right-[calc(50%+285px)] w-[min(360px,calc(100vw-32px))] pointer-events-auto select-none z-40"
                  >
                    <div className="flex flex-col gap-2 rounded-2xl border-2 border-violet-400/80 bg-black/95 p-4 shadow-[0_0_40px_rgba(168,85,247,0.4),0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-2 ring-violet-400/30 text-center">
                      <div className="text-sm font-black text-violet-200">
                        Play Single Hand?
                      </div>
                      <p className="text-xs text-white/60">
                        You must win all 8 tricks alone without trump (±3 game points).
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            onAction("declare_single_hand");
                            onConfirmSingleHand?.();
                          }}
                          className="rounded-xl border border-violet-400 bg-violet-600 px-5 py-1.5 text-xs font-black text-white shadow-md hover:bg-violet-500 active:scale-95 transition cursor-pointer"
                        >
                          Yes, Single Hand!
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeclinedSingleHand(true);
                            onConfirmSingleHand?.();
                          }}
                          className="rounded-xl border border-white/20 bg-white/10 px-5 py-1.5 text-xs font-black text-white/80 shadow-md hover:bg-white/20 active:scale-95 transition cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

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

              {/* 1. MATCH SCORE (LEFT FLANK): Pinned to Bottom-Left, In Line With Hand */}
              <div className="hidden lg:flex flex-col items-stretch justify-end z-30 w-72 xl:w-80 2xl:w-88 pb-0.5 pointer-events-auto absolute bottom-2.5 sm:bottom-3 left-3 sm:left-6">
                {/* Turn Status Badge above Match Score */}
                {isMyTurn && state.phase === "playing" ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "mb-1.5 flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-lg ring-2",
                      state.trumpRevealed &&
                      state.trumpRevealerPlayerId === currentUserId &&
                      state.completedTricks.length === state.trumpRevealTrickNumber &&
                      state.trumpSuit &&
                      sortedHand.some((c) => c.suit === state.trumpSuit)
                        ? "border-amber-200 bg-gradient-to-r from-amber-950 via-orange-950 to-amber-900 text-white ring-amber-400 animate-pulse"
                        : "border-amber-400/90 bg-gradient-to-r from-amber-950 to-amber-900 text-white ring-amber-300"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin" />
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
                ) : !isMyTurn && state.phase !== "finished" && !hasAction(legalActions, "declare_single_hand") ? (
                  <div className="mb-1.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-bold text-white/60 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate max-w-[12rem]">Turn: {currentTurnName}</span>
                  </div>
                ) : null}

                {/* Large Match Score Card - Full Width */}
                <div className="w-full rounded-2xl border border-white/15 bg-black/85 p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/80">
                        Match Score
                      </span>
                    </div>
                    <span className="text-[0.62rem] sm:text-xs font-black text-amber-300 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                      Race to 6
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Red Team */}
                    <div className="rounded-xl border border-rose-500/35 bg-rose-950/50 p-2 sm:p-2.5 text-center shadow-inner">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                        <span className="text-rose-300 font-extrabold">
                          RED
                        </span>
                        <span className="text-white text-base sm:text-lg font-black tabular-nums">
                          {state.teamGamePoints["0"] > 0 ? `+${state.teamGamePoints["0"]}` : state.teamGamePoints["0"]}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/70">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            state.teamGamePoints["0"] < 0
                              ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                              : "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                          )}
                          style={{
                            width: `${Math.min(100, (Math.abs(state.teamGamePoints["0"]) / 6) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Blue Team */}
                    <div className="rounded-xl border border-sky-500/35 bg-sky-950/50 p-2 sm:p-2.5 text-center shadow-inner">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                        <span className="text-sky-300 font-extrabold">
                          BLUE
                        </span>
                        <span className="text-white text-base sm:text-lg font-black tabular-nums">
                          {state.teamGamePoints["1"] > 0 ? `+${state.teamGamePoints["1"]}` : state.teamGamePoints["1"]}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/70">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            state.teamGamePoints["1"] < 0
                              ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                              : "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                          )}
                          style={{
                            width: `${Math.min(100, (Math.abs(state.teamGamePoints["1"]) / 6) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Review Last Hand Action Button */}
                  {state.lastHandResult ? (
                    <button
                      type="button"
                      onClick={() => setLastHandModalOpen(true)}
                      className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 py-1.5 px-3 text-xs font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/25 transition w-full cursor-pointer shadow-sm active:scale-98"
                    >
                      <History className="h-4 w-4 text-amber-300" />
                      <span>Review Last Hand</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 2. CENTERED LOCAL PLAYER HAND & FLOATING INTERACTIVE ACTIONS (GUARANTEED DEAD CENTER) */}
              <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center w-[min(760px,calc(100vw-32px))] xl:w-[780px] 2xl:w-[820px]">
                {/* FLOATING ACTION OVERLAYS ANCHORED DIRECTLY TO HAND CONTAINER */}
                <AnimatePresence>
                  {/* 1. AUCTION BIDDING BAR */}
                  {state.phase === "bidding" && isMyTurn && !sittingOutSingleHand ? (
                    <motion.div
                      key="bidding-bar"
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[min(480px,calc(100vw-32px))]"
                    >
                      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-400/80 bg-black/95 p-3.5 shadow-[0_0_40px_rgba(245,158,11,0.5),0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-2 ring-amber-400/30">
                        {/* Winning Bid Status Banner */}
                        <div className="flex items-center justify-between w-full border-b border-white/10 pb-1.5 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[0.62rem] font-black uppercase tracking-wider text-white/50">
                              High Bid:
                            </span>
                            {highestBidder && state.currentBid !== null ? (
                              <span className="flex items-center gap-1 font-black text-amber-300">
                                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <strong className="text-xs text-white">{state.currentBid}</strong>
                                <span className="text-[0.6rem] text-white/60">({highestBidder.displayName})</span>
                              </span>
                            ) : (
                              <span className="text-amber-300 font-bold text-xs">16 Min</span>
                            )}
                          </div>
                          <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[0.6rem] font-black uppercase text-amber-300 animate-pulse">
                            Your Turn
                          </span>
                        </div>

                        {selectedBidValue !== null && lowestLegalBid !== null && highestLegalBid !== null ? (
                          <div className="flex items-center gap-2 w-full justify-center">
                            <button
                              type="button"
                              disabled={selectedBidValue <= lowestLegalBid}
                              onClick={() => setSelectedBid(Math.max(lowestLegalBid, selectedBidValue - 1))}
                              className="grid h-8 w-8 place-items-center rounded-xl border border-white/20 bg-white/10 text-base font-black text-white hover:bg-white/20 disabled:opacity-30 cursor-pointer active:scale-95 transition"
                            >
                              −
                            </button>

                            <div className="px-3 text-center">
                              <span className="block text-[0.55rem] font-black uppercase tracking-widest text-amber-300/70">
                                Your Bid
                              </span>
                              <span className="text-xl font-black text-amber-300 leading-none">
                                {selectedBidValue}
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={selectedBidValue >= highestLegalBid}
                              onClick={() => setSelectedBid(Math.min(highestLegalBid, selectedBidValue + 1))}
                              className="grid h-8 w-8 place-items-center rounded-xl border border-white/20 bg-white/10 text-base font-black text-white hover:bg-white/20 disabled:opacity-30 cursor-pointer active:scale-95 transition"
                            >
                              +
                            </button>

                            <button
                              type="button"
                              onClick={() => onAction("bid", { value: selectedBidValue })}
                              className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-2 text-xs font-black text-black shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95 cursor-pointer ml-1.5"
                            >
                              Bid {selectedBidValue}
                            </button>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2 w-full justify-center pt-0.5">
                          {/* PROMINENT ACHII (DITTO) BUTTON */}
                          <button
                            type="button"
                            disabled={!isDittoLegal}
                            onClick={() => onAction("ditto")}
                            className={cn(
                              "flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-black transition",
                              isDittoLegal
                                ? "border-violet-400/80 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:scale-105 cursor-pointer"
                                : "border-white/10 bg-white/[0.04] text-white/35 cursor-not-allowed"
                            )}
                          >
                            <span>🤝 Achii (Ditto)</span>
                            {state.currentBid !== null ? (
                              <span className="text-[0.62rem] opacity-90 font-mono">({state.currentBid})</span>
                            ) : null}
                          </button>

                          {/* PASS BUTTON */}
                          <button
                            type="button"
                            onClick={() => onAction("pass_bid")}
                            className="rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black text-white/80 transition hover:bg-white/20 active:scale-95 cursor-pointer"
                          >
                            Pass
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  {/* 2. TRUMP SELECTION DIALOGUE */}
                  {state.phase === "trump" && isMyTurn ? (
                    <motion.div
                      key="trump-dialogue"
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[min(480px,calc(100vw-32px))]"
                    >
                      <div className="flex flex-col gap-2 rounded-2xl border-2 border-emerald-400/80 bg-black/95 p-3.5 shadow-[0_0_40px_rgba(52,211,153,0.4),0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-2 ring-emerald-400/30">
                        <span className="text-[0.68rem] font-black uppercase tracking-wider text-emerald-300">
                          Choose Trump Suit:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {(["spades", "hearts", "diamonds", "clubs"] as TwentyNineSuit[]).map((suit) => {
                            const info = TWENTY_NINE_SUITS_INFO[suit];
                            return (
                              <button
                                key={suit}
                                type="button"
                                onClick={() => onAction("choose_trump_suit", { suit })}
                                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-black text-white transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
                              >
                                <SuitMark suit={suit} size={16} />
                                <span>{info?.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {hasAction(legalActions, "choose_seventh_trump") ? (
                          <button
                            type="button"
                            onClick={() => onAction("choose_seventh_trump")}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 cursor-pointer active:scale-95"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>7th Card Trump</span>
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}



                  {/* 4. IN-GAME PLAYING ACTIONS: REVEAL TRUMP, MARRIAGE */}
                  {state.phase === "playing" && ((hasAction(legalActions, "reveal_trump") && isMyTurn) || hasAction(legalActions, "declare_pair")) ? (
                    <motion.div
                      key="playing-actions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2"
                    >
                      {hasAction(legalActions, "reveal_trump") && isMyTurn ? (
                        <button
                          type="button"
                          onClick={() => onAction("reveal_trump")}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/80 bg-emerald-600/70 px-4 py-2 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:bg-emerald-600 active:scale-95 cursor-pointer animate-pulse"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Reveal Trump</span>
                        </button>
                      ) : null}

                      {hasAction(legalActions, "declare_pair") ? (
                        <button
                          type="button"
                          onClick={() => onAction("declare_pair")}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/80 bg-amber-600/70 px-4 py-2 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:bg-amber-600 active:scale-95 cursor-pointer"
                        >
                          <span>💍</span>
                          <span>Declare Marriage (±4)</span>
                        </button>
                      ) : null}
                    </motion.div>
                  ) : null}

                  {/* 5. LARGE TARGET REACHED SKIP HAND ALERT */}
                  {state.canSkipHand && hasAction(legalActions, "skip_hand") ? (
                    <motion.div
                      key="skip-hand"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-950/95 via-emerald-900/90 to-emerald-950/95 px-5 py-2.5 shadow-[0_0_30px_rgba(52,211,153,0.5)] backdrop-blur-xl animate-pulse"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-5 w-5 text-emerald-300 shrink-0" />
                        <div>
                          <span className="text-xs font-black uppercase text-emerald-200 block tracking-wide">
                            Target Reached!
                          </span>
                          <span className="text-[0.65rem] font-semibold text-emerald-300/80">
                            Contract fulfilled — Skip rest of hand
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAction("skip_hand")}
                        className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 px-3.5 py-1.5 font-black text-xs transition active:scale-95 shadow-lg cursor-pointer"
                      >
                        Skip Hand ⏩
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Local Player Hand Fan Container */}
                <section
                  ref={handRef}
                  className={cn(
                    "relative z-40 flex w-full h-[185px] sm:h-[195px] flex-col items-center justify-between rounded-2xl px-4 sm:px-5 py-2 shadow-2xl backdrop-blur-xl transition-all duration-300",
                    isMyTurn
                      ? "border-2 border-amber-400 bg-black/90 shadow-[0_0_35px_rgba(251,191,36,0.6),0_0_70px_rgba(245,158,11,0.25)] ring-2 ring-amber-300/80"
                      : isViewerDeclarer
                      ? "border-2 border-amber-400/80 bg-black/85 shadow-[0_0_24px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/40"
                      : "border border-white/10 bg-black/80"
                  )}
                >
                  {/* UNO-Style Ambient Pulsing Halo behind the player's hand */}
                  {isMyTurn ? (
                    <motion.div
                      className="pointer-events-none absolute -inset-2.5 rounded-3xl blur-2xl bg-amber-400/35"
                      animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.99, 1.025, 0.99] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : isViewerDeclarer ? (
                    <motion.div
                      className="pointer-events-none absolute -inset-2 rounded-3xl blur-xl bg-amber-400/20"
                      animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.99, 1.015, 0.99] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}

                  {/* Local Player Info Bar */}
                  <div className="mb-0.5 flex w-full items-center justify-between px-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shadow-md",
                          me?.team === 0 ? "bg-rose-400 shadow-rose-500/50" : "bg-sky-400 shadow-sky-500/50"
                        )}
                      />
                      <span className="font-black text-white">{me?.displayName ?? "Your Hand"}</span>
                      {isViewerDeclarer ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/90 bg-gradient-to-r from-amber-500/40 via-yellow-500/35 to-amber-600/40 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/50">
                          <Crown className="h-3 w-3 fill-amber-300 text-amber-300 shrink-0" />
                          Declarer ({state.contractTarget ?? state.currentBid})
                        </span>
                      ) : myBidInfo?.isHighestBidder ? (
                        <span className="flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-950/80 px-2 py-0.5 text-[0.62rem] font-black uppercase text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                          <Crown className="h-3 w-3 fill-amber-300 text-amber-300 shrink-0" />
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
                    <div className="relative flex min-h-[9rem] items-end justify-center overflow-visible pb-1 pt-1">
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
                              marginLeft: index === 0 ? 0 : sortedHand.length > 5 ? "-1.6rem" : "-1.1rem",
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
                        <div className="py-6 text-xs font-bold text-white/40">
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

                        <div className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 px-6 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-lg ring-2 ring-amber-300/60 group-hover:scale-105 group-active:scale-95 transition-transform">
                          <span>Next Trick</span>
                          <ArrowRight className="h-4 w-4 stroke-[3]" />
                        </div>

                        <span className="text-[0.62rem] font-semibold text-white/50 mt-1">
                          Click anywhere on your hand or press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono text-[0.6rem] text-amber-200">Space</kbd> to continue
                        </span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>
              </div>

              {/* 3. CARD POINTS & TRICKS WON (RIGHT FLANK): Pinned to Bottom-Right, In Line With Hand */}
              <div className="hidden lg:flex flex-col items-stretch justify-end z-30 w-96 xl:w-[440px] 2xl:w-[480px] pb-0.5 pointer-events-auto absolute bottom-2.5 sm:bottom-3 right-3 sm:right-6">
                {/* HORIZONTAL ROW: CARD POINTS (28 PTS) + 8-TRICKS WON */}
                <div className="flex items-stretch gap-2.5 sm:gap-3 w-full">
                  {/* Card Points 28-pt Race */}
                  <div className="flex-1 rounded-2xl border border-white/10 bg-black/85 p-2.5 sm:p-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5 text-amber-300" />
                        <span className="text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                          Card Pts
                        </span>
                      </div>
                      <span className="text-[0.58rem] sm:text-[0.65rem] font-bold text-white/50">28 Max</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {/* Team Red Points Bar */}
                      <div className="rounded-lg border border-rose-500/25 bg-rose-950/45 px-2 py-1">
                        <div className="flex items-center justify-between text-[0.62rem] sm:text-xs font-black">
                          <span className="text-rose-300 font-extrabold">RED</span>
                          <span className="text-white tabular-nums">
                            {state.capturedPointsByTeam["0"]}
                          </span>
                        </div>
                        <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/70">
                          <div
                            className="h-full rounded-full bg-rose-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (state.capturedPointsByTeam["0"] / 28) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Team Blue Points Bar */}
                      <div className="rounded-lg border border-sky-500/25 bg-sky-950/45 px-2 py-1">
                        <div className="flex items-center justify-between text-[0.62rem] sm:text-xs font-black">
                          <span className="text-sky-300 font-extrabold">BLUE</span>
                          <span className="text-white tabular-nums">
                            {state.capturedPointsByTeam["1"]}
                          </span>
                        </div>
                        <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/70">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (state.capturedPointsByTeam["1"] / 28) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 8-Tricks Won Progress */}
                  <div className="flex-[1.15] rounded-2xl border border-white/10 bg-black/85 p-2.5 sm:p-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1.5">
                      <span className="text-[0.62rem] sm:text-xs font-black uppercase tracking-wider text-white/70">
                        Tricks Won
                      </span>
                      <span className="text-[0.62rem] sm:text-xs font-black text-emerald-400">
                        {state.completedTricks.length}/8
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <TrickProgressWidget team={0} count={state.tricksWonByTeam["0"]} caption="RED" />
                      <TrickProgressWidget team={1} count={state.tricksWonByTeam["1"]} caption="BLUE" />
                    </div>
                  </div>
                </div>
              </div>
            </main>

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
                  <h4 className="font-black text-amber-300">Bidding Auction & Achii (Ditto)</h4>
                  <p className="mt-1 text-white/70">
                    Bids range 16 to 28. Bidding proceeds clockwise in head-to-head duels. Opponents can raise or match with Achii (Ditto) until one passes. Last remaining bidder sets the contract.
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
