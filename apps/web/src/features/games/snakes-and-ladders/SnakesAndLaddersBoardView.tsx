"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSquareCoordinates,
  SNAKES_AND_LADDERS_PIECES,
  type PublicSnakesAndLaddersPlayer,
  type PublicSnakesAndLaddersState
} from "@tabletop/game-core";
import { PLAYER_COLORS } from "../board-games/shared/ui-utils";
import { LadderSvg } from "./LadderSvg";
import { SnakeSvg } from "./SnakeSvg";

// Tile color palette matching vibrant classic reference board
const TILE_PALETTE = [
  "#FF6B6B", // Coral Rose
  "#FFD166", // Sunshine Amber
  "#4CC9F0", // Sky Blue
  "#F72585", // Vivid Pink
  "#A3E635", // Lime Green
  "#FB923C", // Tangerine
  "#38BDF8", // Cyan
  "#C084FC", // Lilac
  "#F472B6", // Bubblegum
  "#F8FAFC"  // Cream White
];

// Helper to pick cheerful harmonious color per tile index
function getTileColor(square: number, row: number, col: number): string {
  if (square === 100) return "#F59E0B"; // Golden Trophy tile
  if (square === 1) return "#10B981";   // Emerald Start tile
  const idx = (row * 7 + col * 3 + square) % TILE_PALETTE.length;
  return TILE_PALETTE[idx] ?? "#38BDF8";
}

// Helper to get compact distinct player label
export function getPlayerBadge(
  player: { userId: string; displayName: string; seat: number; isBot: boolean },
  currentUserId: string | null
): string {
  if (player.userId === currentUserId) return "YOU";
  if (player.isBot) {
    const match = player.displayName.match(/\d+/);
    return match ? `B${match[0]}` : "BOT";
  }
  const parts = player.displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return player.displayName.slice(0, 2).toUpperCase() || `P${player.seat + 1}`;
}

// Soft sound effect for individual hop steps
function playHopAudio() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(460, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // AudioContext blocked or unavailable
  }
}

interface SnakesAndLaddersBoardViewProps {
  state: PublicSnakesAndLaddersState;
  currentUserId: string | null;
}

