/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import type { GameEvent, PublicClassicUnoState, PublicNoMercyState } from "@tabletop/game-core";
import type { RoomPlayerView, RoomStateView, UserRole } from "@tabletop/shared";
import { AlertTriangle, BookOpen, ChevronDown, Copy, LogOut, PanelRightClose, PanelRightOpen, Settings, Trophy } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RoomChat } from "@/features/game-shell/RoomChat";
import type { RenderableCard } from "@/lib/cards";
import { cn } from "@/lib/utils/cn";
import { CardDrawAnimationOverlay } from "./CardDrawAnimationOverlay";
import { CardPlayAnimationOverlay } from "./CardPlayAnimationOverlay";
import { DiscardAllAnimationOverlay } from "./DiscardAllAnimationOverlay";
import { UnoActivityLogOverlay } from "./UnoActivityLogOverlay";
import { DiscardPile } from "./DiscardPile";
import { DirectionIndicator } from "./DirectionIndicator";
import { DrawPile } from "./DrawPile";
import { HandTransferAnimationOverlay } from "./HandTransferAnimationOverlay";
import { PlayerHand } from "./PlayerHand";
import { PlayerSeat } from "./PlayerSeat";
import { PowerEventOverlay, type PowerSeatEffect } from "./PowerEventOverlay";
import { ReactionOverlay, REACTION_PREFIX } from "./ReactionOverlay";
import { TableTurnIndicator } from "./TableTurnIndicator";
import { TurnTimerCircle } from "./TurnTimerCircle";
import { TurnTransitionOverlay } from "./TurnTransitionOverlay";
import { UnoActionBar } from "./UnoActionBar";
import { UnoGameStatus } from "./UnoGameStatus";
import { UnoRuleBookModal } from "./UnoRuleBookModal";
import type { CardThemeId } from "./cardThemes";
import { hasLegalAction } from "./unoActionUtils";

type UnoTableState = PublicClassicUnoState | PublicNoMercyState;

type PlayPayload = {
  cardId: string;
  declaredColor?: "red" | "yellow" | "green" | "blue";
  targetPlayerId?: string;
};

const playAreaAccent: Record<
  string,
  {
    border: string;
    glow: string;
    strongGlow: string;
    soft: string;
    bg: string;
    text: string;
  }
> = {
  red: {
    border: "rgba(255, 75, 69, 0.78)",
    glow: "rgba(255, 54, 48, 0.48)",
    strongGlow: "rgba(255, 54, 48, 0.82)",
    soft: "rgba(255, 75, 69, 0.19)",
    bg: "rgba(255, 75, 69, 0.14)",
    text: "rgb(254, 202, 202)"
  },
  yellow: {
    border: "rgba(255, 201, 40, 0.82)",
    glow: "rgba(255, 190, 24, 0.5)",
    strongGlow: "rgba(255, 190, 24, 0.84)",
    soft: "rgba(255, 201, 40, 0.2)",
    bg: "rgba(255, 201, 40, 0.16)",
    text: "rgb(254, 240, 138)"
  },
  green: {
    border: "rgba(30, 215, 96, 0.76)",
    glow: "rgba(30, 215, 96, 0.46)",
    strongGlow: "rgba(30, 215, 96, 0.78)",
    soft: "rgba(30, 215, 96, 0.18)",
    bg: "rgba(30, 215, 96, 0.14)",
    text: "rgb(187, 247, 208)"
  },
  blue: {
    border: "rgba(45, 140, 255, 0.8)",
    glow: "rgba(45, 140, 255, 0.48)",
    strongGlow: "rgba(45, 140, 255, 0.82)",
    soft: "rgba(45, 140, 255, 0.19)",
    bg: "rgba(45, 140, 255, 0.14)",
    text: "rgb(186, 230, 253)"
  }
};

function displayGameName(gameId: UnoTableState["gameId"]): string {
  return gameId === "uno-no-mercy" ? "No Mercy Match" : "Classic Match";
}

function displayGameTitle(gameId: UnoTableState["gameId"]): string {
  return gameId === "uno-no-mercy" ? "UNO No Mercy" : "Classic UNO";
}

function getPendingPenalty(state: UnoTableState): { amount: number; targetPlayerId: string } | null {
  return "pendingPenalty" in state ? state.pendingPenalty : null;
}

function StackPenaltyBadge({
  amount,
  targetName,
  addedAmount
}: {
  amount: number;
  targetName?: string | null;
  addedAmount?: number | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="pointer-events-none absolute left-[calc(100%+0.85rem)] top-1/2 z-40 min-w-[8.75rem] -translate-y-1/2 rounded-[1.15rem] border border-amber-300/30 bg-black/78 px-3.5 py-2.5 text-center shadow-[0_0_34px_rgb(245_158_11_/_0.26),0_18px_45px_rgb(0_0_0_/_0.46)] backdrop-blur-xl"
    >
      <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-amber-200/80">Stack</p>

      <div className="mt-0.5 flex items-center justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {addedAmount && addedAmount > 0 ? (
            <motion.span
              key={addedAmount}
              initial={{ opacity: 0, y: 5, scale: 0.75 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.85 }}
              className="rounded-full border border-red-300/25 bg-red-500/18 px-2 py-0.5 text-sm font-black text-red-100"
            >
              +{addedAmount}
            </motion.span>
          ) : null}
        </AnimatePresence>

        <p className="text-xl font-black leading-none text-amber-100">DRAW {amount}</p>
      </div>

      {targetName ? (
        <p className="mt-1 max-w-32 truncate text-[0.65rem] font-bold text-white/55">
          {targetName} pending
        </p>
      ) : null}
    </motion.div>
  );
}

