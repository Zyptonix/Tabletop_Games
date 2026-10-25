#!/usr/bin/env python3
"""PC-first Tabletop Arena continuation (v3).

Builds on the already-applied game-engine-hardening-v2 patch. Targets
feat/board-games-pc-first-v1 and requires its V2 marker, so it will not be
silently applied to an unrelated or older prototype-board engine.

Scope: full legal chess special-move handling (castling, en passant,
selectable promotion, repetition/50/75-move and insufficient-material draws),
Barricades circle tokens and hoverable edge-wall placement, game selection
menu, viewport/no-scroll game layouts, and idempotent match finalization.
The V2 Ludo/Barricades path validation, Risk dice/casualties, seeded
Battleships fleet, Poker hand ranking/side-pots and dynamic scoreboards remain.
This patch does not claim to implement every commercial/house rule of all
remaining prototype games; see the included audit.
"""
from __future__ import annotations
import argparse, hashlib, shutil, subprocess, sys
from datetime import datetime
from pathlib import Path

BASE_COMMIT = "19aead093be3c8e1d758413d70b4909977285462"
EXPECTED_BRANCH = "feat/board-games-pc-first-v1"
MARKER = "TABLETOP GAME ENGINE CONTINUATION V3"
class PatchError(RuntimeError): pass

def run_git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    r = subprocess.run(["git", *args], cwd=root, text=True, capture_output=True)
    if check and r.returncode:
        raise PatchError(r.stderr.strip() or f"git {' '.join(args)} failed")
    return r

def replace_once(s: str, old: str, new: str, label: str) -> str:
    n=s.count(old)
    if n != 1: raise PatchError(f"{label}: expected one matching anchor, found {n}; no files changed.")
    return s.replace(old,new,1)

def replace_one_of(s: str, alternatives: list[str], new: str, label: str) -> str:
    """Replace one uniquely matching source anchor, accepting known V2/V3 wording variants."""
    counts = [(anchor, s.count(anchor)) for anchor in alternatives]
    total = sum(count for _, count in counts)
    matches = [anchor for anchor, count in counts if count == 1]
    if total != 1 or len(matches) != 1:
        details = ", ".join(str(count) for _, count in counts)
        raise PatchError(f"{label}: expected exactly one known anchor variant (match counts: {details}); no files changed.")
    return s.replace(matches[0], new, 1)

def replace_region(s: str, start: str, end: str, new: str, label: str) -> str:
    a=s.find(start)
    if a<0: raise PatchError(f"{label}: start anchor not found; no files changed.")
    b=s.find(end,a+len(start))
    if b<0: raise PatchError(f"{label}: end anchor not found; no files changed.")
    if s.find(start,a+len(start),b)>=0: raise PatchError(f"{label}: ambiguous anchors; no files changed.")
    return s[:a]+new+s[b:]

def read(root: Path, rel: str) -> str:
    p=root/rel
    if not p.is_file(): raise PatchError(f"Required file missing: {rel}")
    return p.read_text(encoding="utf-8-sig")

CHESS_PSEUDO = r'''function chessPseudoMoves(state: PrototypeGameState, playerId: string): PrototypeAction[] {
  const output: PrototypeAction[] = [];
  const player = state.players.find((candidate) => candidate.userId === playerId);
  if (!player) return output;
  const board = state.board;
  const isWhite = player.seat % 2 === 0;
  const own = (piece: string | null) => playerOwnsChessPiece(state, playerId, piece);
  const push = (from: number, to: number) => {
    const row = Math.floor(to / 8);
    const piece = board[Math.floor(from / 8)]?.[from % 8] ?? null;
    if (piece?.toLowerCase() === "p" && (row === 0 || row === 7)) {
      for (const promotion of ["q", "r", "b", "n"] as const) output.push({ type: "move_piece", from, to, promotion });
    } else output.push({ type: "move_piece", from, to });
  };
  const directions: Record<string, Array<[number, number]>> = {
    n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    b: [[-1,-1],[-1,1],[1,-1],[1,1]],
    r: [[-1,0],[0,-1],[0,1],[1,0]]
  };
  for (let from = 0; from < 64; from += 1) {
    const fr = Math.floor(from / 8), fc = from % 8;
    const piece = board[fr]?.[fc] ?? null;
    if (!own(piece)) continue;
    const kind = piece!.toLowerCase();
    const tryMove = (r: number, c: number): boolean => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r]?.[c] ?? null;
      if (target && (own(target) || target.toLowerCase() === "k")) return false;
      push(from, r * 8 + c);
      return !target;
    };
    if (kind === "p") {
      const dir = isWhite ? -1 : 1;
      const one = fr + dir;
      if (one >= 0 && one <= 7 && !board[one]?.[fc]) {
        push(from, one * 8 + fc);
        const startRow = isWhite ? 6 : 1;
        const two = fr + dir * 2;
        if (fr === startRow && !board[two]?.[fc]) push(from, two * 8 + fc);
      }
      for (const dc of [-1, 1]) {
        const r = fr + dir, c = fc + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const target = board[r]?.[c] ?? null;
        const to = r * 8 + c;
        if (target && !own(target) && target.toLowerCase() !== "k") push(from, to);
        else if (!target && state.chessEnPassantTarget === to) {
          const passedPawn = board[fr]?.[c] ?? null;
          if (passedPawn?.toLowerCase() === "p" && !own(passedPawn)) push(from, to);
        }
      }
      continue;
    }
    const dirs = kind === "q" ? [...directions.b!, ...directions.r!] : directions[kind];
    if (!dirs) continue;
    const slides = ["b", "r", "q"].includes(kind);
    for (const [dr, dc] of dirs) {
      for (let step = 1; step <= (slides ? 7 : 1); step += 1) {
        if (!tryMove(fr + dr * step, fc + dc * step)) break;
      }
    }
    if (kind === "k") {
      const homeRow = isWhite ? 7 : 0;
      const home = homeRow * 8 + 4;
      const enemy = state.players.find((candidate) => candidate.userId !== playerId);
      const rights = state.chessCastlingRights ?? "KQkq";
      const kingSide = isWhite ? "K" : "k";
      const queenSide = isWhite ? "Q" : "q";
      const rook = isWhite ? "R" : "r";
      if (from === home && enemy && !chessKingInCheck(state, playerId)) {
        if (rights.includes(kingSide) && board[homeRow]?.[7] === rook && !board[homeRow]?.[5] && !board[homeRow]?.[6]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 5) && !chessSquareAttacked(state, enemy.userId, homeRow, 6)) {
          output.push({ type: "move_piece", from, to: home + 2 });
        }
        if (rights.includes(queenSide) && board[homeRow]?.[0] === rook && !board[homeRow]?.[1] && !board[homeRow]?.[2] && !board[homeRow]?.[3]
          && !chessSquareAttacked(state, enemy.userId, homeRow, 3) && !chessSquareAttacked(state, enemy.userId, homeRow, 2)) {
          output.push({ type: "move_piece", from, to: home - 2 });
        }
      }
    }
  }
  return output;
}'''

