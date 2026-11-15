"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSquareCoordinates } from "@tabletop/game-core";

interface SnakeSvgProps {
  id: string;
  from: number; // head square
  to: number;   // tail square
  isSwallowing?: boolean | undefined;
  swallowedPieceEmoji?: string | undefined;
  swallowedColor?: string | undefined;
  onSwallowComplete?: (() => void) | undefined;
}

export function SnakeSvg({
  id,
  from,
  to,
  isSwallowing,
  swallowedPieceEmoji,
  swallowedColor = "#EF4444",
  onSwallowComplete
}: SnakeSvgProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [blobPos, setBlobPos] = useState<{ x: number; y: number } | null>(null);
  const [blobProgress, setBlobProgress] = useState<number>(0);
  const [isPopping, setIsPopping] = useState(false);

  // Geometry calculation for the curved snake body
  const geom = useMemo(() => {
    const headCoord = getSquareCoordinates(from);
    const tailCoord = getSquareCoordinates(to);

    const hx = headCoord.xPercent * 10;
    const hy = headCoord.yPercent * 10;
    const tx = tailCoord.xPercent * 10;
    const ty = tailCoord.yPercent * 10;

    const dx = tx - hx;
    const dy = ty - hy;
    const dist = Math.hypot(dx, dy);

    // Normal vector perpendicular to direct line
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);

    // Create an S-curve or wavy spine
    // Alternating control point offsets
    const curveAmp = Math.min(80, Math.max(35, dist * 0.22));

    // Control point 1: near head, swung out to one side
    const c1x = hx + dx * 0.3 + nx * curveAmp;
    const c1y = hy + dy * 0.3 + ny * curveAmp;

    // Control point 2: near tail, swung out to the opposite side
    const c2x = hx + dx * 0.7 - nx * curveAmp * 0.85;
    const c2y = hy + dy * 0.7 - ny * curveAmp * 0.85;

    const pathD = `M ${hx} ${hy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;

    // Head orientation angle
    const headAngle = (Math.atan2(c1y - hy, c1x - hx) * 180) / Math.PI;

    return {
      hx,
      hy,
      tx,
      ty,
      c1x,
      c1y,
      c2x,
      c2y,
      pathD,
      headAngle,
      dist
    };
  }, [from, to]);

  // Digestive blob transit animation loop
  useEffect(() => {
    if (!isSwallowing) {
      setBlobPos(null);
      setBlobProgress(0);
      setIsPopping(false);
      return;
    }

    const path = pathRef.current;
    if (!path) return;

    const totalLength = path.getTotalLength();
    const durationMs = 2000;
    const startChompDelay = 400; // time for mouth chomp before blob starts sliding
    let animationFrameId: number;
    let startTime: number | null = null;

    const timeout = setTimeout(() => {
      const step = (now: number) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / durationMs);
        setBlobProgress(p);

        const point = path.getPointAtLength(p * totalLength);
        setBlobPos({ x: point.x, y: point.y });

        if (p < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          // Reached the tail: trigger pop animation
          setIsPopping(true);
          setTimeout(() => {
            onSwallowComplete?.();
          }, 450);
        }
      };
      animationFrameId = requestAnimationFrame(step);
    }, startChompDelay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSwallowing, onSwallowComplete]);

  return (
    <g id={`snake-${id}`} className="pointer-events-none select-none">
      <defs>
        {/* Snake Skin Gradients */}
        <linearGradient id={`snake-skin-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="40%" stopColor="#16A34A" />
          <stop offset="85%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>

        <linearGradient id={`snake-belly-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>

        <filter id={`snake-shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="3" dy="9" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Main Snake Body with Drop Shadow */}
      <g filter={`url(#snake-shadow-${id})`}>
        {/* Outer Green Body Spine */}
        <path
          ref={pathRef}
          d={geom.pathD}
          fill="none"
          stroke={`url(#snake-skin-${id})`}
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Yellow Belly Scale Rings / Stripe Pattern */}
        <path
          d={geom.pathD}
          fill="none"
          stroke={`url(#snake-belly-${id})`}
          strokeWidth="8"
          strokeDasharray="14 18"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Subtle 3D Top Highlight Along Spine */}
        <path
          d={geom.pathD}
          fill="none"
          stroke="#BBF7D0"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Tail End: Pointed Taper with Rings */}
        <g transform={`translate(${geom.tx}, ${geom.ty})`}>
          <circle r="7" fill="#15803D" />
          <circle r="4" fill="#FACC15" />
          <circle r="2" fill="#E11D48" />
        </g>

        {/* Snake Head */}
        <g
          transform={`translate(${geom.hx}, ${geom.hy}) rotate(${geom.headAngle + 180})`}
        >
          {/* Head Body Outline */}
          <motion.ellipse
            cx="0"
            cy="0"
            rx={isSwallowing && blobProgress < 0.2 ? 26 : 21}
            ry={isSwallowing && blobProgress < 0.2 ? 20 : 16}
            fill="#16A34A"
            stroke="#14532D"
            strokeWidth="3"
            animate={
              isSwallowing && blobProgress < 0.2
                ? { scale: [1, 1.35, 1.1, 1.4, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.4 }}
          />

          {/* Yellow Belly Chin */}
          <ellipse cx="-6" cy="0" rx="9" ry="8" fill="#FACC15" />

          {/* Big Cartoon Eyes */}
          {/* Left Eye */}
          <g transform="translate(6, -8)">
            <circle r="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
            <circle
              cx={isSwallowing ? 2 : 1.5}
              cy="0"
              r="3"
              fill="#0F172A"
            />
            <circle cx="2.5" cy="-1.5" r="1.2" fill="#FFFFFF" />
          </g>

          {/* Right Eye */}
          <g transform="translate(6, 8)">
            <circle r="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
            <circle
              cx={isSwallowing ? 2 : 1.5}
              cy="0"
              r="3"
              fill="#0F172A"
            />
            <circle cx="2.5" cy="-1.5" r="1.2" fill="#FFFFFF" />
          </g>

          {/* Nostrils */}
          <circle cx="14" cy="-3" r="1.2" fill="#0F172A" />
          <circle cx="14" cy="3" r="1.2" fill="#0F172A" />

          {/* Red Forked Tongue */}
          <g transform="translate(19, 0)">
            <path
              d="M 0 0 L 8 0 L 13 -4 M 8 0 L 13 4"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Mouth Chomping Teeth (visible when swallowing) */}
          {isSwallowing && blobProgress < 0.25 ? (
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <polygon points="12,-5 16,-2 12,1" fill="#FFFFFF" />
              <polygon points="12,1 16,4 12,7" fill="#FFFFFF" />
            </motion.g>
          ) : null}
        </g>
      </g>

      {/* DIGESTIVE BELLY BLOB TRANSIT ANIMATION */}
      {/* A glowing, pulsing swallowed belly mass sliding down through the snake's body spline */}
      <AnimatePresence>
        {isSwallowing && blobPos && !isPopping ? (
          <motion.g
            key="belly-blob"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.25, 1], opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transform={`translate(${blobPos.x}, ${blobPos.y})`}
          >
            {/* Outer Digestive Glow Aura */}
            <circle
              r="24"
              fill={swallowedColor}
              opacity="0.4"
              filter="blur(4px)"
              className="animate-pulse"
            />

            {/* Bulging Snake Belly Lump */}
            <circle
              r="17"
              fill="#16A34A"
              stroke={swallowedColor}
              strokeWidth="3.5"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
            />

            {/* Glowing Inner Fluid */}
            <circle
              r="13"
              fill="#FFFFFF"
              opacity="0.9"
            />

            {/* Swallowed Player Piece Emoji Trapped in Belly */}
            <text
              y="5.5"
              textAnchor="middle"
              fontSize="14"
              className="select-none pointer-events-none"
            >
              {swallowedPieceEmoji}
            </text>
          </motion.g>
        ) : null}

        {/* Tail Pop / Ejection Puff Particles */}
        {isPopping ? (
          <motion.g
            key="tail-pop"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            transform={`translate(${geom.tx}, ${geom.ty})`}
          >
            <circle r="22" fill="#FACC15" opacity="0.6" />
            <circle r="15" fill={swallowedColor} opacity="0.8" />
            <text y="6" textAnchor="middle" fontSize="16">
              💨
            </text>
          </motion.g>
        ) : null}
      </AnimatePresence>
    </g>
  );
}
