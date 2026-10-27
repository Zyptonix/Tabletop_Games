"use client";

import React from "react";

interface ShipSpriteProps {
  id: string; // "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer"
  orientation?: "h" | "v";
  sunk?: boolean;
  className?: string;
  silhouetteOnly?: boolean;
}

export function ShipSprite({
  id,
  orientation = "h",
  sunk = false,
  className = "",
  silhouetteOnly = false,
}: ShipSpriteProps) {
  const isVert = orientation === "v";

  // Base colors
  const hullColor = silhouetteOnly
    ? "#0f172a"
    : sunk
    ? "#334155"
    : "#94a3b8";

  const deckColor = silhouetteOnly
    ? "#090d16"
    : sunk
    ? "#1e293b"
    : "#cbd5e1";

  const detailColor = silhouetteOnly
    ? "#1e293b"
    : sunk
    ? "#475569"
    : "#64748b";

  const accentColor = silhouetteOnly
    ? "transparent"
    : sunk
    ? "#ef4444"
    : "#38bdf8";

  // Render specific ship designs
  switch (id) {
    case "carrier": // Size 5
      return (
        <svg
          viewBox="0 0 500 100"
          className={`h-full w-full select-none drop-shadow-md ${isVert ? "rotate-90 origin-top-left" : ""} ${className}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="carrierHull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={hullColor} />
              <stop offset="50%" stop-color={deckColor} />
              <stop offset="100%" stop-color={hullColor} />
            </linearGradient>
          </defs>
          {/* Main Angled Flight Deck */}
          <polygon
            points="15,20 470,12 492,30 488,70 460,88 15,80 5,50"
            fill="url(#carrierHull)"
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Landing Runway Lines */}
          <line x1="30" y1="50" x2="440" y2="50" stroke={detailColor} strokeWidth="3" strokeDasharray="14,10" />
          <line x1="120" y1="28" x2="420" y2="65" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="8,6" opacity="0.6" />
          {/* Arrestor Wires */}
          <line x1="50" y1="30" x2="50" y2="70" stroke={detailColor} strokeWidth="2" />
          <line x1="70" y1="30" x2="70" y2="70" stroke={detailColor} strokeWidth="2" />
          <line x1="90" y1="30" x2="90" y2="70" stroke={detailColor} strokeWidth="2" />
          {/* Island / Conning Tower (Starboard side) */}
          <rect x="250" y="72" width="80" height="20" rx="4" fill={detailColor} stroke={hullColor} strokeWidth="2" />
          <rect x="280" y="76" width="30" height="12" rx="2" fill={deckColor} />
          <circle cx="315" cy="82" r="3" fill={accentColor} />
          {/* Elevators */}
          <rect x="180" y="16" width="35" height="24" fill={detailColor} opacity="0.5" />
          <rect x="360" y="16" width="35" height="24" fill={detailColor} opacity="0.5" />
        </svg>
      );

    case "battleship": // Size 4
      return (
        <svg
          viewBox="0 0 400 100"
          className={`h-full w-full select-none drop-shadow-md ${isVert ? "rotate-90 origin-top-left" : ""} ${className}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="bbHull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={hullColor} />
              <stop offset="50%" stop-color={deckColor} />
              <stop offset="100%" stop-color={hullColor} />
            </linearGradient>
          </defs>
          {/* Sharp Armored Warship Hull */}
          <path
            d="M 15,35 Q 5,50 15,65 L 340,78 Q 385,50 395,50 Q 385,50 340,22 Z"
            fill="url(#bbHull)"
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Deck Center Structure */}
          <path d="M 100,32 L 280,32 Q 295,50 280,68 L 100,68 Z" fill={deckColor} stroke={detailColor} strokeWidth="2" />
          {/* Forward Triple Turrets */}
          {/* Turret 1 */}
          <circle cx="330" cy="50" r="14" fill={detailColor} />
          <line x1="330" y1="45" x2="365" y2="45" stroke="#334155" strokeWidth="4" />
          <line x1="330" y1="50" x2="368" y2="50" stroke="#334155" strokeWidth="4" />
          <line x1="330" y1="55" x2="365" y2="55" stroke="#334155" strokeWidth="4" />
          {/* Turret 2 */}
          <circle cx="280" cy="50" r="14" fill={detailColor} />
          <line x1="280" y1="45" x2="315" y2="45" stroke="#334155" strokeWidth="4" />
          <line x1="280" y1="50" x2="318" y2="50" stroke="#334155" strokeWidth="4" />
          <line x1="280" y1="55" x2="315" y2="55" stroke="#334155" strokeWidth="4" />
          {/* Bridge Tower & Funnel */}
          <rect x="180" y="38" width="55" height="24" rx="4" fill={detailColor} />
          <circle cx="160" cy="50" r="8" fill="#1e293b" />
          {/* Aft Turret */}
          <circle cx="65" cy="50" r="14" fill={detailColor} />
          <line x1="65" y1="46" x2="30" y2="46" stroke="#334155" strokeWidth="4" />
          <line x1="65" y1="54" x2="30" y2="54" stroke="#334155" strokeWidth="4" />
        </svg>
      );

    case "cruiser": // Size 3
      return (
        <svg
          viewBox="0 0 300 100"
          className={`h-full w-full select-none drop-shadow-md ${isVert ? "rotate-90 origin-top-left" : ""} ${className}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cruiserHull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={hullColor} />
              <stop offset="50%" stop-color={deckColor} />
              <stop offset="100%" stop-color={hullColor} />
            </linearGradient>
          </defs>
          {/* Sleek Warship Hull */}
          <path
            d="M 12,38 Q 4,50 12,62 L 250,72 Q 288,50 294,50 Q 288,50 250,28 Z"
            fill="url(#cruiserHull)"
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Forward Turret */}
          <circle cx="230" cy="50" r="11" fill={detailColor} />
          <line x1="230" y1="47" x2="260" y2="47" stroke="#334155" strokeWidth="3" />
          <line x1="230" y1="53" x2="260" y2="53" stroke="#334155" strokeWidth="3" />
          {/* Bridge & Mast */}
          <rect x="130" y="38" width="45" height="24" rx="3" fill={detailColor} />
          <circle cx="110" cy="50" r="6" fill="#1e293b" />
          {/* Aft Missile Mount */}
          <rect x="55" y="42" width="24" height="16" rx="2" fill={detailColor} />
          <line x1="60" y1="50" x2="74" y2="50" stroke={accentColor} strokeWidth="3" />
        </svg>
      );

    case "submarine": // Size 3
      return (
        <svg
          viewBox="0 0 300 100"
          className={`h-full w-full select-none drop-shadow-md ${isVert ? "rotate-90 origin-top-left" : ""} ${className}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="subHull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={detailColor} />
              <stop offset="50%" stop-color={hullColor} />
              <stop offset="100%" stop-color={detailColor} />
            </linearGradient>
          </defs>
          {/* Streamlined Submarine Hull */}
          <path
            d="M 18,50 Q 8,42 12,32 L 24,32 L 24,68 L 12,68 Q 8,58 18,50 Z"
            fill={detailColor}
          />
          <ellipse cx="150" cy="50" rx="135" ry="24" fill="url(#subHull)" stroke={detailColor} strokeWidth="3" />
          {/* Conning Tower (Fin) */}
          <path d="M 130,50 L 165,50 L 160,32 L 138,32 Z" fill="#0f172a" />
          <circle cx="148" cy="38" r="3" fill={accentColor} />
          {/* Forward Sonar Dome */}
          <ellipse cx="275" cy="50" rx="10" ry="18" fill="#1e293b" />
          {/* Tail Rudder Stabilizers */}
          <polygon points="12,20 28,32 18,34" fill={detailColor} />
          <polygon points="12,80 28,68 18,66" fill={detailColor} />
        </svg>
      );

    case "destroyer": // Size 2
    default:
      return (
        <svg
          viewBox="0 0 200 100"
          className={`h-full w-full select-none drop-shadow-md ${isVert ? "rotate-90 origin-top-left" : ""} ${className}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="destroyerHull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color={hullColor} />
              <stop offset="50%" stop-color={deckColor} />
              <stop offset="100%" stop-color={hullColor} />
            </linearGradient>
          </defs>
          {/* Fast Patrol Cutter Hull */}
          <path
            d="M 12,38 Q 4,50 12,62 L 155,70 Q 192,50 196,50 Q 192,50 155,30 Z"
            fill="url(#destroyerHull)"
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Forward Cannon */}
          <circle cx="140" cy="50" r="9" fill={detailColor} />
          <line x1="140" y1="50" x2="168" y2="50" stroke="#334155" strokeWidth="3.5" />
          {/* Cabin Superstructure */}
          <rect x="75" y="38" width="38" height="24" rx="3" fill={detailColor} />
          <rect x="85" y="43" width="18" height="14" rx="1" fill="#1e293b" />
          {/* Depth Charge Racks */}
          <rect x="25" y="44" width="14" height="12" rx="2" fill={detailColor} />
        </svg>
      );
  }
}