CHESS_BOARD_AFTER = r'''function chessBoardAfterMove(state: PrototypeGameState, action: PrototypeAction): Array<Array<string | null>> | null {
  if (action.type !== "move_piece" || !Number.isInteger(action.from) || !Number.isInteger(action.to) || action.from < 0 || action.from >= 64 || action.to < 0 || action.to >= 64) return null;
  const board = state.board.map((row) => row.slice());
  const fromRow = Math.floor(action.from / 8), fromColumn = action.from % 8;
  const toRow = Math.floor(action.to / 8), toColumn = action.to % 8;
  const piece = board[fromRow]?.[fromColumn] ?? null;
  if (!piece || board[toRow]?.[toColumn]?.toLowerCase() === "k") return null;
  const target = board[toRow]?.[toColumn] ?? null;
  // En passant captures the pawn behind the empty destination square.
  if (piece.toLowerCase() === "p" && fromColumn !== toColumn && !target && state.chessEnPassantTarget === action.to) {
    board[fromRow]![toColumn] = null;
  }
  board[fromRow]![fromColumn] = null;
  board[toRow]![toColumn] = piece;
  // Castling moves the rook as part of the same indivisible move.
  if (piece.toLowerCase() === "k" && Math.abs(toColumn - fromColumn) === 2) {
    const rookFrom = toColumn > fromColumn ? 7 : 0;
    const rookTo = toColumn > fromColumn ? 5 : 3;
    const rook = board[toRow]?.[rookFrom] ?? null;
    if (rook?.toLowerCase() !== "r") return null;
    board[toRow]![rookTo] = rook;
    board[toRow]![rookFrom] = null;
  }
  if (piece.toLowerCase() === "p" && (toRow === 0 || toRow === 7)) {
    const promotion = action.promotion ?? "q";
    if (!( ["q", "r", "b", "n"] as string[]).includes(promotion)) return null;
    board[toRow]![toColumn] = piece === piece.toUpperCase() ? promotion.toUpperCase() : promotion.toLowerCase();
  }
  return board;
}'''

CHESS_HELPERS = r'''function chessPositionKey(state: PrototypeGameState): string {
  const active = state.players.find((player) => player.userId === state.currentPlayerId);
  const sideToMove = active && active.seat % 2 === 0 ? "w" : "b";
  let ep = "-";
  const target = state.chessEnPassantTarget ?? null;
  if (target !== null) {
    const targetRow = Math.floor(target / 8), targetColumn = target % 8;
    const pawnRow = targetRow + (sideToMove === "w" ? 1 : -1);
    const pawn = sideToMove === "w" ? "P" : "p";
    if ([-1, 1].some((delta) => state.board[pawnRow]?.[targetColumn + delta] === pawn)) ep = String(target);
  }
  return `${state.board.map((row) => row.join("")).join("/")}:${sideToMove}:${state.chessCastlingRights ?? "KQkq"}:${ep}`;
}
function chessPositionCount(state: PrototypeGameState): number {
  const key = chessPositionKey(state);
  return (state.chessPositionHistory ?? []).filter((position) => position === key).length;
}
function chessDrawClaimAvailable(state: PrototypeGameState): boolean {
  return (state.chessHalfmoveClock ?? 0) >= 100 || chessPositionCount(state) >= 3;
}
function chessInsufficientMaterial(state: PrototypeGameState): boolean {
  const pieces: Array<{kind:string; color:number}> = [];
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    const piece = state.board[row]?.[column] ?? null;
    if (!piece || piece.toLowerCase() === "k") continue;
    pieces.push({ kind: piece.toLowerCase(), color: (row + column) % 2 });
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && ["b", "n"].includes(pieces[0]!.kind)) return true;
  return pieces.every((piece) => piece.kind === "b") && new Set(pieces.map((piece) => piece.color)).size === 1;
}'''

GAME_MENU = r'''"use client";

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
  poker: { subtitle: "Texas Hold’em · hand ranking and bets", colors: "from-emerald-500/25 via-teal-300/10 to-slate-950", icon: "♠", art: "cards" }
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
'''


