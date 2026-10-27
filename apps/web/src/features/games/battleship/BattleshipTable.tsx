"use client";

import { useEffect, useState } from "react";
import { Crosshair, Shield, Zap, Clock } from "lucide-react";
import type { BoardGameTableProps } from "../board-games/shared/types";
import { owns } from "../board-games/shared/ui-utils";
import { FLEET_CONFIG, ClientPlacedShip } from "./fleetUtils";
import { FleetPlacementView } from "./FleetPlacementView";
import { ShipSprite } from "./ShipSprites";
import { SunkShipModal, SunkShipEvent } from "./SunkShipModal";

export function BattleshipTable(props: BoardGameTableProps) {
  const { room, state, currentUserId, timer, onAction } = props;
  const isMyTurn = owns(state, currentUserId);
  const opponent = state.players.find((p) => p.userId !== currentUserId);
  const opponentId = opponent?.userId ?? "";

  const incoming = state.shots.filter((shot) => shot.targetId === currentUserId);
  const outgoing = state.shots.filter((shot) => shot.shooterId === currentUserId);

  const ownFleetCells = new Set(state.ownShipCells);
  const incomingAt = (x: number, y: number) => incoming.find((s) => s.x === x && s.y === y);
  const outgoingAt = (x: number, y: number) => outgoing.find((s) => s.x === x && s.y === y);

  const letters = "ABCDEFGHIJ";

  // Target radar hover coordinate
  const [hoverTarget, setHoverTarget] = useState<{ x: number; y: number } | null>(null);

  // Sunk ship announcement pop-up
  const [sunkEvent, setSunkEvent] = useState<SunkShipEvent | null>(null);

  useEffect(() => {
    if (state.lastSunkShip) {
      setSunkEvent({
        shooterId: state.lastSunkShip.shooterId,
        ownerId: state.lastSunkShip.ownerId,
        name: state.lastSunkShip.name,
        size: state.lastSunkShip.size,
      });
    }
  }, [state.lastSunkShip]);

  // Is placement phase active?
  const isPlacement = state.battleshipPhase === "placement";
  const isLockedIn = Boolean(state.battleshipReady?.[currentUserId]);
  const enemyReady = Boolean(opponent && state.battleshipReady?.[opponent.userId]);

  function handleConfirmFleet(ships: ClientPlacedShip[]) {
    onAction("place_fleet", { ships });
  }

  function handleFire(x: number, y: number) {
    if (!isMyTurn || isPlacement || outgoingAt(x, y)) return;
    onAction("fire", { x, y });
  }

  // Chess clock calculations
  const clockSeconds = Number(room.settings?.clockSeconds ?? 300);
  const clockEnabled = clockSeconds > 0;
  const myRemainingMs = timer != null && timer.currentPlayerId === currentUserId && timer.remainingMs !== null
    ? timer.remainingMs
    : state.clockRemainingMsByPlayer?.[currentUserId] ?? clockSeconds * 1000;
  const enemyRemainingMs = timer != null && timer.currentPlayerId === opponentId && timer.remainingMs !== null
    ? timer.remainingMs
    : state.clockRemainingMsByPlayer?.[opponentId] ?? clockSeconds * 1000;

  function formatClock(ms: number) {
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Last shot bonus turn indicator
  const lastShot = state.shots[state.shots.length - 1];
  const lastShotWasMyHit = lastShot && lastShot.shooterId === currentUserId && lastShot.hit;
  const lastShotWasEnemyHit = lastShot && lastShot.shooterId === opponentId && lastShot.hit;

  // Peg Marker Component matching user reference
  function PegMarker({ hit }: { hit: boolean; sunk?: boolean }) {
    if (hit) {
      return (
        <div className="relative z-20 flex items-center justify-center">
          <span className="absolute h-4 w-4 sm:h-5 sm:w-5 rounded-full border border-red-400 opacity-60 animate-ping" />
          <div className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-[0_0_10px_#ef4444]">
            <div className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative z-20 flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full border border-white/60 bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.6)]">
        <span className="text-[8px] sm:text-[9px] font-black leading-none text-white">✕</span>
      </div>
    );
  }

  // Enhanced Tactical Fleet Intel Card with Silhouettes and Block Counters
  function FleetIntelCard({
    ship,
    status,
    isEnemy,
  }: {
    ship: { id: string; name: string; size: number };
    status?: { sunk?: boolean | undefined; hits?: number | undefined } | undefined;
    isEnemy?: boolean | undefined;
  }) {
    const isSunk = Boolean(status?.sunk);
    const hits = status?.hits ?? 0;
    const remainingCount = isSunk ? 0 : 1;

    return (
      <div
        className={`relative flex flex-col items-center justify-between rounded-xl border px-2 py-1.5 transition-all shadow-md ${
          isSunk
            ? "border-red-500/40 bg-red-950/20 opacity-40 grayscale"
            : isEnemy
            ? "border-emerald-500/30 bg-[#041624]/85 hover:border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
            : "border-cyan-500/30 bg-[#06182c]/85 hover:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.06)]"
        }`}
      >
        {/* Name and Length Header */}
        <div className="flex w-full items-center justify-between gap-1 text-[10px] font-black uppercase tracking-wider">
          <span className={isSunk ? "text-red-400 line-through" : isEnemy ? "text-emerald-300" : "text-cyan-200"}>
            {ship.name}
          </span>
          <span className="rounded bg-black/40 px-1 py-0.2 text-[9px] font-mono text-slate-400">
            {ship.size}
          </span>
        </div>

        {/* Sleek Warship Silhouette */}
        <div className="my-1 flex h-4 w-14 sm:w-16 items-center justify-center">
          <ShipSprite
            id={ship.id}
            orientation="h"
            sunk={isSunk}
            silhouetteOnly={isEnemy && !isSunk}
            className="max-h-4 w-full object-contain"
          />
        </div>

        {/* Tactical Block Counter Matrix */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: ship.size }).map((_, i) => {
            const isBlockHit = hits > i;
            let blockBg = isEnemy
              ? isSunk
                ? "bg-red-500 shadow-[0_0_4px_#ef4444]"
                : "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]"
              : isSunk
              ? "bg-red-500 shadow-[0_0_4px_#ef4444]"
              : isBlockHit
              ? "bg-amber-400 shadow-[0_0_4px_#f59e0b]"
              : "bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.8)]";

            return (
              <div
                key={i}
                className={`h-2.5 w-2 sm:h-3 sm:w-2.5 rounded-[1px] border border-black/30 transition-all ${blockBg}`}
              />
            );
          })}
        </div>

        {/* Count remaining badge (matching reference image) */}
        <div className="mt-1 flex items-center justify-center text-[10px] font-mono font-black">
          <span className={isSunk ? "text-red-400" : "text-slate-300"}>
            {remainingCount}
          </span>
        </div>
      </div>
    );
  }

  // If in placement phase, render Placement View
  if (isPlacement) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <FleetPlacementView
          initialShips={state.ownShips?.map((s) => ({
            id: s.id,
            name: s.name,
            size: s.size,
            x: s.x,
            y: s.y,
            orientation: s.orientation,
            cells: s.cells,
          }))}
          isLockedIn={isLockedIn}
          enemyReady={enemyReady}
          onConfirmFleet={handleConfirmFleet}
        />
      </div>
    );
  }

  // BATTLE PHASE STATS
  const myTotalHitsReceived = incoming.filter((s) => s.hit).length;
  const myCellsRemaining = Math.max(0, 17 - myTotalHitsReceived);
  const enemyTotalHitsLanded = outgoing.filter((s) => s.hit).length;
  const enemyCellsRemaining = Math.max(0, 17 - enemyTotalHitsLanded);

  const myCritical = clockEnabled && myRemainingMs <= 15000;
  const enemyCritical = clockEnabled && enemyRemainingMs <= 15000;

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-2 overflow-hidden text-slate-100 select-none">
      {/* Sunk Ship Announcement Modal */}
      <SunkShipModal
        event={sunkEvent}
        currentUserId={currentUserId}
        onDismiss={() => setSunkEvent(null)}
      />

      {/* TOP TACTICAL COMMAND DECK: Friendly Fleet Intel | Dual Chess Clock | Enemy Fleet Intel */}
      <div className="grid shrink-0 grid-cols-1 gap-2 rounded-xl border border-cyan-500/20 bg-[#07172e]/90 p-2 shadow-md lg:grid-cols-[1fr_auto_1fr] items-center">
        {/* Friendly Fleet Intel */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-300">
              <Shield className="h-3.5 w-3.5 text-cyan-400" /> Defense Fleet
            </span>
            <span className="text-[10px] font-mono text-cyan-200/70">
              {myCellsRemaining}/17 Cells Intact
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {FLEET_CONFIG.map((ship) => {
              const status = state.myFleetStatus?.find((s) => s.name.toLowerCase() === ship.id);
              return <FleetIntelCard key={ship.id} ship={ship} status={status} />;
            })}
          </div>
        </div>

        {/* Central Dual Naval Chess Clock */}
        <div className="flex flex-col items-center justify-center gap-1 px-3 py-1">
          {clockEnabled ? (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-[#051424] px-3 py-1.5 shadow-xl">
              {/* Your Clock */}
              <div
                className={`flex flex-col items-center rounded-lg px-2.5 py-1 transition-all ${
                  isMyTurn
                    ? myCritical
                      ? "border border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                      : "border border-emerald-400/60 bg-emerald-950/70 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.3)] ring-1 ring-emerald-400/40"
                    : "bg-black/30 text-slate-400"
                }`}
              >
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-300">You</span>
                <span className="font-mono text-base sm:text-lg font-black tracking-wider tabular-nums">
                  {formatClock(myRemainingMs)}
                </span>
              </div>

              {/* Central Divider / Active Icon */}
              <div className="flex flex-col items-center px-1">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[7px] font-black uppercase text-cyan-300/60">VS</span>
              </div>

              {/* Enemy Clock */}
              <div
                className={`flex flex-col items-center rounded-lg px-2.5 py-1 transition-all ${
                  !isMyTurn
                    ? enemyCritical
                      ? "border border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                      : "border border-amber-400/60 bg-amber-950/70 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/40"
                    : "bg-black/30 text-slate-400"
                }`}
              >
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-300 truncate max-w-[55px]">
                  {opponent?.displayName ?? "Enemy"}
                </span>
                <span className="font-mono text-base sm:text-lg font-black tracking-wider tabular-nums">
                  {formatClock(enemyRemainingMs)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-slate-400">
              <Clock className="h-3 w-3 text-cyan-400" /> Casual (No Timer)
            </div>
          )}

          {/* Turn Notification Banner (+1 Bonus Turn Rule) */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-black tracking-wide ${
              isMyTurn
                ? lastShotWasMyHit
                  ? "border-emerald-300 bg-emerald-500/25 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.5)] animate-pulse"
                  : "border-emerald-400/50 bg-emerald-950/80 text-emerald-300"
                : lastShotWasEnemyHit
                ? "border-red-400/40 bg-red-950/60 text-red-300"
                : "border-amber-400/30 bg-amber-950/60 text-amber-200"
            }`}
          >
            {lastShotWasMyHit && isMyTurn ? (
              <>
                <Zap className="h-3 w-3 text-emerald-300" /> DIRECT HIT! BONUS SHOT AWARDED!
              </>
            ) : isMyTurn ? (
              <>
                <Crosshair className="h-3 w-3 text-emerald-400" /> YOUR TURN: TARGET ENEMY WATERS
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 text-amber-400" /> ENEMY COMMANDER AIMING...
              </>
            )}
          </div>
        </div>

        {/* Enemy Fleet Intel */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-rose-300">
              <Crosshair className="h-3.5 w-3.5 text-rose-400" /> Enemy Fleet Intel
            </span>
            <span className="text-[10px] font-mono text-rose-200/70">
              {enemyCellsRemaining}/17 Cells Left
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {FLEET_CONFIG.map((ship) => {
              const status = state.enemyFleetStatus?.find((s) => s.name.toLowerCase() === ship.id);
              return <FleetIntelCard key={ship.id} ship={ship} status={status} isEnemy />;
            })}
          </div>
        </div>
      </div>

      {/* DUAL SCREEN OCEAN GRIDS: LEFT (MY FLEET) & RIGHT (TARGET RADAR) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-center justify-center gap-2 sm:grid-cols-2 lg:gap-4 xl:gap-6">
        {/* LEFT: DEFENSE WATERS (MY FLEET) */}
        <section className="flex flex-col items-center justify-center min-h-0 h-full w-full">
          <div className="flex flex-col h-full max-h-[calc(100dvh-175px)] aspect-square w-auto max-w-[min(48vw,calc(100dvh-175px))]">
            {/* Header with Title and Stats */}
            <div className="mb-0.5 flex shrink-0 items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-cyan-200">
                <Shield className="h-3.5 w-3.5 text-cyan-400" /> Defense Waters (Your Fleet)
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {incoming.length} incoming · {myTotalHitsReceived} hits
              </span>
            </div>

            {/* Coordinates letters A-J */}
            <div className="flex shrink-0 items-center pl-5 sm:pl-6 pr-1 pb-0.5">
              <div className="grid w-full grid-cols-10 gap-[2px]">
                {letters.split("").map((letter) => (
                  <div key={letter} className="flex items-center justify-center text-[10px] sm:text-xs font-black text-cyan-300/70">
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            {/* Ocean Body: 1-10 on left, 10x10 Ocean Grid on right */}
            <div className="flex min-h-0 flex-1 items-stretch gap-1">
              <div className="grid w-5 sm:w-6 shrink-0 grid-rows-10 gap-[2px] py-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex items-center justify-center text-[10px] sm:text-xs font-black text-cyan-300/70">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Pure 10x10 Ocean Grid */}
              <div
                className="relative flex-1 aspect-square rounded-xl border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-[#05162b]"
                style={{
                  backgroundImage: "radial-gradient(ellipse at 50% 50%, #082850 0%, #031024 100%)",
                }}
              >
                {/* 100 Cell Tiles */}
                <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {Array.from({ length: 10 }, (_, row) =>
                    Array.from({ length: 10 }, (_, col) => {
                      const key = `${col},${row}`;
                      const shot = incomingAt(col, row);
                      const isShip = ownFleetCells.has(key);

                      return (
                        <div
                          key={`def-${key}`}
                          className={`relative flex aspect-square items-center justify-center rounded-[2px] border ${
                            shot
                              ? shot.hit
                                ? "border-red-500/50 bg-red-950/60"
                                : "border-sky-300/25 bg-[#081e3d]"
                              : isShip
                              ? "border-cyan-400/20 bg-cyan-950/30"
                              : "border-cyan-400/10 bg-[#0b274c]/55"
                          }`}
                        >
                          {shot ? <PegMarker hit={shot.hit} sunk={shot.sunk} /> : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pixel-Perfect Overlay of My Ships */}
                <div className="pointer-events-none absolute inset-0 grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {state.ownShips?.map((ship) => {
                    const colSpan = ship.orientation === "h" ? ship.size : 1;
                    const rowSpan = ship.orientation === "v" ? ship.size : 1;
                    return (
                      <div
                        key={ship.id}
                        className="relative z-10 flex h-full w-full items-center justify-center p-0.5"
                        style={{
                          gridColumn: `${ship.x + 1} / span ${colSpan}`,
                          gridRow: `${ship.y + 1} / span ${rowSpan}`,
                        }}
                      >
                        <ShipSprite id={ship.id} orientation={ship.orientation} sunk={ship.sunk} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: ATTACK RADAR (ENEMY WATERS) */}
        <section className="flex flex-col items-center justify-center min-h-0 h-full w-full">
          <div
            className="flex flex-col h-full max-h-[calc(100dvh-175px)] aspect-square w-auto max-w-[min(48vw,calc(100dvh-175px))]"
            onMouseLeave={() => setHoverTarget(null)}
          >
            {/* Header with Title and Hover Coordinates */}
            <div className="mb-0.5 flex shrink-0 items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-300">
                <Crosshair className="h-3.5 w-3.5 text-emerald-400" /> Attack Radar ({opponent?.displayName ?? "Enemy"})
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {hoverTarget ? `Target: [${letters[hoverTarget.x]}${hoverTarget.y + 1}]` : "Click coordinate to fire"}
              </span>
            </div>

            {/* Coordinates letters A-J */}
            <div className="flex shrink-0 items-center pl-5 sm:pl-6 pr-1 pb-0.5">
              <div className="grid w-full grid-cols-10 gap-[2px]">
                {letters.split("").map((letter) => (
                  <div key={letter} className="flex items-center justify-center text-[10px] sm:text-xs font-black text-emerald-300/70">
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            {/* Ocean Body: 1-10 on left, 10x10 Attack Ocean Grid on right */}
            <div className="flex min-h-0 flex-1 items-stretch gap-1">
              <div className="grid w-5 sm:w-6 shrink-0 grid-rows-10 gap-[2px] py-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex items-center justify-center text-[10px] sm:text-xs font-black text-emerald-300/70">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Pure 10x10 Attack Ocean Grid */}
              <div
                className={`relative flex-1 aspect-square rounded-xl border-2 overflow-hidden transition-all shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-[#041624] ${
                  isMyTurn ? "border-emerald-400/60 shadow-[0_0_35px_rgba(52,211,153,0.25)]" : "border-slate-700/40"
                }`}
                style={{
                  backgroundImage: "radial-gradient(ellipse at 50% 50%, #06263b 0%, #020c15 100%)",
                }}
              >
                {/* 100 Interactive Attack Cell Tiles */}
                <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {Array.from({ length: 10 }, (_, row) =>
                    Array.from({ length: 10 }, (_, col) => {
                      const key = `${col},${row}`;
                      const shot = outgoingAt(col, row);
                      const canFire = isMyTurn && !shot;

                      return (
                        <button
                          key={`atk-${key}`}
                          type="button"
                          disabled={!canFire}
                          onClick={() => handleFire(col, row)}
                          onMouseEnter={() => setHoverTarget({ x: col, y: row })}
                          className={`relative flex aspect-square items-center justify-center rounded-[2px] border transition-colors ${
                            shot
                              ? shot.hit
                                ? "border-red-500/60 bg-red-950/60"
                                : "border-sky-300/20 bg-[#081e3d]"
                              : canFire
                              ? "border-emerald-400/20 bg-[#062438]/70 hover:border-emerald-300 hover:bg-emerald-500/25 cursor-crosshair"
                              : "border-slate-800 bg-[#061824]/50 cursor-default"
                          }`}
                          title={`${letters[col]}${row + 1}${shot ? (shot.hit ? " (HIT)" : " (MISS)") : ""}`}
                        >
                          {shot ? <PegMarker hit={shot.hit} sunk={shot.sunk} /> : null}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Pixel-Perfect Overlay of Sunk Enemy Ships (Silhouette Revealed!) */}
                <div className="pointer-events-none absolute inset-0 grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {state.enemySunkShips?.map((ship) => {
                    const colSpan = ship.orientation === "h" ? ship.size : 1;
                    const rowSpan = ship.orientation === "v" ? ship.size : 1;
                    return (
                      <div
                        key={`sunk-${ship.id}`}
                        className="relative z-10 flex h-full w-full items-center justify-center p-0.5 opacity-60"
                        style={{
                          gridColumn: `${ship.x + 1} / span ${colSpan}`,
                          gridRow: `${ship.y + 1} / span ${rowSpan}`,
                        }}
                      >
                        <ShipSprite id={ship.id} orientation={ship.orientation} sunk silhouetteOnly />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM RADAR LEGEND BAR */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-white bg-red-600 shadow-[0_0_6px_#ef4444]" />
            <span>Hit Peg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-white/60 bg-white/40 flex items-center justify-center text-[7px] text-white">✕</div>
            <span>Miss Peg</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-xs bg-slate-600 opacity-60" />
            <span>Sunk Ship Silhouette</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-emerald-400">
            <Zap className="h-3 w-3" />
            <span>Direct Hit = Extra Turn!</span>
          </div>
        </div>

        <div className="text-[10px] text-cyan-200/70">
          Tabletop Arena · Authoritative Naval Warfare
        </div>
      </div>
    </div>
  );
}
