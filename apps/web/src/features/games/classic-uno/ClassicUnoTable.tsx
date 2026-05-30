"use client";

import { useMemo, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import type { PublicClassicUnoState, PublicNoMercyState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { BookOpen, Copy, LogOut, Settings, Smile, Trophy } from "lucide-react";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RenderableCard } from "@/lib/cards";
import { DiscardPile } from "./DiscardPile";
import { DirectionIndicator } from "./DirectionIndicator";
import { DrawPile } from "./DrawPile";
import { EmojiReactionButton } from "./EmojiReactionButton";
import { PlayerHand } from "./PlayerHand";
import { PlayerSeat } from "./PlayerSeat";
import { ReactionOverlay, REACTION_PREFIX } from "./ReactionOverlay";
import { UnoActionBar } from "./UnoActionBar";
import { UnoGameStatus } from "./UnoGameStatus";
import { UnoRuleBookModal } from "./UnoRuleBookModal";
import type { CardThemeId } from "./cardThemes";
import { hasLegalAction } from "./unoActionUtils";

type UnoTableState = PublicClassicUnoState | PublicNoMercyState;

type PlayPayload = { cardId: string; declaredColor?: "red" | "yellow" | "green" | "blue"; targetPlayerId?: string };

const colorGlow: Record<string, string> = {
  red: "rgb(255 59 48 / 0.32)",
  yellow: "rgb(255 201 40 / 0.34)",
  green: "rgb(30 215 96 / 0.28)",
  blue: "rgb(45 140 255 / 0.3)"
};

function displayGameName(gameId: UnoTableState["gameId"]): string {
  return gameId === "uno-no-mercy" ? "UNO No Mercy" : "Classic UNO";
}

function getPendingPenalty(state: UnoTableState): { amount: number; targetPlayerId: string } | null {
  return "pendingPenalty" in state ? state.pendingPenalty : null;
}

export function ClassicUnoTable({
  room,
  state,
  legalActions,
  currentUserId,
  onAction,
  onReaction,
  onChat
}: {
  room: RoomStateView;
  state: UnoTableState;
  legalActions: unknown[];
  currentUserId: string | null;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onReaction?: ((emoji: string) => void) | undefined;
  onChat?: ((roomId: string, body: string) => void) | undefined;
}) {
  const cardTheme: CardThemeId = state.gameId === "uno-no-mercy" ? "no_mercy" : "classic";
  const [rulebookOpen, setRulebookOpen] = useState(false);
  const me = state.players.find((player) => player.userId === currentUserId);
  const others = state.players.filter((player) => player.userId !== currentUserId);
  const onlineCount = room.players.filter((player) => player.connected).length;  const currentPlayerName = state.players.find((player) => player.userId === state.currentPlayerId)?.displayName;
  const winner = state.results?.placements[0];
  const winnerName = winner ? room.players.find((player) => player.userId === winner.userId)?.displayName : null;
  const pendingPenalty = getPendingPenalty(state);
  const tableTint = colorGlow[state.currentColor] ?? "rgb(250 204 21 / 0.18)";
  const reactionMessages = useMemo(
    () => room.chat.filter((message) => message.type === "user" && typeof message.body === "string" && message.body.startsWith(REACTION_PREFIX)),
    [room.chat]
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

  function goDashboard() {
    globalThis.location.assign("/dashboard");
  }

  return (
    <LayoutGroup id={`uno-${room.id}`}>
      <div className="uno-fullscreen relative h-[100dvh] w-screen overflow-hidden text-white">        <div className="pointer-events-none absolute inset-0 uno-fullscreen-grid" />
        <div className="pointer-events-none absolute inset-0 uno-fullscreen-grid" />
        <div className="pointer-events-none absolute inset-0 uno-perspective-grid" />
        <div className="pointer-events-none absolute inset-0 uno-fullscreen-glow" />
        <ReactionOverlay messages={reactionMessages} />

        <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-1 gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_365px]">          <main className="relative h-full min-h-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/20 shadow-[0_40px_120px_rgb(0_0_0_/_0.45)] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 classic-uno-stage-light" />

            <header className="relative z-20 flex h-[4.75rem] items-start justify-between gap-3 p-3">              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2.5 shadow-xl backdrop-blur-md">                  <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-amber-200">Room {room.code}</p>
                  <h2 className="text-xl font-black tracking-wide text-white">{displayGameName(state.gameId)}</h2>
                </div>

                <button
                  type="button"
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/35 text-white/80 shadow-xl backdrop-blur-md transition hover:bg-white/10 hover:text-white"
                  aria-label="Copy room code"
                  onClick={() => navigator.clipboard.writeText(room.code)}
                >
                  <Copy className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/35 text-white/80 shadow-xl backdrop-blur-md transition hover:bg-white/10 hover:text-white"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <UnoGameStatus state={state as PublicClassicUnoState} currentPlayerName={currentPlayerName} />

                {pendingPenalty ? (
                  <div className="rounded-full border border-red-300/25 bg-red-500/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100">
                    Stack +{pendingPenalty.amount}
                  </div>
                ) : null}

                <Button type="button" variant="outline" onClick={() => setRulebookOpen(true)}>
                  <BookOpen className="h-4 w-4" />
                  Rules
                </Button>

                {onReaction ? <EmojiReactionButton onReact={onReaction} /> : null}
              </div>
            </header>

            <section className="relative z-10 grid h-[calc(100%-4.75rem)] min-h-0 grid-rows-[6.75rem_minmax(0,1fr)_13.25rem] gap-2 px-3 pb-3">            {others.length > 0 ? (
                <div className="mx-auto grid h-full w-full max-w-5xl auto-rows-fr gap-2 overflow-hidden sm:grid-cols-2 xl:grid-cols-3">                  {others.map((player) => (
                    <PlayerSeat
                      key={player.userId}
                      player={player}
                      roomPlayer={room.players.find((roomPlayer) => roomPlayer.userId === player.userId)}
                      theme={cardTheme}
                    />
                  ))}
                </div>
              ) : (
                <div />
              )}

              <div className="classic-uno-table relative min-h-0 overflow-hidden rounded-[1.65rem] border-[6px] border-[#3a2417] shadow-[inset_0_0_80px_rgb(0_0_0_/_0.45)]">                
                <DirectionIndicator direction={state.direction} />

                <motion.div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  animate={{ backgroundColor: tableTint }}
                  transition={{ duration: 0.35 }}
                />

                <div className="relative z-10 grid h-full min-h-0 place-items-center py-4">
                  <motion.div
                    layout
                    className="uno-center-glass relative z-10 flex items-center justify-center gap-8 rounded-[2rem] border border-white/10 px-6 py-5 backdrop-blur-sm sm:gap-12 sm:px-8"
                  >
                    <DrawPile
                      count={state.drawPileCount}
                      canDraw={hasLegalAction(legalActions, "draw_card")}
                      theme={cardTheme}
                      onDraw={() => onAction("draw_card")}
                    />
                    <DiscardPile card={state.topDiscard as RenderableCard} theme={cardTheme} />
                  </motion.div>
                </div>

                {me ? (
                  <div className="absolute right-5 top-1/2 z-20 hidden w-[min(21rem,28vw)] -translate-y-1/2 xl:block">
                    <PlayerSeat
                      player={me}
                      roomPlayer={room.players.find((roomPlayer) => roomPlayer.userId === me.userId)}
                      theme={cardTheme}
                      isSelf
                    />
                  </div>
                ) : null}
              </div>

              {me?.hand ? (
                <div className="uno-hand-zone relative z-20 min-h-0 overflow-visible">
                  {me.isCurrentTurn ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mb-1 w-fit rounded-full border border-amber-300/25 bg-amber-300/15 px-4 py-1 text-xs font-black uppercase tracking-[0.24em] text-amber-100 shadow"
                    >
                      Your turn
                    </motion.div>
                  ) : null}
                  <PlayerHand
                    hand={me.hand as RenderableCard[]}
                    legalActions={legalActions}
                    theme={cardTheme}
                    targetPlayers={state.players.filter((player) => player.userId !== currentUserId)}
                    onPlay={playCard}
                  />
                </div>
              ) : null}
            </section>

            <button
              type="button"
              className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-2xl border border-red-400/15 bg-black/35 px-4 py-3 text-sm font-bold text-red-300 shadow-xl backdrop-blur-md transition hover:bg-red-500/10"
              onClick={goDashboard}
            >
              <LogOut className="h-4 w-4" />
              Leave Match
            </button>

            {onReaction ? (
                <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
                  {["😂", "🔥", "💀"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/35 text-xl shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/10"
                      aria-label={`React ${emoji}`}
                      onClick={() => onReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100 shadow-xl backdrop-blur-md transition hover:-translate-y-1 hover:bg-amber-300/20"
                    aria-label="Quick reaction"
                    onClick={() => onReaction("🙂")}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
          </main>

          <aside className="hidden h-full min-h-0 overflow-hidden xl:block">            
            {onChat ? <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={onlineCount} /> : null}
          </aside>
        </div>

        <div className="sr-only">
          <UnoActionBar
            legalActions={legalActions}
            onDraw={() => onAction("draw_card")}
            onPass={() => onAction("pass_turn")}
            onUno={() => onAction("call_uno")}
          />
        </div>

        <UnoRuleBookModal open={rulebookOpen} mode={state.gameId} theme={cardTheme} onClose={() => setRulebookOpen(false)} />

        {state.phase === "finished" ? (
          <Dialog open title="Results" onClose={goDashboard}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="rounded-xl bg-zinc-950 p-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-300 text-zinc-950">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-lg font-black">{winner?.userId === currentUserId ? "You won" : `${winnerName ?? "Someone"} won`}</p>
                    <p className="text-xs font-semibold text-white/60">Final scores are calculated by the server.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {placementRows.map((placement) => (
                  <div key={placement.userId} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-black text-zinc-950">#{placement.placement} {placement.displayName}</p>
                      <p className="text-xs font-semibold text-zinc-500">{placement.result === "WIN" ? "Winner" : "Finished"}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 font-black text-zinc-950 shadow-sm">{placement.score}</span>
                  </div>
                ))}
              </div>
              <Button type="button" className="w-full" onClick={goDashboard}>
                Dashboard
              </Button>
            </motion.div>
          </Dialog>
        ) : null}
      </div>
    </LayoutGroup>
  );
}