def transform_prototype(src: str) -> str:
    if MARKER in src: raise PatchError("v3 chess rules already appear installed in prototype-board-games.ts")
    if "TABLETOP GAME ENGINE HARDENING V2" not in src or "function settlePokerShowdown" not in src or "barricadesCanReachGoal" not in src:
        raise PatchError("prototype-board-games.ts does not contain the applied v2 engine hardening. Refusing to patch.")
    src = f"/* {MARKER} */\n" + src
    # Persist complete chess state across snapshots.
    src = replace_once(src,
      '  gameId: PrototypeGameId;\n  version: string;\n  settings: PrototypeSettings;\n  phase: "playing" | "finished";\n  players: GamePlayer[];\n  currentPlayerId: string | null;\n  winnerUserId: string | null;',
      '  gameId: PrototypeGameId;\n  version: string;\n  settings: PrototypeSettings;\n  phase: "playing" | "finished";\n  players: GamePlayer[];\n  currentPlayerId: string | null;\n  winnerUserId: string | null;\n  chessCastlingRights: string;\n  chessEnPassantTarget: number | null;\n  chessHalfmoveClock: number;\n  chessPositionHistory: string[];', "chess persistent state")
    src = replace_once(src,
      '  | { type: "move_piece"; from: number; to: number }',
      '  | { type: "move_piece"; from: number; to: number; promotion?: "q" | "r" | "b" | "n" }\n  | { type: "claim_chess_draw" }', "chess action union")
    src = replace_once(src,
      '  z.object({ type: z.literal("move_piece"), from: z.number().int().min(0).max(63), to: z.number().int().min(0).max(63) }),',
      '  z.object({ type: z.literal("move_piece"), from: z.number().int().min(0).max(63), to: z.number().int().min(0).max(63), promotion: z.enum(["q", "r", "b", "n"]).optional() }),\n  z.object({ type: z.literal("claim_chess_draw") }),', "chess action schema")
    src = replace_once(src,
      '    gameId, version: "0.2.0-rules-hardening", settings: params.settings, phase: "playing", players,\n    currentPlayerId: firstId, winnerUserId: null, turnNumber: 1, actionNumber: 0,',
      '    gameId, version: "0.3.0-chess-rules", settings: params.settings, phase: "playing", players,\n    currentPlayerId: firstId, winnerUserId: null, chessCastlingRights: "KQkq", chessEnPassantTarget: null, chessHalfmoveClock: 0, chessPositionHistory: [], turnNumber: 1, actionNumber: 0,', "chess state initialization")
    src = replace_once(src, '  state.rngState = rngState;\n  state.activityLog.push(makeActivity(state, "game_started",', '  state.rngState = rngState;\n  if (gameId === "chess") state.chessPositionHistory = [chessPositionKey(state)];\n  state.activityLog.push(makeActivity(state, "game_started",', "initialize chess repetition history")
    src = replace_region(src, "function chessPseudoMoves(", "\nconst BATTLESHIP_LENGTHS", CHESS_PSEUDO + "\n", "chess movement generation")
    src = replace_region(src, "function chessBoardAfterMove(", "\nfunction chessActions(", CHESS_BOARD_AFTER + "\n", "chess special move board transitions")
    src = replace_once(src, 'function chessActions(state: PrototypeGameState, playerId: string): PrototypeAction[] {\n  return chessPseudoMoves(state, playerId).filter((action) => {\n    const board = chessBoardAfterMove(state, action);\n    return board !== null && !chessKingInCheck(state, playerId, board);\n  });\n}', 'function chessActions(state: PrototypeGameState, playerId: string): PrototypeAction[] {\n  return chessPseudoMoves(state, playerId).filter((action) => {\n    const board = chessBoardAfterMove(state, action);\n    return board !== null && !chessKingInCheck(state, playerId, board);\n  });\n}\n\n' + CHESS_HELPERS, "chess draw and repetition helpers")
    src = replace_once(src, '  if (state.gameId === "chess") return chessActions(state, playerId);', '  if (state.gameId === "chess") {\n    const moves = chessActions(state, playerId);\n    if (chessDrawClaimAvailable(state)) moves.push({ type: "claim_chess_draw" });\n    return moves;\n  }', "chess draw-claim availability")
    src = replace_one_of(src,
      [
        '  chess: { title: "Chess", min: 2, max: 2, notice: "Server rules enforce legal movement, check, checkmate and stalemate. Castling, en passant and repetition/fifty-move draw rules are still outstanding." },',
        '  chess: { title: "Chess", min: 2, max: 2, notice: "Server-authoritative legal moves, check, checkmate and stalemate are implemented; castling, en passant, repetition and fifty-move draws remain." },',
      ],
      '  chess: { title: "Chess", min: 2, max: 2, notice: "Legal moves, check/checkmate, castling, en passant, selectable promotion, repetition and move-count draw rules are enforced by the server." },',
      "chess rules notice")
    src = replace_once(src, '    version: "0.2.0-rules-hardening",\n    minPlayers: spec.min,', '    version: "0.3.0-chess-rules",\n    minPlayers: spec.min,', "chess module version")
    move_branch = r'''  if (action.type === "claim_chess_draw" && state.gameId === "chess") {
    if (!chessDrawClaimAvailable(state)) return { state: params.state, events: [] };
    finish(state, null, now);
    message = `🤝 ${player.displayName} claimed a draw by ${state.chessHalfmoveClock >= 100 ? "the 50-move rule" : "threefold repetition"}.`;
  } else if (action.type === "move_piece" && state.gameId === "chess") {
    const legalMove = chessActions(state, playerId).some((candidate) => candidate.type === "move_piece" && candidate.from === action.from && candidate.to === action.to && (candidate.promotion ?? "") === (action.promotion ?? ""));
    if (!legalMove) return { state: params.state, events: [] };
    const fromRow = Math.floor(action.from / 8), fromCol = action.from % 8;
    const toRow = Math.floor(action.to / 8), toCol = action.to % 8;
    const piece = state.board[fromRow]?.[fromCol] ?? null;
    const captured = state.board[toRow]?.[toCol] ?? null;
    if (!piece || !playerOwnsChessPiece(state, playerId, piece)) return { state: params.state, events: [] };
    const epCapture = piece.toLowerCase() === "p" && fromCol !== toCol && !captured && state.chessEnPassantTarget === action.to;
    const board = chessBoardAfterMove(state, action);
    if (!board) return { state: params.state, events: [] };
    let rights = state.chessCastlingRights ?? "KQkq";
    if (piece === "K") rights = rights.replace(/[KQ]/g, "");
    if (piece === "k") rights = rights.replace(/[kq]/g, "");
    if (piece === "R" && action.from === 63) rights = rights.replace("K", "");
    if (piece === "R" && action.from === 56) rights = rights.replace("Q", "");
    if (piece === "r" && action.from === 7) rights = rights.replace("k", "");
    if (piece === "r" && action.from === 0) rights = rights.replace("q", "");
    if (captured === "R" && action.to === 63) rights = rights.replace("K", "");
    if (captured === "R" && action.to === 56) rights = rights.replace("Q", "");
    if (captured === "r" && action.to === 7) rights = rights.replace("k", "");
    if (captured === "r" && action.to === 0) rights = rights.replace("q", "");
    state.chessCastlingRights = rights;
    state.chessEnPassantTarget = piece.toLowerCase() === "p" && Math.abs(action.to - action.from) === 16 ? (action.to + action.from) / 2 : null;
    state.chessHalfmoveClock = piece.toLowerCase() === "p" || captured !== null || epCapture ? 0 : (state.chessHalfmoveClock ?? 0) + 1;
    state.board = board;
    state.currentPlayerId = nextPlayerId(state, playerId);
    state.turnNumber += 1;
    state.chessPositionHistory = [...(state.chessPositionHistory ?? []), chessPositionKey(state)].slice(-200);
    const opponentId = state.currentPlayerId;
    const destination = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const repetitionCount = chessPositionCount(state);
    if (opponentId) {
      const replies = chessActions(state, opponentId);
      const checked = chessKingInCheck(state, opponentId);
      if (replies.length === 0 && checked) {
        finish(state, playerId, now);
        message = `♟️ ${player.displayName} delivered checkmate on ${destination} and wins!`;
      } else if (replies.length === 0) {
        finish(state, null, now);
        message = `🤝 Stalemate after ${player.displayName}'s move to ${destination}. The game is a draw.`;
      } else if ((state.chessHalfmoveClock ?? 0) >= 150 || repetitionCount >= 5 || chessInsufficientMaterial(state)) {
        finish(state, null, now);
        message = `🤝 Draw after ${player.displayName}'s move (${(state.chessHalfmoveClock ?? 0) >= 150 ? "75-move rule" : repetitionCount >= 5 ? "fivefold repetition" : "insufficient material"}).`;
      } else {
        message = `♟️ ${player.displayName} moved ${piece}${action.promotion ? `=${action.promotion.toUpperCase()}` : ""} from ${String.fromCharCode(97 + fromCol)}${8 - fromRow} to ${destination}${captured || epCapture ? " and captured a piece" : ""}${checked ? " — CHECK!" : ""}${Math.abs(toCol-fromCol)===2 && piece.toLowerCase()==="k" ? " — CASTLING" : ""}.`;
      }
    } else {
      message = `♟️ ${player.displayName} moved ${piece} to ${destination}.`;
    }
'''
    src = replace_region(src, '  if (action.type === "move_piece" && state.gameId === "chess") {', '  } else if (action.type === "fire" && state.gameId === "battleship") {', move_branch, "chess rule-enforced action application")
    return src