export function ClassicUnoTable({
  room,
  state,
  legalActions,
  gameEvents = [],
  currentUserId,
  currentUserRole,
  onAction,
  onChat,
  onEndMatch
}: {
  room: RoomStateView;
  state: UnoTableState;
  legalActions: unknown[];
  gameEvents?: GameEvent[];
  currentUserId: string | null;
  currentUserRole?: UserRole | null | undefined;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onReaction?: ((emoji: string) => void) | undefined;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
}) {
  const cardTheme: CardThemeId = state.gameId === "uno-no-mercy" ? "no_mercy" : "classic";
  const tableRootRef = useRef<HTMLElement | null>(null);
  const drawPileRef = useRef<HTMLDivElement | null>(null);
  const discardPileRef = useRef<HTMLDivElement | null>(null);
  const handDockRef = useRef<HTMLDivElement | null>(null);
  const centerDockRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastCurrentPlayerIdRef = useRef<string | null>(state.currentPlayerId);
  const lastPenaltyAmountRef = useRef<number | null>(null);
  const lastResolvedPenaltyRef = useRef<{
    amount: number;
    targetPlayerId: string;
  } | null>(null);

  const [previousPlayerId, setPreviousPlayerId] = useState<string | null>(null);
  const [rulebookOpen, setRulebookOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem("tabletop.sidePanelHidden") !== "true"
  );
  const [stackAddedAmount, setStackAddedAmount] = useState<number | null>(null);
  const [stackHitNotice, setStackHitNotice] = useState<{
    playerId: string;
    playerName: string;
    amount: number;
  } | null>(null);
  const [seatPowerEffects, setSeatPowerEffects] = useState<Record<string, PowerSeatEffect>>({});
  const [now, setNow] = useState(() => Date.now());

  const me = state.players.find((player) => player.userId === currentUserId);

  const orderedPlayers = useMemo(() => [...state.players].sort((a, b) => a.seat - b.seat), [state.players]);

  // Visual seats must follow the physical table perimeter, not just seat-number groups.
  // With the local player anchored at the bottom, the clockwise path is:
  // left side bottom->top, top left->right, right side top->bottom, then back to self.
  // Keeping this order stable fixes the "jumping" turn highlight when play reverses.
  const sortedOpponents = useMemo(() => {
    if (!currentUserId) {
      return orderedPlayers;
    }

    const selfIndex = orderedPlayers.findIndex((player) => player.userId === currentUserId);
    if (selfIndex < 0) {
      return orderedPlayers.filter((player) => player.userId !== currentUserId);
    }

    return [
      ...orderedPlayers.slice(selfIndex + 1),
      ...orderedPlayers.slice(0, selfIndex)
    ].filter((player) => player.userId !== currentUserId);
  }, [orderedPlayers, currentUserId]);

  const compactSeats = sortedOpponents.length >= 7;
  const opponentSeatWidth = useMemo(() => {
    if (sortedOpponents.length >= 9) return "clamp(13.2rem, 14.2vw, 15.8rem)";
    if (sortedOpponents.length >= 6) return "clamp(14rem, 15.5vw, 16.5rem)";
    if (sortedOpponents.length >= 4) return "clamp(15.5rem, 18.5vw, 19.5rem)";
    return "clamp(17rem, 22vw, 22rem)";
  }, [sortedOpponents.length]);

  const opponentSlots = useMemo(() => {
    const count = sortedOpponents.length;
    if (count === 0) return [];

    let leftCount = 0;
    let rightCount = 0;

    if (count >= 9) {
      leftCount = 3;
      rightCount = 3;
    } else if (count >= 6) {
      leftCount = 2;
      rightCount = 2;
    } else if (count >= 3) {
      leftCount = 1;
      rightCount = 1;
    }

    const topCount = Math.max(0, count - leftCount - rightCount);

    function spread(countToSpread: number, start: number, end: number) {
      if (countToSpread <= 0) return [];
      if (countToSpread === 1) return [(start + end) / 2];
      return Array.from(
        { length: countToSpread },
        (_, index) => start + ((end - start) * index) / (countToSpread - 1)
      );
    }

    // Physical clockwise table path from the local player at bottom:
    // left side bottom->top, top left->right, right side top->bottom.
    const leftYs = spread(leftCount, 67, 24);
    const topXs = spread(topCount, topCount >= 5 ? 11 : 25, topCount >= 5 ? 89 : 75);
    const rightYs = spread(rightCount, 24, 67);

    const slots: Array<{
      player: (typeof sortedOpponents)[number];
      left: number;
      top: number;
      side: "top" | "left" | "right";
    }> = [];

    let cursor = 0;

    for (let index = 0; index < leftCount; index += 1) {
      const player = sortedOpponents[cursor++];
      if (!player) continue;

      slots.push({
        player,
        left: 8.5,
        top: leftYs[index] ?? 48,
        side: "left"
      });
    }

    for (let index = 0; index < topCount; index += 1) {
      const player = sortedOpponents[cursor++];
      if (!player) continue;

      slots.push({
        player,
        left: topXs[index] ?? 50,
        top: 9,
        side: "top"
      });
    }

    for (let index = 0; index < rightCount; index += 1) {
      const player = sortedOpponents[cursor++];
      if (!player) continue;

      slots.push({
        player,
        left: 91.5,
        top: rightYs[index] ?? 48,
        side: "right"
      });
    }

    return slots;
  }, [sortedOpponents]);

  const roomPlayerById = useMemo(
    () => new Map<string, RoomPlayerView>(room.players.map((player) => [player.userId, player])),
    [room.players]
  );

  const onlineCount = room.players.filter((player) => player.connected).length;
  const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
  const currentPlayerName = currentPlayer
    ? currentPlayer.userId === currentUserId
      ? "Your Turn"
      : `${currentPlayer.displayName}'s Turn`
    : undefined;

  const winner = state.results?.placements[0];
  const winnerName = winner ? room.players.find((player) => player.userId === winner.userId)?.displayName : null;
  const pendingPenalty = getPendingPenalty(state);
  const penaltyTargetName = pendingPenalty
    ? state.players.find((player) => player.userId === pendingPenalty.targetPlayerId)?.displayName ??
      room.players.find((player) => player.userId === pendingPenalty.targetPlayerId)?.displayName ??
      null
    : null;

  const activeAccent = playAreaAccent[state.currentColor] ?? playAreaAccent.blue!;
  const isNoMercy = state.gameId === "uno-no-mercy";
  const isMyTurn = Boolean(currentUserId && state.currentPlayerId === currentUserId);
  const canDraw = hasLegalAction(legalActions, "draw_card");
  const hasPlayableCard = hasLegalAction(legalActions, "play_card");
  const canPass = hasLegalAction(legalActions, "pass_turn");
  const isForcedDraw = isMyTurn && canDraw && !hasPlayableCard && !canPass;
  const ENABLE_TORCH_LIGHT = false; // Backup option: set to true to restore the table-wide torch spotlight beam

  const targetPlayerList = useMemo(() => {
    return state.players
      .filter((player) => player.userId !== currentUserId)
      .map((player) => {
        const roomP = roomPlayerById.get(player.userId);
        return {
          userId: player.userId,
          displayName: player.displayName,
          handCount: player.handCount,
          unoCalled: player.unoCalled,
          eliminated: "eliminated" in player ? Boolean(player.eliminated) : false,
          avatarUrl: roomP?.avatarUrl ?? null,
          isBot: Boolean(roomP?.isBot),
          connected: roomP?.connected ?? true,
          seat: player.seat
        };
      });
  }, [state.players, currentUserId, roomPlayerById]);

  const activeSeatAngle = useMemo(() => {
    if (!state.currentPlayerId) return undefined;
    if (state.currentPlayerId === currentUserId) {
      return 90; // Bottom seat (local player)
    }
    const slot = opponentSlots.find((s) => s.player.userId === state.currentPlayerId);
    if (!slot) return undefined;

    // Geometric alignment calibrated from the center dock (50% X, 60% Y) to the seat with 16:9 table felt aspect ratio
    const dx = (slot.left - 50) * 1.85;
    const dy = slot.top - 60;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, [currentUserId, opponentSlots, state.currentPlayerId]);

  const reactionMessages = useMemo(
    () =>
      room.chat.filter(
        (message) => message.type === "user" && typeof message.body === "string" && message.body.startsWith(REACTION_PREFIX)
      ),
    [room.chat]
  );

  // Timer calculations (defaults to 20 seconds for both UNO games)
  const turnDurationMs = state.turnDurationMs ?? 20000;
  const turnExpiresAt = state.turnExpiresAt ? new Date(state.turnExpiresAt).getTime() : null;
  const turnRemainingMs = turnExpiresAt ? Math.max(0, turnExpiresAt - now) : turnDurationMs;
  const turnProgress = Math.max(0, Math.min(1, turnRemainingMs / turnDurationMs));
  const turnSecondsLeft = Math.max(0, Math.ceil(turnRemainingMs / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.currentPlayerId !== lastCurrentPlayerIdRef.current) {
      setPreviousPlayerId(lastCurrentPlayerIdRef.current);
      lastCurrentPlayerIdRef.current = state.currentPlayerId;
    }
  }, [state.currentPlayerId]);

  useEffect(() => {
    const previousAmount = lastPenaltyAmountRef.current;

    if (pendingPenalty) {
      if (previousAmount !== null && pendingPenalty.amount > previousAmount) {
        const delta = pendingPenalty.amount - previousAmount;
        setStackAddedAmount(delta);

        const timeout = window.setTimeout(() => {
          setStackAddedAmount(null);
        }, 1300);

        lastPenaltyAmountRef.current = pendingPenalty.amount;
        lastResolvedPenaltyRef.current = pendingPenalty;

        return () => window.clearTimeout(timeout);
      }

      lastPenaltyAmountRef.current = pendingPenalty.amount;
      lastResolvedPenaltyRef.current = pendingPenalty;
      return;
    }

    if (lastResolvedPenaltyRef.current) {
      const resolved = lastResolvedPenaltyRef.current;
      const playerName =
        room.players.find((roomPlayer) => roomPlayer.userId === resolved.targetPlayerId)?.displayName ??
        state.players.find((player) => player.userId === resolved.targetPlayerId)?.displayName ??
        "Player";

      setStackHitNotice({
        playerId: resolved.targetPlayerId,
        playerName,
        amount: resolved.amount
      });

      const timeout = window.setTimeout(() => {
        setStackHitNotice(null);
      }, 2000);

      lastResolvedPenaltyRef.current = null;
      lastPenaltyAmountRef.current = null;
      setStackAddedAmount(null);

      return () => window.clearTimeout(timeout);
    }

    lastPenaltyAmountRef.current = null;
  }, [pendingPenalty, room.players, state.players]);

  const triggerSeatPowerEffect = useCallback((playerId: string, effect: PowerSeatEffect) => {
    setSeatPowerEffects((current) => ({ ...current, [playerId]: effect }));
    window.setTimeout(() => {
      setSeatPowerEffects((current) => {
        if (current[playerId]?.id !== effect.id) {
          return current;
        }
        const next = { ...current };
        delete next[playerId];
        return next;
      });
    }, effect.kind === "draw" ? 2100 : 1800);
  }, []);

  function setPanelOpen(next: boolean) {
    setSidePanelOpen(next);
    localStorage.setItem("tabletop.sidePanelHidden", next ? "false" : "true");
  }

  function registerSeatRef(playerId: string) {
    return (element: HTMLDivElement | null) => {
      if (element) {
        seatRefs.current.set(playerId, element);
      } else {
        seatRefs.current.delete(playerId);
      }
    };
  }

  const canEndMatch = Boolean(
    onEndMatch &&
      (room.status === "in_game" || room.status === "paused") &&
      (currentUserRole === "ADMIN" || room.effectiveHostUserId === currentUserId)
  );

  const wonByElimination = useMemo(() => {
    if (!state.results?.winnerUserId) return false;
    const activePlayers = state.players.filter((p) => !p.eliminated);
    return activePlayers.length <= 1;
  }, [state.results, state.players]);

  const placementRows = useMemo(() => {
    const list =
      state.results?.placements.map((placement) => {
        const statePlayer = state.players.find((player) => player.userId === placement.userId);
        const roomPlayer = room.players.find((player) => player.userId === placement.userId);
        const isWinner = placement.result === "WIN" || placement.placement === 1;
        const isEliminated = Boolean(statePlayer?.eliminated);
        const handCount = statePlayer?.handCount ?? 0;
        const seat = statePlayer?.seat ?? roomPlayer?.seat ?? 0;
        const displayName =
          roomPlayer?.displayName ??
          statePlayer?.displayName ??
          `Player ${placement.userId.slice(0, 6)}`;
        const isBot = roomPlayer?.isBot ?? false;

        let statusText = "Finished";
        let statusBadge = "bg-white/10 text-white/70 border-white/15";
        let statusIcon = "🏁";

        if (isWinner) {
          if (wonByElimination) {
            statusText = "Sole Survivor";
            statusBadge = "bg-amber-400/20 text-amber-300 border-amber-400/40";
            statusIcon = "👑";
          } else {
            statusText = "Emptied Hand";
            statusBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
            statusIcon = "🏆";
          }
        } else if (isEliminated) {
          statusText = "Eliminated";
          statusBadge = "bg-rose-500/20 text-rose-300 border-rose-500/30";
          statusIcon = "💀";
        } else {
          statusText = `${handCount} card${handCount === 1 ? "" : "s"} left`;
          statusBadge = "bg-sky-500/20 text-sky-300 border-sky-400/30";
          statusIcon = "🃏";
        }

        const rankWord =
          placement.placement === 1
            ? "First"
            : placement.placement === 2
            ? "Second"
            : placement.placement === 3
            ? "Third"
            : placement.placement === 4
            ? "Fourth"
            : placement.placement === 5
            ? "Fifth"
            : placement.placement === 6
            ? "Sixth"
            : placement.placement === 7
            ? "Seventh"
            : placement.placement === 8
            ? "Eighth"
            : `${placement.placement}th`;

        return {
          ...placement,
          displayName,
          isBot,
          isWinner,
          isEliminated,
          handCount,
          seat,
          statusText,
          statusBadge,
          statusIcon,
          rankWord
        };
      }) ?? [];

    return list.slice().sort((a, b) => a.placement - b.placement);
  }, [state.results, state.players, room.players, wonByElimination]);

  function playCard(payload: PlayPayload) {
    onAction("play_card", payload);
  }

  function copyRoomCode() {
    void navigator.clipboard.writeText(room.code);
  }

  function goDashboard() {
    globalThis.location.assign("/dashboard");
  }

  function confirmEndMatch() {
    if (!onEndMatch) return;

    onEndMatch(room.id);
    setConfirmEndOpen(false);
  }

  function getFanSide(side: "top" | "left" | "right", left: number) {
    if (side === "right") return "left";
    if (side === "top" && left > 58) return "left";
    return "right";
  }

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={`uno-${room.id}`}>
      <div
        className={cn(
          isNoMercy ? "uno-no-mercy-fullscreen" : "uno-fullscreen",
          "tt-game-viewport relative h-[100dvh] w-screen overflow-hidden text-white"
        )}
      >
        <div className={cn("pointer-events-none absolute inset-0", isNoMercy ? "uno-no-mercy-grid" : "uno-fullscreen-grid")} />
        <div className={cn("pointer-events-none absolute inset-0", isNoMercy ? "uno-no-mercy-perspective-grid" : "uno-perspective-grid")} />
        <div className="pointer-events-none absolute inset-0 uno-fullscreen-glow" />
        <ReactionOverlay messages={reactionMessages} />

        {/* Top Middle Persistent Turn Banner */}
        <AnimatePresence mode="wait">
          {!state.results && state.currentPlayerId && currentPlayer ? (
            <motion.div
              key={`top-turn-${state.currentPlayerId}`}
              initial={{ opacity: 0, y: -12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="pointer-events-none absolute inset-x-0 top-3.5 z-[60] flex justify-center px-4"
            >
              <div
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[0.74rem] font-black uppercase tracking-[0.2em] shadow-[0_14px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300",
                  isMyTurn
                    ? "border-lime-300/80 bg-[linear-gradient(135deg,rgba(34,197,94,0.38),rgba(16,185,129,0.28))] text-lime-100 shadow-[0_0_24px_rgba(34,197,94,0.35),0_18px_40px_rgba(0,0,0,0.45)]"
                    : "border-sky-300/60 bg-[linear-gradient(135deg,rgba(14,165,233,0.26),rgba(59,130,246,0.18))] text-sky-100 shadow-[0_0_20px_rgba(14,165,233,0.2),0_18px_40px_rgba(0,0,0,0.45)]"
                )}
              >
                {isMyTurn ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.95)]" />
                  </span>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
                )}
                <span className="truncate max-w-[14rem] sm:max-w-xs">
                  {isMyTurn ? "Your turn!" : `${currentPlayer.displayName}'s turn`}
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative z-10 flex h-full min-h-0 w-full flex-col p-3">
          <header className="relative z-30 flex h-[4.6rem] shrink-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-[3.25rem] w-[11.5rem] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-black/42 px-4 text-left text-sm font-black text-white shadow-xl backdrop-blur-md transition hover:bg-white/10"
                aria-label={`${displayGameTitle(state.gameId)} match menu`}
              >
                <span className="truncate">{displayGameName(state.gameId)}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-white/55" />
              </button>

              <button
                type="button"
                className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-[1.15rem] border border-white/10 bg-black/42 text-white/78 shadow-xl backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                aria-label="Copy room code"
                onClick={copyRoomCode}
              >
                <Copy className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-[1.15rem] border border-white/10 bg-black/42 text-white/78 shadow-xl backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <UnoGameStatus state={state} currentPlayerName={currentPlayerName} />

              <Button
                type="button"
                variant="outline"
                className="min-h-10 rounded-full border-white/12 bg-black/35 px-3 text-white hover:bg-white/10"
                onClick={() => setRulebookOpen(true)}
              >
                <BookOpen className="h-4 w-4" />
                Rules
              </Button>

              <Button
                type="button"
                variant="outline"
                className="min-h-10 rounded-full border-white/12 bg-black/35 px-3 text-white hover:bg-white/10"
                onClick={() => setPanelOpen(!sidePanelOpen)}
              >
                {sidePanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                {sidePanelOpen ? "Hide panel" : "Show panel"}
              </Button>
            </div>
          </header>

          <div className={cn("grid min-h-0 flex-1 grid-cols-1 gap-3", sidePanelOpen && "xl:grid-cols-[minmax(0,1fr)_330px]")}>
            <main ref={tableRootRef} className="relative h-full min-h-0 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 classic-uno-stage-light" />

              <TurnTransitionOverlay
                currentPlayerId={state.currentPlayerId}
                previousPlayerId={previousPlayerId}
                currentColor={state.currentColor}
                containerRef={tableRootRef}
                seatRefs={seatRefs}
              />

              <CardDrawAnimationOverlay
                events={gameEvents}
                players={state.players}
                currentUserId={currentUserId}
                currentColor={state.currentColor}
                theme={cardTheme}
                containerRef={tableRootRef}
                drawPileRef={drawPileRef}
                handDockRef={handDockRef}
                seatRefs={seatRefs}
              />

              <CardPlayAnimationOverlay
                events={gameEvents}
                players={state.players}
                currentUserId={currentUserId}
                theme={cardTheme}
                containerRef={tableRootRef}
                handDockRef={handDockRef}
                seatRefs={seatRefs}
                discardPileRef={discardPileRef}
              />

              <HandTransferAnimationOverlay
                events={gameEvents}
                players={state.players}
                currentUserId={currentUserId}
                theme={cardTheme}
                containerRef={tableRootRef}
                seatRefs={seatRefs}
                handDockRef={handDockRef}
              />

              <DiscardAllAnimationOverlay
                events={gameEvents}
                players={state.players}
                currentUserId={currentUserId}
                theme={cardTheme}
                containerRef={tableRootRef}
                seatRefs={seatRefs}
                handDockRef={handDockRef}
                discardPileRef={discardPileRef}
              />


              <PowerEventOverlay
                events={gameEvents}
                players={state.players}
                currentUserId={currentUserId}
                onSeatEffect={triggerSeatPowerEffect}
              />

              <section
                className={cn(
                  "relative z-10 grid h-full min-h-0 grid-rows-[minmax(0,1fr)_15rem] gap-2 rounded-[2.25rem] p-3 overflow-hidden shadow-2xl",
                  isNoMercy ? "uno-no-mercy-table" : "classic-uno-table"
                )}
              >
                {/* Full-Table Spotlight Torch beam (backup option; kept disabled in favor of intense hand glow) */}
                <AnimatePresence>
                  {ENABLE_TORCH_LIGHT && isMyTurn ? (
                    <motion.div
                      key="player-turn-torch-light"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-0 z-0 origin-bottom overflow-hidden"
                    >
                      {/* Wide Conic light beam spreading upward from bottom-center across the whole table */}
                      <div
                        className="absolute inset-0 opacity-65"
                        style={{
                          background:
                            "conic-gradient(from 180deg at 50% 100%, transparent 35deg, rgba(255,255,255,0.06) 50deg, rgba(255,255,255,0.18) 70deg, rgba(255,255,255,0.35) 90deg, rgba(255,255,255,0.18) 110deg, rgba(255,255,255,0.06) 130deg, transparent 145deg)",
                          filter: "blur(44px)"
                        }}
                      />

                      {/* Wide linear light beam connecting player at bottom to center and top */}
                      <div
                        className="absolute inset-0 opacity-70"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.24) 35%, rgba(255,255,255,0.1) 70%, transparent 100%)",
                          clipPath: "polygon(22% 100%, 78% 100%, 96% 0%, 4% 0%)",
                          filter: "blur(32px)"
                        }}
                      />

                      {/* White glowing spotlight pool illuminating the middle discard and draw piles */}
                      <motion.div
                        animate={{
                          opacity: [0.75, 1, 0.75],
                          scale: [0.97, 1.04, 0.97]
                        }}
                        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: "min(85%, 36rem, 64vh)",
                          height: "min(50%, 22rem, 42vh)",
                          background:
                            "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.03) 72%, transparent 100%)",
                          filter: "blur(32px)"
                        }}
                      />

                      {/* Soft ambient illumination on the player bottom dock */}
                      <div
                        className="absolute inset-x-0 bottom-0 h-48 opacity-55"
                        style={{
                          background:
                            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.1) 55%, transparent 100%)",
                          filter: "blur(36px)"
                        }}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="relative min-h-0 overflow-visible">
                  <div
                    className="pointer-events-none absolute left-1/2 top-[calc(50%+4rem)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border"
                    style={{
                      width: "min(85%, 38rem, 80vh)",
                      borderColor: activeAccent.border,
                      background: `radial-gradient(circle, ${activeAccent.strongGlow} 0%, ${activeAccent.glow} 28%, ${activeAccent.soft} 58%, transparent 76%)`,
                      filter: `drop-shadow(0 0 20px ${activeAccent.glow})`,
                      boxShadow: `
                        inset 0 0 95px ${activeAccent.glow},
                        0 0 55px ${activeAccent.glow},
                        0 0 105px ${activeAccent.soft}
                      `
                    }}
                  />

                  <DirectionIndicator
                    direction={state.direction}
                    currentColor={state.currentColor}
                    activeSeatAngle={activeSeatAngle}
                    isNoMercy={isNoMercy}
                  />

                  {opponentSlots.map(({ player, left, top, side }) => (
                    <div
                      key={player.userId}
                      ref={registerSeatRef(player.userId)}
                      className={cn(
                        "absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300",
                        side === "left" && "origin-left",
                        side === "right" && "origin-right"
                      )}
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: opponentSeatWidth
                      }}
                    >
                      <PlayerSeat
                        player={player}
                        roomPlayer={roomPlayerById.get(player.userId)}
                        theme={cardTheme}
                        compact={compactSeats}
                        fanSide={getFanSide(side, left)}
                        seatSide={side}
                        stackHitAmount={stackHitNotice?.playerId === player.userId ? stackHitNotice.amount : undefined}
                        powerEffect={seatPowerEffects[player.userId]}
                        turnProgress={player.isCurrentTurn ? turnProgress : undefined}
                        activeColor={state.currentColor ?? (state.topDiscard as RenderableCard)?.color}
                        isNoMercy={isNoMercy}
                      />
                    </div>
                  ))}

                  <div className="relative z-10 grid h-full min-h-0 place-items-center translate-y-16">
                    <motion.div
                      ref={centerDockRef}
                      layout
                      className="relative z-10 translate-y-16 flex items-center justify-center gap-6 sm:gap-10 md:gap-12 rounded-[3rem] px-6 py-6 backdrop-blur-xl sm:px-10"
                      style={{
                        border: `1px solid ${activeAccent.border}`,
                        background: isNoMercy
                          ? "radial-gradient(ellipse at 50% 18%, rgba(55,8,22,0.82), rgba(18,2,7,0.88) 72%, rgba(0,0,0,0.72) 100%)"
                          : "radial-gradient(ellipse at 50% 18%, rgba(13,62,48,0.76), rgba(3,16,12,0.82) 72%, rgba(0,0,0,0.62) 100%)",
                        boxShadow: `
                          0 30px 90px rgba(0,0,0,0.72),
                          0 0 65px ${activeAccent.strongGlow},
                          0 0 115px ${activeAccent.glow},
                          inset 0 1px 0 rgba(255,255,255,0.12)
                        `
                      }}
                    >
                      <AnimatePresence>
                        {pendingPenalty ? (
                          <StackPenaltyBadge
                            amount={pendingPenalty.amount}
                            targetName={penaltyTargetName}
                            addedAmount={stackAddedAmount}
                          />
                        ) : null}
                      </AnimatePresence>

                      <div ref={drawPileRef}>
                        <DrawPile
                          count={state.drawPileCount}
                          canDraw={canDraw}
                          isForcedDraw={isForcedDraw}
                          isMyTurn={isMyTurn}
                          activeColor={state.currentColor ?? (state.topDiscard as RenderableCard)?.color}
                          theme={cardTheme}
                          onDraw={() => onAction("draw_card")}
                        />
                      </div>

                      <div ref={discardPileRef} className="relative">
                        <AnimatePresence initial={false}>
                          <motion.div
                            key={`discard-pulse-${state.topDiscard.id}`}
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-3 rounded-[1.4rem] border"
                            style={{ borderColor: activeAccent.border, boxShadow: `0 0 26px ${activeAccent.glow}` }}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: [0, 0.7, 0], scale: [0.94, 1.04, 1.1] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                          />
                        </AnimatePresence>
                        <DiscardPile card={state.topDiscard as RenderableCard} theme={cardTheme} currentColor={state.currentColor} />
                      </div>

                      <TableTurnIndicator
                        player={currentPlayer}
                        roomPlayer={currentPlayer ? roomPlayerById.get(currentPlayer.userId) : undefined}
                        isMyTurn={isMyTurn}
                        turnProgress={turnProgress}
                        turnSecondsLeft={turnSecondsLeft}
                        activeColor={state.currentColor ?? (state.topDiscard as RenderableCard)?.color}
                        activeSeatAngle={activeSeatAngle}
                        isNoMercy={isNoMercy}
                      />
                    </motion.div>
                  </div>
                </div>

                <div ref={handDockRef} className="uno-hand-zone relative z-20 -mt-5 min-h-0 overflow-visible px-2">
                  <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-3 px-2 pb-1 bg-transparent">
                    <div className="flex min-h-14 items-center gap-3">
                      <div className="rounded-full border border-white/10 bg-transparent p-1.5">
                        <TurnTimerCircle
                          active={Boolean(currentPlayer)}
                          progress={turnProgress}
                          secondsLeft={turnSecondsLeft}
                          size={56}
                          color={activeAccent.text}
                        />
                      </div>

                      {me?.isCurrentTurn ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.92 }}
                          className="inline-flex min-h-11 items-center gap-3 rounded-full border px-5 py-1.5 text-xs sm:text-sm font-black uppercase tracking-[0.28em] shadow-xl backdrop-blur-md"
                          style={{
                            borderColor: "rgba(255, 255, 255, 0.35)",
                            background:
                              "linear-gradient(135deg, rgba(34,197,94,0.42), rgba(14,165,233,0.26) 60%, rgba(255,255,255,0.12) 100%)",
                            color: "#ffffff",
                            boxShadow: `0 0 35px ${activeAccent.strongGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`
                          }}
                        >
                          <span className="relative flex h-3 w-3 items-center justify-center">
                            <span
                              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                              style={{ backgroundColor: activeAccent.text }}
                            />
                            <span
                              className="relative inline-flex h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: activeAccent.text,
                                boxShadow: `0 0 16px ${activeAccent.strongGlow}`
                              }}
                            />
                          </span>
                          <span className="font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            YOUR TURN!
                          </span>
                        </motion.div>
                      ) : null}
                    </div>

                    <div className="hidden md:block">
                      <UnoActionBar
                        legalActions={legalActions}
                        mode={state.gameId}
                        onDraw={() => onAction("draw_card")}
                        onPass={() => onAction("pass_turn")}
                        onUno={() => onAction("call_uno")}
                        onResolveRoulette={(chosenColor) => onAction("resolve_roulette", { chosenColor })}
                      />
                    </div>
                  </div>

                  <div className="flex min-h-0 items-end justify-center gap-3">
                    {me ? (
                      <div ref={registerSeatRef(me.userId)} className="shrink-0">
                        <div
                          aria-label={`${me.displayName}, ${me.handCount} cards${me.isCurrentTurn ? ", your turn" : ""}`}
                          className={cn(
                            "flex w-[4.75rem] flex-col items-center gap-1 rounded-2xl border p-2 text-center sm:hidden",
                            me.isCurrentTurn
                              ? "border-2 border-emerald-300 bg-[linear-gradient(135deg,#34d399_0%,#10b981_100%)] shadow-[0_0_24px_rgba(16,185,129,0.7)] text-white"
                              : "border-white/10 bg-black/45"
                          )}
                        >
                          <div
                            className={cn(
                              "grid h-9 w-9 place-items-center overflow-hidden rounded-full border text-xs font-black text-white",
                              me.isCurrentTurn ? "border border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "border-white/20 bg-black/50"
                            )}
                          >
                            {roomPlayerById.get(me.userId)?.avatarUrl ? (
                              <img src={roomPlayerById.get(me.userId)?.avatarUrl ?? undefined} alt="" className="h-full w-full object-cover" />
                            ) : (
                              me.displayName.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="max-w-full truncate text-[0.58rem] font-black text-white">{me.displayName}</span>
                          <span className="text-[0.58rem] font-bold text-amber-200">{me.handCount} cards</span>
                          {me.isCurrentTurn ? <span className="text-[0.52rem] font-black uppercase text-emerald-300">Your turn</span> : null}
                        </div>

                        <div className="hidden w-[min(17rem,24vw)] pb-1 sm:block">
                          <PlayerSeat
                            player={me}
                            roomPlayer={roomPlayerById.get(me.userId)}
                            theme={cardTheme}
                            isSelf
                            compact
                            fanSide="right"
                            seatSide="top"
                            stackHitAmount={stackHitNotice?.playerId === me.userId ? stackHitNotice.amount : undefined}
                            powerEffect={seatPowerEffects[me.userId]}
                            turnProgress={me.isCurrentTurn ? turnProgress : undefined}
                            activeColor={state.currentColor ?? (state.topDiscard as RenderableCard)?.color}
                            isNoMercy={isNoMercy}
                          />
                        </div>
                      </div>
                    ) : null}

                    {me?.hand ? (
                      <PlayerHand
                        hand={me.hand as RenderableCard[]}
                        legalActions={legalActions}
                        theme={cardTheme}
                        targetPlayers={targetPlayerList}
                        onPlay={playCard}
                        isMyTurn={Boolean(me?.isCurrentTurn)}
                        activeColor={state.currentColor ?? (state.topDiscard as RenderableCard)?.color}
                        myHandCount={me?.hand?.length ?? me?.handCount ?? 0}
                        turnProgress={turnProgress}
                        turnSecondsLeft={turnSecondsLeft}
                        turnExpiresAt={state.turnExpiresAt}
                        turnDurationMs={turnDurationMs}
                        isNoMercy={isNoMercy}
                      />
                    ) : null}
                  </div>
                </div>
              </section>
            </main>

            {sidePanelOpen ? (
              <aside className="relative z-20 hidden min-h-0 overflow-visible xl:flex xl:flex-col xl:gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-black text-red-300 transition hover:bg-white/5 hover:text-red-200"
                    onClick={goDashboard}
                  >
                    <LogOut className="h-4 w-4" />
                    Leave
                  </button>

                  {canEndMatch ? (
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-500/10 px-3 py-2 text-left text-sm font-black text-red-200 transition hover:bg-red-500/18"
                      onClick={() => setConfirmEndOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      End Match
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/35">Match ID</p>
                    <p className="truncate text-xs font-bold text-white/62">{room.code}</p>
                  </div>
                  <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white"
                    aria-label="Copy match id"
                    onClick={copyRoomCode}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <UnoActivityLogOverlay events={gameEvents} players={state.players} currentUserId={currentUserId} />

              <div className="min-h-0 flex-[1_1_0%] overflow-hidden">
                {onChat ? <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={onlineCount} /> : null}
              </div>
              </aside>
            ) : null}
          </div>
        </div>

        <div className="md:hidden">
          <UnoActionBar
            legalActions={legalActions}
            mode={state.gameId}
            onDraw={() => onAction("draw_card")}
            onPass={() => onAction("pass_turn")}
            onUno={() => onAction("call_uno")}
            onResolveRoulette={(chosenColor) => onAction("resolve_roulette", { chosenColor })}
          />
        </div>

        <UnoRuleBookModal open={rulebookOpen} mode={state.gameId} theme={cardTheme} onClose={() => setRulebookOpen(false)} />

        {canEndMatch ? (
          <Dialog open={confirmEndOpen} title="End match" onClose={() => setConfirmEndOpen(false)}>
            <div className="space-y-4">
              <p className="text-sm font-semibold leading-relaxed text-white/70">End this match for everyone?</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="border-white/15 bg-white/[0.06] text-white hover:bg-white/12" onClick={() => setConfirmEndOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="bg-red-700 hover:bg-red-800" onClick={confirmEndMatch}>
                  End Match
                </Button>
              </div>
            </div>
          </Dialog>
        ) : null}

        {state.phase === "finished" ? (
          <Dialog
            open
            title="Match Standings"
            onClose={goDashboard}
            className="max-w-xl sm:max-w-2xl"
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              {/* Champion Headline Banner */}
              <div className="overflow-hidden rounded-[1.45rem] border border-amber-400/30 bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.32),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(3,7,18,0.96))] p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 shadow-[0_0_32px_rgba(251,191,36,0.5)] shrink-0 text-xl font-black">
                    🏆
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg sm:text-xl font-black text-amber-200">
                      {winner?.userId === currentUserId ? "Victory! You Won the Match!" : `${winnerName ?? "Player"} Won the Match!`}
                    </p>
                    <p className="text-xs font-semibold text-white/60">
                      {wonByElimination
                        ? "All opponents eliminated by mercy rules • Final Arena Standings"
                        : "Cards cleared from hand • Final Arena Standings"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3D Olympic Position Stand (Podium for Top 3) */}
              {placementRows.length >= 2 ? (
                <div className="relative rounded-2xl border border-white/10 bg-black/40 p-3 pt-6 backdrop-blur-md">
                  <div className="flex items-end justify-center gap-2 sm:gap-4 px-1">
                    {/* 2nd Place (Silver - Left) */}
                    {placementRows[1] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[140px]">
                        <div className="relative mb-2 flex flex-col items-center text-center">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-2 border-slate-200 text-slate-950 font-black shadow-[0_0_20px_rgba(203,213,225,0.4)] text-xl">
                            🥈
                          </div>
                          <span className="mt-1.5 text-xs font-black text-slate-200 truncate max-w-[120px]">
                            {placementRows[1].displayName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {placementRows[1].statusText}
                          </span>
                        </div>
                        {/* 2nd Podium Base */}
                        <div className="w-full h-20 rounded-t-2xl border-t-2 border-x-2 border-slate-400/50 bg-gradient-to-b from-slate-400/30 via-slate-700/40 to-slate-950/90 p-2 flex flex-col items-center justify-start shadow-lg">
                          <span className="text-xl font-black text-slate-200">2nd</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Second</span>
                        </div>
                      </div>
                    ) : null}

                    {/* 1st Place (Gold - Center, Highest) */}
                    {placementRows[0] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-5 z-10">
                        <div className="relative mb-2 flex flex-col items-center text-center">
                          <span className="text-2xl animate-bounce mb-0.5">👑</span>
                          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-amber-200 text-slate-950 font-black shadow-[0_0_30px_rgba(251,191,36,0.65)] text-2xl">
                            🥇
                          </div>
                          <span className="mt-1.5 text-xs sm:text-sm font-black text-amber-200 truncate max-w-[140px]">
                            {placementRows[0].displayName}
                          </span>
                          <span className="text-[10px] font-black text-amber-400">
                            {placementRows[0].statusText}
                          </span>
                        </div>
                        {/* 1st Podium Base */}
                        <div className="w-full h-28 rounded-t-2xl border-t-2 border-x-2 border-amber-400/70 bg-gradient-to-b from-amber-500/35 via-amber-700/40 to-slate-950/90 p-2 flex flex-col items-center justify-start shadow-[0_0_35px_rgba(251,191,36,0.3)]">
                          <span className="text-2xl font-black text-amber-300">1st</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Champion</span>
                        </div>
                      </div>
                    ) : null}

                    {/* 3rd Place (Bronze - Right) */}
                    {placementRows[2] ? (
                      <div className="flex flex-col items-center flex-1 max-w-[140px]">
                        <div className="relative mb-2 flex flex-col items-center text-center">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 border-2 border-amber-600/70 text-amber-200 font-black shadow-[0_0_18px_rgba(217,119,6,0.3)] text-xl">
                            🥉
                          </div>
                          <span className="mt-1.5 text-xs font-black text-amber-200 truncate max-w-[120px]">
                            {placementRows[2].displayName}
                          </span>
                          <span className="text-[10px] font-bold text-amber-500/80">
                            {placementRows[2].statusText}
                          </span>
                        </div>
                        {/* 3rd Podium Base */}
                        <div className="w-full h-16 rounded-t-2xl border-t-2 border-x-2 border-amber-700/50 bg-gradient-to-b from-amber-800/30 via-amber-950/50 to-slate-950/90 p-2 flex flex-col items-center justify-start shadow-md">
                          <span className="text-xl font-black text-amber-400">3rd</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80">Third</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Full Standings List (All Players with Smooth Scrolling Enabled) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-white/40">
                  <span>Player & Rank</span>
                  <span>Match Result</span>
                </div>
                <div className="max-h-[34vh] sm:max-h-[40vh] overflow-y-auto space-y-2 pr-1 [scrollbar-color:rgba(251,191,36,0.65)_rgba(255,255,255,0.08)] [scrollbar-width:thin]">
                  {placementRows.map((placement) => {
                    const isMe = placement.userId === currentUserId;
                    const isFirst = placement.placement === 1;
                    const isSecond = placement.placement === 2;
                    const isThird = placement.placement === 3;

                    return (
                      <div
                        key={placement.userId}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl border p-2.5 sm:p-3 text-sm transition-all shadow-md",
                          isFirst
                            ? "border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-950/30 ring-1 ring-amber-400/30"
                            : isSecond
                            ? "border-slate-300/30 bg-gradient-to-r from-slate-400/15 via-slate-900/90 to-slate-950/50"
                            : isThird
                            ? "border-amber-700/30 bg-gradient-to-r from-amber-800/15 via-slate-900/90 to-slate-950/50"
                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Position Pill */}
                          <div
                            className={cn(
                              "flex items-center justify-center rounded-xl px-2.5 py-1 text-xs font-black shadow-sm shrink-0 min-w-[62px]",
                              isFirst
                                ? "bg-amber-400 text-slate-950 ring-1 ring-amber-200"
                                : isSecond
                                ? "bg-slate-300 text-slate-950"
                                : isThird
                                ? "bg-amber-700 text-amber-100"
                                : "bg-white/10 text-white/80"
                            )}
                          >
                            <span>{placement.rankWord}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-black text-white text-sm">
                                {placement.displayName}
                              </span>
                              {isMe ? (
                                <span className="rounded bg-amber-400/20 border border-amber-400/40 px-1.5 py-0.2 text-[8px] font-black text-amber-300 uppercase">
                                  YOU
                                </span>
                              ) : null}
                              {placement.isBot ? (
                                <span className="rounded bg-sky-500/20 border border-sky-400/30 px-1.5 py-0.2 text-[8px] font-black text-sky-300 uppercase">
                                  BOT
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] font-semibold text-white/45">
                              Seat #{placement.seat + 1}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge (NO POINTS!) */}
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black shrink-0 shadow-sm",
                            placement.statusBadge
                          )}
                        >
                          <span>{placement.statusIcon}</span>
                          <span>{placement.statusText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                className="w-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 py-3 font-black text-slate-950 shadow-lg hover:brightness-110 active:scale-[0.99] transition"
                onClick={goDashboard}
              >
                Back to Dashboard
              </Button>
            </motion.div>
          </Dialog>
        ) : null}
      </div>
      </LayoutGroup>
    </MotionConfig>
  );
}