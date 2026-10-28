"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Gamepad2, Loader2, Play, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";

type Game = { id: string; displayName: string; minPlayers: number; maxPlayers: number };
const META: Record<string, { subtitle: string; colors: string; icon: string; art: "cards"|"board"|"grid"|"dice"|"words"|"arena" }> = {
  "classic-uno": { subtitle: "Fast colorful card battles", colors: "from-rose-500/25 via-orange-400/10 to-amber-300/10", icon: "🃏", art: "cards" },
  "uno-no-mercy": { subtitle: "High-stakes, brutal card play", colors: "from-red-600/30 via-rose-500/10 to-zinc-950", icon: "💥", art: "cards" },
  "mafia-werewolf": { subtitle: "Bluff, discuss and uncover roles", colors: "from-violet-500/25 via-indigo-400/10 to-slate-950", icon: "🌙", art: "words" },
  "strategic-shockwave": { subtitle: "Dodge blasts and outlast rivals", colors: "from-emerald-500/25 via-lime-300/10 to-slate-950", icon: "💣", art: "arena" },
  "twenty-nine": { subtitle: "Bangladeshi 29 partnership cards", colors: "from-emerald-500/25 via-teal-400/10 to-slate-950", icon: "♣", art: "cards" },
  "connect-four": { subtitle: "Line up four discs to win", colors: "from-sky-500/25 via-blue-400/10 to-slate-950", icon: "🔴", art: "grid" },
  reversi: { subtitle: "Flip pieces, control the board", colors: "from-slate-400/20 via-emerald-400/10 to-slate-950", icon: "⚫", art: "grid" },
  chess: { subtitle: "Classic tactical strategy", colors: "from-lime-500/20 via-emerald-400/10 to-slate-950", icon: "♟", art: "board" },
  battleship: { subtitle: "Find the hidden enemy fleet", colors: "from-cyan-500/25 via-sky-400/10 to-slate-950", icon: "🚢", art: "grid" },
  ludo: { subtitle: "Race four tokens safely home", colors: "from-amber-400/25 via-orange-300/10 to-slate-950", icon: "🎲", art: "dice" },
  barricades: { subtitle: "Reach your goal; keep paths open", colors: "from-orange-400/25 via-amber-300/10 to-slate-950", icon: "🟠", art: "board" },
  monopoly: { subtitle: "Buy spaces and collect rent", colors: "from-green-500/25 via-emerald-300/10 to-slate-950", icon: "🏠", art: "board" },
  risk: { subtitle: "Reinforce borders and attack", colors: "from-rose-500/25 via-red-400/10 to-slate-950", icon: "🌍", art: "grid" },
  "world-conquest": { subtitle: "An expanded territory campaign", colors: "from-fuchsia-500/25 via-violet-300/10 to-slate-950", icon: "🗺️", art: "grid" },
  codenames: { subtitle: "Team word association and deduction", colors: "from-amber-400/25 via-yellow-200/10 to-slate-950", icon: "🔎", art: "words" },
  poker: { subtitle: "Texas Hold’em · hand ranking and bets", colors: "from-emerald-500/25 via-teal-300/10 to-slate-950", icon: "♠", art: "cards" },
  blackjack: { subtitle: "Casino 21 · Dealer stands on 17", colors: "from-amber-500/25 via-emerald-400/15 to-slate-950", icon: "🎰", art: "cards" }
};
function Art({ kind, icon }: { kind: string; icon: string }) {
  if (kind === "cards") return <div className="relative flex h-full items-center justify-center"><span className="absolute h-20 w-14 -rotate-[18deg] rounded-lg border border-white/30 bg-slate-100 shadow-xl"><span className="absolute left-2 top-1 text-xl text-rose-600">♥</span></span><span className="absolute h-20 w-14 rotate-[14deg] rounded-lg border border-white/30 bg-white shadow-xl"><span className="absolute left-2 top-1 text-xl text-slate-950">♠</span><span className="absolute bottom-1 right-2 text-xl text-slate-950">{icon}</span></span></div>;
  if (kind === "board") return <div className="grid h-24 w-24 grid-cols-4 grid-rows-4 overflow-hidden rounded-xl border border-white/30 shadow-xl">{Array.from({length:16},(_,i)=><span key={i} className={(Math.floor(i/4)+i%4)%2 ? "bg-emerald-100/80" : "bg-emerald-800/85"}>{i===2||i===13?<span className="grid h-full place-items-center text-lg text-slate-950">{icon}</span>:null}</span>)}</div>;
  if (kind === "grid") return <div className="grid h-24 w-28 grid-cols-5 gap-1 rounded-xl border border-white/20 bg-slate-950/70 p-2 shadow-xl">{Array.from({length:25},(_,i)=><span key={i} className="grid place-items-center rounded-full bg-white/[.07]">{[2,6,11,17,22].includes(i)?<i className="h-3 w-3 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.7)]"/>:null}</span>)}</div>;
  if (kind === "dice") return <div className="flex gap-2"><span className="grid h-16 w-16 rotate-[-8deg] place-items-center rounded-2xl border border-white/30 bg-white text-4xl text-rose-500 shadow-xl">⚄</span><span className="grid h-16 w-16 rotate-[9deg] place-items-center rounded-2xl border border-white/30 bg-white text-4xl text-sky-500 shadow-xl">⚅</span></div>;
  if (kind === "words") return <div className="grid grid-cols-3 gap-2">{["SUN","MOON","KEY","MAP","FOX","OWL"].map((word,i)=><span key={word} className={`grid h-8 w-14 place-items-center rounded-md border text-[9px] font-black ${i%3===0?"border-amber-100/40 bg-amber-100/80 text-slate-900":"border-white/20 bg-slate-900/50 text-white/70"}`}>{word}</span>)}</div>;
  return <div className="relative h-24 w-28"><span className="absolute left-2 top-4 h-12 w-12 rounded-lg border border-emerald-200/40 bg-emerald-300/25"/><span className="absolute right-2 top-1 h-12 w-12 rounded-lg border border-amber-200/40 bg-amber-300/25"/><span className="absolute bottom-1 left-8 h-12 w-12 rounded-lg border border-rose-200/40 bg-rose-300/25"/><span className="absolute inset-0 grid place-items-center text-3xl">{icon}</span></div>;
}
export function GameSelectionMenu() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => { let cancelled=false; void api.games().then(result=>{if(!cancelled)setGames(result.games)}).catch(()=>{if(!cancelled)setError("The game catalogue could not be loaded. Check that the local game server is running.")}).finally(()=>{if(!cancelled)setLoadingList(false)}); return ()=>{cancelled=true}; }, []);
  const visible = useMemo(()=>games.filter(game=>`${game.displayName} ${META[game.id]?.subtitle ?? ""}`.toLowerCase().includes(search.toLowerCase())),[games,search]);
  async function launch(game: Game) { setLaunching(game.id); setError(null); try {const result=await api.createRoom({gameId:game.id}); if(result.room?.code) router.push(`/rooms/${result.room.code}`); else throw new Error("The server did not return a room code.");} catch(e) {setError(e instanceof Error?e.message:"Room creation failed."); setLaunching(null);} }
  return <section className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#0b1513] shadow-[0_20px_55px_rgba(0,0,0,.28)]">
    <div className="flex flex-col gap-3 border-b border-white/[.07] bg-gradient-to-r from-emerald-400/[.08] to-transparent px-5 py-4 md:flex-row md:items-end md:justify-between"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-emerald-300"><Sparkles className="h-3.5 w-3.5"/> Pick your table</p><h2 className="mt-1 text-2xl font-black text-emerald-50">Choose a game</h2><p className="mt-1 text-sm text-emerald-100/55">Launch a private LAN room. Artwork here is lightweight CSS; custom illustrations can be added later.</p></div><label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-sm"><span className="text-white/35">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a game…" className="w-full bg-transparent text-white outline-none placeholder:text-white/35 md:w-56"/></label></div>
    {error?<p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-300/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-100">{error}</p>:null}
    {loadingList?<div className="flex items-center gap-2 p-6 text-sm text-emerald-100/60"><Loader2 className="h-4 w-4 animate-spin"/> Loading registered game engines…</div>:<div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visible.map(game=>{const meta=META[game.id]??{subtitle:"A Tabletop Arena game",colors:"from-emerald-500/20 to-slate-950",icon:"🎮",art:"grid" as const};return <article key={game.id} className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-xl border border-white/[.09] bg-[#0b1219] transition duration-150 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-[#101c20]"><div className={`relative flex h-[100px] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${meta.colors}`}><div className="absolute inset-0 opacity-35" style={{backgroundImage:"linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px)",backgroundSize:"20px 20px"}}/><Art kind={meta.art} icon={meta.icon}/><span className="absolute right-3 top-2 rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/75">{game.minPlayers===game.maxPlayers?`${game.minPlayers} players`:`${game.minPlayers}–${game.maxPlayers} players`}</span></div><div className="flex flex-1 flex-col p-3"><h3 className="text-sm font-black text-white">{game.displayName}</h3><p className="mt-1 min-h-8 text-[11px] leading-relaxed text-white/50">{meta.subtitle}</p><button type="button" onClick={()=>void launch(game)} disabled={launching!==null} className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-55">{launching===game.id?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Play className="h-3.5 w-3.5"/>}{launching===game.id?"Creating room…":"Create room"}<ArrowUpRight className="ml-auto h-3.5 w-3.5"/></button></div></article>})}</div>}
    {!loadingList&&!visible.length?<div className="p-8 text-center text-sm text-white/45">No registered games match that search.</div>:null}
    <div className="flex items-center gap-2 border-t border-white/[.06] px-5 py-3 text-[10px] font-semibold text-white/35"><Gamepad2 className="h-3.5 w-3.5"/> {games.length} registered engines · PC-first layout · runs on your local game server</div>
  </section>;
}