def transform_tests(src: str) -> str:
    if MARKER in src: raise PatchError("v3 chess regression tests already appear installed")
    if "backend rules hardening v2" not in src.lower(): raise PatchError("Expected v2 board-game test suite not found")
    src = f"// {MARKER}\n" + src
    return src.rstrip() + r'''

// Chess special-move and draw-regression cases for V3.
describe("chess rules continuation v3", () => {
  it("offers legal castling only when rights and clear king-side path exist", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![4] = "K"; state.board[7]![7] = "R";
    state.board[0]![4] = "k"; state.board[0]![7] = "r";
    state.chessCastlingRights = "K"; state.currentPlayerId = "p1";
    expect(chessModule.getLegalActions({ state, playerId: "p1" })).toContainEqual({ type: "move_piece", from: 60, to: 62 });
    state.board[7]![5] = "N";
    expect(chessModule.getLegalActions({ state, playerId: "p1" })).not.toContainEqual({ type: "move_piece", from: 60, to: 62 });
  });

  it("supports en passant and removes the bypassed pawn", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![7] = "K"; state.board[0]![7] = "k";
    state.board[3]![4] = "P"; state.board[3]![3] = "p";
    state.chessCastlingRights = ""; state.chessEnPassantTarget = 19; state.currentPlayerId = "p1";
    const result = chessModule.applyAction({ state, playerId: "p1", action: { type: "move_piece", from: 28, to: 19 }, now: "2026-10-25T00:02:00.000Z" });
    expect(result.state.board[2]?.[3]).toBe("P");
    expect(result.state.board[3]?.[3]).toBeNull();
    expect((result.state as PrototypeGameState).chessEnPassantTarget).toBeNull();
  });

  it("offers all four standard promotion choices", () => {
    const state = start(chessModule);
    state.board = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
    state.board[7]![7] = "K"; state.board[0]![7] = "k"; state.board[1]![0] = "P";
    state.chessCastlingRights = ""; state.currentPlayerId = "p1";
    const moves = chessModule.getLegalActions({ state, playerId: "p1" }).filter((action) => action.type === "move_piece" && action.from === 8 && action.to === 0);
    expect(moves.map((action) => action.type === "move_piece" ? action.promotion : null).sort()).toEqual(["b", "n", "q", "r"]);
  });
});
'''

PIECE_COMPONENT = r'''const CHESS_PIECE_FILES: Record<string, string> = {
  K: "white_king.png", Q: "white_queen.png", R: "white_rook.png", B: "white_bishop.png", N: "white_knight.png", P: "white_pawn.png",
  k: "black_king.png", q: "black_queen.png", r: "black_rook.png", b: "black_bishop.png", n: "black_knight.png", p: "black_pawn.png"
};
function ChessPieceArt({ piece }: { piece: string }) {
  const file = CHESS_PIECE_FILES[piece];
  const [failedFile, setFailedFile] = useState<string | null>(null);
  if (!file || failedFile === file) return <span className={piece === piece.toUpperCase() ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,.8)]" : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,.8)]"}>{PIECES[piece] ?? piece}</span>;
  return <img src={`/game-assets/chess/${file}`} alt="" draggable={false} onError={() => setFailedFile(file)} className="pointer-events-none h-[84%] w-[84%] select-none object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,.48)]" />;
}
'''

