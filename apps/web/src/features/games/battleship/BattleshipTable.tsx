"use client";

import { useEffect, useState } from "react";
import { Anchor, Crosshair, Shield, Users, AlertTriangle } from "lucide-react";
import type { BoardGameTableProps } from "../board-games/shared/types";
import { owns } from "../board-games/shared/ui-utils";
import { FLEET_CONFIG, ClientPlacedShip } from "./fleetUtils";
import { FleetPlacementView } from "./FleetPlacementView";
import { ShipSprite } from "./ShipSprites";
import { SunkShipModal, SunkShipEvent } from "./SunkShipModal";

export function BattleshipTable(props: BoardGameTableProps) {
  const { state, currentUserId, timer, onAction } = props;
  const isMyTurn = owns(state, currentUserId);
  const opponent = state.players.find((p) => p.userId !== currentUserId);

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

  // Peg Marker Component
  function PegMarker({ hit, sunk }: { hit: boolean; sunk?: boolean }) {
    if (hit) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute h-6 w-6 rounded-full border border-red-400 opacity-60 animate-ping" />
          <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-[0_0_12px_#ef4444]">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border border-white/60 bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.6)]">
        <span className="text-[9px] font-black text-white">✕</span>
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

  // BATTLE PHASE
  const myTotalHitsReceived = incoming.filter((s) => s.hit).length;
  const myCellsRemaining = Math.max(0, 17 - myTotalHitsReceived);
  const enemyTotalHitsLanded = outgoing.filter((s) => s.hit).length;
  const enemyCellsRemaining = Math.max(0, 17 - enemyTotalHitsLanded);

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-2 overflow-hidden text-slate-100 select-none">
      {/* Sunk Ship Announcement Modal */}
      <SunkShipModal
        event={sunkEvent}
        currentUserId={currentUserId}
        onDismiss={() => setSunkEvent(null)}
      />

      {/* TOP TACTICAL COMMAND BAR */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-[#07172e]/90 px-3 py-2 shadow-md">
        {/* Friendly Fleet Health Icons */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Defense Fleet</p>
            <p className="text-[9px] text-slate-400">{myCellsRemaining}/17 Cells Intact</p>
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            {FLEET_CONFIG.map((ship) => {
              const status = state.myFleetStatus?.find((s) => s.name.toLowerCase() === ship.id);
              const isSunk = status?.sunk;
              return (
                <div
                  key={ship.id}
                  title={`${ship.name}: ${isSunk ? "Sunk" : "Active"}`}
                  className={`flex flex-col items-center rounded border px-1.5 py-0.5 ${
                    isSunk
                      ? "border-red-500/40 bg-red-950/40 opacity-40 line-through"
                      : "border-cyan-400/25 bg-cyan-950/40"
                  }`}
                >
                  <span className="text-[8px] font-bold text-slate-300">{ship.name.slice(0, 4)}</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: ship.size }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1 rounded-xs ${
                          isSunk
                            ? "bg-red-500"
                            : (status?.hits ?? 0) > i
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turn Status & Countdown Center Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black tracking-wide ${
              isMyTurn
                ? "border-emerald-400/50 bg-emerald-950/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                : "border-amber-400/30 bg-amber-950/60 text-amber-200"
            }`}
          >
            <Crosshair className="h-4 w-4" />
            {isMyTurn ? "YOUR TURN: TARGET ENEMY WATERS" : `ENEMY'S TURN: BRACING FOR IMPACT`}
          </div>

          {timer?.remainingMs !== null && timer?.remainingMs !== undefined ? (
            <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
              ⏱️ {Math.max(0, Math.ceil(timer.remainingMs / 1000))}s
            </span>
          ) : null}
        </div>

        {/* Enemy Fleet Intel Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {FLEET_CONFIG.map((ship) => {
              const status = state.enemyFleetStatus?.find((s) => s.name.toLowerCase() === ship.id);
              const isSunk = status?.sunk;
              return (
                <div
                  key={ship.id}
                  title={`Enemy ${ship.name}: ${isSunk ? "SUNK" : "Unknown coordinates"}`}
                  className={`flex flex-col items-center rounded border px-1.5 py-0.5 ${
                    isSunk
                      ? "border-red-500/60 bg-red-950/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                      : "border-white/10 bg-black/30"
                  }`}
                >
                  <span className={`text-[8px] font-bold ${isSunk ? "text-red-400 line-through" : "text-slate-400"}`}>
                    {ship.name.slice(0, 4)}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: ship.size }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1 rounded-xs ${isSunk ? "bg-red-500" : "bg-slate-600"}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-300">Enemy Fleet</p>
            <p className="text-[9px] text-slate-400">{enemyCellsRemaining}/17 Remaining</p>
          </div>
        </div>
      </div>

      {/* DUAL SCREEN OCEAN GRIDS: LEFT (MY FLEET) & RIGHT (TARGET RADAR) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-center justify-center gap-3 sm:grid-cols-2 lg:gap-6">
        {/* LEFT: DEFENSE WATERS (MY FLEET) */}
        <section className="flex flex-col items-center justify-center min-h-0">
          <div className="mb-1 flex w-full max-w-[min(42vw,44vh)] items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-cyan-200">
              <Shield className="h-3.5 w-3.5 text-cyan-400" /> Defense Waters (Your Fleet)
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {incoming.length} shots received · {myTotalHitsReceived} hits
            </span>
          </div>

          <div
            className="relative aspect-square w-full max-w-[min(42vw,44vh)] overflow-hidden rounded-xl border-2 border-cyan-500/30 bg-[#061426] p-1.5 shadow-[0_0_30px_rgba(6,182,212,0.12)]"
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 50%, #0a254c 0%, #041022 100%)",
            }}
          >
            {/* Grid Cells */}
            <div
              className="grid h-full w-full gap-[2px]"
              style={{
                gridTemplateColumns: "1.1rem repeat(10, minmax(0, 1fr))",
                gridTemplateRows: "1.1rem repeat(10, minmax(0, 1fr))",
              }}
            >
              {/* Corner */}
              <div />
              {letters.split("").map((letter) => (
                <div key={letter} className="flex items-center justify-center text-[9px] font-black text-cyan-200/60">
                  {letter}
                </div>
              ))}

              {Array.from({ length: 10 }, (_, row) => (
                <div key={`def-row-${row}`} className="contents">
                  <div className="flex items-center justify-center text-[9px] font-black text-cyan-200/60">
                    {row + 1}
                  </div>
                  {Array.from({ length: 10 }, (_, col) => {
                    const key = `${col},${row}`;
                    const shot = incomingAt(col, row);
                    const isShip = ownFleetCells.has(key);

                    return (
                      <div
                        key={`def-${key}`}
                        className={`relative flex aspect-square items-center justify-center rounded-[2px] border ${
                          shot
                            ? shot.hit
                              ? "border-red-500/40 bg-red-950/50"
                              : "border-sky-300/20 bg-[#081e3d]"
                            : isShip
                            ? "border-slate-500/30 bg-slate-800/60"
                            : "border-cyan-400/10 bg-[#0b2447]/60"
                        }`}
                      >
                        {shot ? <PegMarker hit={shot.hit} sunk={shot.sunk} /> : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Overlay My Ships Graphics */}
            <div className="pointer-events-none absolute inset-1.5">
              <div
                className="grid h-full w-full gap-[2px]"
                style={{
                  gridTemplateColumns: "1.1rem repeat(10, minmax(0, 1fr))",
                  gridTemplateRows: "1.1rem repeat(10, minmax(0, 1fr))",
                }}
              >
                {state.ownShips?.map((ship) => {
                  const colSpan = ship.orientation === "h" ? ship.size : 1;
                  const rowSpan = ship.orientation === "v" ? ship.size : 1;
                  return (
                    <div
                      key={ship.id}
                      className="relative p-0.5"
                      style={{
                        gridColumn: `${ship.x + 2} / span ${colSpan}`,
                        gridRow: `${ship.y + 2} / span ${rowSpan}`,
                      }}
                    >
                      <ShipSprite id={ship.id} orientation={ship.orientation} sunk={ship.sunk} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: ATTACK RADAR (ENEMY WATERS) */}
        <section className="flex flex-col items-center justify-center min-h-0">
          <div className="mb-1 flex w-full max-w-[min(42vw,44vh)] items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300">
              <Crosshair className="h-3.5 w-3.5 text-emerald-400" /> Attack Radar ({opponent?.displayName ?? "Enemy"})
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {hoverTarget ? `Target: [${letters[hoverTarget.x]}${hoverTarget.y + 1}]` : "Select coordinate to fire"}
            </span>
          </div>

          <div
            className={`relative aspect-square w-full max-w-[min(42vw,44vh)] overflow-hidden rounded-xl border-2 p-1.5 transition-all shadow-[0_0_30px_rgba(16,185,129,0.12)] ${
              isMyTurn
                ? "border-emerald-400/50 bg-[#041624] shadow-[0_0_35px_rgba(52,211,153,0.2)]"
                : "border-slate-700/40 bg-[#06121d]"
            }`}
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 50%, #07283c 0%, #030e17 100%)",
            }}
            onMouseLeave={() => setHoverTarget(null)}
          >
            {/* Grid Cells */}
            <div
              className="grid h-full w-full gap-[2px]"
              style={{
                gridTemplateColumns: "1.1rem repeat(10, minmax(0, 1fr))",
                gridTemplateRows: "1.1rem repeat(10, minmax(0, 1fr))",
              }}
            >
              <div />
              {letters.split("").map((letter) => (
                <div key={letter} className="flex items-center justify-center text-[9px] font-black text-emerald-200/60">
                  {letter}
                </div>
              ))}

              {Array.from({ length: 10 }, (_, row) => (
                <div key={`atk-row-${row}`} className="contents">
                  <div className="flex items-center justify-center text-[9px] font-black text-emerald-200/60">
                    {row + 1}
                  </div>
                  {Array.from({ length: 10 }, (_, col) => {
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
                            ? "border-emerald-400/15 bg-[#062438]/70 hover:border-emerald-300 hover:bg-emerald-500/20 cursor-crosshair"
                            : "border-slate-800 bg-[#061824]/50 cursor-default"
                        }`}
                        title={`${letters[col]}${row + 1}${shot ? (shot.hit ? " (HIT)" : " (MISS)") : ""}`}
                      >
                        {shot ? <PegMarker hit={shot.hit} sunk={shot.sunk} /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Overlay Sunk Enemy Ships (Silhouette Revealed!) */}
            <div className="pointer-events-none absolute inset-1.5">
              <div
                className="grid h-full w-full gap-[2px]"
                style={{
                  gridTemplateColumns: "1.1rem repeat(10, minmax(0, 1fr))",
                  gridTemplateRows: "1.1rem repeat(10, minmax(0, 1fr))",
                }}
              >
                {state.enemySunkShips?.map((ship) => {
                  const colSpan = ship.orientation === "h" ? ship.size : 1;
                  const rowSpan = ship.orientation === "v" ? ship.size : 1;
                  return (
                    <div
                      key={`sunk-${ship.id}`}
                      className="relative p-0.5 opacity-60"
                      style={{
                        gridColumn: `${ship.x + 2} / span ${colSpan}`,
                        gridRow: `${ship.y + 2} / span ${rowSpan}`,
                      }}
                    >
                      <ShipSprite id={ship.id} orientation={ship.orientation} sunk silhouetteOnly />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM RADAR LEGEND BAR */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
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
        </div>

        <div className="text-[10px] text-cyan-200/70">
          Tabletop Arena · Authoritative Naval Warfare
        </div>
      </div>
    </div>
  );
}
