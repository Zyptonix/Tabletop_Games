"use client";

import React from "react";

interface ShipSpriteProps {
  id: string; // "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer"
  orientation?: "h" | "v" | undefined;
  sunk?: boolean | undefined;
  className?: string | undefined;
  silhouetteOnly?: boolean | undefined;
}

export function ShipSprite({
  id,
  orientation = "h",
  sunk = false,
  className = "",
  silhouetteOnly = false,
}: ShipSpriteProps) {
  const isVert = orientation === "v";
  const uid = React.useId().replace(/:/g, "_");

  const hullColor = silhouetteOnly ? "#0a1322" : sunk ? "#334155" : "#94a3b8";
  const deckColor = silhouetteOnly ? "#070d17" : sunk ? "#1e293b" : "#cbd5e1";
  const detailColor = silhouetteOnly ? "#152033" : sunk ? "#475569" : "#64748b";
  const accentColor = silhouetteOnly ? "transparent" : sunk ? "#ef4444" : "#38bdf8";

  // Helper to wrap rotated vertical content
  function wrapSvg(width: number, content: React.ReactNode, gradDefs?: React.ReactNode) {
    const viewBox = isVert ? `0 0 100 ${width}` : `0 0 ${width} 100`;
    return (
      <svg
        viewBox={viewBox}
        className={`h-full w-full select-none drop-shadow-md ${className}`}
        preserveAspectRatio="none"
      >
        <defs>{gradDefs}</defs>
        {isVert ? (
          <g transform="translate(100, 0) rotate(90)">
            {content}
          </g>
        ) : (
          content
        )}
      </svg>
    );
  }

  const gradId = `${uid}-${id.toLowerCase()}-hull`;

  switch (id.toLowerCase()) {
    case "carrier": {
      const grad = (
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hullColor} />
          <stop offset="50%" stopColor={deckColor} />
          <stop offset="100%" stopColor={hullColor} />
        </linearGradient>
      );
      const content = (
        <g>
          {/* Main Angled Flight Deck */}
          <polygon
            points="12,18 472,10 494,28 490,72 462,90 12,82 4,50"
            fill={`url(#${gradId})`}
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Runway Lines */}
          <line x1="25" y1="50" x2="445" y2="50" stroke={detailColor} strokeWidth="3" strokeDasharray="14,10" />
          <line x1="110" y1="26" x2="425" y2="66" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="8,6" opacity="0.6" />
          {/* Arrestor Wires */}
          <line x1="45" y1="28" x2="45" y2="72" stroke={detailColor} strokeWidth="2" />
          <line x1="65" y1="28" x2="65" y2="72" stroke={detailColor} strokeWidth="2" />
          <line x1="85" y1="28" x2="85" y2="72" stroke={detailColor} strokeWidth="2" />
          {/* Island / Conning Tower */}
          <rect x="245" y="72" width="85" height="22" rx="4" fill={detailColor} stroke={hullColor} strokeWidth="2" />
          <rect x="275" y="76" width="32" height="13" rx="2" fill={deckColor} />
          <circle cx="310" cy="82" r="3.5" fill={accentColor} />
          {/* Elevators */}
          <rect x="175" y="14" width="36" height="24" fill={detailColor} opacity="0.5" />
          <rect x="355" y="14" width="36" height="24" fill={detailColor} opacity="0.5" />
        </g>
      );
      return wrapSvg(500, content, grad);
    }

    case "battleship": {
      const grad = (
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hullColor} />
          <stop offset="50%" stopColor={deckColor} />
          <stop offset="100%" stopColor={hullColor} />
        </linearGradient>
      );
      const content = (
        <g>
          {/* Sharp Armored Warship Hull */}
          <path
            d="M 12,34 Q 4,50 12,66 L 340,80 Q 388,50 396,50 Q 388,50 340,20 Z"
            fill={`url(#${gradId})`}
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Deck Center Structure */}
          <path d="M 95,30 L 285,30 Q 300,50 285,70 L 95,70 Z" fill={deckColor} stroke={detailColor} strokeWidth="2" />
          {/* Forward Triple Turrets */}
          <circle cx="330" cy="50" r="15" fill={detailColor} />
          <line x1="330" y1="44" x2="368" y2="44" stroke="#1e293b" strokeWidth="4" />
          <line x1="330" y1="50" x2="372" y2="50" stroke="#1e293b" strokeWidth="4" />
          <line x1="330" y1="56" x2="368" y2="56" stroke="#1e293b" strokeWidth="4" />

          <circle cx="278" cy="50" r="15" fill={detailColor} />
          <line x1="278" y1="44" x2="316" y2="44" stroke="#1e293b" strokeWidth="4" />
          <line x1="278" y1="50" x2="320" y2="50" stroke="#1e293b" strokeWidth="4" />
          <line x1="278" y1="56" x2="316" y2="56" stroke="#1e293b" strokeWidth="4" />

          {/* Bridge & Mast */}
          <rect x="175" y="36" width="60" height="28" rx="4" fill={detailColor} />
          <circle cx="155" cy="50" r="9" fill="#0f172a" />
          {/* Aft Turret */}
          <circle cx="60" cy="50" r="15" fill={detailColor} />
          <line x1="60" y1="45" x2="22" y2="45" stroke="#1e293b" strokeWidth="4" />
          <line x1="60" y1="55" x2="22" y2="55" stroke="#1e293b" strokeWidth="4" />
        </g>
      );
      return wrapSvg(400, content, grad);
    }

    case "cruiser": {
      const grad = (
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hullColor} />
          <stop offset="50%" stopColor={deckColor} />
          <stop offset="100%" stopColor={hullColor} />
        </linearGradient>
      );
      const content = (
        <g>
          <path
            d="M 10,36 Q 3,50 10,64 L 250,74 Q 290,50 296,50 Q 290,50 250,26 Z"
            fill={`url(#${gradId})`}
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Forward Turret */}
          <circle cx="230" cy="50" r="12" fill={detailColor} />
          <line x1="230" y1="46" x2="264" y2="46" stroke="#1e293b" strokeWidth="3.5" />
          <line x1="230" y1="54" x2="264" y2="54" stroke="#1e293b" strokeWidth="3.5" />
          {/* Bridge Structure */}
          <rect x="125" y="36" width="50" height="28" rx="3" fill={detailColor} />
          <circle cx="105" cy="50" r="7" fill="#0f172a" />
          {/* Aft Launcher */}
          <rect x="50" y="40" width="28" height="20" rx="2" fill={detailColor} />
          <line x1="56" y1="50" x2="72" y2="50" stroke={accentColor} strokeWidth="3.5" />
        </g>
      );
      return wrapSvg(300, content, grad);
    }

    case "submarine": {
      const grad = (
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={detailColor} />
          <stop offset="50%" stopColor={hullColor} />
          <stop offset="100%" stopColor={detailColor} />
        </linearGradient>
      );
      const content = (
        <g>
          <path d="M 14,50 Q 6,40 10,30 L 22,30 L 22,70 L 10,70 Q 6,60 14,50 Z" fill={detailColor} />
          <ellipse cx="150" cy="50" rx="138" ry="26" fill={`url(#${gradId})`} stroke={detailColor} strokeWidth="3" />
          {/* Conning Tower (Fin) */}
          <path d="M 125,50 L 168,50 L 162,30 L 135,30 Z" fill="#090d16" />
          <circle cx="148" cy="38" r="3.5" fill={accentColor} />
          {/* Sonar Nose Dome */}
          <ellipse cx="278" cy="50" rx="10" ry="20" fill="#0f172a" />
          {/* Tail Rudder Stabilizers */}
          <polygon points="10,18 26,30 16,32" fill={detailColor} />
          <polygon points="10,82 26,70 16,68" fill={detailColor} />
        </g>
      );
      return wrapSvg(300, content, grad);
    }

    case "destroyer":
    default: {
      const grad = (
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hullColor} />
          <stop offset="50%" stopColor={deckColor} />
          <stop offset="100%" stopColor={hullColor} />
        </linearGradient>
      );
      const content = (
        <g>
          <path
            d="M 10,36 Q 3,50 10,64 L 155,72 Q 194,50 197,50 Q 194,50 155,28 Z"
            fill={`url(#${gradId})`}
            stroke={detailColor}
            strokeWidth="3"
          />
          {/* Forward Cannon */}
          <circle cx="140" cy="50" r="10" fill={detailColor} />
          <line x1="140" y1="50" x2="172" y2="50" stroke="#1e293b" strokeWidth="4" />
          {/* Cabin Superstructure */}
          <rect x="70" y="36" width="44" height="28" rx="3" fill={detailColor} />
          <rect x="82" y="42" width="20" height="16" rx="2" fill="#0f172a" />
          {/* Depth Charge Racks */}
          <rect x="22" y="42" width="16" height="16" rx="2" fill={detailColor} />
        </g>
      );
      return wrapSvg(200, content, grad);
    }
  }
}
