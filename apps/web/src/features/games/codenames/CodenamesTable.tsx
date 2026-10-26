"use client";
import { useState } from "react";
import type { AnyAction, BoardGameTableProps } from "../board-games/shared/types";
import { PLAYER_COLORS, owns, isAction, hasAction, money } from "../board-games/shared/ui-utils";


export function CodenamesTable(props:BoardGameTableProps){
const { room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch } = props;
const me = state.players.find((player) => player.userId === currentUserId);
const isMyTurn = owns(state, currentUserId);
const currentPlayer = state.players.find((player) => player.userId === state.currentPlayerId);
const [codenamesClueText,setCodenamesClueText]=useState("");const [codenamesClueNumber,setCodenamesClueNumber]=useState(1);

function renderCodenames() {
    const revealedCounts = state.wordCards.reduce((counts, card) => {
      if (card.revealed && card.revealedRole) counts[card.revealedRole] = (counts[card.revealedRole] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const team = state.codenamesCurrentTeam;
    const teamName = team === "red" ? "RED" : "BLUE";
    return <div className="mx-auto w-full max-w-[1000px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-black">🕵️ Codenames</h2><p className="text-sm text-white/50">Spymaster gives one clue and a number; operatives find matching agents without touching the assassin.</p></div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-black text-rose-200">🔴 {revealedCounts.red ?? 0}/9</span><span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black text-sky-200">🔵 {revealedCounts.blue ?? 0}/8</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${team === "red" ? "border-rose-200/25 bg-rose-300/10 text-rose-100" : "border-sky-200/25 bg-sky-300/10 text-sky-100"}`}>{teamName} TEAM TURN</span></div>
      </div>
      <section className="mb-3 rounded-2xl border border-white/10 bg-[#0b131c] p-3 sm:p-4">
        {state.codenamesClue ? <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Current clue · {teamName}</p><p className="text-xl font-black text-amber-100">{state.codenamesClue} <span className="text-sm text-white/55">({state.codenamesClueNumber === 0 ? "unlimited" : state.codenamesClueNumber})</span></p></div><div className="rounded-xl border border-amber-200/20 bg-amber-200/[.06] px-3 py-2 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-amber-100/45">Guesses remaining</p><p className="text-xl font-black text-amber-100">{state.codenamesGuessesRemaining}</p></div></div> : <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white/60">Waiting for the {teamName.toLowerCase()} spymaster to give a clue.</p><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/40">Clue phase</span></div>}
        {state.isCodenamesSpymaster ? <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-100/55">🔑 You are the spymaster — unrevealed cards show the secret key only on your screen.</p> : <p className="mt-2 text-[10px] text-white/35">Operatives cannot see the key. A correct guess keeps your turn until the clue budget is used; a bystander or opposing agent ends it.</p>}
      </section>
      {hasAction(legalActions, "give_clue") ? <section className="mb-3 grid gap-2 rounded-2xl border border-amber-200/15 bg-amber-300/[.04] p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">One-word clue
          <input value={codenamesClueText} onChange={(event) => setCodenamesClueText(event.target.value)} maxLength={30} placeholder="e.g. Tropical" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-200/50" />
        </label>
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">Number
          <select value={codenamesClueNumber} onChange={(event) => setCodenamesClueNumber(Number(event.target.value))} className="h-11 rounded-xl border border-white/10 bg-[#111a24] px-3 text-sm font-black text-white outline-none focus:border-amber-200/50">{Array.from({ length: 10 }, (_, number) => <option key={number} value={number}>{number === 0 ? "0 · Unlimited" : number}</option>)}</select>
        </label>
        <button type="button" onClick={() => { onAction("give_clue", { clue: codenamesClueText.trim(), number: codenamesClueNumber }); setCodenamesClueText(""); }} disabled={!codenamesClueText.trim() || /\s/.test(codenamesClueText.trim()) || state.wordCards.some((card) => card.word.toLowerCase() === codenamesClueText.trim().toLowerCase())} className="min-h-11 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">Give clue</button>
      </section> : null}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">{state.wordCards.map((card, index) => {
        const role = card.revealedRole ?? (state.isCodenamesSpymaster ? card.keyRole : null);
        const cardStyle = role === "red" ? "border-rose-300/40 bg-rose-500/25 text-rose-100" : role === "blue" ? "border-sky-300/40 bg-sky-500/25 text-sky-100" : role === "assassin" ? "border-black bg-black text-white" : role === "neutral" ? "border-amber-100/20 bg-[#d8d1bc] text-[#343124]" : "border-amber-100/25 bg-gradient-to-br from-[#f6e8c3] to-[#d7c59d] text-[#463d2a] hover:from-white hover:to-[#ead8af]";
        return <button key={card.word} type="button" aria-label={`Codenames word ${card.word}${card.revealed ? `, revealed ${card.revealedRole}` : ""}`} onClick={() => onAction("reveal_word", { index })} disabled={!isMyTurn || state.isCodenamesSpymaster || !state.codenamesClue || card.revealed || !hasAction(legalActions, "reveal_word", (action) => action.index === index)} className={`flex aspect-[1.3/1] flex-col items-center justify-center rounded-xl border px-1 text-center font-black shadow-[0_4px_14px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 disabled:cursor-default ${cardStyle}`}><span className="text-[clamp(.55rem,1.3vw,.9rem)] tracking-wide sm:text-sm">{card.word}</span>{card.revealed && card.revealedRole ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-70">{card.revealedRole === "assassin" ? "☠ assassin" : card.revealedRole}</span> : state.isCodenamesSpymaster && role ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-60">{role === "assassin" ? "☠ assassin" : role}</span> : null}</button>;
      })}</div>
      {hasAction(legalActions, "end_codenames_turn") ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"><p className="mr-auto text-xs text-white/45">You can pass once you are satisfied with your guesses.</p><button type="button" onClick={() => onAction("end_codenames_turn")} className="min-h-10 rounded-xl border border-white/15 px-4 text-xs font-black text-white/80 hover:bg-white/5">End guessing turn</button></div> : null}
      <p className="mt-3 text-[10px] leading-relaxed text-white/30">Rules: 4–10 players, alternating teams by seat. A clue number N permits up to N+1 guesses; 0 allows continuing until a wrong card is revealed. A neutral or opposing agent passes the turn, an assassin loses immediately, and revealing every agent on a team's key wins the match. The spymaster key stays private.</p>
    </div>;
  }
return renderCodenames();
}