BARRICADES_RENDER = r'''  function renderBarricades() {
    const tracks = "repeat(8, minmax(0, 1fr) 0.14fr) minmax(0, 1fr)";
    const hoveredKey = hoveredWall ? `${hoveredWall.orientation}:${hoveredWall.x}:${hoveredWall.y}` : "";
    const remaining = state.wallsRemaining[currentUserId] ?? 0;
    return <div className="prototype-barricades-wrap mx-auto flex h-full min-h-0 w-full max-w-[min(76vh,680px)] flex-col justify-center gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">🟠 Barricades</h2><p className="text-[11px] text-white/50">Move to the opposite edge. Hover a gap to preview and place a two-edge wall.</p></div><div className="flex items-center gap-2"><span className="rounded-lg border border-orange-200/20 bg-orange-300/10 px-3 py-2 text-xs font-black text-orange-100">{remaining} walls left</span><button onClick={() => setWallMode(wallMode === "h" ? null : "h")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-3 py-2 text-xs font-black ${wallMode === "h" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>— H</button><button onClick={() => setWallMode(wallMode === "v" ? null : "v")} disabled={!isMyTurn || remaining < 1} className={`rounded-lg border px-3 py-2 text-xs font-black ${wallMode === "v" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04] text-white/70"}`}>| V</button><button onClick={() => setWallMode(null)} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white/60">Auto</button></div></div>
      <div className="barricades-hover-board relative mx-auto grid aspect-square w-full flex-1 min-h-0 max-h-[min(64vh,680px)] overflow-visible rounded-xl border border-orange-100/20 bg-[#10242b] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.28)]" style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}>
        {Array.from({ length: 289 }, (_, index) => {
          const row = Math.floor(index / 17), col = index % 17;
          const style: React.CSSProperties = { gridRow: row + 1, gridColumn: col + 1 };
          if (row % 2 === 0 && col % 2 === 0) {
            const x = col / 2, y = row / 2;
            const pawn = Object.entries(state.pawns).find(([, pos]) => pos.x === x && pos.y === y);
            const pawnPlayer = pawn ? state.players.find((player) => player.userId === pawn[0]) : null;
            const allowedMove = hasAction(legalActions, "move_pawn", (action) => action.x === x && action.y === y);
            return <button key={index} type="button" style={style} aria-label={`Barricades tile ${x + 1}, ${y + 1}${pawnPlayer ? ` occupied by ${pawnPlayer.displayName}` : ""}`} disabled={!isMyTurn || !allowedMove} onClick={() => { if (allowedMove) { onAction("move_pawn", { x, y }); setHoveredWall(null); setWallMode(null); } }} className={`relative z-10 grid aspect-square min-h-0 min-w-0 place-items-center rounded-[3px] border border-cyan-50/[.07] transition ${allowedMove ? "bg-emerald-300/15 ring-1 ring-inset ring-emerald-200/65 hover:bg-emerald-200/25" : "bg-[#203942]"}`}>
              {pawnPlayer ? <span title={pawnPlayer.displayName} className="block h-[62%] w-[62%] rounded-full border-2 border-white/90 shadow-[0_0_12px_rgba(255,255,255,.3),inset_0_2px_2px_rgba(255,255,255,.38)]" style={{ background: PLAYER_COLORS[pawnPlayer.seat % PLAYER_COLORS.length] }} /> : null}
            </button>;
          }
          const horizontalGap = row % 2 === 1 && col % 2 === 0;
          const verticalGap = row % 2 === 0 && col % 2 === 1;
          if (!horizontalGap && !verticalGap) return <div key={index} style={style} className="pointer-events-none" />;
          const orientation: "h" | "v" = horizontalGap ? "h" : "v";
          const x = horizontalGap ? col / 2 : (col - 1) / 2;
          const y = horizontalGap ? (row - 1) / 2 : row / 2;
          const eligible = x >= 0 && x <= 7 && y >= 0 && y <= 7;
          const existing = eligible ? state.walls.find((wall) => wall.orientation === orientation && (orientation === "h" ? wall.y === y && (wall.x === x || wall.x + 1 === x) : wall.x === x && (wall.y === y || wall.y + 1 === y))) : undefined;
          const isExistingSegment = existing && (orientation === "h" ? existing.x !== x : existing.y !== y);
          if (isExistingSegment) return <div key={index} style={style} className="pointer-events-none" />;
          const wallOwner = existing ? state.players.find((player) => player.userId === existing.playerId) : null;
          if (existing) {
            const start = orientation === "h" ? existing.x === x : existing.y === y;
            const wallStyle: React.CSSProperties = orientation === "h"
              ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` }
              : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` };
            return start ? <div key={index} style={wallStyle} title={`Wall placed by ${wallOwner?.displayName ?? "player"}`} className={`barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} relative z-30 self-center rounded-full border border-orange-100/80 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,.28)]`} /> : <div key={index} style={style} className="pointer-events-none" />;
          }
          const legalWall = eligible && (!wallMode || wallMode === orientation) && hasAction(legalActions, "place_wall", (action) => action.x === x && action.y === y && action.orientation === orientation);
          const currentKey = `${orientation}:${x}:${y}`;
          const hovered = hoveredKey === currentKey;
          if (!eligible) return <div key={index} style={style} className="pointer-events-none" />;
          const previewStyle: React.CSSProperties = hovered && legalWall
            ? orientation === "h" ? { gridRow: row + 1, gridColumn: `${col + 1} / span 3` } : { gridColumn: col + 1, gridRow: `${row + 1} / span 3` }
            : style;
          return <button key={index} type="button" style={previewStyle} title={legalWall ? `Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}` : "Wall would overlap or block a path"} aria-label={`Place ${orientation === "h" ? "horizontal" : "vertical"} wall at ${x + 1}, ${y + 1}`} disabled={!isMyTurn || remaining < 1 || !legalWall} onMouseEnter={() => legalWall && setHoveredWall({ x, y, orientation })} onMouseLeave={() => setHoveredWall(null)} onFocus={() => legalWall && setHoveredWall({ x, y, orientation })} onBlur={() => setHoveredWall(null)} onClick={() => { if (!legalWall) return; onAction("place_wall", { x, y, orientation }); setHoveredWall(null); setWallMode(null); }} className={`relative ${hovered && legalWall ? `barricades-wall-solid ${orientation === "h" ? "barricades-h-wall" : "barricades-v-wall"} z-40 self-center rounded-full border border-orange-100 bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,.48)]` : "z-20 rounded-sm bg-transparent"} ${legalWall ? "cursor-crosshair hover:bg-orange-300/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100" : "cursor-not-allowed"}`}>
            {hovered && legalWall ? <span className="pointer-events-none absolute inset-0 grid place-items-center text-[9px] font-black uppercase text-orange-950">Place wall</span> : null}
          </button>;
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/45"><span>{hoveredWall ? `Preview: ${hoveredWall.orientation === "h" ? "horizontal" : "vertical"} wall` : wallMode ? `Showing ${wallMode === "h" ? "horizontal" : "vertical"} wall gaps` : "Hover a horizontal or vertical gap to preview a legal wall."}</span><span className="shrink-0 text-emerald-100/60">Green tile rings = legal pawn moves</span></div>
    </div>;
  }
'''


