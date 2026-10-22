"use client";

import { motion, useReducedMotion } from "framer-motion";

interface DirectionPalette {
  color: string;
  soft: string;
  pulse: string;
  halo: string;
}

const DEFAULT_PALETTE: DirectionPalette = {
  color: "#2d8cff",
  soft: "rgb(45 140 255 / 0.20)",
  pulse: "rgb(45 140 255 / 0.70)",
  halo: "rgb(14 165 233 / 0.34)"
};

const PALETTES: Record<string, DirectionPalette> = {
  red: { color: "#ff4b45", soft: "rgb(255 75 69 / 0.20)", pulse: "rgb(255 75 69 / 0.72)", halo: "rgb(248 113 113 / 0.34)" },
  yellow: { color: "#ffc928", soft: "rgb(255 201 40 / 0.20)", pulse: "rgb(255 201 40 / 0.72)", halo: "rgb(245 158 11 / 0.34)" },
  green: { color: "#1ed760", soft: "rgb(30 215 96 / 0.20)", pulse: "rgb(30 215 96 / 0.72)", halo: "rgb(34 197 94 / 0.34)" },
  blue: DEFAULT_PALETTE
};

function getPalette(currentColor?: string): DirectionPalette {
  return PALETTES[currentColor ?? ""] ?? DEFAULT_PALETTE;
}

export function DirectionIndicator({ direction, currentColor }: { direction: 1 | -1; currentColor?: string }) {
  const reduceMotion = useReducedMotion();
  const palette = getPalette(currentColor);
  const clockwise = direction === 1;
  const rotation = reduceMotion ? { rotate: 0 } : { rotate: clockwise ? 360 : -360 };

  return (
    <div
      aria-label={`Turn direction: ${clockwise ? "clockwise" : "counterclockwise"}`}
      role="img"
      className="pointer-events-none absolute inset-0 z-[1] grid place-items-center overflow-hidden translate-y-10"
    >
      <div className="relative aspect-square" style={{ width: "min(68%, 31rem, 68vh)" }}>
        <motion.div
          className="absolute inset-[2%] rounded-full"
          style={{
            border: `1px solid ${palette.soft}`,
            boxShadow: `inset 0 0 22px ${palette.halo}, 0 0 28px ${palette.halo}`,
            opacity: 0.6
          }}
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 30, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${palette.soft}`,
            borderTopColor: palette.pulse,
            borderRightColor: palette.soft,
            borderBottomColor: palette.halo,
            borderLeftColor: "transparent",
            boxShadow: `0 0 18px ${palette.halo}`
          }}
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <DirectionArrow color={palette.color} pulse={palette.pulse} clockwise={clockwise} />
          <span
            className="absolute left-[17%] top-[10%] h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: palette.color, boxShadow: `0 0 12px ${palette.pulse}` }}
          />
          <span
            className="absolute bottom-[13%] right-[11%] h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "white", boxShadow: `0 0 10px ${palette.pulse}` }}
          />
          <span
            className="absolute right-[28%] top-[2%] h-1 w-8 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${palette.color}, transparent)` }}
          />
        </motion.div>

        <motion.div
          className="absolute inset-[10%] rounded-full"
          style={{
            border: `1px dashed ${palette.soft}`,
            borderTopColor: palette.halo,
            borderBottomColor: palette.pulse,
            opacity: 0.82
          }}
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 16, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute right-[6%] top-[21%] h-2 w-2 rounded-full"
            style={{ backgroundColor: palette.color, boxShadow: `0 0 14px ${palette.pulse}` }}
          />
          <span
            className="absolute bottom-[13%] left-[19%] h-1 w-5 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${palette.color})` }}
          />
        </motion.div>

        <motion.div
          className="absolute inset-[21%] rounded-full"
          style={{
            border: `1px solid ${palette.soft}`,
            background: `radial-gradient(circle at center, ${palette.halo} 0%, transparent 72%)`,
            opacity: 0.55
          }}
          animate={reduceMotion ? { ...rotation, opacity: 0.45 } : { ...rotation, opacity: [0.28, 0.52, 0.28] }}
          transition={reduceMotion
            ? { duration: 0.01 }
            : { rotate: { duration: 12, repeat: Infinity, ease: "linear" }, opacity: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
        />
      </div>
    </div>
  );
}

function DirectionArrow({ color, pulse, clockwise }: { color: string; pulse: string; clockwise: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{ filter: `drop-shadow(0 0 8px ${pulse})` }}
    >
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100">
        <path
          d={clockwise ? "M 61.65 6.65 A 45 45 0 1 1 34 8" : "M 38.35 6.65 A 45 45 0 1 0 66 8"}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={clockwise
            ? "M 43.3 4.4 L 35.4 11.7 L 32.6 4.3 Z"
            : "M 56.7 4.4 L 64.6 11.7 L 67.4 4.3 Z"}
          fill="white"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
