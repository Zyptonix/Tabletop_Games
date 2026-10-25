/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GameEvent, PublicStrategicShockwaveState, ShockwaveTile } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";

type Point = { x: number; y: number };
const TILE = 40;
const PLAYER_COLORS = ["#38bdf8", "#fb7185", "#facc15", "#a78bfa", "#4ade80", "#fb923c", "#f472b6", "#2dd4bf", "#c084fc", "#e2e8f0"];

function shortName(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value;
}

function drawTile(ctx: CanvasRenderingContext2D, tile: ShockwaveTile, x: number, y: number, col: number, row: number) {
  const px = col * TILE;
  const py = row * TILE;
  if (tile === "wall") {
    ctx.fillStyle = "#18313a";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#244752";
    ctx.fillRect(px + 2, py + 2, TILE - 4, 5);
    ctx.fillRect(px + 2, py + 2, 5, TILE - 4);
    ctx.fillStyle = "#10232b";
    ctx.fillRect(px + TILE - 7, py + 5, 5, TILE - 10);
    ctx.fillRect(px + 5, py + TILE - 7, TILE - 10, 5);
    ctx.strokeStyle = "#2b5360";
    ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
    return;
  }
  if (tile === "block") {
    ctx.fillStyle = "#815138";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#a96b43";
    ctx.fillRect(px + 3, py + 3, TILE - 6, 6);
    ctx.fillRect(px + 3, py + 3, 6, TILE - 6);
    ctx.fillStyle = "#573729";
    ctx.fillRect(px + TILE - 8, py + 7, 5, TILE - 14);
    ctx.fillRect(px + 7, py + TILE - 8, TILE - 14, 5);
    ctx.strokeStyle = "#c58a59";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 5.5, py + 5.5, TILE - 11, TILE - 11);
    return;
  }
  ctx.fillStyle = (col + row) % 2 === 0 ? "#254b3d" : "#224637";
  ctx.fillRect(px, py, TILE, TILE);
  ctx.strokeStyle = "rgba(133, 191, 147, 0.08)";
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  // Subtle floor marks make the arena feel less flat without image assets.
  ctx.fillStyle = "rgba(173, 220, 174, 0.07)";
  ctx.fillRect(px + (x % 3) * 5 + 7, py + (y % 3) * 5 + 9, 2, 2);
}

