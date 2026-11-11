"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Dices, Sparkles } from "lucide-react";

interface TumblingDice3DProps {
  value: number | null;
  actionNumber?: number | undefined;
  isRolling?: boolean;
  canRoll: boolean;
  onRoll: () => void;
  disabled?: boolean;
  label?: string;
  size?: number; // size in px, default 72
}

// Rotations to show each face facing forward
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 }
};

export function TumblingDice3D({
  value,
  actionNumber,
  isRolling: externalRolling,
  canRoll,
  onRoll,
  disabled,
  label = "Roll Dice",
  size = 72
}: TumblingDice3DProps) {
  const [internalRolling, setInternalRolling] = useState(false);
  const [rotations, setRotations] = useState({ x: 0, y: 0, z: 0 });
  const spinCounterRef = useRef(1);
  const controls = useAnimation();
  const halfSize = size / 2;

  const isRolling = externalRolling || internalRolling;

  // Sound synthesis for satisfying dice roll clatter
  const playRollAudio = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140 + Math.random() * 90, now + i * 0.1);
        gain.gain.setValueAtTime(0.08, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.09);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const handleRollClick = () => {
    if (!canRoll || disabled || isRolling) return;
    setInternalRolling(true);
    playRollAudio();
    onRoll();

    // Guaranteed reset: always end rolling animation after 950ms even if server response delays
    setTimeout(() => {
      setInternalRolling(false);
    }, 950);
  };

  useEffect(() => {
    if (value && value >= 1 && value <= 6) {
      spinCounterRef.current += 1;
      const target = FACE_ROTATIONS[value] ?? { x: 0, y: 0 };
      // Add full 360-degree spins so it tumbles realistically every roll
      const extraX = 360 * 2 * spinCounterRef.current;
      const extraY = 360 * 2 * spinCounterRef.current;
      setRotations({
        x: target.x + extraX,
        y: target.y + extraY,
        z: (spinCounterRef.current % 2 === 0 ? 360 : -360)
      });
    }

    const timer = setTimeout(() => {
      setInternalRolling(false);
    }, 950);
    return () => clearTimeout(timer);
  }, [value, actionNumber]);

  const pipsColor = "bg-slate-900 shadow-inner";
  const primaryPipColor = "bg-rose-600 shadow-inner"; // Classic red center pip for 1

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* 3D Dice Stage */}
      <div
        className="relative flex items-center justify-center cursor-pointer select-none"
        style={{
          width: size + 36,
          height: size + 36,
          perspective: 800
        }}
        onClick={handleRollClick}
      >
        {/* Dynamic Cast Shadow */}
        <motion.div
          animate={{
            scale: isRolling ? [1, 0.6, 1.1, 1] : 1,
            opacity: isRolling ? [0.4, 0.15, 0.5, 0.4] : 0.45
          }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute -bottom-1 h-5 w-20 rounded-[100%] bg-black/60 blur-[6px] pointer-events-none"
        />

        {/* 3D Rotating Cube */}
        <motion.div
          animate={{
            rotateX: rotations.x,
            rotateY: rotations.y,
            rotateZ: rotations.z,
            y: isRolling ? [-30, 0, -15, 0] : 0
          }}
          transition={{
            duration: isRolling ? 0.95 : 0.4,
            ease: [0.25, 1, 0.5, 1]
          }}
          style={{
            width: size,
            height: size,
            transformStyle: "preserve-3d"
          }}
          className={`relative transition-transform ${canRoll && !isRolling ? "hover:scale-105" : ""}`}
        >
          {/* FACE 1: FRONT */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className={`h-4 w-4 rounded-full ${primaryPipColor} ring-2 ring-rose-300/40`} />
          </div>

          {/* FACE 6: BACK */}
          <div
            className="absolute inset-0 grid grid-cols-2 place-items-center p-3 rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `rotateY(180deg) translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
          </div>

          {/* FACE 2: RIGHT */}
          <div
            className="absolute inset-0 flex flex-col justify-between p-3 rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `rotateY(90deg) translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className="flex justify-start">
              <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            </div>
            <div className="flex justify-end">
              <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            </div>
          </div>

          {/* FACE 5: LEFT */}
          <div
            className="absolute inset-0 grid grid-cols-3 place-items-center p-2.5 rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `rotateY(-90deg) translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
          </div>

          {/* FACE 3: TOP */}
          <div
            className="absolute inset-0 flex flex-col justify-between p-3 rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `rotateX(90deg) translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className="flex justify-start">
              <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            </div>
            <div className="flex justify-center">
              <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            </div>
            <div className="flex justify-end">
              <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            </div>
          </div>

          {/* FACE 4: BOTTOM */}
          <div
            className="absolute inset-0 grid grid-cols-2 place-items-center p-3 rounded-2xl border-2 border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"
            style={{
              transform: `rotateX(-90deg) translateZ(${halfSize}px)`,
              backfaceVisibility: "hidden"
            }}
          >
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
            <div className={`h-3 w-3 rounded-full ${pipsColor}`} />
          </div>
        </motion.div>
      </div>

      {/* Action Button */}
      <motion.button
        type="button"
        disabled={!canRoll || disabled || isRolling}
        whileHover={canRoll && !isRolling ? { scale: 1.05 } : {}}
        whileTap={canRoll && !isRolling ? { scale: 0.95 } : {}}
        onClick={handleRollClick}
        className={`group relative flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3 font-black text-sm tracking-wide shadow-xl transition-all ${
          canRoll && !isRolling
            ? "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 ring-4 ring-amber-400/30 hover:ring-amber-400/50 hover:shadow-[0_0_25px_rgba(251,191,36,0.6)] cursor-pointer animate-pulse"
            : "bg-white/10 text-white/40 border border-white/10 cursor-not-allowed"
        }`}
      >
        <Dices className={`h-5 w-5 transition-transform ${canRoll ? "group-hover:rotate-45" : ""}`} />
        <span>{isRolling ? "Rolling..." : label}</span>
        {value && !isRolling ? (
          <span className="ml-1 rounded-lg bg-black/20 px-2 py-0.5 text-xs font-black">
            {value}
          </span>
        ) : null}
      </motion.button>
    </div>
  );
}
