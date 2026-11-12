"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { RoomPlayerView } from "@tabletop/shared";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "P";
}

function getDirectionLabel(seatAngle: number | undefined, isMyTurn: boolean): string {
  if (isMyTurn) return "You • Bottom";
  if (typeof seatAngle !== "number") return "Active";
  // seatAngle Cartesian:
  // ~90: Bottom
  // ~ -90: Top
  // ~ 0: Right
  // ~ 180 or -180: Left
  if (seatAngle >= 45 && seatAngle <= 135) return "Bottom Seat";
  if (seatAngle >= -135 && seatAngle <= -45) return "Top Seat";
  if (seatAngle > -45 && seatAngle < 45) return "Right Seat";
  return "Left Seat";
}

const COLOR_ACCENT_MAP: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    glow: string;
    ring: string;
    needleCore: string;
  }
> = {
  red: {
    border: "border-rose-400/80",
    bg: "from-rose-950/60 via-slate-950/85 to-black/95",
    text: "text-rose-300",
    glow: "rgba(244,63,94,0.65)",
    ring: "#f43f5e",
    needleCore: "#fb7185"
  },
  yellow: {
    border: "border-amber-400/80",
    bg: "from-amber-950/60 via-slate-950/85 to-black/95",
    text: "text-amber-200",
    glow: "rgba(251,191,36,0.65)",
    ring: "#fbbf24",
    needleCore: "#fde047"
  },
  green: {
    border: "border-emerald-400/80",
    bg: "from-emerald-950/60 via-slate-950/85 to-black/95",
    text: "text-emerald-300",
    glow: "rgba(52,211,153,0.65)",
    ring: "#34d399",
    needleCore: "#6ee7b7"
  },
  blue: {
    border: "border-sky-400/80",
    bg: "from-sky-950/60 via-slate-950/85 to-black/95",
    text: "text-sky-300",
    glow: "rgba(56,189,248,0.65)",
    ring: "#38bdf8",
    needleCore: "#7dd3fc"
  },
  wild: {
    border: "border-fuchsia-400/80",
    bg: "from-fuchsia-950/60 via-slate-950/85 to-black/95",
    text: "text-fuchsia-300",
    glow: "rgba(217,70,239,0.65)",
    ring: "#d946ef",
    needleCore: "#f0abfc"
  }
};

