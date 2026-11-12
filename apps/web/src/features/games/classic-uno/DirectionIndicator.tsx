"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface DirectionPalette {
  color: string;
  soft: string;
  pulse: string;
  halo: string;
  core: string;
}

const DEFAULT_PALETTE: DirectionPalette = {
  color: "#2d8cff",
  soft: "rgba(45, 140, 255, 0.22)",
  pulse: "rgba(45, 140, 255, 0.82)",
  halo: "rgba(14, 165, 233, 0.42)",
  core: "rgba(3, 20, 50, 0.6)"
};

const PALETTES: Record<string, DirectionPalette> = {
  red: {
    color: "#ff3b30",
    soft: "rgba(255, 59, 48, 0.24)",
    pulse: "rgba(255, 59, 48, 0.85)",
    halo: "rgba(244, 63, 94, 0.45)",
    core: "rgba(60, 6, 18, 0.65)"
  },
  yellow: {
    color: "#ffd60a",
    soft: "rgba(255, 214, 10, 0.24)",
    pulse: "rgba(255, 214, 10, 0.88)",
    halo: "rgba(245, 158, 11, 0.45)",
    core: "rgba(55, 38, 4, 0.65)"
  },
  green: {
    color: "#30d158",
    soft: "rgba(48, 209, 88, 0.24)",
    pulse: "rgba(48, 209, 88, 0.85)",
    halo: "rgba(34, 197, 94, 0.45)",
    core: "rgba(4, 45, 24, 0.65)"
  },
  blue: DEFAULT_PALETTE
};

function getPalette(currentColor?: string | undefined): DirectionPalette {
  return PALETTES[currentColor ?? ""] ?? DEFAULT_PALETTE;
}

function useShortestPathRotation(targetAngle: number): number {
  const rotationRef = useRef<number>(targetAngle);
  const prevTargetRef = useRef<number>(targetAngle);

  if (prevTargetRef.current !== targetAngle) {
    let diff = (targetAngle - prevTargetRef.current) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rotationRef.current += diff;
    prevTargetRef.current = targetAngle;
  }

  return rotationRef.current;
}