export function SnakesAndLaddersBoardView({
  state,
  currentUserId
}: SnakesAndLaddersBoardViewProps) {
  const { board, players, currentPlayerId, lastMove } = state;

  // Active animation state
  const [activeLadderId, setActiveLadderId] = useState<string | null>(null);
  const [activeSnakeId, setActiveSnakeId] = useState<string | null>(null);
  const [swallowingPlayer, setSwallowingPlayer] = useState<PublicSnakesAndLaddersPlayer | null>(null);
  const [climbingPlayer, setClimbingPlayer] = useState<PublicSnakesAndLaddersPlayer | null>(null);
  const [moveBanner, setMoveBanner] = useState<{ text: string; icon: string; color: string } | null>(null);

  // Step-by-step visual position tracking
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const [steppingPlayerId, setSteppingPlayerId] = useState<string | null>(null);
  const processedMoveKeyRef = useRef<string | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear timeouts helper
  const clearAllTimeouts = () => {
    for (const t of timeoutsRef.current) {
      clearTimeout(t);
    }
    timeoutsRef.current = [];
  };

  // Helper to cleanly finalize ladder climb
  const handleClimbDone = (playerId: string, toSquare: number) => {
    setVisualPositions((prev) => ({ ...prev, [playerId]: toSquare }));
    setActiveLadderId(null);
    setClimbingPlayer(null);
  };

  // Helper to cleanly finalize snake swallow
  const handleSwallowDone = (playerId: string, toSquare: number) => {
    setVisualPositions((prev) => ({ ...prev, [playerId]: toSquare }));
    setActiveSnakeId(null);
    setSwallowingPlayer(null);
  };

  // Synchronize visualPositions with players state for all idle pieces
  useEffect(() => {
    setVisualPositions((prev) => {
      const next = { ...prev };
      for (const p of players) {
        // Never prematurely jump the actively moving player to their end position while an animation is executing
        const isActivelyMoving =
          lastMove &&
          p.userId === lastMove.playerId &&
          (steppingPlayerId === p.userId ||
            climbingPlayer?.userId === p.userId ||
            swallowingPlayer?.userId === p.userId ||
            (next[p.userId] !== undefined && next[p.userId] !== p.position));

        if (!isActivelyMoving) {
          next[p.userId] = p.position;
        }
      }
      return next;
    });
  }, [players, steppingPlayerId, climbingPlayer, swallowingPlayer, lastMove]);

  // Step-by-step piece animation upon each new move
  useEffect(() => {
    if (!lastMove) {
      setActiveLadderId(null);
      setClimbingPlayer(null);
      setActiveSnakeId(null);
      setSwallowingPlayer(null);
      setMoveBanner(null);
      setSteppingPlayerId(null);
      return;
    }

    const moveKey = `${lastMove.playerId}-${lastMove.from}-${lastMove.to}-${lastMove.rolled}-${state.actionNumber}`;
    if (processedMoveKeyRef.current === moveKey) {
      return;
    }
    processedMoveKeyRef.current = moveKey;
    clearAllTimeouts();

    // Immediately anchor the moving player at their starting position so they NEVER bounce or jump ahead of the steps
    setSteppingPlayerId(lastMove.playerId);
    setVisualPositions((prev) => {
      const next = { ...prev };
      for (const p of players) {
        if (p.userId === lastMove.playerId) {
          next[p.userId] = lastMove.from;
        } else {
          next[p.userId] = p.position;
        }
      }
      return next;
    });

    const movingPlayer = players.find((p) => p.userId === lastMove.playerId);
    const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === movingPlayer?.piece);
    const pieceEmoji = pieceInfo?.emoji ?? "🎲";
    const playerName = movingPlayer?.displayName ?? "Player";

    // 1. Calculate tile-by-tile stepping path
    const steps: number[] = [];
    if (lastMove.entered) {
      steps.push(1);
    } else if (lastMove.bounced) {
      const overshoot = lastMove.from + lastMove.rolled - 100;
      for (let s = lastMove.from + 1; s <= 100; s++) {
        steps.push(s);
      }
      for (let s = 99; s >= 100 - overshoot; s--) {
        steps.push(s);
      }
    } else {
      const intermediateTarget = lastMove.ladder
        ? lastMove.ladder.from
        : lastMove.snake
        ? lastMove.snake.from
        : lastMove.to;

      for (let s = lastMove.from + 1; s <= intermediateTarget; s++) {
        steps.push(s);
      }
    }

    // If entering the board
    if (lastMove.entered) {
      setMoveBanner({
        text: `${playerName} rolled a 1 and entered the board! ${pieceEmoji}`,
        icon: "🚀",
        color: "text-emerald-300"
      });
    } else if (lastMove.bounced) {
      setMoveBanner({
        text: `🎯 Bounce Back! Overshot 100, bounced back to square ${lastMove.to}!`,
        icon: "↩️",
        color: "text-purple-300"
      });
    }

    // 2. Schedule deliberate step-by-step movement (300ms cadence per square, easily made out)
    const stepDuration = 300;
    steps.forEach((sq, idx) => {
      const t = setTimeout(() => {
        setVisualPositions((prev) => ({ ...prev, [lastMove.playerId]: sq }));
        playHopAudio();
      }, (idx + 1) * stepDuration);
      timeoutsRef.current.push(t);
    });

    // 3. After step sequence completes, pause deliberately on the square before triggering ladder or snake!
    const stepCompletionDelay = (steps.length + 1) * stepDuration;
    // Deliberate 500ms resting pause on the ladder foot or snake mouth so the player clearly sees where they landed!
    const pauseBeforeEvent = (lastMove.ladder || lastMove.snake) ? 500 : 100;

    const finalizeTimeout = setTimeout(() => {
      setSteppingPlayerId(null);

      if (lastMove.ladder) {
        // Trigger ladder climb ONLY after the piece has deliberately arrived and rested at the bottom
        setActiveLadderId(lastMove.ladder.id);
        setClimbingPlayer(movingPlayer ?? null);
        setMoveBanner({
          text: `🪜 Super Climb! ${playerName} climbed ladder to square ${lastMove.to}!`,
          icon: "✨",
          color: "text-amber-300"
        });

        // Glide up ladder to top square (fallback timer)
        const climbTimer = setTimeout(() => {
          handleClimbDone(lastMove.playerId, lastMove.to);
          const bannerTimer = setTimeout(() => setMoveBanner(null), 1400);
          timeoutsRef.current.push(bannerTimer);
        }, 1500);
        timeoutsRef.current.push(climbTimer);
      } else if (lastMove.snake) {
        // Trigger snake swallow ONLY after the piece has deliberately arrived and rested at the mouth
        setActiveSnakeId(lastMove.snake.id);
        setSwallowingPlayer(movingPlayer ?? null);
        setMoveBanner({
          text: `🐍 GULP! ${playerName} swallowed down to square ${lastMove.to}!`,
          icon: "😱",
          color: "text-rose-400"
        });

        // Slide down snake to tail (fallback timer)
        const snakeTimer = setTimeout(() => {
          handleSwallowDone(lastMove.playerId, lastMove.to);
          const bannerTimer = setTimeout(() => setMoveBanner(null), 1400);
          timeoutsRef.current.push(bannerTimer);
        }, 2900);
        timeoutsRef.current.push(snakeTimer);
      } else {
        setVisualPositions((prev) => ({ ...prev, [lastMove.playerId]: lastMove.to }));
        const bannerTimer = setTimeout(() => setMoveBanner(null), 1800);
        timeoutsRef.current.push(bannerTimer);
      }
    }, stepCompletionDelay + pauseBeforeEvent);

    timeoutsRef.current.push(finalizeTimeout);

    return () => {
      clearAllTimeouts();
    };
  }, [lastMove, players, state.actionNumber]);

  // Group active on-board players by their current visual square for multi-piece offset math
  const playersBySquare = useMemo(() => {
    const map = new Map<number, PublicSnakesAndLaddersPlayer[]>();
    for (const p of players) {
      const sq = visualPositions[p.userId] ?? p.position;
      if (sq >= 1 && sq <= 100) {
        const list = map.get(sq) ?? [];
        list.push(p);
        map.set(sq, list);
      }
    }
    return map;
  }, [players, visualPositions]);

  // 100 Tiles array
  const tiles = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const square = i + 1;
      const coords = getSquareCoordinates(square);
      const color = getTileColor(square, coords.row, coords.col);
      return { square, ...coords, color };
    });
  }, []);

  return (
    <div className="relative flex h-full max-h-full aspect-square w-auto max-w-full items-center justify-center select-none">
      {/* Dynamic Action Notification Banner */}
      <AnimatePresence>
        {moveBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute -top-10 z-30 flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/95 px-4 py-1.5 shadow-2xl backdrop-blur-md pointer-events-none"
          >
            <span className="text-xl">{moveBanner.icon}</span>
            <span className={`text-xs font-black tracking-wide ${moveBanner.color}`}>
              {moveBanner.text}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Board Outer Container */}
      <div className="relative h-full w-full aspect-square rounded-3xl border-4 border-amber-950/80 bg-[#1e130b] p-2 sm:p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_2px_8px_rgba(255,255,255,0.15)]">
        {/* SVG Board Rendering Canvas */}
        <svg
          viewBox="0 0 1000 1000"
          className="h-full w-full rounded-2xl overflow-hidden shadow-inner"
        >
          <defs>
            {/* Tile Bevel Highlight & Shadow */}
            <filter id="tile-bevel" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
            </filter>

            {/* Glowing Aura Filter for Active & Current Player */}
            <filter id="turn-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. 100 Tiles Grid */}
          <g id="tiles-layer">
            {tiles.map((tile) => {
              const x = tile.col * 100;
              const y = tile.row * 100;
              const isTrophySquare = tile.square === 100;
              const isStartSquare = tile.square === 1;

              return (
                <g key={tile.square} transform={`translate(${x}, ${y})`}>
                  {/* Tile Rectangle */}
                  <rect
                    width="100"
                    height="100"
                    fill={tile.color}
                    stroke="#000000"
                    strokeWidth="1.5"
                    strokeOpacity="0.18"
                    filter="url(#tile-bevel)"
                  />

                  {/* Subtle Inner Gradient Overlay */}
                  <rect
                    width="100"
                    height="100"
                    fill="url(#tile-bevel)"
                    opacity="0.08"
                  />

                  {/* Square Number Label */}
                  <text
                    x="8"
                    y="22"
                    fontSize="17"
                    fontWeight="900"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                    fill="#000000"
                    fillOpacity="0.45"
                  >
                    {tile.square}
                  </text>
                  <text
                    x="7"
                    y="21"
                    fontSize="17"
                    fontWeight="900"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                    fill="#FFFFFF"
                    fillOpacity="0.9"
                  >
                    {tile.square}
                  </text>

                  {/* Special Start & Finish Emblems */}
                  {isTrophySquare ? (
                    <g transform="translate(50, 56)">
                      <text fontSize="40" textAnchor="middle" dominantBaseline="middle">
                        🏆
                      </text>
                    </g>
                  ) : isStartSquare ? (
                    <g transform="translate(50, 56)">
                      <text fontSize="34" textAnchor="middle" dominantBaseline="middle">
                        🚀
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>

          {/* 2. Ladders Layer */}
          <g id="ladders-layer">
            {board.ladders.map((ladder) => {
              const isClimbing = activeLadderId === ladder.id;
              const pieceInfo = climbingPlayer
                ? SNAKES_AND_LADDERS_PIECES.find((p) => p.id === climbingPlayer.piece)
                : null;
              const playerColor = climbingPlayer
                ? PLAYER_COLORS[climbingPlayer.seat % PLAYER_COLORS.length]
                : "#F59E0B";

              return (
                <LadderSvg
                  key={ladder.id}
                  id={ladder.id}
                  from={ladder.from}
                  to={ladder.to}
                  isClimbing={isClimbing}
                  climbingPieceEmoji={pieceInfo?.emoji}
                  climbingColor={playerColor}
                  onClimbComplete={() => {
                    if (climbingPlayer) {
                      handleClimbDone(climbingPlayer.userId, ladder.to);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* 3. Snakes Layer */}
          <g id="snakes-layer">
            {board.snakes.map((snake) => {
              const isSwallowing = activeSnakeId === snake.id;
              const pieceInfo = swallowingPlayer
                ? SNAKES_AND_LADDERS_PIECES.find((p) => p.id === swallowingPlayer.piece)
                : null;
              const playerColor = swallowingPlayer
                ? PLAYER_COLORS[swallowingPlayer.seat % PLAYER_COLORS.length]
                : "#EF4444";

              return (
                <SnakeSvg
                  key={snake.id}
                  id={snake.id}
                  from={snake.from}
                  to={snake.to}
                  isSwallowing={isSwallowing}
                  swallowedPieceEmoji={pieceInfo?.emoji}
                  swallowedColor={playerColor}
                  onSwallowComplete={() => {
                    if (swallowingPlayer) {
                      handleSwallowDone(swallowingPlayer.userId, snake.to);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* 4. Player Tokens on Board Layer - Stepping animation with persistent motion nodes */}
          <g id="tokens-layer">
            {players
              .filter((player) => {
                const pos = visualPositions[player.userId] ?? player.position;
                if (pos < 1) return false;
                // While actively climbing ladder, the animated piece in LadderSvg is active; hide static token at bottom
                if (activeLadderId && climbingPlayer?.userId === player.userId) return false;
                // While actively swallowed in snake, the digestion blob in SnakeSvg is active; hide static token at mouth
                if (activeSnakeId && swallowingPlayer?.userId === player.userId) return false;
                return true;
              })
              .map((player) => {
                const currentSq = visualPositions[player.userId] ?? player.position;
                const coords = getSquareCoordinates(currentSq);
                const cx = coords.xPercent * 10;
                const cy = coords.yPercent * 10;
                const squarePlayers = playersBySquare.get(currentSq) ?? [player];
                const count = squarePlayers.length;
                const idx = squarePlayers.findIndex((p) => p.userId === player.userId);

                // Offset calculations for multiple pieces on same square
                let ox = 0;
                let oy = 0;
                const baseRadius = count === 1 ? 26 : count === 2 ? 22 : 18;
                const emojiSize = count === 1 ? 27 : count === 2 ? 22 : 18;

                if (count === 2) {
                  ox = idx === 0 ? -17 : 17;
                } else if (count === 3) {
                  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
                  ox = Math.cos(angles[idx] ?? 0) * 20;
                  oy = Math.sin(angles[idx] ?? 0) * 20;
                } else if (count >= 4) {
                  const angle = (idx / count) * 2 * Math.PI;
                  ox = Math.cos(angle) * 24;
                  oy = Math.sin(angle) * 24;
                }

                const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
                const isTurn = player.userId === currentPlayerId;
                const isMe = player.userId === currentUserId;
                const isStepping = steppingPlayerId === player.userId;
                const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";
                const badge = getPlayerBadge(player, currentUserId);

                return (
                  <motion.g
                    key={player.userId}
                    animate={{
                      x: cx + ox,
                      y: cy + oy
                    }}
                    transition={{
                      duration: 0.22,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                  >
                    {/* Current turn pulsing outer ring */}
                    {isTurn ? (
                      <circle
                        r={baseRadius + 8}
                        fill={color}
                        opacity="0.35"
                        className="animate-ping"
                      />
                    ) : null}

                    {/* Distinct Glow for Current Turn & User */}
                    {isTurn || isMe ? (
                      <circle
                        r={baseRadius + 4}
                        fill="none"
                        stroke={isMe ? "#FBBF24" : color}
                        strokeWidth="3.5"
                        strokeDasharray={isTurn ? "8 4" : "none"}
                        opacity="0.9"
                        filter="url(#turn-glow)"
                      />
                    ) : null}

                    {/* Player Token Base Disc - Big & Solid with Colored Ring */}
                    <circle
                      r={baseRadius}
                      fill="#FFFFFF"
                      stroke={color}
                      strokeWidth={isTurn || isMe ? "4.5" : "3.5"}
                      filter="drop-shadow(0 6px 10px rgba(0,0,0,0.6))"
                    />

                    {/* Token Custom Emoji Icon - Prominent & Big */}
                    <text
                      y={baseRadius * 0.35}
                      textAnchor="middle"
                      fontSize={emojiSize}
                      className="pointer-events-none select-none"
                    >
                      {pieceInfo?.emoji ?? "🎲"}
                    </text>

                    {/* Player Distinction Pill Badge */}
                    <g transform={`translate(0, ${-baseRadius - 2})`}>
                      <rect
                        x={badge.length > 3 ? "-18" : "-13"}
                        y="-9"
                        width={badge.length > 3 ? "36" : "26"}
                        height="13"
                        rx="6"
                        fill="#0F172A"
                        stroke={isMe ? "#FBBF24" : color}
                        strokeWidth="1.5"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                      />
                      <text
                        x="0"
                        y="1.5"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="900"
                        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                        fill={isMe ? "#FBBF24" : "#FFFFFF"}
                      >
                        {badge}
                      </text>
                    </g>
                  </motion.g>
                );
              })}
          </g>
        </svg>
      </div>
    </div>
  );
}
