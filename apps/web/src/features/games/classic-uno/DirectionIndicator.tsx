"use client";

import { motion } from "framer-motion";

interface DirectionPalette {
  color: string;
  soft: string;
  pulse: string;
  halo: string;
}

const DEFAULT_PALETTE: DirectionPalette = {
  color: "#2d8cff",
  soft: "rgb(45 140 255 / 0.2)",
  pulse: "rgb(45 140 255 / 0.42)",
  halo: "rgb(14 165 233 / 0.28)"
};

const PALETTES: Record<string, DirectionPalette> = {
  red: { color: "#ff4b45", soft: "rgb(255 75 69 / 0.18)", pulse: "rgb(255 75 69 / 0.4)", halo: "rgb(248 113 113 / 0.26)" },
  yellow: { color: "#ffc928", soft: "rgb(255 201 40 / 0.18)", pulse: "rgb(255 201 40 / 0.42)", halo: "rgb(245 158 11 / 0.28)" },
  green: { color: "#1ed760", soft: "rgb(30 215 96 / 0.18)", pulse: "rgb(30 215 96 / 0.4)", halo: "rgb(34 197 94 / 0.26)" },
  blue: DEFAULT_PALETTE
};

function getPalette(currentColor?: string): DirectionPalette {
  return PALETTES[currentColor ?? ""] ?? DEFAULT_PALETTE;
}

export function DirectionIndicator({ direction, currentColor }: { direction: 1 | -1; currentColor?: string }) {
  const palette = getPalette(currentColor);
  const colorKey = currentColor ?? "blue";
  const markerId = `uno-arrow-head-${colorKey}-${direction}`;
  const glowId = `uno-arrow-glow-${colorKey}-${direction}`;
  const clockwise = direction === 1;

  const upperPath = clockwise
    ? "M 169 129 A 150 150 0 0 1 451 129"
    : "M 451 129 A 150 150 0 0 0 169 129";

  const lowerPath = clockwise
    ? "M 451 231 A 150 150 0 0 1 169 231"
    : "M 169 231 A 150 150 0 0 0 451 231";
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center overflow-visible translate-y-10">
      <motion.div
        key={`${direction}-${colorKey}`}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative h-[35rem] w-[70rem] -translate-y-4"
        style={{ color: palette.color }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 h-[18rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: palette.halo }}
          animate={{ opacity: [0.52, 0.78, 0.52], scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.svg
          viewBox="0 0 620 360"
          className="absolute inset-0 h-full w-full overflow-visible"
          style={{ filter: `drop-shadow(0 0 18px ${palette.color}) drop-shadow(0 0 54px ${palette.pulse}) drop-shadow(0 0 92px ${palette.soft})` }}
          animate={{ rotate: clockwise ? 360 : -360 }}
          transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
        >
          <defs>
            <filter id={glowId} x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker
              id={markerId}
              markerWidth="38"
              markerHeight="38"
              refX="14"
              refY="19"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M 0 0 L 38 19 L 0 38 z" fill="currentColor" />
            </marker>
          </defs>


          <circle cx="310" cy="180" r="160" fill="none" stroke="currentColor" strokeWidth="7" opacity="0.08" />
          <circle cx="310" cy="180" r="143" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.22" />

          <path
            d={upperPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="butt"
            opacity="0.9"
            markerEnd={`url(#${markerId})`}
            filter={`url(#${glowId})`}
          />

          <path
            d={lowerPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="butt"
            opacity="0.82"
            markerEnd={`url(#${markerId})`}
            filter={`url(#${glowId})`}
          />

          <path d={upperPath} fill="none" stroke="white" strokeWidth="4" strokeLinecap="butt" opacity="0.14" />
          <path d={lowerPath} fill="none" stroke="white" strokeWidth="4" strokeLinecap="butt" opacity="0.1" />
        </motion.svg>
      </motion.div>
    </div>
  );
}
