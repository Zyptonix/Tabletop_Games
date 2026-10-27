// TABLETOP ARENA FULL PATCH V5 — CODENAMES RULES
/* TABLETOP ARENA FULL PATCH V4 */
/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameEvent, PublicBoardGameState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";
import type { BoardGameTableProps } from "./shared/types";
import { GAME_META, PLAYER_COLORS, owns, money } from "./shared/ui-utils";
import { ChessTable } from "../chess/ChessTable";
import { BattleshipTable } from "../battleship/BattleshipTable";
import { LudoTable } from "../ludo/LudoTable";
import { BarricadesTable } from "../barricades/BarricadesTable";
import { MonopolyTable } from "../monopoly/MonopolyTable";
import { RiskTable } from "../risk/RiskTable";
import { WorldConquestTable } from "../world-conquest/WorldConquestTable";
import { CodenamesTable } from "../codenames/CodenamesTable";
import { PokerTable } from "../poker/PokerTable";





















// CHESS CHECK MARKER + ILLEGAL MOVE NOTICE V1




function ActivityIcon({ type, message }: { type: string; message: string }) {
  const emoji = message.match(/^\p{Extended_Pictographic}/u)?.[0];
  if (emoji) return <span className="text-base leading-none">{emoji}</span>;
  const fallbacks: Record<string, string> = { game_started: "🎮", game_action: "🎯", player_eliminated: "💥", attack: "⚔️", purchase: "🏠" };
  return <span className="text-base leading-none">{fallbacks[type] ?? "✨"}</span>;
}

