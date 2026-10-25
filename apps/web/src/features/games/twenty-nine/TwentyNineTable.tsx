/* TABLETOP GAME ENGINE CONTINUATION V3 */
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

type EventSpotlight = {
  id: string;
  title: string;
  detail: string;
  emoji: string;
  tone: "amber" | "rose" | "emerald" | "violet" | "sky";
  durationMs?: number;
};


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

function spotlightForEvent(event: GameEvent, state: PublicTwentyNineState, currentUserId: string | null): EventSpotlight | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  const actorId = typeof payload.playerId === "string" ? payload.playerId : null;
  const actor = playerName(state, actorId, currentUserId);
  const value = typeof payload.value === "number" ? payload.value : null;
  const titleFor = (title: string, detail: string, emoji: string, tone: EventSpotlight["tone"], durationMs = 2450): EventSpotlight => ({ id: event.id, title, detail, emoji, tone, durationMs });

  switch (event.type) {
    case "twenty-nine:bid":
      return titleFor(`BID ${value ?? "PLACED"}`, `${actor} raised the auction${value !== null ? ` to ${value}` : ""}.`, "🎯", "amber");
    case "twenty-nine:ditto":
      return titleFor("DITTO!", event.message || `${actor} called Ditto${value !== null ? ` at ${value}` : ""}.`, "🤝", "violet");
    case "twenty-nine:pass_bid":
      return titleFor("PASS", `${actor} passed the bid.`, "✋", "sky");
    case "twenty-nine:double":
      return titleFor("CONTRACT DOUBLED", event.message || `${actor} doubled the stakes to ×2.`, "⚔️", "rose");
    case "twenty-nine:redouble":
      return titleFor("REDOUBLE! ×4", event.message || `${actor} redoubled the contract.`, "🔥", "rose");
    case "twenty-nine:trick_won": {
      const winnerId = typeof payload.winnerPlayerId === "string" ? payload.winnerPlayerId : null;
      const winner = state.players.find((player) => player.userId === winnerId);
      const teamName = winner?.team === 0 ? "RED" : winner?.team === 1 ? "BLUE" : "A TEAM";
      const number = typeof payload.trickNumber === "number" ? payload.trickNumber : state.completedTricks.length;
      const points = typeof payload.points === "number" ? payload.points : 0;
      return titleFor(`${teamName} TAKES THE TRICK`, `${playerName(state, winnerId, currentUserId)} wins trick ${number} · +${points} card points`, "🏆", winner?.team === 0 ? "rose" : "sky");
    }
    case "twenty-nine:trump_revealed":
      return titleFor("TRUMP REVEALED", `Trump is ${String(payload.trumpSuit ?? "now revealed")}.`, "🃏", "emerald");
    case "twenty-nine:pair":
      return titleFor("PAIR DECLARED", event.message || "The King–Queen pair changes the contract.", "👑", "violet");
    case "twenty-nine:single_hand_declared":
      return titleFor("SINGLE HAND!", event.message || `${actor} is playing alone.`, "🗡️", "violet");
    case "twenty-nine:single_hand_scored":
      return titleFor(payload.succeeded === true ? "SINGLE HAND WON" : "SINGLE HAND LOST", event.message || "Single Hand contract scored.", payload.succeeded === true ? "🏆" : "💥", payload.succeeded === true ? "emerald" : "rose");
    case "twenty-nine:hand_scored": {
      const result = state.lastHandResult;
      if (!result) return titleFor("HAND COMPLETE", event.message || "The eight tricks are complete.", "📊", "amber", 3600);
      const biddingTeamKey = String(result.declarerTeam) as "0" | "1";
      const biddingTeamName = result.declarerTeam === 0 ? "RED" : "BLUE";
      const winnerTeam = result.succeeded ? result.declarerTeam : (result.declarerTeam === 0 ? 1 : 0);
      const winnerName = winnerTeam === 0 ? "RED" : "BLUE";
      const actualPoints = result.teamPoints[biddingTeamKey] ?? 0;
      const before = state.teamGamePoints[biddingTeamKey] - result.scoreChange;
      const after = state.teamGamePoints[biddingTeamKey];
      const signed = (number: number) => number > 0 ? `+${number}` : String(number);
      const detail = `Team ${biddingTeamName} needed ${result.contractTarget} card points and took ${actualPoints}. ${result.succeeded ? `Team ${winnerName} made the contract` : `Team ${winnerName} won because the contract failed`}. Game points ${signed(before)} → ${signed(after)} (${signed(result.scoreChange)} · ×${result.multiplier}).`;
      return titleFor(result.succeeded ? `TEAM ${winnerName} WINS THE HAND` : `TEAM ${winnerName} TAKES THE HAND`, detail, result.succeeded ? "🏆" : "⚔️", winnerTeam === 0 ? "rose" : "sky", 4400);
    }
    case "twenty-nine:game_over":
      return titleFor(state.winnerTeam === null ? "MATCH DRAW" : `TEAM ${state.winnerTeam === 0 ? "RED" : "BLUE"} WINS THE MATCH`, event.message || (state.winnerTeam === null ? "The match ended in a draw." : `Team ${state.winnerTeam === 0 ? "Red" : "Blue"} wins the match.`), state.winnerTeam === null ? "🤝" : "🏆", state.winnerTeam === 0 ? "rose" : state.winnerTeam === 1 ? "sky" : "amber", 4400);
    case "twenty-nine:deal_cancelled":
      return titleFor("DEAL CANCELLED", event.message || "The auction ended without a contract.", "🔄", "sky");
    default:
      return null;
  }
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
  if (event.type === "twenty-nine:trick_won") {
    const winnerId = String(payload.winnerPlayerId ?? "");
    const winnerTeam = state.players.find((player) => player.userId === winnerId)?.team;
    return { label: `${playerName(state, winnerId, currentUserId)} won trick ${String(payload.trickNumber ?? "")} (+${String(payload.points ?? 0)})`, tone: winnerTeam === 0 ? "rose" : winnerTeam === 1 ? "sky" : "muted" };
  }
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
      <CardSprite rank={card.rank} suit={card.suit} className="absolute inset-0 z-20 h-full w-full object-cover object-center" />
    </div>
  );
}

