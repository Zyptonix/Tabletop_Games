"use client";

import { motion } from "framer-motion";

export interface TurnTimerCircleProps {
  progress: number; // 1 to 0
  secondsLeft: number;
  active: boolean;
  size?: number;
  color?: string;
}

export function TurnTimerCircle({
  progress,
  secondsLeft,
  active,
  size = 60,
  color
}: TurnTimerCircleProps) {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  // Color based on time remaining
  const ringColor = secondsLeft <= 5 ? "#ef4444" : secondsLeft <= 10 ? "#f97316" : color || "#22c55e";
  const textColor = secondsLeft <= 5 ? "#fca5a5" : secondsLeft <= 10 ? "#fed7aa" : "#bbf7d0";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute left-0 top-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2"
        />

        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          animate={{
            strokeDashoffset: offset,
            opacity: active ? 1 : 0.5
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </svg>

      {/* Center text */}
      <motion.div
        className="relative flex flex-col items-center justify-center"
        animate={{
          scale: secondsLeft <= 5 ? [1, 1.08, 1] : 1,
          opacity: active ? 1 : 0.6
        }}
        transition={
          secondsLeft <= 5
            ? { duration: 0.6, repeat: Infinity, repeatType: "reverse" }
            : { duration: 0.3, ease: "easeOut" }
        }
      >
        <span className="text-[0.65rem] font-black uppercase leading-none tracking-wider text-white/70">
          Turn
        </span>
        <span className="mt-0.5 text-sm font-black leading-none" style={{ color: textColor }}>
          {secondsLeft}s
        </span>
      </motion.div>
    </div>
  );
}
