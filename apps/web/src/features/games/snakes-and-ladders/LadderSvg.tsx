"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getSquareCoordinates } from "@tabletop/game-core";

interface LadderSvgProps {
  id: string;
  from: number;
  to: number;
  isClimbing?: boolean | undefined;
  climbingPieceEmoji?: string | undefined;
  climbingColor?: string | undefined;
  onClimbComplete?: (() => void) | undefined;
}

export function LadderSvg({
  id,
  from,
  to,
  isClimbing,
  climbingPieceEmoji,
  climbingColor = "#F59E0B",
  onClimbComplete
}: LadderSvgProps) {
  const geom = useMemo(() => {
    const fromCoord = getSquareCoordinates(from);
    const toCoord = getSquareCoordinates(to);

    const x1 = fromCoord.xPercent * 10;
    const y1 = fromCoord.yPercent * 10;
    const x2 = toCoord.xPercent * 10;
    const y2 = toCoord.yPercent * 10;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    const angle = Math.atan2(dy, dx);
    // Perpendicular unit vector
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const halfW = 14; // half-width of ladder
    const lx1 = x1 - nx * halfW;
    const ly1 = y1 - ny * halfW;
    const lx2 = x2 - nx * halfW;
    const ly2 = y2 - ny * halfW;

    const rx1 = x1 + nx * halfW;
    const ry1 = y1 + ny * halfW;
    const rx2 = x2 + nx * halfW;
    const ry2 = y2 + ny * halfW;

    // Rungs count based on length
    const rungCount = Math.max(3, Math.floor(len / 32));
    const rungs = [];
    for (let i = 1; i <= rungCount; i++) {
      const t = i / (rungCount + 1);
      const rlx = lx1 + (lx2 - lx1) * t;
      const rly = ly1 + (ly2 - ly1) * t;
      const rrx = rx1 + (rx2 - rx1) * t;
      const rry = ry1 + (ry2 - ry1) * t;
      rungs.push({ x1: rlx, y1: rly, x2: rrx, y2: rry, t });
    }

    return {
      x1,
      y1,
      x2,
      y2,
      lx1,
      ly1,
      lx2,
      ly2,
      rx1,
      ry1,
      rx2,
      ry2,
      rungs,
      len,
      angle
    };
  }, [from, to]);

  if (!geom) return null;

  return (
    <g id={`ladder-${id}`} className="pointer-events-none select-none">
      <defs>
        {/* Ladder 3D Rail Gradients */}
        <linearGradient id={`ladder-rail-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A3423" />
          <stop offset="35%" stopColor="#D99B56" />
          <stop offset="70%" stopColor="#8C5320" />
          <stop offset="100%" stopColor="#301E11" />
        </linearGradient>

        <linearGradient id={`ladder-rung-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5D0A1" />
          <stop offset="50%" stopColor="#B3783D" />
          <stop offset="100%" stopColor="#5B3614" />
        </linearGradient>

        <filter id={`ladder-shadow-${id}`} x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Ladder Drop Shadow & Structure */}
      <g filter={`url(#ladder-shadow-${id})`}>
        {/* Rungs */}
        {geom.rungs.map((rung, index) => (
          <g key={index}>
            {/* Rung Shadow */}
            <line
              x1={rung.x1}
              y1={rung.y1 + 2}
              x2={rung.x2}
              y2={rung.y2 + 2}
              stroke="#1F1209"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Rung Body */}
            <line
              x1={rung.x1}
              y1={rung.y1}
              x2={rung.x2}
              y2={rung.y2}
              stroke={`url(#ladder-rung-grad-${id})`}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Rung Top 3D Highlight */}
            <line
              x1={rung.x1}
              y1={rung.y1 - 1.5}
              x2={rung.x2}
              y2={rung.y2 - 1.5}
              stroke="#FFF1DB"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.75"
            />
          </g>
        ))}

        {/* Left Side Rail */}
        <line
          x1={geom.lx1}
          y1={geom.ly1}
          x2={geom.lx2}
          y2={geom.ly2}
          stroke={`url(#ladder-rail-grad-${id})`}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Left Rail Highlight */}
        <line
          x1={geom.lx1 - 1}
          y1={geom.ly1 - 1}
          x2={geom.lx2 - 1}
          y2={geom.ly2 - 1}
          stroke="#FFE2B8"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Right Side Rail */}
        <line
          x1={geom.rx1}
          y1={geom.ry1}
          x2={geom.rx2}
          y2={geom.ry2}
          stroke={`url(#ladder-rail-grad-${id})`}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Right Rail Highlight */}
        <line
          x1={geom.rx1 - 1}
          y1={geom.ry1 - 1}
          x2={geom.rx2 - 1}
          y2={geom.ry2 - 1}
          stroke="#FFE2B8"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Foot Stops */}
        <circle cx={geom.lx1} cy={geom.ly1} r="4.5" fill="#3A2414" />
        <circle cx={geom.rx1} cy={geom.ry1} r="4.5" fill="#3A2414" />

        {/* Top Stops */}
        <circle cx={geom.lx2} cy={geom.ly2} r="4.5" fill="#5B381A" />
        <circle cx={geom.rx2} cy={geom.ry2} r="4.5" fill="#5B381A" />
      </g>

      {/* Climb Animation Piece */}
      {isClimbing && climbingPieceEmoji ? (
        <motion.g
          initial={{
            x: geom.x1,
            y: geom.y1,
            scale: 1
          }}
          animate={{
            x: [geom.x1, geom.x2],
            y: [geom.y1, geom.y2],
            scale: [1, 1.25, 1.15, 1.3, 1]
          }}
          transition={{
            duration: 1.4,
            ease: "easeInOut"
          }}
          onAnimationComplete={() => {
            onClimbComplete?.();
          }}
        >
          {/* Glowing Aura Ring */}
          <circle r="22" fill={climbingColor} opacity="0.35" className="animate-ping" />
          <circle
            r="18"
            fill="#FFFFFF"
            stroke={climbingColor}
            strokeWidth="3.5"
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
          />
          <text
            y="7"
            textAnchor="middle"
            fontSize="18"
            className="select-none pointer-events-none"
          >
            {climbingPieceEmoji}
          </text>
        </motion.g>
      ) : null}
    </g>
  );
}