function CardBackArtwork({ className = "" }: { className?: string }) {
  const candidates = [
    "/game-assets/twenty-nine/cards/back.png",
    "/game-assets/twenty-nine/sprites/back.png",
    "/game-assets/twenty-nine/back.png",
    "/game-assets/29/cards/back.png",
    "/game-assets/29/back.png"
  ];
  const [candidateIndex, setCandidateIndex] = useState(0);
  const failed = candidateIndex >= candidates.length;
  return (
    <div className={cn("relative isolate overflow-hidden rounded-[0.62rem] border border-emerald-100/35 bg-[linear-gradient(145deg,#14533d,#06251d_54%,#03130f)] shadow-[0_8px_18px_rgba(0,0,0,.34)]", className)}>
      {!failed ? (
        <img
          src={candidates[candidateIndex]}
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={() => setCandidateIndex((current) => current + 1)}
          className="twenty-nine-card-back-sprite absolute inset-0 z-10 h-full w-full select-none object-cover object-center"
        />
      ) : (
        <>
          <div className="absolute inset-[5%] rounded-[0.48rem] border border-emerald-100/35" />
          <div className="absolute inset-[18%] rotate-45 rounded-[0.5rem] border border-emerald-100/55 bg-emerald-200/[0.07]" />
          <div className="absolute inset-[27%] rotate-45 rounded-[0.35rem] border border-emerald-100/35" />
          <div className="absolute inset-0 grid place-items-center text-emerald-50/85"><span className="text-lg font-black tracking-tight">29</span></div>
        </>
      )}
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  return <CardBackArtwork className={small ? "h-[3.85rem] w-[2.75rem]" : "h-[5rem] w-[3.55rem]"} />;
}

function ScoreCardBack() {
  return <CardBackArtwork className="twenty-nine-score-card-back h-full w-full" />;
}

function ScoreCardFace({ suit, points, positive }: { suit: TwentyNineSuit; points: number; positive: boolean }) {
  const ink = positive ? "#bf1735" : "#121923";
  const scoreText = points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "";
  return (
    <div className="twenty-nine-score-card-face relative h-full w-full overflow-hidden rounded-[0.62rem] border border-white/80 bg-[#fffdf6] shadow-[0_8px_22px_rgba(0,0,0,.38)]" style={{ color: ink }}>
      <CardSprite rank="6" suit={suit} className="absolute inset-0 z-0 h-full w-full object-cover object-center" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(145deg,rgba(255,255,255,.08),transparent_44%,rgba(0,0,0,.06))]" />
      {scoreText ? (
        <motion.div
          key={scoreText}
          initial={{ opacity: 0, y: 5, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="absolute inset-x-[9%] top-[38%] z-20 grid h-[25%] place-items-center rounded-md border border-white/45 bg-white/82 text-[clamp(.8rem,1.4vw,1.25rem)] font-black leading-none shadow-sm"
        >
          {scoreText}
        </motion.div>
      ) : null}
    </div>
  );
}

function TeamScore({ team, points, caption }: { team: number; points: number; caption: string }) {
  const redTeam = team === 0;
  const [displayPoints, setDisplayPoints] = useState(points);
  const absolute = Math.min(6, Math.abs(displayPoints));
  const positive = displayPoints > 0;
  const negative = displayPoints < 0;
  const revealedSuit: TwentyNineSuit = negative ? "spades" : "hearts";
  const accent = redTeam ? "#fb7185" : "#60a5fa";

  useEffect(() => {
    if (displayPoints === points) return;
    const timeout = window.setTimeout(() => {
      setDisplayPoints((current) => current + Math.sign(points - current));
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [displayPoints, points]);

  return (
    <div className={cn(
      "twenty-nine-team-score flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5",
      redTeam ? "border-rose-200/30 bg-rose-950/45" : "border-sky-200/30 bg-sky-950/45"
    )}>
      <div className="twenty-nine-score-stack relative h-[4.65rem] w-[3.3rem] shrink-0" aria-label={`${caption}: ${displayPoints} game points`}>
        <motion.div
          className="absolute inset-0 z-0"
          animate={{
            x: positive ? -5 : negative ? 5 : 0,
            y: displayPoints === 0 ? 0 : 7,
            rotate: positive ? -8 : negative ? 8 : 0,
            opacity: displayPoints === 0 ? 0.12 : 1,
            scale: absolute === 6 ? 1.04 : 1
          }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          <ScoreCardFace suit={revealedSuit} points={displayPoints} positive={positive} />
        </motion.div>
        <motion.div
          className="absolute inset-0 z-20"
          animate={{
            x: displayPoints === 0 ? 0 : absolute === 6 ? (positive ? 78 : -78) : positive ? 17 : negative ? -17 : 0,
            y: displayPoints === 0 ? 0 : absolute === 6 ? -12 : -2,
            rotate: displayPoints === 0 ? 0 : positive ? 7 : -7,
            opacity: absolute === 6 ? 0 : 1,
            scale: displayPoints === 0 ? 1 : 0.985
          }}
          transition={{ type: "spring", stiffness: 250, damping: 22 }}
          aria-hidden="true"
        >
          <ScoreCardBack />
        </motion.div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.58rem] font-black uppercase tracking-[0.12em]", redTeam ? "text-rose-100/80" : "text-sky-100/80")}>{caption}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.strong
              key={displayPoints}
              initial={{ opacity: 0, y: displayPoints >= 0 ? 10 : -10, scale: 0.75 }}
              animate={{ opacity: 1, y: 0, scale: displayPoints === points ? 1.08 : 1 }}
              exit={{ opacity: 0, y: displayPoints >= 0 ? -8 : 8, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 360, damping: 23 }}
              className="text-xl font-black leading-none tabular-nums text-white"
            >{displayPoints > 0 ? `+${displayPoints}` : displayPoints}</motion.strong>
          </AnimatePresence>
          <span className="text-[0.6rem] font-bold text-white/45">/ 6</span>
        </div>
        <div className="mt-2 flex items-center gap-1" aria-label={`${absolute} of 6 points`}>
          {Array.from({ length: 6 }, (_, index) => (
            <motion.span key={index} className="h-1.5 flex-1 rounded-full" animate={{ backgroundColor: index < absolute ? accent : "rgba(255,255,255,.15)" }} transition={{ duration: 0.18 }} />
          ))}
        </div>
        <p className={cn("mt-1 text-[0.53rem] font-bold", redTeam ? "text-rose-100/65" : "text-sky-100/65")}>
          {displayPoints === 0 ? "🂠 Hidden" : positive ? (absolute === 6 ? "🏆 +6 · WIN" : `❤️ +${absolute}`) : (absolute === 6 ? "♠ −6 · LOSS" : `♠ −${absolute}`)}
        </p>
      </div>
    </div>
  );
}

function TrickProgress({ team, count, caption }: { team: number; count: number; caption: string }) {
  const clampedCount = Math.max(0, Math.min(8, count));
  const redTeam = team === 0;
  return (
    <div className={cn("twenty-nine-trick-progress min-w-0 rounded-xl border px-2 py-1.5", redTeam ? "border-rose-200/25 bg-rose-950/50" : "border-sky-200/25 bg-sky-950/50")}>
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className={cn("truncate text-[0.56rem] font-black uppercase tracking-[0.1em]", redTeam ? "text-rose-100/80" : "text-sky-100/80")}>{caption}</span>
        <strong className="shrink-0 text-sm font-black tabular-nums text-white">{clampedCount}<span className="text-[0.58rem] text-white/40">/8</span></strong>
      </div>
      <div className="grid grid-cols-8 gap-1" aria-label={`${caption}: ${clampedCount} tricks won out of 8`}>
        {Array.from({ length: 8 }, (_, index) => {
          const earned = index < clampedCount;
          return (
            <motion.div
              key={`${team}-trick-${index}`}
              layout
              initial={false}
              animate={{ opacity: earned ? 1 : 0.22, y: earned ? 0 : 1, scale: earned ? 1 : 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={cn("twenty-nine-trick-slot relative aspect-[0.715] min-w-0 overflow-hidden rounded-[0.2rem]", earned ? (redTeam ? "ring-1 ring-rose-200/45 shadow-[0_0_9px_rgba(251,113,133,.16)]" : "ring-1 ring-sky-200/45 shadow-[0_0_9px_rgba(96,165,250,.16)]") : "border border-dashed border-white/20 bg-white/[0.025]")}
            >
              {earned ? <CardBackArtwork className="h-full w-full rounded-[0.2rem] border-0 shadow-none" /> : null}
            </motion.div>
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
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [eventSpotlight, setEventSpotlight] = useState<EventSpotlight | null>(null);
  const spotlightTimeoutRef = useRef<number | null>(null);
  const processedSpotlightIds = useRef<Set<string>>(new Set(gameEvents.map((event) => event.id)));

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
  const ledSuit = state.currentTrick[0]?.card.suit ?? null;

  useEffect(() => () => {
    for (const timeout of timeoutRefs.current) window.clearTimeout(timeout);
    timeoutRefs.current = [];
    if (spotlightTimeoutRef.current !== null) window.clearTimeout(spotlightTimeoutRef.current);
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

  useEffect(() => {
    const unseen = gameEvents.filter((event) => !processedSpotlightIds.current.has(event.id));
    if (unseen.length === 0) return;
    for (const event of unseen) processedSpotlightIds.current.add(event.id);

    const now = Date.now();
    const spotlightCandidates = unseen
      .filter((event) => {
        const createdAt = new Date(event.createdAt).getTime();
        return Number.isFinite(createdAt) && now - createdAt >= -1_000 && now - createdAt <= 12_000;
      })
      .map((event) => spotlightForEvent(event, state, currentUserId))
      .filter((event): event is EventSpotlight => event !== null);
    const newestSpotlight = spotlightCandidates[spotlightCandidates.length - 1];

    if (processedSpotlightIds.current.size > 800) {
      const currentIds = new Set(gameEvents.map((event) => event.id));
      processedSpotlightIds.current = new Set([...processedSpotlightIds.current].filter((id) => currentIds.has(id)));
    }
    if (!newestSpotlight) return;

    setEventSpotlight(newestSpotlight);
    if (spotlightTimeoutRef.current !== null) window.clearTimeout(spotlightTimeoutRef.current);
    spotlightTimeoutRef.current = window.setTimeout(() => {
      setEventSpotlight((current) => current?.id === newestSpotlight.id ? null : current);
      spotlightTimeoutRef.current = null;
    }, newestSpotlight.durationMs ?? 2_450);
  }, [gameEvents, currentUserId, state.players, state.winnerTeam]);

  function registerSeat(playerId: string, element: HTMLDivElement | null) {
    if (element) seatRefs.current.set(playerId, element);
    else seatRefs.current.delete(playerId);
  }

  function play(card: TwentyNineCard) {
    if (!legalPlayIds.has(card.id)) return;
    onAction("play_card", { cardId: card.id });
  }

  function renderCardSlot(playerId: string, playIndex: number) {
      const card = currentTrickByPlayer.get(playerId);
      if (!card) return null;
      const player = state.players.find((item) => item.userId === playerId);
      const isTakingTrick = card.id === activeWinningCardId;
      const isActive = state.currentPlayerId === playerId;
      return (
        <motion.div
          key={`${playerId}-${card.id}`}
          layout
          initial={reduceMotion ? false : { opacity: 0, x: 18, y: -8, scale: 0.86, rotate: playIndex % 2 === 0 ? -2 : 2 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 25, delay: reduceMotion ? 0 : playIndex * 0.045 }}
          className={cn("relative flex shrink-0 flex-col items-center gap-1.5", isTakingTrick && "twenty-nine-winning-play")}
        >
          <div className={cn(
            "max-w-[7.8rem] truncate rounded-full border px-2.5 py-1 text-[0.64rem] font-black shadow-md",
            isActive ? "border-emerald-100/45 bg-emerald-200/15 text-emerald-50" : player?.team === 0 ? "border-emerald-200/15 bg-emerald-950/65 text-emerald-100/75" : "border-sky-200/15 bg-sky-950/65 text-sky-100/75"
          )}>{player?.displayName ?? "Player"}{playerId === currentUserId ? " · You" : ""}</div>
          <div className={cn("twenty-nine-trick-card-frame relative flex items-center justify-center rounded-xl", isTakingTrick && "ring-2 ring-amber-200/85 shadow-[0_0_28px_rgba(252,211,77,.25)]")}>
            <motion.div
              key={card.id}
              initial={reduceMotion ? false : { opacity: 0, y: -28, rotate: playIndex % 2 === 0 ? -3 : 3, scale: 0.78 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 23, delay: reduceMotion ? 0 : playIndex * 0.045 }}
              className="relative"
            >
              <CardFace card={card} />
            </motion.div>
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em]", isTakingTrick ? "border border-amber-100/45 bg-amber-200/12 text-amber-100" : "text-white/35")}>
            {isTakingTrick ? "👑 Taking trick" : "Played"}
          </span>
        </motion.div>
      );
    }


  return (
    <div data-ui-patch="twenty-nine-tabletop-polish-v3" className="twenty-nine-shell tt-game-viewport fixed inset-0 z-10 h-[100dvh] min-h-0 w-screen overflow-hidden text-white" style={{ backgroundImage: "linear-gradient(180deg,rgba(2,8,6,.56),rgba(2,8,6,.74)),url(/game-assets/twenty-nine/arcade-background-v1.webp)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="twenty-nine-grain pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 p-2">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#04110f]/45 px-3 py-2 shadow-[0_10px_34px_rgba(0,0,0,.2)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-100/20 bg-emerald-300/10 text-emerald-100"><span className="text-lg font-black">29</span></div>
            <div className="min-w-0"><p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-emerald-200/45">Bangladesh card table</p><h1 className="truncate text-lg font-black tracking-tight">Twenty-Nine <span className="text-emerald-200/50">/ Hand {state.handNumber}</span></h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

              <div className="twenty-nine-board-telemetry absolute left-[1.25%] top-[1.5%] z-40">
                <div className="grid grid-cols-2 gap-2">
                  <TeamScore team={0} points={state.teamGamePoints["0"]} caption="Team Red" />
                  <TeamScore team={1} points={state.teamGamePoints["1"]} caption="Team Blue" />
                </div>
              </div>
              <div className="twenty-nine-trick-racks absolute bottom-[1.8%] left-[1.25%] z-30 grid grid-cols-1 gap-1.5">
                <TrickProgress team={0} count={state.tricksWonByTeam["0"]} caption="Red · Tricks won" />
                <TrickProgress team={1} count={state.tricksWonByTeam["1"]} caption="Blue · Tricks won" />
              </div>

              {partner ? (
                <div ref={(el) => registerSeat(partner.userId, el)} className={cn("absolute left-1/2 top-[1%] z-10 -translate-x-1/2", partner.isCurrentTurn && "z-20")}>
                  <Seat playerName={partner.displayName} team={partner.team} count={partner.handCount} active={partner.isCurrentTurn} dealer={state.dealerPlayerId === partner.userId} seat={partner.seat} />
                  {singleHandCaller && partner.userId !== singleHandCaller.userId && partner.team === singleHandCaller.team ? <span className="mt-1 block rounded-full border border-violet-200/20 bg-violet-300/10 px-2 py-1 text-center text-[0.5rem] font-black uppercase tracking-[0.2em] text-violet-100/70">Sitting out</span> : null}
                </div>
              ) : null}
              {enemyPlayers.map((player) => {
                const pos = positionFor(player.userId, state, currentUserId);
                return (
                  <div key={player.userId} ref={(el) => registerSeat(player.userId, el)} className={cn("absolute z-10", pos === "left" ? "left-[2.5%] top-[45%] -translate-y-1/2" : "right-[2.5%] top-[45%] -translate-y-1/2", player.isCurrentTurn && "z-20")}>
                    <Seat playerName={player.displayName} team={player.team} count={player.handCount} active={player.isCurrentTurn} dealer={state.dealerPlayerId === player.userId} seat={player.seat} vertical />
                  </div>
                );
              })}

              <div className="absolute right-[2.5%] top-[2.8%] z-30 flex items-center gap-2 rounded-xl border border-emerald-100/15 bg-[#02110d]/75 px-3 py-2 shadow-lg backdrop-blur-sm">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-100/15 bg-emerald-300/[0.08] text-emerald-100">🃏</div>
                <div><span className="block text-[0.5rem] font-black uppercase tracking-[0.22em] text-emerald-100/45">Current trick</span><strong className="text-sm font-black text-white">{String(turnIndex).padStart(2, "0")} <span className="text-[0.6rem] text-white/35">/ 08</span></strong></div>
              </div>

              <div className="absolute left-[28%] top-[65%] z-20 w-[min(52rem,44%)] -translate-y-1/2">
                <div className="mb-2 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.09] bg-[#03100f]/72 px-3 py-2 shadow-lg backdrop-blur-sm">
                  <span className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-emerald-100/45">Trick {String(turnIndex).padStart(2, "0")} / 08</span>
                  {ledSuit ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-black text-white/90">
                      <SuitMark suit={ledSuit} color={suitInfo(ledSuit).color} size={17} /> Lead suit · {suitInfo(ledSuit).label}
                    </span>
                  ) : <span className="text-xs font-semibold text-white/40">The first card establishes the lead suit</span>}
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[0.62rem] font-black text-white/70">{state.singleHandPlayerId ? "Single Hand · ±3" : `Contract ${state.contractTarget ?? state.currentBid ?? "—"} · ×${state.multiplier}`}</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[0.62rem] font-bold text-white/55">
                    {state.trumpRevealed && state.trumpSuit ? <><span>Trump</span><SuitMark suit={state.trumpSuit} color={suitInfo(state.trumpSuit).color} size={15} /><span>{suitInfo(state.trumpSuit).label}</span></> : state.singleHandPlayerId ? "No trump" : "Trump concealed"}
                  </span>
                </div>
                <div className="twenty-nine-trick-rail flex min-h-[12.2rem] w-full items-start justify-start gap-2.5 overflow-visible px-1 pt-1">
                  {state.currentTrick.map((entry, index) => renderCardSlot(entry.playerId, index))}
                  {state.currentTrick.length === 0 ? (
                    <div className="grid min-h-[10rem] w-full place-items-center rounded-2xl border border-dashed border-emerald-100/15 bg-black/[0.08] px-4 text-center">
                      <div><div className="text-3xl">🃏</div><p className="mt-2 text-sm font-black text-white/65">{state.phase === "playing" ? "Waiting for the first card" : phaseLabel(state.phase)}</p><p className="mt-1 text-xs font-semibold text-white/35">Cards will appear from left to right as they are played.</p></div>
                    </div>
                  ) : null}
                </div>
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

            <section className="twenty-nine-action-panel relative z-30 shrink-0 rounded-[1.35rem] border p-3.5 shadow-lg">
              <AnimatePresence initial={false}>
                {state.phase === "bidding" && isMyTurn && !sittingOutSingleHand ? (
                  <motion.div
                    key={`bid-prompt-${state.handNumber}-${state.currentBid ?? "open"}`}
                    className="twenty-nine-bid-prompt relative mb-3 flex w-full items-center gap-4 rounded-2xl border border-amber-100/40 bg-[linear-gradient(105deg,rgba(92,54,8,.96),rgba(28,21,9,.98)_55%,rgba(10,13,12,.98))] px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,.45)]"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 340, damping: 28 }}
                    role="status"
                    aria-live="polite"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-100/30 bg-amber-200/10 text-amber-100 text-2xl">🎯</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.67rem] font-black uppercase tracking-[0.23em] text-amber-100/75">Your turn to bid</p>
                      <p className="mt-0.5 text-base font-black text-white">{state.currentBid === null ? `Open the auction · minimum ${lowestLegalBid ?? 16}` : `Current bid ${state.currentBid} · ${state.highestBidderId ? playerName(state, state.highestBidderId, currentUserId) : "No bidder yet"}`}</p>
                      <p className="mt-0.5 text-xs font-semibold text-white/65">Set your contract, call Ditto if available, or Pass. Highest possible bid: 28.</p>
                    </div>
                    <div className="hidden shrink-0 rounded-xl border border-amber-100/25 bg-black/20 px-4 py-2 text-center sm:block"><span className="block text-[0.54rem] font-black uppercase tracking-wider text-amber-100/45">Hand</span><strong className="text-xl font-black text-amber-100">{state.handNumber}</strong></div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
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

            <section ref={handRef} className="twenty-nine-hand-panel relative z-40 shrink-0 overflow-visible rounded-xl border border-white/[0.07] bg-[#04120f]/45 px-3 pb-2 pt-2 shadow-none">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100/15 bg-emerald-300/[0.08] text-emerald-100"><Crown className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-black">{me?.displayName ?? "Your hand"}</p><p className="text-[0.58rem] font-bold uppercase tracking-[0.17em] text-white/35">{sittingOutSingleHand ? "Partner playing alone" : me?.team === 0 ? "Team Red" : "Team Blue"} · {(me?.hand?.length ?? 0) + (state.privateSeventhCard ? 1 : 0)} cards</p></div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[0.63rem] font-bold text-white/48"><Shield className="h-3.5 w-3.5" /> Follow suit when possible</div>
              </div>
              {sittingOutSingleHand ? <div className="flex min-h-[7.7rem] flex-col items-center justify-center gap-2 rounded-xl border border-violet-200/10 bg-violet-300/[0.035] px-4 py-3 text-center"><div className="flex -space-x-3">{Array.from({ length: Math.min(me?.hand?.length ?? 0, 8) }).map((_, index) => <div key={index} className="origin-bottom" style={{ transform: `rotate(${(index - 3.5) * 2}deg)` }}><CardBack small /></div>)}</div><p className="text-xs font-black text-violet-100">You're sitting out this hand.</p><p className="max-w-md text-[0.68rem] font-semibold text-white/45">Your teammate must win all eight tricks alone. Your cards stay out of play.</p></div> : <div className="twenty-nine-hand-row relative z-50 -mt-12 flex min-h-[12.8rem] items-end justify-center gap-0 overflow-hidden overflow-y-visible px-1 pb-1 pt-2 [scrollbar-width:thin] [scrollbar-color:rgba(52,211,153,.25)_transparent]">
                {sortedHand.map((card, index) => {
                  const canPlay = legalPlayIds.has(card.id) && isMyTurn && state.phase === "playing";
                  const fanOffset = index - (sortedHand.length - 1) / 2;
                  const fanRotate = fanOffset * (sortedHand.length >= 7 ? 1.25 : 0.9);
                  const fanLift = Math.abs(fanOffset) * 1.15;
                  const hoverMotion = canPlay && !reduceMotion ? { y: -31, rotate: fanRotate + (fanOffset < 0 ? -1.6 : 1.6), scale: 1.14, zIndex: 100 } : null;
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      disabled={!canPlay}
                      onClick={() => play(card)}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: canPlay ? -10 - fanLift : -fanLift, rotate: fanRotate, scale: canPlay ? 1.035 : 1 }}
                      {...(hoverMotion ? { whileHover: hoverMotion } : {})}
                      {...(canPlay ? { whileTap: { scale: 0.96 } } : {})}
                      transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                      className={cn("twenty-nine-hand-card relative shrink-0 rounded-xl text-left outline-none transition", canPlay ? "cursor-pointer ring-2 ring-emerald-100/90 shadow-[0_0_30px_rgba(52,211,153,.3)]" : "cursor-default opacity-100")}
                      style={{ marginLeft: index === 0 ? 0 : sortedHand.length >= 8 ? "-1.45rem" : sortedHand.length >= 7 ? "-1.1rem" : "-0.62rem", transformOrigin: "50% 100%", zIndex: 10 + index }}
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
          </main>

          <aside className="flex min-h-[25rem] flex-col gap-3 xl:max-h-[calc(100dvh-7.5rem)]">
            <section className="shrink-0 overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#04120f]/85 shadow-[0_16px_44px_rgba(0,0,0,.2)]">
              <button type="button" onClick={() => setLogCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 text-left"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200/15 bg-emerald-300/[0.08] text-emerald-100"><Flag className="h-3.5 w-3.5" /></span><div><p className="text-sm font-black">Hand activity</p><p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-white/35">Bidding · tricks · score</p></div></div><span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.6rem] font-black text-white/45">{formattedLog.length}</span></button>
              {!logCollapsed ? <div className="max-h-[7rem] space-y-1 overflow-hidden p-2 [scrollbar-color:rgba(110,231,183,.2)_transparent] [scrollbar-width:thin]">{formattedLog.length ? formattedLog.map(({ event, row }) => <div key={event.id} className="flex gap-2 rounded-xl border border-white/[0.045] bg-white/[0.02] px-2.5 py-2"><span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", toneDot(row!.tone))} /><p className="min-w-0 text-[0.68rem] font-semibold leading-relaxed text-white/70">{row!.label}</p><time className="ml-auto shrink-0 pt-0.5 text-[0.52rem] font-bold tabular-nums text-white/25">{new Date(event.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>) : <div className="px-3 py-6 text-center text-xs font-semibold text-white/32">The auction and trick history will appear here.</div>}</div> : null}
            </section>

            <section className="grid shrink-0 grid-cols-2 gap-2 rounded-[1.4rem] border border-white/[0.09] bg-[#04120f]/80 p-3">
              <MiniStat label="Red card points" value={String(state.capturedPointsByTeam["0"])} tint="rose" />
              <MiniStat label="Blue card points" value={String(state.capturedPointsByTeam["1"])} tint="sky" />
              <MiniStat label="Contract" value={String(state.contractTarget ?? state.currentBid ?? "—")} tint="amber" />
              <MiniStat label="Multiplier" value={`×${state.multiplier}`} tint="amber" />

            </section>

            <div className="min-h-[17rem] flex-1 overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#04120f]/85 shadow-[0_16px_44px_rgba(0,0,0,.2)]">{onChat ? <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={onlineCount} /> : <div className="p-4 text-sm text-white/40">Chat is unavailable.</div>}</div>
          </aside>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {eventSpotlight ? (
          <motion.div
            key={eventSpotlight.id}
            className="pointer-events-none fixed inset-0 z-[140] grid place-items-center overflow-hidden px-4 pb-4 pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
            aria-live="assertive"
            role="status"
          >
            <motion.div className="absolute inset-0 bg-black/52 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className={cn(
                "twenty-nine-event-spotlight relative flex w-[min(92vw,44rem)] flex-col items-center overflow-y-auto overflow-x-hidden rounded-[1.5rem] border px-6 py-5 text-center shadow-[0_28px_90px_rgba(0,0,0,.62)]",
                eventSpotlight.tone === "amber" ? "border-amber-100/45 bg-[linear-gradient(145deg,rgba(64,43,10,.98),rgba(10,16,14,.98))]" :
                eventSpotlight.tone === "rose" ? "border-rose-100/40 bg-[linear-gradient(145deg,rgba(65,15,28,.98),rgba(10,12,16,.98))]" :
                eventSpotlight.tone === "emerald" ? "border-emerald-100/40 bg-[linear-gradient(145deg,rgba(6,59,41,.98),rgba(5,16,14,.98))]" :
                eventSpotlight.tone === "sky" ? "border-sky-100/40 bg-[linear-gradient(145deg,rgba(8,42,72,.98),rgba(5,13,20,.98))]" :
                "border-violet-100/40 bg-[linear-gradient(145deg,rgba(46,23,72,.98),rgba(10,12,18,.98))]"
              )}
              initial={{ opacity: 0, y: 30, scale: 0.84, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />
              <motion.div className="grid h-16 w-16 place-items-center rounded-[1.2rem] border border-white/20 bg-white/[0.075] text-4xl shadow-[0_0_32px_rgba(255,255,255,.08)]" {...(!reduceMotion ? { animate: { y: [0, -4, 0], rotate: [0, -2, 2, 0] }, transition: { duration: 1.15, repeat: 1 } } : {})}>{eventSpotlight.emoji}</motion.div>
              <p className="mt-2.5 text-[0.63rem] font-black uppercase tracking-[0.26em] text-white/55">Twenty-Nine · Table event</p>
              <h2 className="mt-2 text-[clamp(1.7rem,4vw,3rem)] font-black leading-tight tracking-tight text-white">{eventSpotlight.title}</h2>
              <p className="mt-2 max-w-2xl text-base font-semibold leading-relaxed text-white/75">{eventSpotlight.detail}</p>
              <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
                {Array.from({ length: 3 }, (_, index) => (
                  <motion.div key={`${eventSpotlight.id}-card-${index}`} initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: (index - 1.5) * 9, scale: 0.85 }} animate={{ opacity: 1, y: 0, rotate: (index - 1.5) * 5, scale: 1 }} transition={{ delay: reduceMotion ? 0 : index * 0.055, type: "spring", stiffness: 300, damping: 24 }}>
                    <CardBack small />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{rulesOpen ? <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRulesOpen(false)}><motion.div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-[1.8rem] border border-emerald-100/15 bg-[#061510] p-5 shadow-2xl" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: 0.98 }} onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-emerald-200" /><h2 className="text-xl font-black">29 — Quick rules</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><RuleTile title="Rank" body="J > 9 > A > 10 > K > Q > 8 > 7. The deck contains exactly 28 card points." /><RuleTile title="Partnerships" body="Four players, partners opposite. Play proceeds counterclockwise." /><RuleTile title="Auction" body="Deal four cards each; bid from 16 to 28. Raise, Ditto or Pass; partners can take over. Three passes end the auction." /><RuleTile title="Trump" body="Declarer chooses a hidden suit or calls for the seventh card. If unable to follow suit, reveal trump before discarding." /><RuleTile title="Pair" body="After trump is revealed, King + Queen of trump can adjust the target by four. Bids 16–18 are not reduced for your team." /><RuleTile title="Single Hand" body="Before the first card, any player may declare Single Hand. No trump is used; their partner sits out and the caller must win all eight tricks for +3, otherwise −3." /><RuleTile title="Contract" body="After eight tricks, the bidding team gains or loses 1, 2 or 4 game points. First to +6 wins; reaching −6 loses." /></div><p className="mt-4 text-xs font-semibold leading-relaxed text-white/35">House rules: 28 card points only (no last-trick bonus). Double/Redouble and seventh-card trump are enabled; Set is not used.</p><button type="button" onClick={() => setRulesOpen(false)} className="mt-4 rounded-xl border border-emerald-200/20 bg-emerald-200/10 px-4 py-2 text-sm font-black text-emerald-100">Got it</button></motion.div></motion.div> : null}</AnimatePresence>

      {state.phase === "finished" && state.winnerTeam !== null ? <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-black/20 p-4"><motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="pointer-events-auto w-full max-w-md rounded-[2rem] border border-amber-200/20 bg-[#061510]/95 p-6 text-center shadow-[0_24px_100px_rgba(0,0,0,.65)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-200/20 bg-amber-200/10 text-amber-100"><Trophy className="h-7 w-7" /></div><p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.3em] text-amber-100/50">Match complete</p><h2 className="mt-1 text-2xl font-black">Team {state.winnerTeam + 1} wins!</h2><p className="mt-2 text-sm font-semibold text-white/55">Emerald {state.teamGamePoints["0"]} · Sapphire {state.teamGamePoints["1"]}</p><p className="mt-4 text-xs text-white/35">Start a new room to play another match.</p></motion.div></div> : null}
    </div>
  );
}

const SEAT_CHARACTERS = ["🦊", "🐉", "🦁", "🦅"] as const;

function Seat({ playerName: name, team, count, active, dealer, seat, vertical = false }: { playerName: string; team: number; count: number; active: boolean; dealer: boolean; seat: number; vertical?: boolean }) {
  const character = SEAT_CHARACTERS[((seat % SEAT_CHARACTERS.length) + SEAT_CHARACTERS.length) % SEAT_CHARACTERS.length] ?? "🃏";
  const redTeam = team === 0;
  return (
    <div className={cn(
      "twenty-nine-player-seat relative rounded-[1.2rem] border px-2.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,.28)] transition-all duration-300",
      vertical ? "w-[clamp(10rem,14vw,14rem)]" : "w-[min(14rem,21vw)]",
      active
        ? (redTeam ? "border-rose-200/70 bg-[linear-gradient(145deg,rgba(74,14,30,.97),rgba(28,7,15,.97))] shadow-[0_0_28px_rgba(251,113,133,.2)]" : "border-sky-200/70 bg-[linear-gradient(145deg,rgba(9,47,81,.97),rgba(4,20,40,.97))] shadow-[0_0_28px_rgba(96,165,250,.2)]")
        : (redTeam ? "border-rose-200/25 bg-[linear-gradient(145deg,rgba(46,12,23,.94),rgba(17,8,14,.94))]" : "border-sky-200/25 bg-[linear-gradient(145deg,rgba(8,29,49,.94),rgba(5,13,24,.94))]")
    )}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={cn(
          "twenty-nine-seat-character relative grid h-[2.8rem] w-[2.8rem] shrink-0 place-items-center rounded-xl border text-[1.55rem]",
          redTeam ? "border-rose-200/35 bg-rose-300/[0.15]" : "border-sky-200/35 bg-sky-300/[0.15]"
        )}>
          <span aria-hidden="true">{character}</span>
          {dealer ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-amber-100/40 bg-amber-300 text-[0.6rem] font-black text-amber-950">D</span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] font-black text-white">{name}</p>
          <p className={cn("mt-0.5 truncate text-[0.56rem] font-black uppercase tracking-[0.1em]", redTeam ? "text-rose-100/80" : "text-sky-100/80")}>{redTeam ? "Team Red" : "Team Blue"}</p>
          <p className="mt-1 text-[0.55rem] font-bold text-white/45">{active ? (redTeam ? "🔴 Acting now" : "🔵 Acting now") : dealer ? "🃏 Dealer" : "Ready"}{dealer && active ? " · Dealer" : ""}</p>
        </div>
        {active ? <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", redTeam ? "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,.85)]" : "bg-sky-300 shadow-[0_0_12px_rgba(96,165,250,.85)]")} aria-label="Active player" /> : null}
      </div>
      <div className="mt-2.5 flex min-w-0 items-end justify-between gap-2 border-t border-white/[0.07] pt-2">
        <div className="flex min-w-0 items-end -space-x-5 overflow-visible pl-1">
          {Array.from({ length: Math.min(count, vertical ? 4 : 5) }).map((_, index) => (
            <motion.div key={index} className="origin-bottom" initial={false} animate={{ rotate: (index - 2) * 4, y: active ? -2 : 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={{ zIndex: index }}>
              <CardBack small />
            </motion.div>
          ))}
        </div>
        <span className="shrink-0 rounded-lg border border-white/10 bg-black/25 px-1.5 py-1 text-[0.59rem] font-black text-white/75">{count} 🂠</span>
      </div>
    </div>
  );
}

function ActionButton({ label, tone, onClick, disabled = false, icon }: { label: string; tone: "gold" | "violet" | "neutral" | "rose"; onClick: () => void; disabled?: boolean; icon?: React.ReactNode }) {
  const color = tone === "gold" ? "border-amber-200/30 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20" : tone === "violet" ? "border-violet-200/25 bg-violet-300/10 text-violet-100 hover:bg-violet-300/20" : tone === "rose" ? "border-rose-200/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20" : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/10";
  return <button type="button" disabled={disabled} onClick={onClick} className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40", color)}>{icon}{label}</button>;
}

function MiniStat({ label, value, tint }: { label: string; value: string; tint: "rose" | "sky" | "amber" }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2"><p className="truncate text-[0.55rem] font-black uppercase tracking-[0.15em] text-white/35">{label}</p><p className={cn("mt-1 text-xl font-black", tint === "rose" ? "text-rose-100" : tint === "sky" ? "text-sky-100" : "text-amber-100")}>{value}</p></div>;
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