def transform_proto_ui(src: str) -> str:
    if MARKER in src: raise PatchError("v3 game-table UI already patched")
    src = f"/* {MARKER} */\n" + src
    src = replace_once(src, 'const [selectedSquare, setSelectedSquare] = useState<number | null>(null);', 'const [selectedSquare, setSelectedSquare] = useState<number | null>(null);\n  const [pendingChessPromotion, setPendingChessPromotion] = useState<AnyAction[] | null>(null);\n  const [hoveredWall, setHoveredWall] = useState<{ x: number; y: number; orientation: "h" | "v" } | null>(null);', "chess promotion and Barricades hover state")
    src = replace_once(src, 'function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }', 'function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }\n' + PIECE_COMPONENT, "PNG chess pieces")
    # Replace only the active board's main scroll container and add a responsive zoom wrapper.
    src = replace_once(src, 'className="relative min-h-0 min-w-0 overflow-y-auto rounded-2xl', 'className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl', "no-scroll prototype board panel")
    src = replace_once(src, '<div className="min-w-0">{renderBoard()}</div>', '<div className="prototype-board-content min-h-0 min-w-0 flex-1">{renderBoard()}</div>', "viewport-fit prototype content")
    src = replace_once(src, '            {piece ? <span className={piece === piece.toUpperCase() ? "drop-shadow-[0_2px_1px_rgba(255,255,255,.45)]" : "drop-shadow-[0_2px_1px_rgba(0,0,0,.6)]"}>{PIECES[piece] ?? piece}</span> : null}', '            {piece ? <ChessPieceArt piece={piece} /> : null}', "render named chess PNG assets")
    src = replace_once(src, '              onAction("move_piece", { from: selectedSquare, to: index }); setSelectedSquare(null); return;', '              const choices = selectedMoves.filter((action) => action.to === index);\n              if (choices.length > 1) { setPendingChessPromotion(choices); return; }\n              const move = choices[0]; if (move) onAction("move_piece", { from: selectedSquare, to: index }); setSelectedSquare(null); setPendingChessPromotion(null); return;', "choose promotion instead of implicit queen")
    src = replace_once(src, '            if (isOwnPiece) setSelectedSquare(index); else setSelectedSquare(null);', '            if (isOwnPiece) { setSelectedSquare(index); setPendingChessPromotion(null); } else { setSelectedSquare(null); setPendingChessPromotion(null); }', "clear pending chess promotion")
    src = replace_once(src, '<p className="mt-3 text-xs leading-relaxed text-amber-100/60">Server rules enforce legal movement, check, checkmate and stalemate. Castling, en passant and repetition/fifty-move draw rules are still outstanding.</p>', '<div className="mt-2 flex flex-wrap items-center justify-between gap-2">{pendingChessPromotion ? <div className="flex items-center gap-2 rounded-lg border border-amber-200/20 bg-amber-100/[.06] p-2"><span className="text-[10px] font-black text-amber-100">Promote to</span>{pendingChessPromotion.map((action) => <button key={String(action.promotion)} type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/10 text-lg font-black hover:bg-emerald-300/20" onClick={() => { onAction("move_piece", { from: action.from, to: action.to, promotion: action.promotion }); setPendingChessPromotion(null); setSelectedSquare(null); }}>{String(action.promotion).toUpperCase()}</button>)}<button type="button" onClick={() => setPendingChessPromotion(null)} className="rounded-lg px-2 py-1 text-xs text-white/50">Cancel</button></div> : null}{hasAction(legalActions, "claim_chess_draw") ? <button type="button" onClick={() => onAction("claim_chess_draw")} className="rounded-lg border border-amber-200/25 bg-amber-100/10 px-3 py-2 text-[10px] font-black text-amber-100 hover:bg-amber-100/20">Claim draw</button> : null}</div><p className="mt-2 text-[10px] leading-relaxed text-white/40">Legal moves, castling, en passant, promotion, checkmate and draw rules are enforced by the server.</p>', "chess promotion chooser and draw claim")
    src = replace_region(src, '  function renderBarricades() {', '\n  function renderMonopoly() {', BARRICADES_RENDER + "\n", "Barricades circle tokens and hoverable wall gaps")
    src = replace_once(src, '        <main className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl', '        <main className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl', "prototype no-scroll verification")
    return src


def transform_dashboard(src: str) -> str:
    if MARKER in src: raise PatchError("dashboard game menu already integrated")
    src = f"/* {MARKER} */\n" + src
    src = replace_once(src, 'import { api } from "@/lib/api/client";', 'import { api } from "@/lib/api/client";\nimport { GameSelectionMenu } from "@/components/game-menu/GameSelectionMenu";', "dashboard game menu import")
    src = replace_once(src, '    <AppShell>\n      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">', '    <AppShell>\n      <div className="mb-6"><GameSelectionMenu /></div>\n      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">', "dashboard game menu mount")
    return src


def transform_styles(src: str) -> str:
    if MARKER in src: raise PatchError("viewport fit CSS already appended")
    return src.rstrip() + "\n\n/* " + MARKER + r''' — PC-first game viewport fit.
   Keep active tables inside the display; shrink board content on short displays.
   Individual game panels still use fixed-size visual affordances, not page scrolling. */
html:has(.tt-game-viewport),
body:has(.tt-game-viewport) {
  width: 100%;
  height: 100%;
  overflow: hidden !important;
  overscroll-behavior: none;
}
.tt-game-viewport {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
}
.tt-game-viewport .overflow-y-auto,
.tt-game-viewport .overflow-x-auto {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.tt-game-viewport .overflow-y-auto::-webkit-scrollbar,
.tt-game-viewport .overflow-x-auto::-webkit-scrollbar {
  display: none !important;
}
.prototype-game-screen .prototype-board-content {
  min-height: 0;
  overflow: hidden;
  transform-origin: top center;
}
.prototype-game-screen .prototype-barricades-wrap { min-height: 0; }
.barricades-hover-board { touch-action: manipulation; }
.barricades-wall-solid { min-width: 0; min-height: 0; }
.barricades-h-wall { width: 100%; height: 62%; }
.barricades-v-wall { width: 62%; height: 100%; }
@media (max-height: 860px) {
  .prototype-game-screen .prototype-board-content { zoom: .86; }
  .prototype-game-screen .prototype-barricades-wrap { gap: .35rem; }
}
@media (max-height: 740px) {
  .prototype-game-screen .prototype-board-content { zoom: .76; }
  .prototype-game-screen .prototype-barricades-wrap h2 { font-size: 1rem; }
  .prototype-game-screen .prototype-barricades-wrap p { font-size: .62rem; }
}
@media (max-height: 850px) {
  .twenty-nine-hand-row { min-height: 0 !important; padding-top: .75rem !important; margin-top: 0 !important; }
  .twenty-nine-hand-row > * { min-width: 0 !important; flex-shrink: 1 !important; }
  .twenty-nine-shell .twenty-nine-board-telemetry { transform: scale(.88); transform-origin: top left; }
  .twenty-nine-shell .twenty-nine-trick-racks { transform: scale(.88); transform-origin: bottom left; }
}
@media (max-height: 740px) {
  .twenty-nine-shell header { padding-top: .25rem !important; padding-bottom: .25rem !important; }
  .twenty-nine-shell .twenty-nine-table { min-height: 0; }
  .twenty-nine-shell .twenty-nine-hand-card { transform-origin: bottom center; }
}
''' + "\n"

