"use client";

import { useEffect, useState } from "react";
import { Crosshair, Skull, X } from "lucide-react";
import { ShipSprite } from "./ShipSprites";

export interface SunkShipEvent {
  shooterId: string;
  ownerId: string;
  name: string;
  size: number;
}

interface SunkShipModalProps {
  event: SunkShipEvent | null;
  currentUserId: string;
  onDismiss: () => void;
}

export function SunkShipModal({ event, currentUserId, onDismiss }: SunkShipModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [event, onDismiss]);

  if (!event || !visible) return null;

  const isEnemySunk = event.shooterId === currentUserId;
  const shipId = event.name.toLowerCase();

  return (
    <div
      onClick={() => {
        setVisible(false);
        onDismiss();
      }}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border-2 p-6 shadow-2xl transition-all duration-300 ${
          isEnemySunk
            ? "border-emerald-400/60 bg-[#061e1b] shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            : "border-red-500/60 bg-[#1e0a0a] shadow-[0_0_50px_rgba(239,68,68,0.3)]"
        }`}
      >
        {/* Close icon */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Ambient Top Glow */}
        <div
          className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl opacity-40 ${
            isEnemySunk ? "bg-emerald-400" : "bg-red-500"
          }`}
        />

        {/* Icon & Title */}
        <div className="relative flex flex-col items-center text-center">
          <div
            className={`grid h-16 w-16 place-items-center rounded-2xl border ${
              isEnemySunk
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                : "border-red-500/40 bg-red-500/20 text-red-300"
            }`}
          >
            {isEnemySunk ? <Crosshair className="h-8 w-8 animate-pulse" /> : <Skull className="h-8 w-8 animate-bounce" />}
          </div>

          <h3
            className={`mt-4 text-2xl font-black uppercase tracking-wider ${
              isEnemySunk ? "text-emerald-300" : "text-red-400"
            }`}
          >
            {isEnemySunk ? "TARGET SUNK!" : "VESSEL LOST!"}
          </h3>

          <p className="mt-1 text-sm text-slate-300">
            {isEnemySunk
              ? `You sent the enemy ${event.name} to the bottom of the sea!`
              : `Your ${event.name} took critical damage and went down!`}
          </p>

          {/* Ship Silhouette Graphic */}
          <div className="mt-5 flex h-20 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="relative h-12 w-48">
              <ShipSprite id={shipId} sunk />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded bg-black/80 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-red-400 border border-red-500/40">
                  DESTROYED
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-500">
            Click anywhere to continue
          </p>
        </div>
      </div>
    </div>
  );
}