function drawGame(ctx: CanvasRenderingContext2D, state: PublicStrategicShockwaveState, now: number) {
  const width = state.width * TILE;
  const height = state.height * TILE;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c1f1a";
  ctx.fillRect(0, 0, width, height);

  state.board.forEach((row, y) => row.forEach((tile, x) => drawTile(ctx, tile, x, y, x, y)));

  for (const powerUp of state.powerUps) {
    const cx = (powerUp.x + 0.5) * TILE;
    const cy = (powerUp.y + 0.5) * TILE;
    const color = powerUp.kind === "bomb" ? "#38bdf8" : powerUp.kind === "flame" ? "#fb923c" : "#a3e635";
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - 11, cy - 11, 22, 22, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#10232b";
    ctx.font = "900 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerUp.kind === "bomb" ? "B" : powerUp.kind === "flame" ? "F" : "+", cx, cy + 0.5);
    ctx.restore();
  }

  for (const explosion of state.explosions) {
    const remaining = Math.max(0, Math.min(1, (explosion.expiresAt - now) / 650));
    ctx.save();
    for (const cell of explosion.cells) {
      const px = cell.x * TILE;
      const py = cell.y * TILE;
      ctx.globalAlpha = 0.35 + remaining * 0.5;
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#fde047";
      ctx.fillRect(px + 10, py + 10, TILE - 20, TILE - 20);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#fff7cc";
      ctx.fillRect(px + 16, py + 5, 8, TILE - 10);
      ctx.fillRect(px + 5, py + 16, TILE - 10, 8);
    }
    ctx.restore();
  }

  for (const bomb of state.bombs) {
    const cx = (bomb.x + 0.5) * TILE;
    const cy = (bomb.y + 0.5) * TILE;
    const fuseRatio = Math.max(0, Math.min(1, (bomb.explodeAt - now) / 1900));
    const blink = bomb.explodeAt - now < 650 && Math.floor(now / 100) % 2 === 0;
    ctx.save();
    ctx.shadowColor = blink ? "#fb7185" : "#050807";
    ctx.shadowBlur = blink ? 16 : 6;
    ctx.fillStyle = blink ? "#3f1218" : "#07100d";
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuseRatio);
    ctx.stroke();
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 12, 3 + (blink ? 2 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const threatCells = new Set<string>();
    for (const direction of [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ]) {
      for (let distance = 1; distance <= bomb.blastRange; distance += 1) {
        const x = bomb.x + direction.x * distance;
        const y = bomb.y + direction.y * distance;
        const tile = state.board[y]?.[x];
        if (tile === undefined || tile === "wall") break;
        threatCells.add(`${x},${y}`);
        if (tile === "block") break;
      }
    }
    threatCells.add(`${bomb.x},${bomb.y}`);
    for (const key of threatCells) {
      const parts = key.split(",");
      const cellX = Number(parts[0]);
      const cellY = Number(parts[1]);
      if (!Number.isFinite(cellX) || !Number.isFinite(cellY)) continue;
      const px = cellX * TILE + TILE / 2;
      const py = cellY * TILE + TILE / 2;
      const warningAlpha = Math.max(0.18, Math.min(0.95, (bomb.explodeAt - now) / 1900));
      if (warningAlpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = warningAlpha;
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 12px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("☠", px, py + 1);
      ctx.restore();
    }
  }

  for (const player of state.players) {
    if (!player.alive) continue;
    const cx = player.x * TILE;
    const cy = player.y * TILE;
    const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#ffffff";
    const invulnerable = player.invulnerableUntil > now;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = invulnerable ? 15 : 7;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = invulnerable ? 3 : 2;
    ctx.strokeStyle = invulnerable ? "#ffffff" : "rgba(255,255,255,0.8)";
    ctx.stroke();
    ctx.fillStyle = "#10232b";
    ctx.font = "900 11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.displayName.trim().slice(0, 1).toUpperCase(), cx, cy + 0.5);

    const label = shortName(player.displayName);
    ctx.font = "700 10px ui-sans-serif, system-ui";
    const labelWidth = ctx.measureText(label).width + 10;
    ctx.fillStyle = "rgba(3, 13, 11, 0.82)";
    ctx.beginPath();
    ctx.roundRect(cx - labelWidth / 2, cy - 27, labelWidth, 15, 5);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(label, cx, cy - 19.5);
    ctx.restore();
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

export function StrategicShockwaveTable({
  room,
  state,
  currentUserId,
  gameEvents = [],
  onAction,
  onChat,
  onPause,
  onResume,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicStrategicShockwaveState;
  currentUserId: string;
  gameEvents?: GameEvent[];
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onPause?: ((roomId: string) => void) | undefined;
  onResume?: ((roomId: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const actionRef = useRef(onAction);
  const keysRef = useRef(new Set<string>());
  const lastInputRef = useRef("0,0");
  const canPlayRef = useRef(room.status === "in_game" && state.phase === "playing" && Boolean(state.players.find((player) => player.userId === currentUserId)?.alive));
  const [chatDraft, setChatDraft] = useState("");
  const [localNow, setLocalNow] = useState(() => Date.now());
  const mobileActionRef = useRef(onAction);
  const mobileInputIntervalRef = useRef<number | null>(null);
  useEffect(() => { mobileActionRef.current = onAction; }, [onAction]);
  useEffect(() => () => {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    mobileActionRef.current("set_input", { x: 0, y: 0 });
  }, []);

  function startMobileMove(x: number, y: number) {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    const send = () => mobileActionRef.current("set_input", { x, y });
    send();
    mobileInputIntervalRef.current = window.setInterval(send, 75);
  }

  function stopMobileMove() {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    mobileInputIntervalRef.current = null;
    mobileActionRef.current("set_input", { x: 0, y: 0 });
  }
  const me = state.players.find((player) => player.userId === currentUserId);
  const isHost = room.effectiveHostUserId === currentUserId;
  const alivePlayers = state.players.filter((player) => player.alive);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionRef.current = onAction; }, [onAction]);
  useEffect(() => {
    canPlayRef.current = room.status === "in_game" && state.phase === "playing" && Boolean(state.players.find((player) => player.userId === currentUserId)?.alive);
  }, [room.status, state.phase, state.players, currentUserId]);

  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = state.width * TILE;
    canvas.height = state.height * TILE;
    const render = () => {
      const current = stateRef.current;
      drawGame(ctx, current, Date.now());
      frame = window.requestAnimationFrame(render);
    };
    render();
    return () => window.cancelAnimationFrame(frame);
  }, [state.width, state.height]);

  useEffect(() => {
    const sendCurrentInput = (force = false) => {
      if (!canPlayRef.current) return;
      const keys = keysRef.current;
      const x = Number(keys.has("right")) - Number(keys.has("left"));
      const y = Number(keys.has("down")) - Number(keys.has("up"));
      const key = `${x},${y}`;
      if (!force && key === lastInputRef.current) return;
      lastInputRef.current = key;
      actionRef.current("set_input", { x, y });
    };
    const mapKey = (event: KeyboardEvent): string | null => {
      const directionByCode: Record<string, string> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        KeyW: "up",
        KeyS: "down",
        KeyA: "left",
        KeyD: "right"
      };
      const directionByKey: Record<string, string> = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
      };
      const byCode = directionByCode[event.code];
      if (byCode) return byCode;
      return directionByKey[event.key.toLowerCase()] ?? null;
    };
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (canPlayRef.current && !event.repeat) actionRef.current("place_bomb", {});
        return;
      }
      const direction = mapKey(event);
      if (!direction) return;
      event.preventDefault();
      const wasPressed = keysRef.current.has(direction);
      keysRef.current.add(direction);
      if (!wasPressed) sendCurrentInput(true);
    };
    const up = (event: KeyboardEvent) => {
      const direction = mapKey(event);
      if (!direction) return;
      event.preventDefault();
      if (keysRef.current.delete(direction)) sendCurrentInput(true);
    };
    const clear = () => {
      keysRef.current.clear();
      sendCurrentInput(true);
    };
    const onVisibilityChange = () => { if (document.hidden) clear(); };
    const heartbeat = window.setInterval(() => {
      const keys = keysRef.current;
      if (canPlayRef.current && keys.size > 0) sendCurrentInput(true);
    }, 75);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setLocalNow(Date.now()), 150);
    return () => window.clearInterval(interval);
  }, []);

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message || !onChat) return;
    onChat(room.id, message);
    setChatDraft("");
  }

  const remainingMs = state.deadlineAt - localNow;
  const winner = state.players.find((player) => player.userId === state.winnerUserId);
  const newestEvents = gameEvents.slice(-4).reverse();

  return (
    <div className="tt-game-viewport strategic-shockwave-screen h-dvh bg-[#07120f] overflow-hidden px-3 py-2 text-white sm:px-4 lg:px-5">
      <div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-2 space-y-0">
        <header className="flex flex-col gap-3 rounded-2xl border border-emerald-900/80 bg-[#10231c] p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">Tabletop Arena / Room {room.code}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">BOMBER <span className="text-amber-400">TAG</span></h1>
            <p className="mt-1 text-sm text-emerald-100/70">Run, dodge, plant, and survive the blast radius.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">Time left</p>
              <p className={`font-mono text-2xl font-black ${remainingMs < 15_000 ? "text-rose-300" : "text-white"}`}>{formatTime(remainingMs)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">Still alive</p>
              <p className="text-2xl font-black">{alivePlayers.length}<span className="text-sm text-white/50">/{state.players.length}</span></p>
            </div>
            {room.status === "in_game" && isHost ? <button type="button" onClick={() => onPause?.(room.id)} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold hover:bg-white/10">Pause</button> : null}
            {room.status === "paused" && isHost ? <button type="button" onClick={() => onResume?.(room.id)} className="min-h-11 rounded-xl bg-emerald-500 px-3 text-sm font-black text-emerald-950 hover:bg-emerald-400">Resume</button> : null}
            {isHost && room.status !== "finished" ? <button type="button" onClick={() => { if (window.confirm("End this match for everyone?")) onEndMatch?.(room.id); }} className="min-h-11 rounded-xl border border-rose-400/40 px-3 text-sm font-bold text-rose-200 hover:bg-rose-950/60">End match</button> : null}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_290px]">
          <section className="overflow-hidden rounded-2xl border border-emerald-900/80 bg-[#10231c] p-2 shadow-2xl sm:p-4">
            <div className="mx-auto max-w-[760px] overflow-hidden rounded-xl border border-emerald-300/15 bg-[#0c1f1a] shadow-[0_0_55px_rgba(16,185,129,0.09)]">
              <canvas ref={canvasRef} aria-label="Strategic Shockwave bomb arena" className="block h-auto max-h-[calc(100dvh-210px)] w-full object-contain" style={{ imageRendering: "pixelated" }} />
            </div>
            <div className="mx-auto mt-3 flex max-w-[760px] flex-wrap items-center justify-between gap-3 text-xs text-emerald-100/70">
              <p><span className="font-black text-white">MOVE</span> WASD / Arrow keys <span className="ml-3 font-black text-white">BOMB</span> Space</p>
              <button type="button" disabled={!me?.alive || state.phase !== "playing" || room.status !== "in_game"} onClick={() => onAction("place_bomb", {})} className="min-h-10 rounded-lg bg-amber-400 px-4 font-black text-amber-950 shadow-lg shadow-amber-950/20 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">Plant Bomb · Space</button>
            </div>
            <div className="mx-auto mt-3 grid w-full max-w-[13rem] grid-cols-3 gap-2 sm:hidden" aria-label="Touch movement controls">
              <span />
              <button type="button" className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black" aria-label="Move up" onPointerDown={(event) => { event.preventDefault(); startMobileMove(0, -1); }} onPointerUp={stopMobileMove} onPointerCancel={stopMobileMove} onPointerLeave={stopMobileMove}>↑</button>
              <span />
              <button type="button" className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black" aria-label="Move left" onPointerDown={(event) => { event.preventDefault(); startMobileMove(-1, 0); }} onPointerUp={stopMobileMove} onPointerCancel={stopMobileMove} onPointerLeave={stopMobileMove}>←</button>
              <button type="button" className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black" aria-label="Move down" onPointerDown={(event) => { event.preventDefault(); startMobileMove(0, 1); }} onPointerUp={stopMobileMove} onPointerCancel={stopMobileMove} onPointerLeave={stopMobileMove}>↓</button>
              <button type="button" className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black" aria-label="Move right" onPointerDown={(event) => { event.preventDefault(); startMobileMove(1, 0); }} onPointerUp={stopMobileMove} onPointerCancel={stopMobileMove} onPointerLeave={stopMobileMove}>→</button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">Scoreboard</h2>
              <div className="mt-3 space-y-2">
                {[...state.players].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kills - a.kills || a.seat - b.seat).map((player) => (
                  <div key={player.userId} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${player.userId === currentUserId ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/5 bg-black/15"} ${player.alive ? "" : "opacity-45"}`}>
                    <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/20" style={{ backgroundColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{player.displayName}{player.userId === currentUserId ? " (you)" : ""}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{player.alive ? player.isBot ? "Bot · In play" : "In play" : "Eliminated"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{player.kills} <span className="text-[10px] font-bold text-white/40">KOs</span></p>
                      <p className="text-[10px] text-white/45">{player.bombsAvailable} bomb{player.bombsAvailable === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">Arena feed</h2>
              <div className="mt-3 space-y-2">
                {newestEvents.length ? newestEvents.map((item) => <p key={item.id} className="rounded-lg bg-black/20 px-3 py-2 text-xs leading-relaxed text-white/75">{item.message ?? item.type.replaceAll("_", " ")}</p>) : <p className="text-xs text-white/40">Bombs planted and chaos will show up here.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">Room chat</h2>
              <div className="mt-3 max-h-24 space-y-1 overflow-hidden pr-1">
                {room.chat.slice(-12).map((message) => <p key={message.id} className="text-xs leading-relaxed"><span className="font-black text-emerald-200">{message.displayName}: </span><span className="text-white/75">{message.body}</span></p>)}
              </div>
              <form onSubmit={submitChat} className="mt-3 flex gap-2">
                <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={280} placeholder="Talk trash responsibly…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none placeholder:text-white/30 focus:border-emerald-300/50" />
                <button type="submit" disabled={!chatDraft.trim()} className="rounded-lg bg-emerald-500 px-3 text-xs font-black text-emerald-950 disabled:opacity-40">Send</button>
              </form>
            </section>
          </aside>
        </div>

        {room.status === "paused" ? <div className="fixed inset-0 z-30 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"><div className="rounded-2xl border border-emerald-300/25 bg-[#10231c] p-8 text-center shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Time out</p><h2 className="mt-2 text-3xl font-black">Game paused</h2><p className="mt-2 text-sm text-white/60">The host will resume the chaos shortly.</p></div></div> : null}
        {state.phase === "finished" ? <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4 backdrop-blur-md"><div className="w-full max-w-md rounded-3xl border border-amber-300/25 bg-[#10231c] p-8 text-center shadow-2xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-300 text-3xl">{winner ? "🏆" : "💥"}</div><p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-amber-300">Round complete</p><h2 className="mt-2 text-3xl font-black">{winner ? `${winner.displayName} wins!` : "It's a draw!"}</h2><p className="mt-3 text-sm text-white/60">{winner ? "Everyone else has been blown away." : "Nobody made it out alive—or the top players tied."}</p><div className="mt-6 space-y-2 text-left">{[...state.players].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kills - a.kills).slice(0, 5).map((player, index) => <div key={player.userId} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"><span className="w-5 font-mono text-sm font-black text-white/40">{index + 1}</span><span className="h-3 w-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }} /><span className="flex-1 text-sm font-bold">{player.displayName}</span><span className="text-xs font-black text-amber-200">{player.kills} KO</span></div>)}</div><p className="mt-6 text-xs text-white/40">The host can end this room and start a fresh match from the dashboard.</p></div></div> : null}
      </div>
    </div>
  );
}
