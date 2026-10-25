"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameEvent, PublicPrototypeGameState } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";
import { RoomChat } from "@/features/game-shell/RoomChat";

type AnyAction = { type: string; [key: string]: unknown };
type Props = {
  room: RoomStateView;
  state: PublicPrototypeGameState;
  legalActions: unknown[];
  gameEvents: GameEvent[];
  currentUserId: string;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat: (roomId: string, body: string) => void;
  onEndMatch?: (roomId: string) => void;
};

const META: Record<string, { title: string; icon: string; accent: string; description: string }> = {
  chess: { title: "Chess", icon: "♟️", accent: "#a5b4fc", description: "Classic strategy · Early access" },
  battleship: { title: "Battleships", icon: "🚢", accent: "#38bdf8", description: "Naval tactics · Early access" },
  ludo: { title: "Ludo", icon: "🎲", accent: "#fbbf24", description: "Race to home · Early access" },
  barricades: { title: "Barricades", icon: "🧱", accent: "#fb923c", description: "Block and outmaneuver · Early access" },
  monopoly: { title: "Property Tycoon", icon: "🏠", accent: "#4ade80", description: "Buy, build and collect · Early access" },
  risk: { title: "Risk", icon: "🌍", accent: "#fb7185", description: "Territory strategy · Early access" },
  "world-conquest": { title: "World Conquest", icon: "🗺️", accent: "#f472b6", description: "Larger conquest map · Early access" },
  codenames: { title: "Codenames", icon: "🕵️", accent: "#facc15", description: "Team word deduction · Early access" },
  poker: { title: "Poker · Texas Hold'em", icon: "🃏", accent: "#c4b5fd", description: "Cards, blinds and betting · Early access" }
};
const PIECES: Record<string, string> = { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" };
const PLAYER_COLORS = ["#38bdf8", "#fb7185", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6", "#a3e635", "#94a3b8"];
const owns = (state: PublicPrototypeGameState, userId: string) => state.currentPlayerId === userId && state.phase === "playing";
function isAction(value: unknown): value is AnyAction { return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"; }
function hasAction(actions: unknown[], type: string, match: (action: AnyAction) => boolean = () => true) { return actions.some((value) => isAction(value) && value.type === type && match(value)); }
function money(value: number | null | undefined) { return `$${(value ?? 0).toLocaleString("en-US")}`; }
function cardColor(card: string) { return /[♥♦]/.test(card) ? "text-rose-400" : "text-slate-100"; }
function ActivityIcon({ type, message }: { type: string; message: string }) {
  const emoji = message.match(/^\p{Extended_Pictographic}/u)?.[0];
  if (emoji) return <span className="text-base leading-none">{emoji}</span>;
  const fallbacks: Record<string, string> = { game_started: "🎮", game_action: "🎯", player_eliminated: "💥", attack: "⚔️", purchase: "🏠" };
  return <span className="text-base leading-none">{fallbacks[type] ?? "✨"}</span>;
}

export function PrototypeBoardGamesTable({ room, state, legalActions, gameEvents, currentUserId, onAction, onChat, onEndMatch }: Props) {
  const router = useRouter();
  const meta = META[state.gameId] ?? META.chess!;
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [wallMode, setWallMode] = useState<"h" | "v" | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
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
  const activeTarget = state.players.find((player) => player.userId !== currentUserId);

  function dispatch(action: AnyAction) {
    const { type, ...payload } = action;
    onAction(type, payload);
  }
  function dashboard() { router.push("/dashboard"); }

  function renderChess() {
    const legalMoves = legalActions.filter(isAction).filter((action) => action.type === "move_piece");
    const selectedMoves = legalMoves.filter((action) => action.from === selectedSquare);
    return <div className="mx-auto w-full max-w-[min(75vh,740px)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[.2em] text-white/45">White at bottom · Select a piece, then a highlighted square</div><div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold">{currentPlayer?.displayName ?? "Waiting"} to move</div></div>
      <div className="overflow-hidden rounded-2xl border-[7px] border-[#26394d] bg-[#26394d] shadow-[0_24px_50px_rgba(0,0,0,.45)]"><div className="grid grid-cols-8">
        {state.board.flatMap((row, rowIndex) => row.map((piece, column) => {
          const index = rowIndex * 8 + column;
          const highlighted = selectedMoves.some((action) => action.to === index);
          const selected = selectedSquare === index;
          return <button key={index} type="button" aria-label={`Chess square ${String.fromCharCode(97 + column)}${8 - rowIndex}`} onClick={() => {
            if (!isMyTurn) return;
            if (selectedSquare !== null && selectedMoves.some((action) => action.to === index)) {
              onAction("move_piece", { from: selectedSquare, to: index }); setSelectedSquare(null); return;
            }
            const isOwnPiece = Boolean(piece && ((me?.seat ?? 0) % 2 === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase()));
            if (isOwnPiece) setSelectedSquare(index); else setSelectedSquare(null);
          }} className={`relative grid aspect-square place-items-center text-[clamp(1.5rem,4.6vw,3.2rem)] leading-none transition-colors ${((rowIndex + column) % 2 === 0) ? "bg-[#e3d8c4] text-[#1e293b]" : "bg-[#65816d] text-white"} ${selected ? "ring-4 ring-inset ring-amber-300" : ""} ${highlighted ? "after:absolute after:h-3 after:w-3 after:rounded-full after:bg-emerald-500/80 after:shadow-[0_0_0_4px_rgba(16,185,129,.18)]" : ""}`}>
            {piece ? <span className={piece === piece.toUpperCase() ? "drop-shadow-[0_2px_1px_rgba(255,255,255,.45)]" : "drop-shadow-[0_2px_1px_rgba(0,0,0,.6)]"}>{PIECES[piece] ?? piece}</span> : null}
            {column === 0 ? <span className="absolute left-1 top-1 text-[9px] font-black opacity-40">{8 - rowIndex}</span> : null}{rowIndex === 7 ? <span className="absolute bottom-1 right-1 text-[9px] font-black opacity-40">{"abcdefgh"[column]}</span> : null}
          </button>;
        }))}
      </div></div><p className="mt-3 text-xs leading-relaxed text-amber-100/60">Prototype rules: move geometry and captures work, but check/checkmate legality, castling and en passant are still being built.</p>
    </div>;
  }

  function renderBattleships() {
    const incoming = state.shots.filter((shot) => shot.targetId === currentUserId);
    const outgoing = state.shots.filter((shot) => shot.shooterId === currentUserId);
    const shotAt = (x: number, y: number, outgoingSide = true) => (outgoingSide ? outgoing : incoming).find((shot) => shot.x === x && shot.y === y);
    const fired = new Set(outgoing.map((shot) => `${shot.x},${shot.y}`));
    return <div className="mx-auto w-full max-w-[690px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">🎯 Target grid</h2><p className="text-sm text-white/50">Fire at {activeTarget?.displayName ?? "your opponent"}</p></div><div className="rounded-xl border border-cyan-200/15 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100">🚢 Fleet: {state.ownShipCells.length} cells</div></div>
      <div className="grid grid-cols-10 gap-1 rounded-2xl border border-cyan-300/15 bg-[#071a2d] p-2 sm:gap-1.5 sm:p-3">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const shot = shotAt(x, y, true); return <button key={index} type="button" onClick={() => onAction("fire", { x, y })} disabled={!isMyTurn || fired.has(`${x},${y}`) || !hasAction(legalActions, "fire", (action) => action.x === x && action.y === y)} className={`relative grid aspect-square place-items-center rounded-md border text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${shot ? shot.hit ? "border-rose-300/45 bg-rose-500/30 text-rose-100" : "border-sky-200/15 bg-sky-300/[.07] text-sky-100/45" : "border-sky-200/15 bg-[#0c2d48] text-cyan-100 hover:border-cyan-200/70 hover:bg-cyan-300/15"}`}>{shot ? shot.hit ? "💥" : "·" : ""}</button>; })}</div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-white/50"><span>💥 Hit</span><span>· Miss</span><span>🚢 {incoming.filter((shot) => shot.hit).length} hits received</span><span>🎯 {outgoing.filter((shot) => shot.hit).length} hits landed</span></div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xs font-black uppercase tracking-widest text-white/45">Your hidden fleet</p><div className="mt-2 grid grid-cols-10 gap-1">{Array.from({ length: 100 }, (_, index) => { const x = index % 10; const y = Math.floor(index / 10); const ship = state.ownShipCells.includes(`${x},${y}`); const shot = shotAt(x, y, false); return <div key={index} className={`aspect-square rounded-sm ${ship ? shot?.hit ? "bg-rose-400" : "bg-slate-300/65" : shot ? shot.hit ? "bg-rose-400/70" : "bg-cyan-300/20" : "bg-white/[.035]"}`} />; })}</div></div>
    </div>;
  }

  function renderLudo() {
    const track = Array.from({ length: 58 }, (_, index) => index);
    const allTokenCount = Object.values(state.ludoTokens).reduce((sum, tokens) => sum + tokens.filter((position) => position >= 0).length, 0);
    return <div className="mx-auto w-full max-w-[780px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🎲 Race to home</h2><p className="text-sm text-white/50">Roll a six to launch a token. First player to finish all four wins.</p></div><div className="flex items-center gap-3 rounded-2xl border border-amber-200/15 bg-amber-300/10 px-4 py-3"><span className="text-3xl">{state.diceRoll ? ["⚀","⚁","⚂","⚃","⚄","⚅"][state.diceRoll - 1] : "🎲"}</span><div><p className="text-[10px] font-black uppercase tracking-widest text-amber-100/50">Last roll</p><p className="text-2xl font-black text-amber-100">{state.diceRoll ?? "—"}</p></div></div></div>
      <div className="rounded-3xl border border-white/10 bg-[#10211f] p-4 shadow-[0_25px_70px_rgba(0,0,0,.3)]"><div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 sm:gap-1.5">{track.map((index) => { const tokenList = state.players.flatMap((player) => (state.ludoTokens[player.userId] ?? []).map((position, tokenIndex) => ({ player, position, tokenIndex }))).filter((token) => token.position === index); return <div key={index} className={`relative grid aspect-square place-items-center rounded-lg border text-[10px] ${tokenList.length ? "border-white/15 bg-white/10" : "border-white/[.045] bg-black/10"}`}>{tokenList.map((token) => <span key={token.player.userId + token.tokenIndex} title={token.player.displayName} className="grid h-5 w-5 place-items-center rounded-full border-2 border-white/70 text-[8px] font-black text-slate-950" style={{ background: PLAYER_COLORS[token.player.seat % PLAYER_COLORS.length] }}>{token.tokenIndex + 1}</span>)}{tokenList.length === 0 ? <span className="text-white/15">{index + 1}</span> : null}</div>; })}</div><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">52-space shared route + 6-space home stretch; safe-square rules are still in progress</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{state.players.map((player) => <section key={player.userId} className={`rounded-2xl border p-3 ${player.userId === currentUserId ? "border-amber-200/30 bg-amber-200/[.06]" : "border-white/10 bg-black/15"}`}><div className="flex items-center justify-between gap-2"><p className="font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><span className="text-xs font-bold text-white/40">{(player.tokens ?? [-1,-1,-1,-1]).filter((pos) => pos >= 57).length}/4 home</span></div><div className="mt-3 grid grid-cols-4 gap-2">{(player.tokens ?? [-1,-1,-1,-1]).map((position, tokenIndex) => <button key={tokenIndex} type="button" onClick={() => onAction("move_token", { tokenIndex })} disabled={player.userId !== currentUserId || !isMyTurn || !state.hasRolled || !hasAction(legalActions, "move_token", (action) => action.tokenIndex === tokenIndex)} className="min-h-12 rounded-xl border text-xl font-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length], background: `${PLAYER_COLORS[player.seat % PLAYER_COLORS.length]}22` }}>{position < 0 ? "🏠" : position >= 57 ? "🏁" : position + 1}</button>)}</div></section>)}</div>
      <div className="mt-4 flex gap-2">{hasAction(legalActions,"roll_dice") ? <button onClick={() => onAction("roll_dice")} className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-slate-950 hover:bg-amber-200">🎲 Roll dice</button> : null}{hasAction(legalActions,"end_turn") ? <button onClick={() => onAction("end_turn")} className="min-h-12 rounded-xl border border-white/10 px-4 font-bold">End turn</button> : null}<span className="self-center text-xs text-white/40">{allTokenCount} tokens on the track</span></div>
    </div>;
  }

  function renderBarricades() {
    return <div className="mx-auto w-full max-w-[660px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🧱 Barricades</h2><p className="text-sm text-white/50">Reach the far side. Place walls to slow your rivals.</p></div><div className="flex gap-2"><button onClick={() => setWallMode(wallMode === "h" ? null : "h")} disabled={!isMyTurn || (state.wallsRemaining[currentUserId] ?? 0) < 1} className={`rounded-xl border px-3 py-2 text-xs font-black ${wallMode === "h" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04]"}`}>▬ Horizontal</button><button onClick={() => setWallMode(wallMode === "v" ? null : "v")} disabled={!isMyTurn || (state.wallsRemaining[currentUserId] ?? 0) < 1} className={`rounded-xl border px-3 py-2 text-xs font-black ${wallMode === "v" ? "border-orange-300 bg-orange-300/20 text-orange-100" : "border-white/10 bg-white/[.04]"}`}>▮ Vertical</button></div></div>
      <div className="grid grid-cols-9 gap-1 rounded-2xl border border-orange-200/15 bg-[#12242a] p-2 sm:gap-1.5 sm:p-3">{Array.from({ length: 81 }, (_, index) => { const x = index % 9; const y = Math.floor(index / 9); const pawn = Object.entries(state.pawns).find(([, pos]) => pos.x === x && pos.y === y); const wallH = state.walls.some((wall) => wall.orientation === "h" && wall.y === y && (wall.x === x || wall.x + 1 === x)); const wallV = state.walls.some((wall) => wall.orientation === "v" && wall.x === x && (wall.y === y || wall.y + 1 === y)); const allowedMove = hasAction(legalActions, "move_pawn", (action) => action.x === x && action.y === y); const legalWall = wallMode ? hasAction(legalActions,"place_wall",(action) => action.x === x && action.y === y && action.orientation === wallMode) : false; return <button key={index} type="button" onClick={() => { if (wallMode && legalWall) { onAction("place_wall", { x, y, orientation: wallMode }); setWallMode(null); } else if (allowedMove) onAction("move_pawn", { x, y }); }} className={`relative grid aspect-square place-items-center rounded-md border text-lg transition ${pawn ? "border-white/25 bg-white/15" : "border-cyan-100/[.08] bg-[#203942]"} ${allowedMove && !wallMode ? "ring-2 ring-inset ring-emerald-300/75" : ""} ${legalWall ? "ring-2 ring-inset ring-orange-300/75" : ""} ${wallH ? "border-b-4 border-b-orange-400" : ""} ${wallV ? "border-r-4 border-r-orange-400" : ""} disabled:opacity-60`} disabled={!isMyTurn || (!allowedMove && !legalWall)}>{pawn ? <span style={{ color: PLAYER_COLORS[state.players.find((player) => player.userId === pawn[0])?.seat ?? 0] }}>♟</span> : legalWall ? "🧱" : ""}</button>; })}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45"><span>Walls remaining: {state.wallsRemaining[currentUserId] ?? 0}</span><span>{wallMode ? `Select a highlighted square for a ${wallMode === "h" ? "horizontal" : "vertical"} wall.` : "Highlighted squares are legal pawn moves."}</span><button onClick={() => onAction("end_turn")} disabled={!isMyTurn || !hasAction(legalActions,"end_turn")} className="rounded-lg border border-white/10 px-3 py-2 font-bold text-white/70">End turn</button></div>
    </div>;
  }

  function renderMonopoly() {
    const propertyAt = state.properties[state.positions[currentUserId] ?? 0];
    return <div className="mx-auto w-full max-w-[900px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🏠 Property Tycoon</h2><p className="text-sm text-white/50">Roll, move, buy properties and collect rent.</p></div><div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[.08] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Your cash</p><p className="text-2xl font-black text-emerald-100">{money(me?.money)}</p></div></div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">{state.properties.map((property, index) => { const positionPlayers = state.players.filter((player) => player.position === index); const owner = state.players.find((player) => player.userId === property.ownerId); const occupied = positionPlayers.some((player) => player.userId === currentUserId); return <div key={property.id} className={`relative flex min-h-[78px] flex-col rounded-xl border p-2 text-left ${occupied ? "border-emerald-300 ring-2 ring-emerald-300/30" : "border-white/10"} ${owner ? "bg-emerald-300/10" : "bg-[#101d1b]"}`}><span className="text-[9px] font-bold text-white/35">{String(index).padStart(2,"0")}</span><span className="mt-1 line-clamp-2 text-[10px] font-black leading-tight">{property.label}</span><span className="mt-auto text-[10px] font-bold text-emerald-100/65">{property.cost ? money(property.cost) : "—"}</span>{owner ? <span className="mt-1 truncate text-[9px] font-black" style={{ color: PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] }}>● {owner.displayName}</span> : null}{positionPlayers.length ? <span className="absolute right-1 top-1 text-sm">{positionPlayers.map(() => "🎲").join("")}</span> : null}</div>; })}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mr-auto"><p className="text-xs font-black uppercase tracking-widest text-white/40">Current space</p><p className="font-black">{propertyAt?.label ?? "Start"}</p></div>{hasAction(legalActions,"roll_dice") ? <button onClick={() => onAction("roll_dice")} className="min-h-12 rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🎲 Roll</button> : null}{hasAction(legalActions,"buy_property") ? <button onClick={() => onAction("buy_property")} className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-slate-950 hover:bg-amber-200">🏡 Buy for {money(propertyAt?.cost)}</button> : null}{hasAction(legalActions,"end_turn") ? <button onClick={() => onAction("end_turn")} className="min-h-12 rounded-xl border border-white/10 px-4 font-bold">End turn</button> : null}</div>
    </div>;
  }

  function renderConquest() {
    const selected = state.territories.find((territory) => territory.id === selectedTerritory);
    return <div className="mx-auto w-full max-w-[1000px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{state.gameId === "risk" ? "🌍 Risk" : "🗺️ World Conquest"}</h2><p className="text-sm text-white/50">Claim land, reinforce borders and attack neighboring territories.</p></div><div className="rounded-xl border border-rose-200/15 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100">{state.territories.filter((territory) => state.territoryOwners[territory.id] !== null).length}/{state.territories.length} territories owned</div></div>
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-[#081922] p-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11">{state.territories.map((territory) => { const ownerId = state.territoryOwners[territory.id] ?? null; const owner = state.players.find((player) => player.userId === ownerId); const isSelected = selectedTerritory === territory.id; const canClaim = hasAction(legalActions,"claim_territory",(action) => action.territoryId === territory.id); const canReinforce = hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === territory.id); const canAttack = selected ? hasAction(legalActions,"attack_territory",(action) => action.fromId === selected.id && action.toId === territory.id) : false; return <button key={territory.id} type="button" disabled={!isMyTurn || (!canClaim && !canReinforce && !canAttack && !ownerId)} onClick={() => { if (canClaim) { onAction("claim_territory", { territoryId: territory.id }); setSelectedTerritory(null); } else if (canAttack && selected) { onAction("attack_territory", { fromId: selected.id, toId: territory.id }); setSelectedTerritory(null); } else if (canReinforce) { setSelectedTerritory(territory.id); } else if (ownerId === currentUserId) { setSelectedTerritory(territory.id); } }} className={`min-h-[72px] rounded-xl border p-2 text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-50 ${isSelected ? "border-amber-300 ring-2 ring-amber-300/30" : owner ? "border-white/15" : "border-white/[.06]"}`} style={{ background: owner ? `${PLAYER_COLORS[owner.seat % PLAYER_COLORS.length]}25` : "rgba(255,255,255,.025)" }}><span className="block line-clamp-2 text-[10px] font-black leading-tight">{territory.label}</span><span className="mt-2 block text-[10px] font-black" style={{ color: owner ? PLAYER_COLORS[owner.seat % PLAYER_COLORS.length] : "rgba(255,255,255,.25)" }}>{owner ? `● ${owner.displayName}` : "Unclaimed"}</span><span className="mt-1 block text-[10px] text-white/55">🪖 {state.territoryTroops[territory.id] ?? 0}</span></button>; })}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="mr-auto text-xs text-white/50">{selected ? `Selected: ${selected.label}` : "Select an owned territory to reinforce or attack an adjacent enemy."}</div>{selected && hasAction(legalActions,"reinforce_territory",(action) => action.territoryId === selected.id) ? <button onClick={() => { onAction("reinforce_territory",{territoryId:selected.id}); setSelectedTerritory(null); }} className="min-h-10 rounded-lg bg-amber-300 px-3 text-xs font-black text-slate-950">🪖 Reinforce +2</button> : null}<button onClick={() => { onAction("end_turn"); setSelectedTerritory(null); }} disabled={!isMyTurn || !hasAction(legalActions,"end_turn")} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold">End turn</button></div>
    </div>;
  }

  function renderCodenames() {
    const revealedCounts = state.wordCards.reduce((counts, card) => { if (card.revealedRole) counts[card.revealedRole] = (counts[card.revealedRole] ?? 0) + 1; return counts; }, {} as Record<string, number>);
    return <div className="mx-auto w-full max-w-[900px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🕵️ Codenames</h2><p className="text-sm text-white/50">Reveal words for your team's color. Avoid the assassin.</p></div><div className="flex gap-2"><span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-black text-rose-200">🔴 {revealedCounts.red ?? 0}/9</span><span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black text-sky-200">🔵 {revealedCounts.blue ?? 0}/8</span></div></div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">{state.wordCards.map((card, index) => { const role = card.revealedRole; const cardStyle = role === "red" ? "border-rose-300/40 bg-rose-500/25 text-rose-100" : role === "blue" ? "border-sky-300/40 bg-sky-500/25 text-sky-100" : role === "assassin" ? "border-black bg-black text-white" : role === "neutral" ? "border-amber-100/20 bg-[#d8d1bc] text-[#343124]" : "border-amber-100/25 bg-gradient-to-br from-[#f6e8c3] to-[#d7c59d] text-[#463d2a] hover:from-white hover:to-[#ead8af]"; return <button key={card.word} type="button" onClick={() => onAction("reveal_word", { index })} disabled={!isMyTurn || card.revealed || !hasAction(legalActions,"reveal_word",(action) => action.index === index)} className={`flex aspect-[1.3/1] flex-col items-center justify-center rounded-xl border px-1 text-center font-black shadow-[0_4px_14px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 disabled:cursor-default ${cardStyle}`}><span className="text-[clamp(.55rem,1.3vw,.9rem)] tracking-wide sm:text-sm">{card.word}</span>{role ? <span className="mt-1 text-[9px] uppercase tracking-widest opacity-60">{role === "assassin" ? "☠ assassin" : role}</span> : null}</button>; })}</div><p className="mt-4 text-xs text-white/40">The secret key stays hidden until a card is revealed. Spymaster clue-giving and exact official round rules are not implemented yet.</p>
    </div>;
  }

  function renderPoker() {
    return <div className="mx-auto w-full max-w-[900px]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">🃏 Texas Hold'em</h2><p className="text-sm text-white/50">Build the best hand from your two cards and the community cards.</p></div><div className="rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50">Pot</p><p className="text-2xl font-black text-emerald-100">{money(state.pokerPot)}</p></div></div>
      <div className="rounded-[2.5rem] border-[7px] border-[#4c4038] bg-[radial-gradient(ellipse_at_center,#176047,#0b382b_66%,#06251c)] p-5 shadow-[0_30px_70px_rgba(0,0,0,.45)] sm:p-8"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{state.players.map((player) => <div key={player.userId} className={`rounded-xl border p-3 text-center ${player.isCurrentTurn ? "border-amber-200/50 bg-amber-100/10" : "border-white/10 bg-black/15"}`}><p className="truncate text-xs font-black">{player.displayName}</p><p className="mt-1 text-[10px] text-white/45">{player.folded ? "Folded" : `$${player.stack ?? 0} stack`}</p><p className="mt-1 text-xs font-bold text-emerald-100">Bet ${player.bet}</p><div className="mt-2 flex justify-center gap-1">{player.folded ? <span className="text-sm">❌</span> : player.userId === currentUserId ? (state.myPokerCards.length ? state.myPokerCards.map((card, i) => <span key={i} className={`rounded-md bg-white px-2 py-2 text-sm font-black shadow ${cardColor(card)}`}>{card}</span>) : null) : <><span className="rounded-md border border-white/20 bg-slate-900 px-2 py-2 text-sm">🂠</span><span className="rounded-md border border-white/20 bg-slate-900 px-2 py-2 text-sm">🂠</span></>}</div></div>)}</div>
        <div className="my-8 text-center"><p className="text-[10px] font-black uppercase tracking-[.25em] text-emerald-100/45">{state.pokerStreet} · Current bet ${state.pokerBetToCall}</p><div className="mt-3 flex flex-wrap justify-center gap-2">{Array.from({ length: 5 }, (_, index) => { const card = state.communityCards[index]; return <div key={index} className={`grid h-20 w-14 place-items-center rounded-xl border border-white/15 shadow-xl sm:h-24 sm:w-16 ${card ? `bg-white text-xl font-black ${cardColor(card)}` : "bg-black/20 text-white/15"}`}>{card ?? "·"}</div>; })}</div><p className="mt-4 text-sm font-bold text-emerald-100/75">{state.pokerLastAction}</p></div>
      </div><div className="mt-4 flex flex-wrap gap-2">{legalActions.filter(isAction).filter((action) => action.type === "poker_action").map((action) => <button key={String(action.choice)} type="button" onClick={() => dispatch(action)} className={`min-h-12 rounded-xl px-5 font-black transition hover:-translate-y-0.5 ${action.choice === "fold" ? "border border-rose-300/30 bg-rose-500/10 text-rose-100" : action.choice === "raise" || action.choice === "all_in" ? "bg-amber-300 text-slate-950 hover:bg-amber-200" : "border border-white/10 bg-white/[.06] hover:bg-white/[.12]"}`}>{action.choice === "fold" ? "❌ Fold" : action.choice === "check" ? "👀 Check" : action.choice === "call" ? "🪙 Call" : action.choice === "raise" ? "⬆️ Raise" : "🔥 All-in"}</button>)}</div><p className="mt-3 text-xs text-white/40">Prototype note: card dealing and basic betting rounds work. Showdown currently uses a high-card approximation, not full poker hand ranking.</p>
    </div>;
  }

  function renderBoard() {
    switch (state.gameId) {
      case "chess": return renderChess();
      case "battleship": return renderBattleships();
      case "ludo": return renderLudo();
      case "barricades": return renderBarricades();
      case "monopoly": return renderMonopoly();
      case "risk":
      case "world-conquest": return renderConquest();
      case "codenames": return renderCodenames();
      case "poker": return renderPoker();
    }
  }

  return <div className="prototype-game-screen h-dvh min-h-0 overflow-hidden bg-[#050a0f] text-slate-100">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08121b] px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.045] text-xl">{meta.icon}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-lg font-black tracking-tight lg:text-xl">{meta.title}</h1><span className="rounded-full border border-amber-200/20 bg-amber-200/[.07] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.2em] text-amber-100/75">Prototype</span></div><p className="hidden text-[11px] font-semibold text-white/40 sm:block">Room {room.code} · {meta.description}</p></div></div>
        <div className="flex shrink-0 items-center gap-2"><span className={`hidden rounded-full border px-3 py-2 text-xs font-bold sm:inline-flex ${isMyTurn ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.035] text-white/55"}`}>{isMyTurn ? "🟢 Your turn" : `⏳ ${currentPlayer?.displayName ?? "No active player"}`}</span><button type="button" onClick={dashboard} className="min-h-10 rounded-xl border border-white/10 bg-white/[.055] px-3 text-xs font-black transition hover:border-emerald-200/30 hover:bg-emerald-300/10">🏠 Dashboard</button>{canEndRoom && onEndMatch && room.status !== "finished" ? <button type="button" onClick={() => { if (window.confirm("End this room for everyone?")) onEndMatch(room.id); }} className="hidden min-h-10 rounded-xl border border-rose-300/20 px-3 text-xs font-black text-rose-200 hover:bg-rose-400/10 md:inline-flex md:items-center">End room</button> : null}</div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-4 lg:p-4 xl:grid-cols-[minmax(0,1fr)_370px]">
        <main className="relative min-h-0 min-w-0 overflow-y-auto rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_45%_0%,rgba(30,64,85,.22),transparent_60%),linear-gradient(145deg,#0b141d,#080e14)] p-3 sm:p-5 lg:overflow-y-auto lg:p-5 xl:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3"><div><p className="text-[10px] font-black uppercase tracking-[.25em]" style={{ color: meta.accent }}>Tabletop Arena / Board Games</p><p className="mt-1 text-xs text-white/45">{state.players.length} players · Turn {state.turnNumber} · Move {state.actionNumber}</p></div><div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/65">{isMyTurn ? "⚡ Your move" : `👤 ${currentPlayer?.displayName ?? "—"}`}</div></div>
          <div className="min-w-0">{renderBoard()}</div>
          <div className="mt-5 rounded-xl border border-amber-200/15 bg-amber-100/[.045] p-3 text-xs leading-relaxed text-amber-100/70"><span className="mr-2 font-black">🚧 EARLY ACCESS</span>{state.prototypeNotice}</div>
          {state.phase === "finished" ? <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-emerald-100/20 bg-[#0c181d] p-8 text-center shadow-2xl"><div className="text-5xl">🏆</div><h2 className="mt-3 text-2xl font-black">{state.winnerUserId === currentUserId ? "You won!" : `${state.players.find((player) => player.userId === state.winnerUserId)?.displayName ?? "The match"} won!`}</h2><p className="mt-2 text-sm text-white/50">The match has ended. Return to the dashboard when you are ready.</p><button type="button" onClick={dashboard} className="mt-6 min-h-12 w-full rounded-xl bg-emerald-300 px-5 font-black text-slate-950 hover:bg-emerald-200">🏠 Return to dashboard</button></div></div> : null}
        </main>
        <aside className="grid min-h-0 grid-rows-[auto_minmax(120px,.8fr)_minmax(200px,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(140px,.72fr)_minmax(150px,.9fr)_minmax(180px,1fr)]">
          <section className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">👥 Players</h2><span className="text-[10px] font-bold text-white/30">{state.players.length} seated</span></div><div className="grid gap-1.5 overflow-y-auto pr-1">{state.players.map((player) => <div key={player.userId} className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 ${player.isCurrentTurn ? "border-emerald-200/25 bg-emerald-300/[.06]" : "border-white/[.055] bg-white/[.02]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black text-slate-950" style={{ background: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}>{player.displayName.trim().slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p><p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{player.isBot ? "🤖 Bot" : "🧑 Player"}{player.isCurrentTurn ? " · Turn" : ""}</p></div>{state.gameId === "monopoly" ? <strong className="text-xs text-emerald-100">{money(player.money)}</strong> : state.gameId === "poker" ? <strong className="text-xs text-emerald-100">${player.stack}</strong> : state.gameId === "codenames" ? <strong className="text-xs" style={{ color: player.team === "red" ? "#fb7185" : "#7dd3fc" }}>{player.team === "red" ? "🔴 Red" : "🔵 Blue"}</strong> : null}</div>)}</div></section>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-3"><div className="mb-2 flex shrink-0 items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">📜 Game log</h2><span className="text-[10px] font-bold text-white/30">Latest {log.length}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{log.length ? log.map((entry) => <div key={entry.id} className="flex items-start gap-2 rounded-xl border border-white/[.045] bg-white/[.025] px-2.5 py-2"><ActivityIcon type={entry.type} message={entry.message} /><div className="min-w-0 flex-1"><p className="break-words text-[11px] leading-relaxed text-white/75">{entry.message}</p><p className="mt-0.5 text-[9px] text-white/25">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>) : <p className="py-5 text-center text-xs text-white/35">Waiting for the first move…</p>}</div></section>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b131c] p-2"><div className="shrink-0 px-2 py-1"><h2 className="text-xs font-black uppercase tracking-[.2em] text-white/70">💬 Table chat</h2></div><div className="min-h-0 flex-1 overflow-hidden"><RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={room.players.filter((player) => player.connected).length} /></div></section>
        </aside>
      </div>
    </div>
  </div>;
}