export function DirectionIndicator({
  direction,
  currentColor,
  activeSeatAngle,
  isNoMercy = false
}: {
  direction: 1 | -1;
  currentColor?: string | undefined;
  activeSeatAngle?: number | undefined;
  isNoMercy?: boolean | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const palette = getPalette(currentColor);
  const clockwise = direction === 1;
  const rotation = reduceMotion ? { rotate: 0 } : { rotate: clockwise ? 360 : -360 };

  // Spotlight rotation offset by -90deg since the beam origin points downwards (6 o'clock) at 0deg
  // Uses shortest-path unwrapping so transitions across the 180/-180 branch cut (West to North-West) glide smoothly without doing a 360 spin
  const rawTargetAngle = activeSeatAngle !== undefined ? activeSeatAngle - 90 : 0;
  const spotlightRotation = useShortestPathRotation(rawTargetAngle);

  return (
    <div
      aria-label={`Turn direction: ${clockwise ? "clockwise" : "counterclockwise"}`}
      role="img"
      className="pointer-events-none absolute inset-0 z-[1] grid place-items-center overflow-visible translate-y-16"
    >
      {/* Dynamic Turn Spotlight Beam pointing directly to the active seat - Goes to the end of the screen and touches player seats */}
      {activeSeatAngle !== undefined && !reduceMotion ? (
        <motion.div
          className="pointer-events-none absolute h-full w-full origin-center z-0 overflow-visible"
          initial={{ rotate: spotlightRotation, opacity: 0 }}
          animate={{ rotate: spotlightRotation, opacity: 1 }}
          transition={{
            rotate: { type: "spring", stiffness: 100, damping: 20, mass: 0.8 },
            opacity: { duration: 0.3 }
          }}
        >
          {/* Broad Atmospheric Volumetric Glow Cone - stretches to the end of the screen to touch the player seats */}
          <div
            className="absolute left-1/2 top-1/2 h-[130vh] w-[38rem] sm:w-[48rem] -translate-x-1/2 origin-top"
            style={{
              clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
              background: `linear-gradient(to bottom, ${palette.pulse} 0%, ${palette.color} 28%, ${palette.soft} 65%, transparent 100%)`,
              filter: "blur(24px)",
              opacity: isNoMercy ? 0.82 : 0.72
            }}
          />

          {/* Inner Soft Luminous Light Wash */}
          <div
            className="absolute left-1/2 top-1/2 h-[120vh] w-[20rem] sm:w-[26rem] -translate-x-1/2 origin-top"
            style={{
              clipPath: "polygon(44% 0%, 56% 0%, 90% 100%, 10% 100%)",
              background: `linear-gradient(to bottom, rgba(255,255,255,0.65) 0%, ${palette.pulse} 24%, ${palette.color} 55%, transparent 95%)`,
              filter: "blur(16px)",
              opacity: 0.85
            }}
          />
        </motion.div>
      ) : null}

      {/* Holographic Energy Vortex Container */}
      <div className="relative aspect-square" style={{ width: "min(84%, 38rem, 80vh)" }}>
        {/* Outermost ambient glowing energy perimeter */}
        <motion.div
          className="absolute inset-[-4%] rounded-full"
          style={{
            border: `1px solid ${palette.soft}`,
            background: `radial-gradient(circle at center, transparent 60%, ${palette.soft} 85%, transparent 100%)`,
            boxShadow: `0 0 35px ${palette.halo}`,
            opacity: 0.45
          }}
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 45, repeat: Infinity, ease: "linear" }}
        />

        {/* Outer Ring with Segmented Energy Ticks */}
        <motion.div
          className="absolute inset-[1%] rounded-full"
          style={{
            border: `2px solid ${palette.soft}`,
            borderTopColor: palette.pulse,
            borderBottomColor: palette.halo,
            boxShadow: `inset 0 0 28px ${palette.halo}, 0 0 30px ${palette.halo}`,
            opacity: 0.75
          }}
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 24, repeat: Infinity, ease: "linear" }}
        >
          {/* Orbital Comet Heads with Radiant Tails */}
          <span
            className="absolute left-[12%] top-[14%] h-3.5 w-3.5 rounded-full"
            style={{
              backgroundColor: palette.color,
              boxShadow: `0 0 16px ${palette.pulse}, 0 0 30px ${palette.color}`
            }}
          />
          <span
            className="absolute right-[12%] bottom-[14%] h-3 w-3 rounded-full"
            style={{
              backgroundColor: "white",
              boxShadow: `0 0 18px ${palette.pulse}, 0 0 26px ${palette.color}`
            }}
          />
          <span
            className="absolute right-[22%] top-[4%] h-1.5 w-14 rounded-full"
            style={{
              background: `linear-gradient(${clockwise ? "90deg" : "270deg"}, transparent, ${palette.color}, transparent)`,
              filter: `drop-shadow(0 0 8px ${palette.pulse})`
            }}
          />
          <span
            className="absolute left-[22%] bottom-[4%] h-1.5 w-14 rounded-full"
            style={{
              background: `linear-gradient(${clockwise ? "270deg" : "90deg"}, transparent, ${palette.color}, transparent)`,
              filter: `drop-shadow(0 0 8px ${palette.pulse})`
            }}
          />
        </motion.div>

        {/* Directional Sweeping Chevrons & Wave Arcs - Concentric & Tangent */}
        <motion.div
          className="absolute inset-[2%] rounded-full"
          animate={rotation}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 18, repeat: Infinity, ease: "linear" }}
        >
          <DirectionChevrons color={palette.color} pulse={palette.pulse} clockwise={clockwise} />
        </motion.div>

        {/* Counter-Rotating Middle Energy Ring */}
        <motion.div
          className="absolute inset-[11%] rounded-full"
          style={{
            border: `1.5px dashed ${palette.soft}`,
            borderTopColor: palette.pulse,
            borderBottomColor: palette.halo,
            opacity: 0.8
          }}
          animate={reduceMotion ? { rotate: 0 } : { rotate: clockwise ? -360 : 360 }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute right-[8%] top-[25%] h-2 w-2 rounded-full"
            style={{ backgroundColor: palette.color, boxShadow: `0 0 14px ${palette.pulse}` }}
          />
          <span
            className="absolute left-[8%] bottom-[25%] h-2 w-2 rounded-full"
            style={{ backgroundColor: "white", boxShadow: `0 0 12px ${palette.pulse}` }}
          />
        </motion.div>

        {/* Inner Holographic Vortex Core */}
        <motion.div
          className="absolute inset-[22%] rounded-full"
          style={{
            border: `1px solid ${palette.soft}`,
            background: `radial-gradient(circle at center, ${palette.core} 0%, transparent 75%)`,
            boxShadow: `inset 0 0 40px ${palette.halo}`
          }}
          animate={reduceMotion ? { rotate: 0, opacity: 0.55 } : { rotate: clockwise ? 360 : -360, opacity: [0.45, 0.75, 0.45] }}
          transition={reduceMotion
            ? { duration: 0.01 }
            : {
                rotate: { duration: 14, repeat: Infinity, ease: "linear" },
                opacity: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
              }}
        />
      </div>
    </div>
  );
}

function DirectionChevrons({ color, pulse, clockwise }: { color: string; pulse: string; clockwise: boolean }) {
  const markerId = `chevron-marker-${clockwise ? "cw" : "ccw"}`;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{ filter: `drop-shadow(0 0 10px ${pulse})` }}
    >
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100">
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M 1 1.5 L 9 5 L 1 8.5 Z"
              fill="white"
              stroke={color}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {/* Top Symmetrical Arc */}
        <path
          d={
            clockwise
              ? "M 7.5 38.6 A 44 44 0 0 1 92.5 38.6"
              : "M 92.5 38.6 A 44 44 0 0 0 7.5 38.6"
          }
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="14 8 28 8"
          markerEnd={`url(#${markerId})`}
          opacity="0.95"
        />

        {/* Bottom Symmetrical Arc */}
        <path
          d={
            clockwise
              ? "M 92.5 61.4 A 44 44 0 0 1 7.5 61.4"
              : "M 7.5 61.4 A 44 44 0 0 0 92.5 61.4"
          }
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="14 8 28 8"
          markerEnd={`url(#${markerId})`}
          opacity="0.95"
        />
      </svg>
    </span>
  );
}