export function BoardGameTable({ room, state, legalActions, gameEvents, currentUserId, timer, onAction, onChat, onEndMatch }: BoardGameTableProps) {
  const router = useRouter();
  const meta = GAME_META[state.gameId] ?? GAME_META.chess!;
  const isBattleship = state.gameId === "battleship";
  const [sidebarOpen, setSidebarOpen] = useState(!isBattleship);
  
  const me = state.players.find((player) => player.userId === currentUserId);
  const isMyTurn = owns(state, currentUserId);
  const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
  const log = useMemo(() => {
    const recorded = state.activityLog.map((event) => ({ id: event.id, type: event.type, message: event.message, createdAt: event.createdAt }));
    const known = new Set(recorded.map((entry) => entry.id));
    const extra = gameEvents.filter((event) => !known.has(event.id)).map((event) => ({ id: event.id, type: event.type, message: event.message ?? event.type.replaceAll("_", " "), createdAt: event.createdAt }));
    return [...recorded, ...extra].slice(-24).reverse();
  }, [state.activityLog, gameEvents]);
  const canEndRoom = room.effectiveHostUserId === currentUserId;

  function dashboard() { router.push("/dashboard"); }

  function renderBoard(){const gameProps={room,state,legalActions,gameEvents,currentUserId,timer: timer ?? null,onAction,onChat,...(onEndMatch ? {onEndMatch} : {})};switch(state.gameId){case "chess":return <ChessTable {...gameProps}/>;case "battleship":return <BattleshipTable {...gameProps}/>;case "ludo":return <LudoTable {...gameProps}/>;case "barricades":return <BarricadesTable {...gameProps}/>;case "monopoly":return <MonopolyTable {...gameProps}/>;case "risk":return <RiskTable {...gameProps}/>;case "world-conquest":return <WorldConquestTable {...gameProps}/>;case "codenames":return <CodenamesTable {...gameProps}/>;case "poker":return <PokerTable {...gameProps}/>;default:return null;}}

  return <div className="board-game-screen h-dvh min-h-0 overflow-hidden bg-[#050a0f] text-slate-100">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08121b] px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.045] text-xl">{meta.icon}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-lg font-black tracking-tight lg:text-xl">{meta.title}</h1></div><p className="hidden text-[11px] font-semibold text-white/40 sm:block">Room {room.code} · {meta.description}</p></div></div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden rounded-full border px-3 py-2 text-xs font-bold sm:inline-flex ${isMyTurn ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.035] text-white/55"}`}>{isMyTurn ? "🟢 Your turn" : `⏳ ${currentPlayer?.displayName ?? "No active player"}`}</span>
          <button type="button" onClick={() => setSidebarOpen((prev) => !prev)} className={`min-h-10 rounded-xl border px-3 text-xs font-black transition ${sidebarOpen ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-white/[.055] text-white/80 hover:bg-white/[.09]"}`}>💬 {sidebarOpen ? "Hide Panel" : "Chat & Log"}</button>
          <button type="button" onClick={dashboard} className="min-h-10 rounded-xl border border-white/10 bg-white/[.055] px-3 text-xs font-black transition hover:border-emerald-200/30 hover:bg-emerald-300/10">🏠 Dashboard</button>
          {canEndRoom && onEndMatch && room.status !== "finished" ? <button type="button" onClick={() => { if (window.confirm("End this room for everyone?")) onEndMatch(room.id); }} className="hidden min-h-10 rounded-xl border border-rose-300/20 px-3 text-xs font-black text-rose-200 hover:bg-rose-400/10 md:inline-flex md:items-center">End room</button> : null}
        </div>
      </header>
      <div className={`grid min-h-0 flex-1 gap-2 p-2 sm:p-3 transition-all ${sidebarOpen ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_370px]" : "grid-cols-1"}`}>
        <main className={`relative min-h-0 min-w-0 rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_45%_0%,rgba(30,64,85,.22),transparent_60%),linear-gradient(145deg,#0b141d,#080e14)] ${isBattleship ? "p-1.5 sm:p-2.5 overflow-hidden flex flex-col h-full" : "p-3 sm:p-5 lg:overflow-y-auto lg:p-5 xl:p-6"}`}>
          {!isBattleship ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3"><div><p className="text-[10px] font-black uppercase tracking-[.25em]" style={{ color: meta.accent }}>Tabletop Arena / Board Games</p><p className="mt-1 text-xs text-white/45">{state.players.length} players · Turn {state.turnNumber} · Move {state.actionNumber}</p></div><div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/65">{isMyTurn ? "⚡ Your move" : `👤 ${currentPlayer?.displayName ?? "—"}`}</div></div>
          ) : null}
          <div className={`board-game-content min-h-0 min-w-0 flex-1 ${isBattleship ? "h-full flex flex-col overflow-hidden" : ""}`}>{renderBoard()}</div>
          {!isBattleship ? (
            <div className="mt-5 rounded-xl border border-amber-200/15 bg-amber-100/[.045] p-3 text-xs leading-relaxed text-amber-100/70"><span className="mr-2 font-black">📘 RULES STATUS</span>{state.gameNotice}</div>
          ) : null}
          {state.phase === "finished" ? <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-emerald-100/20 bg-[#0c181d] p-8 text-center shadow-2xl"><div className="text-5xl">🏆</div><h2 className="mt-3 text-2xl font-black">{state.winnerUserId === currentUserId ? "You won!" : `${state.players.find((player) => player.userId === state.winnerUserId)?.displayName ?? "The match"} won!`}</h2><p className="mt-2 text-sm text-white/50">The match has ended. Return to the dashboard when you are ready.</p><button type="button" onClick={dashboard} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🏠 Return to dashboard</button></div></div> : null}
        </main>
        {sidebarOpen ? (
          <aside className="grid min-h-0 grid-rows-[auto_minmax(120px,.8fr)_minmax(200px,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(140px,.72fr)_minmax(150px,.9fr)_minmax(180px,1fr)]">
            <section className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">👥 Players</h2><span className="text-[10px] font-bold text-white/30">{state.players.length} seated</span></div><div className="grid gap-1.5 overflow-y-auto pr-1">{state.players.map((player) => <div key={player.userId} className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 ${player.isCurrentTurn ? "border-emerald-200/25 bg-emerald-300/[.06]" : "border-white/[.055] bg-white/[.02]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black text-slate-950" style={{ background: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}>{player.displayName.trim().slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{player.isBot ? "🤖 Bot" : "🧑 Player"}{player.isCurrentTurn ? " · Turn" : ""}</p></div>{state.gameId === "monopoly" ? <strong className="text-xs text-emerald-100">{money(player.money)}</strong> : state.gameId === "poker" ? <strong className="text-xs text-emerald-100">${player.stack}</strong> : state.gameId === "codenames" ? <strong className="text-xs" style={{ color: player.team === "red" ? "#fb7185" : "#7dd3fc" }}>{player.team === "red" ? "🔴 Red" : "🔵 Blue"}{player.isSpymaster ? " · Spy" : ""}</strong> : null}</div>)}</div></section>
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex shrink-0 items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">📜 Game log</h2><span className="text-[10px] font-bold text-white/30">Latest {log.length}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{log.length ? log.map((entry) => <div key={entry.id} className="flex items-start gap-2 rounded-xl border border-white/[.045] bg-white/[.025] px-2.5 py-2"><ActivityIcon type={entry.type} message={entry.message} /><div className="min-w-0 flex-1"><p className="break-words text-[11px] leading-relaxed text-white/75">{entry.message}</p><p className="mt-0.5 text-[9px] text-white/25">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>) : <p className="py-5 text-center text-xs text-white/35">Waiting for the first move…</p>}</div></section>
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-2"><div className="shrink-0 px-2 py-1"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">💬 Table chat</h2></div><div className="min-h-0 flex-1 overflow-hidden"><RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={room.players.filter((player) => player.connected).length} /></div></section>
          </aside>
        ) : null}
      </div>
    </div>
  </div>;
}