def transform_gameshell(src: str) -> str:
    if MARKER in src: raise PatchError("GameShell viewport patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, '<div className="min-h-screen bg-[#020604] text-white">', '<div className="tt-game-viewport h-dvh bg-[#020604] text-white">', "active game shell viewport")
    return src

def transform_app_shell(src: str) -> str:
    if MARKER in src: raise PatchError("AppShell viewport patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, 'return <main className="min-h-screen overflow-hidden bg-[#020604] text-white">{children}</main>;', 'return <main className="tt-game-viewport h-dvh overflow-hidden bg-[#020604] text-white">{children}</main>;', "wide app shell viewport")
    return src

def transform_classic(src: str) -> str:
    if MARKER in src: raise PatchError("Classic UNO no-scroll patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, 'className="uno-fullscreen relative h-[100dvh] w-screen overflow-hidden text-white"', 'className="uno-fullscreen tt-game-viewport relative h-[100dvh] w-screen overflow-hidden text-white"', "Classic UNO fixed viewport")
    src=replace_once(src, 'max-h-[42vh] space-y-2 overflow-y-auto', 'max-h-[22vh] space-y-1 overflow-hidden', "UNO result list without scroll")
    return src

def transform_29(src: str) -> str:
    if MARKER in src: raise PatchError("Twenty-Nine no-scroll patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, 'className="twenty-nine-shell fixed inset-0 z-10 h-[100dvh] min-h-0 w-screen overflow-hidden text-white"', 'className="twenty-nine-shell tt-game-viewport fixed inset-0 z-10 h-[100dvh] min-h-0 w-screen overflow-hidden text-white"', "Twenty-Nine fixed viewport")
    src=replace_once(src, 'overflow-x-auto overflow-y-visible px-2 pb-2 pt-12', 'overflow-hidden overflow-y-visible px-1 pb-1 pt-2', "Twenty-Nine hand fit without horizontal scrolling")
    src=replace_once(src, 'max-h-[16rem] space-y-1 overflow-y-auto p-2', 'max-h-[7rem] space-y-1 overflow-hidden p-2', "Twenty-Nine event history no-scroll")
    return src

def transform_shockwave(src: str) -> str:
    if MARKER in src: raise PatchError("Bomber Tag no-scroll patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, '<div className="min-h-screen bg-[#07120f] px-3 py-4 text-white sm:px-5 lg:px-8">', '<div className="tt-game-viewport strategic-shockwave-screen h-dvh bg-[#07120f] overflow-hidden px-3 py-2 text-white sm:px-4 lg:px-5">', "Bomber Tag viewport")
    src=replace_once(src, '<div className="mx-auto max-w-[1500px] space-y-4">', '<div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-2 space-y-0">', "Bomber Tag main fit layout")
    src=replace_once(src, '<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">', '<div className="grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_290px]">', "Bomber Tag board/sidebar fit")
    src=replace_once(src, 'className="block h-auto w-full" style={{ imageRendering: "pixelated" }}', 'className="block h-auto max-h-[calc(100dvh-210px)] w-full object-contain" style={{ imageRendering: "pixelated" }}', "Bomber Tag canvas fit")
    src=replace_once(src, 'max-h-48 space-y-2 overflow-y-auto pr-1', 'max-h-24 space-y-1 overflow-hidden pr-1', "Bomber Tag chat no scroll")
    return src

def transform_gridgame(src: str) -> str:
    if MARKER in src: raise PatchError("Connect Four/Reversi no-scroll patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, 'className="board-game-screen flex h-[100dvh] min-h-0 flex-col overflow-hidden', 'className="tt-game-viewport board-game-screen flex h-[100dvh] min-h-0 flex-col overflow-hidden', "Connect Four/Reversi fixed viewport")
    src=replace_once(src, 'min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5', 'min-h-0 flex-1 space-y-1 overflow-hidden p-2.5', "Connect Four/Reversi feed fit")
    return src

def transform_werewolf(src: str) -> str:
    if MARKER in src: raise PatchError("Werewolf no-scroll patch already applied")
    src=f"/* {MARKER} */\n"+src
    src=replace_once(src, 'className={cn("relative min-h-[100dvh] overflow-hidden bg-gradient-to-b text-white", phaseTone(state.phase))}', 'className={cn("tt-game-viewport relative h-dvh min-h-0 overflow-hidden bg-gradient-to-b text-white", phaseTone(state.phase))}', "Werewolf fixed viewport")
    src=replace_once(src, 'className="relative z-10 flex min-h-[100dvh] flex-col p-3"', 'className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-2"', "Werewolf content viewport")
    # Replace internal scroll lists with clipped compact panels. The root viewport never scrolls.
    src=src.replace('overflow-y-auto', 'overflow-hidden')
    return src

def transform_match_results(src: str) -> str:
    if MARKER in src: raise PatchError("match finalization idempotency patch already applied")
    src=f"/* {MARKER} */\n"+src
    anchor='    await prisma.$transaction(async (transaction) => {\n      await transaction.match.update({'
    replacement='    await prisma.$transaction(async (transaction) => {\n      const existingMatch = await transaction.match.findUnique({ where: { id: params.matchId }, select: { endedAt: true } });\n      // Socket retries/reconnects can deliver the same terminal snapshot more than once.\n      // Never duplicate XP, coins, scores or leaderboard increments for an already-finalized match.\n      if (!existingMatch || existingMatch.endedAt) return;\n\n      await transaction.match.update({'
    src=replace_once(src, anchor, replacement, "idempotent match result finalization")
    return src


def build_edits(root: Path) -> dict[str,str]:
    prototype=read(root,"packages/game-core/src/games/prototype-board-games.ts")
    tests=read(root,"packages/game-core/src/__tests__/prototype-board-games.test.ts")
    proto_ui=read(root,"apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx")
    dashboard=read(root,"apps/web/src/app/dashboard/page.tsx")
    styles=read(root,"apps/web/src/styles/globals.css") if (root/"apps/web/src/styles/globals.css").exists() else read(root,"apps/web/src/styles/globals.css")
    game_shell=read(root,"apps/web/src/features/game-shell/GameShell.tsx")
    app_shell=read(root,"apps/web/src/components/layout/AppShell.tsx")
    classic=read(root,"apps/web/src/features/games/classic-uno/ClassicUnoTable.tsx")
    twenty_nine=read(root,"apps/web/src/features/games/twenty-nine/TwentyNineTable.tsx")
    shockwave=read(root,"apps/web/src/features/games/strategic-shockwave/StrategicShockwaveTable.tsx")
    gridgame=read(root,"apps/web/src/features/games/board-games/BoardGamesTable.tsx")
    werewolf=read(root,"apps/web/src/features/games/mafia-werewolf/MafiaWerewolfTable.tsx")
    results=read(root,"apps/server/src/services/MatchResultService.ts")
    menu_rel="apps/web/src/components/game-menu/GameSelectionMenu.tsx"
    if (root/menu_rel).exists(): raise PatchError(f"{menu_rel} already exists; review it manually rather than overwrite it")
    edits={
      "packages/game-core/src/games/prototype-board-games.ts": transform_prototype(prototype),
      "packages/game-core/src/__tests__/prototype-board-games.test.ts": transform_tests(tests),
      "apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx": transform_proto_ui(proto_ui),
      "apps/web/src/app/dashboard/page.tsx": transform_dashboard(dashboard),
      "apps/web/src/components/game-menu/GameSelectionMenu.tsx": GAME_MENU,
      "apps/web/src/styles/globals.css": transform_styles(styles),
      "apps/web/src/features/game-shell/GameShell.tsx": transform_gameshell(game_shell),
      "apps/web/src/components/layout/AppShell.tsx": transform_app_shell(app_shell),
      "apps/web/src/features/games/classic-uno/ClassicUnoTable.tsx": transform_classic(classic),
      "apps/web/src/features/games/twenty-nine/TwentyNineTable.tsx": transform_29(twenty_nine),
      "apps/web/src/features/games/strategic-shockwave/StrategicShockwaveTable.tsx": transform_shockwave(shockwave),
      "apps/web/src/features/games/board-games/BoardGamesTable.tsx": transform_gridgame(gridgame),
      "apps/web/src/features/games/mafia-werewolf/MafiaWerewolfTable.tsx": transform_werewolf(werewolf),
      "apps/server/src/services/MatchResultService.ts": transform_match_results(results),
    }
    if "api.games()" not in edits["apps/web/src/app/dashboard/page.tsx"] and "GameSelectionMenu" not in edits["apps/web/src/app/dashboard/page.tsx"]:
      raise PatchError("Dashboard verification failed: game menu is not mounted")
    engine=edits["packages/game-core/src/games/prototype-board-games.ts"]
    for marker in ["chessCastlingRights", "chessEnPassantTarget", "chessDrawClaimAvailable", "settlePokerShowdown", "barricadesCanReachGoal", "ludoGlobalTrackPosition"]:
      if marker not in engine: raise PatchError(f"Internal engine verification failed: {marker}")
    ui=edits["apps/web/src/features/games/prototype-board-games/PrototypeBoardGamesTable.tsx"]
    for marker in ["white_king.png", "black_bishop.png", "barricades-hover-board", "hoveredWall", "Claim draw"]:
      if marker not in ui: raise PatchError(f"Internal UI verification failed: {marker}")
    return edits

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run",action="store_true",help="Validate V2 markers, branch ancestry and every transformation anchor without writing files")
    args=parser.parse_args()
    root=Path.cwd().resolve()
    if not (root/".git").exists() or not (root/"package.json").is_file():
      print("ERROR: run this from the Tabletop_Games repository root.",file=sys.stderr); return 2
    try:
      branch=run_git(root,"branch","--show-current").stdout.strip()
      if branch!=EXPECTED_BRANCH: raise PatchError(f"Expected {EXPECTED_BRANCH}, found {branch or '<detached HEAD>'}. No files changed.")
      if run_git(root,"merge-base","--is-ancestor",BASE_COMMIT,"HEAD",check=False).returncode:
        raise PatchError(f"Base commit {BASE_COMMIT[:12]} is not an ancestor of HEAD. Fetch the PC-first branch first. No files changed.")
      edits=build_edits(root)
      print(f"Validated {len(edits)} file changes against {EXPECTED_BRANCH} (base {BASE_COMMIT[:12]}):")
      for path,content in sorted(edits.items()): print(f"  UPDATE {path} ({len(content.encode('utf-8')):,} bytes)")
      if args.dry_run: print("DRY RUN OK. No files changed."); return 0
      stamp=datetime.now().strftime("%Y%m%d-%H%M%S")
      backup=root/".tmp"/f"pc-first-game-engine-v3-backup-{stamp}"
      for rel in edits:
        target=root/rel; dest=backup/rel; dest.parent.mkdir(parents=True,exist_ok=True)
        if target.exists(): shutil.copy2(target,dest)
      for rel,content in edits.items():
        target=root/rel; target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(content,encoding="utf-8",newline="\n")
      print(f"\nPatch applied. Backups: {backup.relative_to(root)}")
      print("Now run game-core tests/typecheck, monorepo typecheck/build and verify full-screen layouts at 1080p and 768p.")
      return 0
    except (PatchError, OSError) as error:
      print(f"ERROR: {error}\nNo files changed.",file=sys.stderr); return 1
if __name__=="__main__": raise SystemExit(main())
