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
  const [turnNotice, setTurnNotice] = useState<{ id: string; text: string; tone: "self" | "other" } | null>(null);
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

  const activeSeatAngle = useMemo(() => {
    if (!state.currentPlayerId) return undefined;
    if (state.currentPlayerId === currentUserId) {
      return 90; // Bottom seat (local player)
    }
    const slot = opponentSlots.find((s) => s.player.userId === state.currentPlayerId);
    if (!slot) return undefined;
    const dx = slot.left - 50;
    const dy = slot.top - 50;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, [currentUserId, opponentSlots, state.currentPlayerId]);

  const reactionMessages = useMemo(
    () =>
      room.chat.filter(
        (message) => message.type === "user" && typeof message.body === "string" && message.body.startsWith(REACTION_PREFIX)
      ),
    [room.chat]
  );

  // Timer calculations
  const turnDurationMs = state.turnDurationMs ?? 30000;
  const turnExpiresAt = state.turnExpiresAt ? new Date(state.turnExpiresAt).getTime() : null;
  const turnRemainingMs = turnExpiresAt ? Math.max(0, turnExpiresAt - now) : turnDurationMs;
  const turnProgress = Math.max(0, Math.min(1, turnRemainingMs / turnDurationMs));
  const turnSecondsLeft = Math.max(0, Math.ceil(turnRemainingMs / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
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

  useEffect(() => {
    if (!state.currentPlayerId) {
      return;
    }

    const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
    const nextMessage =
      state.currentPlayerId === currentUserId
        ? "Your turn!"
        : `${currentPlayer?.displayName ?? "Player"}'s turn`;

    setTurnNotice({
      id: `${state.currentPlayerId}-${Date.now()}`,
      text: nextMessage,
      tone: state.currentPlayerId === currentUserId ? "self" : "other"
    });

    const timeout = window.setTimeout(() => setTurnNotice(null), 1750);
    return () => window.clearTimeout(timeout);
  }, [currentUserId, state.currentPlayerId, state.players]);

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

  const placementRows =
    state.results?.placements.map((placement) => ({
      ...placement,
      displayName:
        room.players.find((player) => player.userId === placement.userId)?.displayName ??
        state.players.find((player) => player.userId === placement.userId)?.displayName ??
        `Player ${placement.userId.slice(0, 6)}`
    })) ?? [];

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

        <AnimatePresence>
          {turnNotice ? (
            <motion.div
              key={turnNotice.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-none absolute inset-x-0 top-4 z-[60] flex justify-center"
            >
              <div
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[0.72rem] font-black uppercase tracking-[0.22em] shadow-[0_18px_40px_rgba(0,0,0,0.38)]",
                  turnNotice.tone === "self"
                    ? "border-lime-200/75 bg-[linear-gradient(135deg,rgba(34,197,94,0.34),rgba(16,185,129,0.22))] text-lime-50"
                    : "border-cyan-300/65 bg-[linear-gradient(135deg,rgba(14,165,233,0.24),rgba(59,130,246,0.16))] text-sky-50"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_18px_rgba(190,242,100,0.8)]" />
                {turnNotice.text}
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

              <section className="relative z-10 grid h-full min-h-0 grid-rows-[minmax(0,1fr)_15rem] gap-2 px-3 pb-3">
                <div className={cn(isNoMercy ? "uno-no-mercy-table" : "classic-uno-table", "relative min-h-0 overflow-hidden rounded-[2.25rem] bg-transparent shadow-none")}>
                  <div
                    className="pointer-events-none absolute left-1/2 top-[calc(50%+2rem)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border"
                    style={{
                      width: "min(72%, 31rem, 68vh)",
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
                        isNoMercy={isNoMercy}
                      />
                    </div>
                  ))}

                  <div className="relative z-10 grid h-full min-h-0 place-items-center">
                    <motion.div
                      layout
                      className="relative z-10 translate-y-8 flex items-center justify-center gap-10 rounded-[3rem] px-8 py-7 backdrop-blur-xl sm:gap-16 sm:px-12"
                      style={{
                        border: `1px solid ${activeAccent.border}`,
                        background: isNoMercy
                          ? "radial-gradient(ellipse at 50% 18%, rgba(55,8,22,0.82), rgba(18,2,7,0.88) 72%, rgba(0,0,0,0.72) 100%)"
                          : "radial-gradient(ellipse at 50% 18%, rgba(13,62,48,0.76), rgba(3,16,12,0.82) 72%, rgba(0,0,0,0.62) 100%)",
                        boxShadow: `
                          0 30px 90px rgba(0,0,0,0.68),
                          0 0 44px ${activeAccent.glow},
                          inset 0 1px 0 rgba(255,255,255,0.06)
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
                          canDraw={hasLegalAction(legalActions, "draw_card")}
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
                    </motion.div>
                  </div>
                </div>

                <div ref={handDockRef} className="uno-hand-zone relative z-20 -mt-5 min-h-0 overflow-visible px-2">
                  <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-3 px-2 pb-1">
                    <div className="flex min-h-14 items-center gap-3">
                      <div className="rounded-full border border-white/10 bg-black/42 p-1.5 shadow-[0_0_28px_rgb(0_0_0_/_0.36)] backdrop-blur-xl">
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
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.96 }}
                          className="inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-[0.7rem] font-black uppercase tracking-[0.26em]"
                          style={{
                            borderColor: activeAccent.border,
                            background: "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(14,165,233,0.18))",
                            color: activeAccent.text,
                            boxShadow: `0 0 30px ${activeAccent.glow}`
                          }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: activeAccent.text,
                              boxShadow: `0 0 18px ${activeAccent.strongGlow}`
                            }}
                          />
                          It is your turn
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
                            me.isCurrentTurn ? "border-lime-200/60 bg-lime-400/15" : "border-white/10 bg-black/45"
                          )}
                        >
                          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/20 bg-black/50 text-xs font-black text-white">
                            {roomPlayerById.get(me.userId)?.avatarUrl ? (
                              <img src={roomPlayerById.get(me.userId)?.avatarUrl ?? undefined} alt="" className="h-full w-full object-cover" />
                            ) : (
                              me.displayName.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span className="max-w-full truncate text-[0.58rem] font-black text-white">{me.displayName}</span>
                          <span className="text-[0.58rem] font-bold text-amber-200">{me.handCount} cards</span>
                          {me.isCurrentTurn ? <span className="text-[0.52rem] font-black uppercase text-lime-200">Your turn</span> : null}
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
                        targetPlayers={state.players.filter((player) => player.userId !== currentUserId)}
                        onPlay={playCard}
                        isMyTurn={Boolean(me?.isCurrentTurn)}
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
          <Dialog open title="Match Results" onClose={goDashboard}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="overflow-hidden rounded-[1.45rem] border border-amber-200/20 bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.28),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(3,7,18,0.96))] p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-300 text-zinc-950 shadow-[0_0_32px_rgba(251,191,36,0.42)]">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">
                      {winner?.userId === currentUserId ? "You won" : `${winnerName ?? "Someone"} won`}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Final scoreboard</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[22vh] space-y-1 overflow-hidden pr-1 [scrollbar-color:rgba(251,191,36,0.65)_rgba(255,255,255,0.08)] [scrollbar-width:thin]">
                {placementRows.map((placement) => (
                  <div
                    key={placement.userId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">
                        #{placement.placement} {placement.displayName}
                      </p>
                      <p className="text-xs font-semibold text-white/45">
                        {placement.result === "WIN" ? "Winner" : "Finished"}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-200/20 bg-amber-300/14 px-3 py-1 font-black text-amber-100 shadow-sm">
                      {placement.score}
                    </span>
                  </div>
                ))}
              </div>

              <Button type="button" className="w-full rounded-full bg-amber-300 font-black text-zinc-950 hover:bg-amber-200" onClick={goDashboard}>
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