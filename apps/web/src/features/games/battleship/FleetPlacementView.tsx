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
    if (!activeShipConfig) {
      // Pick first unplaced ship if available
      if (unplacedConfigs[0]) {
        setActiveShipConfig(unplacedConfigs[0]);
      }
      return;
    }

    if (isValidPlacement(x, y, activeShipConfig.size, orientation, placedShips)) {
      const cells = computeShipCells(x, y, activeShipConfig.size, orientation);
      const newShip: ClientPlacedShip = {
        id: activeShipConfig.id,
        name: activeShipConfig.name,
        size: activeShipConfig.size,
        x,
        y,
        orientation,
        cells,
      };

      const nextPlaced = [...placedShips.filter((s) => s.id !== activeShipConfig.id), newShip];
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

  // Calculate hover preview cells
  const previewCells = hoverCell && activeShipConfig
    ? computeShipCells(hoverCell.x, hoverCell.y, activeShipConfig.size, orientation)
    : [];

  const isPreviewValid = hoverCell && activeShipConfig
    ? isValidPlacement(hoverCell.x, hoverCell.y, activeShipConfig.size, orientation, placedShips)
    : false;

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-3 text-slate-100">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cyan-500/20 bg-[#07172e]/80 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Anchor className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-black tracking-wide text-white sm:text-base">
              FLEET DEPLOYMENT PHASE
            </h2>
            <p className="text-[11px] text-cyan-200/60">
              {isLockedIn
                ? "Fleet locked in! Awaiting enemy fleet readiness."
                : "Click or drag to place your 5 warships. Press [R] to rotate."}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isLockedIn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-950/80 px-3 py-1 text-xs font-black text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="h-4 w-4" /> Ready for Battle
            </span>
          ) : (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-200">
              {placedShips.length}/5 Ships Placed
            </span>
          )}
        </div>
      </div>

      {/* Main Placement Area */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-center justify-center gap-4 lg:grid-cols-[auto_320px]">
        {/* Ocean Grid Container */}
        <div className="flex min-h-0 items-center justify-center">
          <div
            className="relative aspect-square w-full max-w-[min(48vw,48vh)] overflow-hidden rounded-xl border-2 border-cyan-400/30 bg-[#061426] p-2 shadow-[0_0_35px_rgba(6,182,212,0.15)]"
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 50%, #0a254c 0%, #041022 100%)",
            }}
            onMouseLeave={() => setHoverCell(null)}
          >
            {/* Coordinates Grid */}
            <div
              className="grid h-full w-full gap-[2px]"
              style={{
                gridTemplateColumns: "1.2rem repeat(10, minmax(0, 1fr))",
                gridTemplateRows: "1.2rem repeat(10, minmax(0, 1fr))",
              }}
            >
              {/* Corner */}
              <div />

              {/* Top A-J Headers */}
              {letters.split("").map((letter) => (
                <div
                  key={letter}
                  className="flex items-center justify-center text-[10px] font-black text-cyan-200/60"
                >
                  {letter}
                </div>
              ))}

              {/* 100 Cells + 1-10 Row Labels */}
              {Array.from({ length: 10 }, (_, row) => (
                <div
                  key={`row-${row}`}
                  className="contents"
                >
                  {/* Row Number */}
                  <div className="flex items-center justify-center text-[10px] font-black text-cyan-200/60">
                    {row + 1}
                  </div>

                  {/* 10 Row Cells */}
                  {Array.from({ length: 10 }, (_, col) => {
                    const cellKey = `${col},${row}`;
                    const shipOnCell = placedShips.find((s) => s.cells.includes(cellKey));
                    const isPreview = previewCells.includes(cellKey);

                    let cellBg = "bg-[#0b2447]/60 border border-cyan-400/10 hover:border-cyan-300/40 hover:bg-[#103366]/70";

                    if (isPreview) {
                      cellBg = isPreviewValid
                        ? "bg-emerald-500/40 border-2 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : "bg-red-500/40 border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                    } else if (shipOnCell) {
                      cellBg = "bg-slate-700/80 border border-slate-400/40";
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
                      >
                        {/* Dot indicator for ship parts */}
                        {shipOnCell ? (
                          <div className="h-2 w-2 rounded-full bg-slate-300 shadow-[0_0_4px_white]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Render Placed Ships As Overlay Graphics */}
            <div className="pointer-events-none absolute inset-2">
              <div
                className="grid h-full w-full gap-[2px]"
                style={{
                  gridTemplateColumns: "1.2rem repeat(10, minmax(0, 1fr))",
                  gridTemplateRows: "1.2rem repeat(10, minmax(0, 1fr))",
                }}
              >
                {placedShips.map((ship) => {
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
                      <ShipSprite id={ship.id} orientation={ship.orientation} />
                    </div>
                  );
                })}
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
              className="h-8 gap-1 border-cyan-400/30 text-xs text-cyan-100 hover:bg-cyan-500/20"
            >
              <RotateCw className="h-3.5 w-3.5" />
              {orientation === "h" ? "Horizontal" : "Vertical"}
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
