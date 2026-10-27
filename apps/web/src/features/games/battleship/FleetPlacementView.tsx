"use client";

import { useEffect, useState } from "react";
import { Check, Dices, RotateCw, Trash2, Anchor, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ClientPlacedShip,
  FLEET_CONFIG,
  ShipConfig,
  computeShipCells,
  generateRandomFleet,
  isValidPlacement,
} from "./fleetUtils";
import { ShipSprite } from "./ShipSprites";

interface FleetPlacementViewProps {
  initialShips?: ClientPlacedShip[] | undefined;
  isLockedIn: boolean;
  enemyReady: boolean;
  onConfirmFleet: (ships: ClientPlacedShip[]) => void;
}

export function FleetPlacementView({
  initialShips,
  isLockedIn,
  enemyReady,
  onConfirmFleet,
}: FleetPlacementViewProps) {
  const [placedShips, setPlacedShips] = useState<ClientPlacedShip[]>(() => {
    if (initialShips && initialShips.length === 5) return initialShips;
    return generateRandomFleet();
  });

  const [activeShipConfig, setActiveShipConfig] = useState<ShipConfig | null>(null);
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  // Sync initial ships if provided
  useEffect(() => {
    if (initialShips && initialShips.length === 5 && !placedShips.length) {
      setPlacedShips(initialShips);
    }
  }, [initialShips, placedShips.length]);

  // Keyboard shortcut to rotate ship with 'R'
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "r" || event.key === "R") {
        setOrientation((prev) => (prev === "h" ? "v" : "h"));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unplacedConfigs = FLEET_CONFIG.filter(
    (config) => !placedShips.some((ship) => ship.id === config.id)
  );

  const letters = "ABCDEFGHIJ";

  function handleCellClick(x: number, y: number) {
    if (isLockedIn) return;

    // Check if clicked an existing placed ship -> pick it up
    const existingShip = placedShips.find((s) => s.cells.includes(`${x},${y}`));
    if (existingShip) {
      const config = FLEET_CONFIG.find((c) => c.id === existingShip.id);
      if (config) {
        setActiveShipConfig(config);
        setOrientation(existingShip.orientation);
        setPlacedShips((prev) => prev.filter((s) => s.id !== existingShip.id));
        return;
      }
    }

    // Otherwise place active ship if one is selected
    const shipToPlace = activeShipConfig ?? unplacedConfigs[0];
    if (!shipToPlace) return;

    if (isValidPlacement(x, y, shipToPlace.size, orientation, placedShips)) {
      const cells = computeShipCells(x, y, shipToPlace.size, orientation);
      const newShip: ClientPlacedShip = {
        id: shipToPlace.id,
        name: shipToPlace.name,
        size: shipToPlace.size,
        x,
        y,
        orientation,
        cells,
      };

      const nextPlaced = [...placedShips.filter((s) => s.id !== shipToPlace.id), newShip];
      setPlacedShips(nextPlaced);

      // Select next unplaced ship automatically
      const nextUnplaced = FLEET_CONFIG.filter(
        (config) => !nextPlaced.some((s) => s.id === config.id)
      );
      setActiveShipConfig(nextUnplaced[0] ?? null);
    }
  }

  function handleAutoDeploy() {
    if (isLockedIn) return;
    const randomFleet = generateRandomFleet();
    setPlacedShips(randomFleet);
    setActiveShipConfig(null);
  }

  function handleReset() {
    if (isLockedIn) return;
    setPlacedShips([]);
    setActiveShipConfig(FLEET_CONFIG[0] ?? null);
  }

  const allPlaced = placedShips.length === 5;

  // Active target ship config (explicitly selected or next unplaced)
  const currentTargetShip = activeShipConfig ?? (!allPlaced ? unplacedConfigs[0] : null);

  // Calculate hover preview cells
  const previewCells = hoverCell && currentTargetShip && !isLockedIn
    ? computeShipCells(hoverCell.x, hoverCell.y, currentTargetShip.size, orientation)
    : [];

  const isPreviewValid = hoverCell && currentTargetShip && !isLockedIn
    ? isValidPlacement(hoverCell.x, hoverCell.y, currentTargetShip.size, orientation, placedShips)
    : false;

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-2 overflow-hidden text-slate-100 select-none">
      {/* Top Header Bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-[#07172e]/90 px-3 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <Anchor className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-xs sm:text-sm font-black tracking-wide text-white">
              FLEET DEPLOYMENT PHASE
            </h2>
            <p className="text-[10px] sm:text-[11px] text-cyan-200/70">
              {isLockedIn
                ? "Fleet locked in! Awaiting enemy fleet readiness."
                : "Click grid to position warships. Press [R] to rotate."}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isLockedIn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/90 px-3 py-1 text-xs font-black text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="h-4 w-4" /> Ready for Battle
            </span>
          ) : (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-950/70 px-3 py-1 text-xs font-bold text-cyan-200">
              {placedShips.length}/5 Ships Placed
            </span>
          )}
        </div>
      </div>

      {/* Main Placement Arena: Ocean Grid on Left/Center, Controls Dock on Right */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-center justify-center gap-3 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">
        {/* Ocean Grid Frame */}
        <div className="flex h-full min-h-0 w-full items-center justify-center p-1">
          <div
            className="flex flex-col h-full max-h-[calc(100dvh-130px)] aspect-square w-auto max-w-[min(65vw,calc(100dvh-130px))]"
            onMouseLeave={() => setHoverCell(null)}
          >
            {/* Top Coordinate Letters (A-J) */}
            <div className="flex shrink-0 items-center pl-6 sm:pl-7 pr-1 pb-1">
              <div className="grid w-full grid-cols-10 gap-[2px]">
                {letters.split("").map((letter) => (
                  <div
                    key={letter}
                    className="flex items-center justify-center text-[10px] sm:text-xs font-black text-cyan-300/70"
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            {/* Ocean Body: Left 1-10 labels + Pure 10x10 Grid */}
            <div className="flex min-h-0 flex-1 items-stretch gap-1">
              {/* Row Numbers 1-10 */}
              <div className="grid w-5 sm:w-6 shrink-0 grid-rows-10 gap-[2px] py-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[10px] sm:text-xs font-black text-cyan-300/70"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* The 10x10 Pure Ocean Grid */}
              <div
                className="relative flex-1 aspect-square rounded-xl border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.15)] bg-[#05162b]"
                style={{
                  backgroundImage: "radial-gradient(ellipse at 50% 50%, #082850 0%, #031024 100%)",
                }}
              >
                {/* 100 interactive water cell tiles */}
                <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {Array.from({ length: 10 }, (_, row) =>
                    Array.from({ length: 10 }, (_, col) => {
                      const cellKey = `${col},${row}`;
                      const shipOnCell = placedShips.find((s) => s.cells.includes(cellKey));
                      const isPreview = previewCells.includes(cellKey);

                      let cellBg = "bg-[#0b274c]/55 hover:bg-[#11396e]/70 border border-cyan-400/10 hover:border-cyan-400/40";

                      if (isPreview) {
                        cellBg = isPreviewValid
                          ? "bg-emerald-500/40 border-2 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          : "bg-red-500/40 border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
                      } else if (shipOnCell) {
                        cellBg = "bg-cyan-950/30 border border-cyan-400/20";
                      }

                      return (
                        <button
                          key={cellKey}
                          type="button"
                          disabled={isLockedIn}
                          onClick={() => handleCellClick(col, row)}
                          onMouseEnter={() => setHoverCell({ x: col, y: row })}
                          className={`relative flex aspect-square items-center justify-center rounded-[2px] transition-colors ${cellBg}`}
                          title={shipOnCell ? `${shipOnCell.name} (Click to move)` : `${letters[col]}${row + 1}`}
                        />
                      );
                    })
                  )}
                </div>

                {/* Pixel-Perfect Ships Overlay (10x10 Grid aligned with cells) */}
                <div className="pointer-events-none absolute inset-0 grid h-full w-full grid-cols-10 grid-rows-10 gap-[2px] p-[2px]">
                  {placedShips.map((ship) => {
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
                        <ShipSprite id={ship.id} orientation={ship.orientation} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls Dock */}
        <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-[#061426]/90 p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-200">
              Ship Fleet Dock
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLockedIn}
              onClick={() => setOrientation((prev) => (prev === "h" ? "v" : "h"))}
              className="h-8 gap-1.5 border-cyan-400/30 text-xs text-cyan-100 hover:bg-cyan-500/20"
            >
              <RotateCw className="h-3.5 w-3.5" />
              {orientation === "h" ? "Horizontal [R]" : "Vertical [R]"}
            </Button>
          </div>

          {/* Ships List */}
          <div className="space-y-2">
            {FLEET_CONFIG.map((shipConfig) => {
              const isPlaced = placedShips.some((s) => s.id === shipConfig.id);
              const isSelected = activeShipConfig?.id === shipConfig.id;

              return (
                <button
                  key={shipConfig.id}
                  type="button"
                  disabled={isLockedIn}
                  onClick={() => {
                    if (isPlaced) {
                      // Pickup ship to move it
                      const existing = placedShips.find((s) => s.id === shipConfig.id);
                      if (existing) {
                        setOrientation(existing.orientation);
                        setPlacedShips((prev) => prev.filter((s) => s.id !== shipConfig.id));
                      }
                    }
                    setActiveShipConfig(shipConfig);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : isPlaced
                      ? "border-emerald-500/30 bg-emerald-950/20 text-slate-300"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{shipConfig.name}</p>
                    <p className="text-[10px] text-slate-400">Length: {shipConfig.size} cells</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Size Pip Blocks */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: shipConfig.size }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2.5 w-2 rounded-sm ${
                            isPlaced ? "bg-emerald-400" : isSelected ? "bg-cyan-400" : "bg-slate-600"
                          }`}
                        />
                      ))}
                    </div>
                    {isPlaced ? <Check className="h-4 w-4 text-emerald-400" /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Setup Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLockedIn}
              onClick={handleAutoDeploy}
              className="gap-1.5 border-cyan-400/30 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              <Dices className="h-3.5 w-3.5" /> Auto-Deploy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLockedIn || placedShips.length === 0}
              onClick={handleReset}
              className="gap-1.5 border-rose-400/30 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          {/* Confirm Button */}
          <div className="pt-2">
            {isLockedIn ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-200">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                Waiting for enemy fleet deployment...
              </div>
            ) : (
              <Button
                type="button"
                disabled={!allPlaced}
                onClick={() => onConfirmFleet(placedShips)}
                className="w-full h-11 font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-40"
              >
                <Anchor className="h-4 w-4 mr-1.5" /> Lock In Fleet
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
