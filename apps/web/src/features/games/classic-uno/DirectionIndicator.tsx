"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function DirectionIndicator({ direction }: { direction: 1 | -1 }) {
  const clockwise = direction === 1;
  const markerId = clockwise ? "uno-arrow-head-clockwise" : "uno-arrow-head-counter";

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center overflow-hidden">
      <motion.div
        key={direction}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={cn(
          // Bigger circle + moved upward behind draw/discard
          "relative h-[30rem] w-[30rem] -translate-y-10",
          clockwise ? "text-sky-400" : "text-amber-300"
        )}
      >
        <motion.svg
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_0_30px_currentColor]"
          animate={{ rotate: clockwise ? -360 : 360 }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <defs>
            <linearGradient id={`uno-direction-gradient-${direction}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
              <stop offset="55%" stopColor="currentColor" stopOpacity="0.45" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.95" />
            </linearGradient>

            <marker
              id={markerId}
              markerWidth="28"
              markerHeight="28"
              refX="14"
              refY="14"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M 0 0 L 28 14 L 0 28 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Upper arc */}
          <path
            d="M 92 128 A 132 132 0 0 1 308 128"
            fill="none"
            stroke={`url(#uno-direction-gradient-${direction})`}
            strokeWidth="10"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
            opacity="0.88"
          />

          {/* Lower arc */}
          <path
            d="M 308 272 A 132 132 0 0 1 92 272"
            fill="none"
            stroke={`url(#uno-direction-gradient-${direction})`}
            strokeWidth="10"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
            opacity="0.7"
          />
        </motion.svg>

        {/* Direction-change pulse */}
        <motion.div
          key={`pulse-${direction}`}
          initial={{ opacity: 0.5, scale: 0.76 }}
          animate={{ opacity: 0, scale: 1.18 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn(
            "absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border blur-sm",
            clockwise ? "border-sky-300/40 bg-sky-400/10" : "border-amber-200/40 bg-amber-300/10"
          )}
        />

        {/* Soft center glow */}
        <motion.div
          className={cn(
            "absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
            clockwise ? "bg-sky-400/16" : "bg-amber-300/16"
          )}
          animate={{ opacity: [0.24, 0.48, 0.24], scale: [0.96, 1.05, 0.96] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}