export interface TableTurnIndicatorProps {
  player?: {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    isBot?: boolean;
    seat?: number;
  } | undefined;
  roomPlayer?: RoomPlayerView | undefined;
  isMyTurn: boolean;
  turnProgress?: number | undefined;
  turnSecondsLeft?: number | undefined;
  activeColor?: string | undefined;
  activeSeatAngle?: number | undefined;
  isNoMercy?: boolean | undefined;
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

export function TableTurnIndicator({
  player,
  roomPlayer,
  isMyTurn,
  turnProgress,
  turnSecondsLeft,
  activeColor = "red",
  activeSeatAngle,
  isNoMercy = false
}: TableTurnIndicatorProps) {
  const displayName = isMyTurn ? "YOU" : (player?.displayName ?? "Player");
  const avatarUrl = player?.avatarUrl ?? roomPlayer?.avatarUrl ?? null;
  const isBot = player?.isBot ?? false;
  const connected = roomPlayer?.connected ?? true;

  const colorConfig = COLOR_ACCENT_MAP[activeColor] ?? COLOR_ACCENT_MAP.red!;

  // Compass target rotation:
  // When activeSeatAngle = 90 (bottom / local player), needle points DOWN (180deg).
  // When activeSeatAngle = -90 (top player), needle points UP (0deg).
  // When activeSeatAngle = 0 (right player), needle points RIGHT (90deg).
  // When activeSeatAngle = 180 (left player), needle points LEFT (270deg).
  const rawTargetAngle = (activeSeatAngle ?? (isMyTurn ? 90 : 0)) + 90;
  const compassRotation = useShortestPathRotation(rawTargetAngle);

  // SVG timer ring calculations (around outer compass bezel)
  const dialSize = 64;
  const strokeWidth = 2.5;
  const radius = (dialSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = typeof turnProgress === "number" ? Math.max(0, Math.min(1, turnProgress)) : 1;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  const timerColor =
    typeof turnSecondsLeft === "number" && turnSecondsLeft <= 5
      ? "#ef4444"
      : isMyTurn
        ? "#a3e635"
        : colorConfig.ring;

  const needleAccent = isMyTurn ? "#a3e635" : colorConfig.needleCore;
  const directionText = getDirectionLabel(activeSeatAngle, isMyTurn);

  return (
    <div className="relative grid place-items-center gap-3 select-none">
      {/* Top Header Label - matches Draw and Discard header height & typography exactly */}
      <div className="flex min-h-[2rem] items-center justify-center mb-1">
        <p className="flex items-center gap-1 text-[0.66rem] font-black uppercase tracking-[0.24em] text-white/70">
          <Compass className="h-3.5 w-3.5 opacity-80" />
          Turn
        </p>
      </div>

      {/* Main Turn Card - exactly matching DrawPile card size: h-40 w-[6.75rem] sm:h-44 sm:w-[7.35rem] */}
      <motion.div
        layout
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative flex flex-col items-center justify-between p-2 rounded-2xl border-2 backdrop-blur-xl transition-all duration-300",
          "h-40 w-[6.75rem] sm:h-44 sm:w-[7.35rem]",
          isMyTurn
            ? "border-lime-300 bg-gradient-to-b from-lime-950/60 via-slate-950/85 to-black/95 shadow-[0_0_35px_rgba(163,230,53,0.7),0_0_70px_rgba(163,230,53,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] ring-2 ring-lime-400/50"
            : cn(
                colorConfig.border,
                "bg-gradient-to-b",
                colorConfig.bg,
                `shadow-[0_0_32px_${colorConfig.glow},0_0_65px_${colorConfig.glow},inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-white/10`
              )
        )}
      >
        {/* Top Section: Small DP Badge + Status Pill + Timer */}
        <div className="flex w-full items-center justify-between gap-1 px-0.5">
          {/* Small DP Section */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "relative flex h-5 w-5 items-center justify-center rounded-full overflow-hidden border shadow-sm transition-all",
                isMyTurn
                  ? "border-lime-400 bg-lime-950/90 text-lime-200"
                  : "border-white/30 bg-slate-900 text-white"
              )}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[0.52rem] font-black uppercase">{getInitials(displayName)}</span>
              )}
            </div>

            {/* Connected or Bot indicator */}
            {isBot ? (
              <span className="absolute -bottom-1 -right-1 rounded bg-sky-500 border border-black px-0.5 text-[5px] font-black text-white">
                B
              </span>
            ) : !connected ? (
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-black bg-red-500" />
            ) : null}
          </div>

          {/* Status Label */}
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wider",
              isMyTurn
                ? "bg-lime-400/25 text-lime-200 border border-lime-400/50 shadow-[0_0_10px_rgba(163,230,53,0.4)]"
                : "bg-white/10 text-white/85 border border-white/15"
            )}
          >
            {isMyTurn ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-300" />
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            )}
            <span className="truncate">{isMyTurn ? "YOURS" : "TURN"}</span>
          </div>

          {/* Countdown Pill */}
          {typeof turnSecondsLeft === "number" ? (
            <span
              className={cn(
                "text-[0.6rem] font-black tracking-tight",
                turnSecondsLeft <= 5 ? "text-red-400 animate-pulse font-extrabold" : "text-white/70"
              )}
            >
              {turnSecondsLeft}s
            </span>
          ) : null}
        </div>

        {/* Center: Compass Dial with Prominent 3D Arrow (No confusing back arrow!) */}
        <div className="relative my-auto flex items-center justify-center">
          {/* Compass Bezel & Countdown Timer SVG */}
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 overflow-visible"
            width={dialSize}
            height={dialSize}
            viewBox={`0 0 ${dialSize} ${dialSize}`}
            aria-hidden="true"
          >
            {/* Background Dial Track */}
            <circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={radius}
              fill="rgba(0, 0, 0, 0.55)"
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth={strokeWidth}
            />

            {/* Subtle Compass Cardinal Marks (N, E, S, W ticks) */}
            <circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={radius - 3.5}
              fill="none"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="1.2"
              strokeDasharray="2 12"
            />

            {/* Circular Countdown Timer Ring */}
            {typeof turnProgress === "number" ? (
              <motion.circle
                cx={dialSize / 2}
                cy={dialSize / 2}
                r={radius}
                fill="none"
                stroke={timerColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            ) : null}
          </svg>

          {/* Compass Rotating Needle / Arrow pointing toward the active player's seat */}
          <motion.div
            className="pointer-events-none relative flex items-center justify-center"
            style={{ width: dialSize, height: dialSize }}
            animate={{ rotate: compassRotation }}
            transition={{ type: "spring", stiffness: 90, damping: 12, mass: 0.7 }}
          >
            {/* Forward Arrowhead (Prominent single arrow pointing toward seat) */}
            <div className="absolute top-[2px] flex flex-col items-center">
              <svg width="18" height="26" viewBox="0 0 18 26" className="overflow-visible">
                <defs>
                  <filter id="compassArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={needleAccent} />
                  </filter>
                </defs>

                {/* Left faceted blade (bright metallic silver/white) */}
                <polygon
                  points="9,0 2,18 9,14"
                  fill="#ffffff"
                  filter="url(#compassArrowGlow)"
                  opacity="0.95"
                />

                {/* Right faceted blade (vibrant colored glow) */}
                <polygon
                  points="9,0 16,18 9,14"
                  fill={needleAccent}
                  opacity="0.92"
                />

                {/* Center glowing spine */}
                <line x1="9" y1="0" x2="9" y2="15" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              </svg>

              {/* Glowing beacon pulse on tip of the arrow */}
              <div
                className="absolute -top-1 h-2.5 w-2.5 rounded-full animate-ping opacity-75"
                style={{ backgroundColor: needleAccent }}
              />
              <div
                className="absolute -top-0.5 h-1.5 w-1.5 rounded-full shadow-[0_0_8px_#fff]"
                style={{ backgroundColor: "#ffffff" }}
              />
            </div>

            {/* Center Pivot Pin */}
            <div className="relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white/80 bg-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.6)]">
              <div className="h-1 w-1 rounded-full" style={{ backgroundColor: needleAccent }} />
            </div>
          </motion.div>
        </div>

        {/* Bottom Section: BIG BOLD PLAYER NAME (Hero of the Card!) */}
        <div className="flex w-full flex-col items-center justify-center min-h-0 px-0.5 pt-0.5 text-center">
          <p
            className={cn(
              "w-full font-black tracking-tight leading-tight uppercase transition-all duration-300 break-words",
              displayName.length <= 4
                ? "text-base sm:text-lg"
                : displayName.length <= 8
                  ? "text-sm sm:text-base"
                  : "text-xs sm:text-sm line-clamp-2",
              isMyTurn
                ? "text-lime-300 drop-shadow-[0_0_14px_rgba(163,230,53,0.95)]"
                : cn(colorConfig.text, `drop-shadow-[0_0_12px_${colorConfig.glow}]`)
            )}
            title={player?.displayName ?? "Player"}
          >
            {displayName}
          </p>

          <p className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-white/50 truncate max-w-full">
            {directionText}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
