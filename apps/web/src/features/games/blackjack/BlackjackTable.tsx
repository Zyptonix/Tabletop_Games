"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, RotateCcw, HelpCircle, Shield, Volume2, VolumeX } from "lucide-react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { CasinoChip, ChipStack, type ChipDenomination } from "../casino/CasinoChip";
import { CasinoPlayingCard } from "../casino/CasinoPlayingCard";
import { casinoAudio } from "../casino/casinoAudio";
import { evaluateBlackjackHand } from "@tabletop/game-core";

const BET_CHIPS: ChipDenomination[] = [10, 25, 50, 100, 500];

export function BlackjackTable(props: BoardGameTableProps) {
  const { room, state, legalActions, currentUserId, onAction, onChat, onEndMatch } = props;

  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const me = state.players.find((p) => p.userId === currentUserId);
  const myChips = state.blackjackChips?.[currentUserId] ?? 0;
  const myHands = state.blackjackPlayerHands?.[currentUserId] ?? [[]];
  const myBets = state.blackjackBets?.[currentUserId] ?? [0];
  const myCurrentBet = myBets.reduce((a, b) => a + b, 0);

  const phase = state.blackjackPhase ?? "betting";
  const isMyTurn = state.currentPlayerId === currentUserId && phase === "player_turns";

  const dealerCards = state.blackjackDealerHand ?? [];
  const dealerScore = state.blackjackDealerScore ?? 0;
  const holeHidden = state.blackjackDealerHoleHidden ?? false;

  const roundResults = state.blackjackRoundResults?.[currentUserId];

  function playSound(type: "chip" | "card" | "win" | "bust") {
    if (!soundEnabled) return;
    if (type === "chip") casinoAudio.playChip();
    if (type === "card") casinoAudio.playCardDeal();
    if (type === "win") casinoAudio.playWin();
    if (type === "bust") casinoAudio.playBust();
  }

  // Trigger win sound on round results
  useEffect(() => {
    if (phase === "round_end" && roundResults && roundResults.length > 0) {
      const anyWin = roundResults.some((r) => r.result === "win" || r.result === "blackjack");
      const allBust = roundResults.every((r) => r.result === "bust");
      if (anyWin) playSound("win");
      else if (allBust) playSound("bust");
    }
  }, [phase, roundResults]);

  function handleBetChip(amount: ChipDenomination) {
    playSound("chip");
    onAction("blackjack_action", { choice: "bet", amount });
  }

  function handleClearBet() {
    playSound("chip");
    onAction("blackjack_action", { choice: "clear_bet" });
  }

  function handleDeal() {
    playSound("card");
    onAction("blackjack_action", { choice: "deal" });
  }

  function handleHit() {
    playSound("card");
    onAction("blackjack_action", { choice: "hit" });
  }

  function handleStand() {
    playSound("card");
    onAction("blackjack_action", { choice: "stand" });
  }

  function handleDouble() {
    playSound("chip");
    onAction("blackjack_action", { choice: "double" });
  }

  function handleSplit() {
    playSound("card");
    onAction("blackjack_action", { choice: "split" });
  }

  function handleNextRound() {
    playSound("chip");
    onAction("blackjack_action", { choice: "next_round" });
  }

  // Can double?
  const activeHandIndex = state.blackjackActiveHandIndex ?? 0;
  const activeHand = myHands[activeHandIndex] ?? [];
  const canDouble = isMyTurn && activeHand.length === 2 && myChips >= (myBets[activeHandIndex] ?? 0);
  const canSplit =
    isMyTurn &&
    activeHand.length === 2 &&
    myChips >= (myBets[activeHandIndex] ?? 0) &&
    activeHand[0]?.slice(0, -1) === activeHand[1]?.slice(0, -1) &&
    myHands.length < 4;

  // Other players (opponents)
  const otherPlayers = state.players.filter((p) => p.userId !== currentUserId);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col select-none overflow-hidden bg-[#050c0a] text-white">
      {/* ============================================================== */}
      {/* CASINO AMBIENT BACKGROUND & CEILING LIGHTS                    */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.18),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(217,119,6,0.12),transparent_70%)]" />

      {/* ============================================================== */}
      {/* CASINO TOP HEADER                                              */}
      {/* ============================================================== */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-slate-950/80 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950 font-black shadow-lg">
            🎰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-amber-200">
                VIP High-Roller Blackjack
              </h1>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                Round {state.blackjackRoundNumber ?? 1}
              </span>
            </div>
            <p className="text-[11px] font-medium text-emerald-400/80">
              Dealer stands on all 17s · Blackjack pays 3 to 2
            </p>
          </div>
        </div>

        {/* Top Controls: Sound, Rules, Chips */}
        <div className="flex items-center gap-3">
          {/* Chip Bankroll Pod */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-black/40 px-3 py-1.5 shadow-inner">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Chips:
            </span>
            <span className="font-mono text-base font-black text-emerald-300 tabular-nums">
              ${myChips.toLocaleString("en-US")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            <HelpCircle className="h-4 w-4 text-amber-300" />
            <span className="hidden sm:inline">Rules</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CASINO BLACKJACK TABLE (SEMI-CIRCULAR FELT)                */}
      {/* ============================================================== */}
      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-between p-2 sm:p-4 overflow-hidden">
        {/* SEMI-CIRCULAR FELT WITH PADDED LEATHER RAIL */}
        <div
          className="relative flex h-full w-full max-w-5xl flex-col items-center justify-between rounded-b-[180px] sm:rounded-b-[240px] border-x-[12px] sm:border-x-[16px] border-b-[14px] sm:border-b-[18px] border-t-2 border-[#542d10] p-4 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 15%, #065f46 0%, #044e39 45%, #022c22 85%, #011d16 100%)",
            boxShadow:
              "inset 0 0 100px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.2), 0 20px 50px rgba(0,0,0,0.85)"
          }}
        >
          {/* Subtle felt texture line / arc */}
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-[70%] rounded-b-full border-2 border-dashed border-amber-300/20" />

          {/* Golden Casino Text printed on table */}
          <div className="pointer-events-none absolute top-[36%] inset-x-0 text-center select-none">
            <p className="font-serif text-[10px] sm:text-xs font-black tracking-[0.25em] text-amber-200/40 uppercase">
              ★ BLACKJACK PAYS 3 TO 2 ★
            </p>
            <p className="mt-1 font-serif text-[8px] sm:text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
              Dealer must draw to 16 and stand on all 17s
            </p>
          </div>

          {/* ========================================================== */}
          {/* DEALER AREA (TOP CENTER)                                   */}
          {/* ========================================================== */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            {/* Dealer Chip Tray & Nameplate */}
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-slate-950/70 px-4 py-1 shadow-lg backdrop-blur-sm">
              <span className="text-xs font-black tracking-wider text-amber-300 uppercase">
                DEALER
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {dealerCards.length > 0 ? (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[11px] font-black text-emerald-300">
                  {holeHidden ? `Shows ${dealerScore}` : `Total: ${dealerScore}`}
                </span>
              ) : null}
            </div>

            {/* Dealer Cards */}
            <div className="flex items-center justify-center gap-2 min-h-[90px] sm:min-h-[105px]">
              {dealerCards.length === 0 ? (
                <div className="flex items-center gap-2 opacity-30">
                  <div className="h-20 w-14 rounded-lg border-2 border-dashed border-white/40" />
                  <div className="h-20 w-14 rounded-lg border-2 border-dashed border-white/40" />
                </div>
              ) : (
                dealerCards.map((card, i) => (
                  <CasinoPlayingCard
                    key={`${i}-${card}`}
                    card={card}
                    hidden={card === "hidden"}
                    size="md"
                    className="shadow-2xl"
                  />
                ))
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* OPPONENT SEATS (AROUND THE PERIMETER)                      */}
          {/* ========================================================== */}
          {otherPlayers.length > 0 ? (
            <div className="relative z-10 flex w-full justify-around px-4">
              {otherPlayers.map((player) => {
                const hands = state.blackjackPlayerHands?.[player.userId] ?? [[]];
                const bets = state.blackjackBets?.[player.userId] ?? [0];
                const chips = state.blackjackChips?.[player.userId] ?? 0;
                const isTurn = state.currentPlayerId === player.userId;

                return (
                  <div
                    key={player.userId}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-2 backdrop-blur-sm transition-all ${
                      isTurn
                        ? "border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50 shadow-xl"
                        : "border-white/10 bg-black/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white">
                        {player.displayName}
                      </span>
                      {player.isBot ? (
                        <span className="rounded bg-sky-500/20 px-1 text-[8px] font-black text-sky-300 uppercase">
                          BOT
                        </span>
                      ) : null}
                    </div>

                    <span className="font-mono text-[10px] text-emerald-300 font-bold">
                      ${chips.toLocaleString("en-US")}
                    </span>

                    {/* Opponent Cards */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {hands[0]?.map((c, idx) => (
                        <CasinoPlayingCard key={idx} card={c} size="xs" />
                      ))}
                    </div>

                    {/* Opponent Bet */}
                    {bets[0] ? (
                      <div className="mt-1">
                        <ChipStack amount={bets[0]} size="xs" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* ========================================================== */}
          {/* LOCAL PLAYER SEAT & BETTING SPOT (BOTTOM CENTER)           */}
          {/* ========================================================== */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            {/* Split hands container or single hand */}
            <div className="flex items-center justify-center gap-6">
              {myHands.map((hand, handIdx) => {
                const handEval = evaluateBlackjackHand(hand);
                const handBet = myBets[handIdx] ?? 0;
                const isActiveHand = isMyTurn && activeHandIndex === handIdx;

                return (
                  <div
                    key={handIdx}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                      isActiveHand
                        ? "ring-2 ring-amber-300 bg-black/40 shadow-2xl scale-105"
                        : ""
                    }`}
                  >
                    {/* Golden Circular Betting Spot */}
                    <div
                      className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-dashed transition-all ${
                        handBet > 0
                          ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                          : "border-white/30 bg-black/20"
                      }`}
                    >
                      {handBet > 0 ? (
                        <ChipStack amount={handBet} size="sm" showLabel={false} />
                      ) : (
                        <span className="text-[10px] font-black tracking-widest text-white/30 uppercase">
                          BET
                        </span>
                      )}

                      {/* Bet Label Badge */}
                      {handBet > 0 ? (
                        <span className="absolute -bottom-2 rounded-full border border-amber-300 bg-slate-950 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow">
                          ${handBet}
                        </span>
                      ) : null}
                    </div>

                    {/* Player Cards for this hand */}
                    <div className="flex items-center justify-center gap-1.5 min-h-[90px] sm:min-h-[105px]">
                      {hand.length === 0 ? (
                        <div className="flex items-center gap-1.5 opacity-20">
                          <div className="h-20 w-14 rounded-lg border border-dashed border-white" />
                          <div className="h-20 w-14 rounded-lg border border-dashed border-white" />
                        </div>
                      ) : (
                        hand.map((c, i) => (
                          <CasinoPlayingCard key={`${i}-${c}`} card={c} size="md" />
                        ))
                      )}
                    </div>

                    {/* Hand Score Badge */}
                    {hand.length > 0 ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-black shadow-md ${
                          handEval.isBlackjack
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 animate-bounce"
                            : handEval.isBust
                              ? "bg-rose-600 text-white"
                              : handEval.total === 21
                                ? "bg-emerald-500 text-white"
                                : "bg-black/60 text-white border border-white/20"
                        }`}
                      >
                        {handEval.displayValue}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* CASINO ACTION / BETTING CONSOLE (BOTTOM BAR)              */}
        {/* ========================================================== */}
        <div className="relative z-20 mt-2 flex w-full max-w-4xl flex-col items-center gap-2 rounded-2xl border border-amber-500/20 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
          {/* PHASE: BETTING CONSOLE */}
          {phase === "betting" ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              {/* Chip Tray */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/80 mr-1 hidden sm:inline">
                  Select Chip:
                </span>
                {BET_CHIPS.map((chip) => (
                  <CasinoChip
                    key={chip}
                    value={chip}
                    size="md"
                    onClick={() => handleBetChip(chip)}
                    disabled={myChips < chip}
                  />
                ))}
              </div>

              {/* Bet Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearBet}
                  disabled={myCurrentBet === 0}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 disabled:opacity-30"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleDeal}
                  disabled={myCurrentBet < 10}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 disabled:opacity-40"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>DEAL (${myCurrentBet})</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* PHASE: PLAYER TURNS (HIT, STAND, DOUBLE, SPLIT) */}
          {phase === "player_turns" ? (
            <div className="flex w-full items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleHit}
                disabled={!isMyTurn}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 disabled:opacity-30"
              >
                HIT 🃏
              </button>

              <button
                type="button"
                onClick={handleStand}
                disabled={!isMyTurn}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/30 hover:bg-amber-300 active:scale-95 disabled:opacity-30"
              >
                STAND ✋
              </button>

              <button
                type="button"
                onClick={handleDouble}
                disabled={!canDouble}
                className="rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-4 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/30 active:scale-95 disabled:opacity-25"
              >
                DOUBLE 2X
              </button>

              {canSplit ? (
                <button
                  type="button"
                  onClick={handleSplit}
                  className="rounded-xl border border-purple-400/50 bg-purple-500/20 px-4 py-2 text-xs font-black text-purple-200 hover:bg-purple-500/30 active:scale-95"
                >
                  SPLIT ✌️
                </button>
              ) : null}
            </div>
          ) : null}

          {/* PHASE: ROUND END CONSOLE */}
          {phase === "round_end" ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-200">
                  {roundResults?.[0]?.message ?? state.blackjackLastAction}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextRound}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-6 py-2 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>NEXT HAND</span>
              </button>
            </div>
          ) : null}
        </div>
      </main>

      {/* ============================================================== */}
      {/* RULES MODAL                                                    */}
      {/* ============================================================== */}
      <AnimatePresence>
        {rulesOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setRulesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-black text-amber-300">
                  Blackjack · House Rules
                </h3>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-white/70 leading-relaxed">
                <p>
                  <strong>Objective:</strong> Beat the dealer's hand total without exceeding 21.
                </p>
                <div className="rounded-xl bg-white/5 p-3 space-y-1">
                  <p className="font-bold text-amber-200">Payouts:</p>
                  <p>• Natural Blackjack: Pays <strong>3 to 2</strong></p>
                  <p>• Standard Win: Pays <strong>1 to 1</strong></p>
                  <p>• Tie / Push: Original bet returned</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 space-y-1">
                  <p className="font-bold text-emerald-300">Dealer Rules:</p>
                  <p>• Dealer must draw cards until total is 17 or higher.</p>
                  <p>• Dealer stands on all 17s (hard and soft).</p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
