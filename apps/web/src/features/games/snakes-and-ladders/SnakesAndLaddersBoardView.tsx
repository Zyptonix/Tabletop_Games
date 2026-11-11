"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSquareCoordinates,
  SNAKES_AND_LADDERS_PIECES,
  type PublicSnakesAndLaddersPlayer,
  type PublicSnakesAndLaddersState,
  type SnakesAndLaddersMoveEvent
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

interface SnakesAndLaddersBoardViewProps {
  state: PublicSnakesAndLaddersState;
  currentUserId: string | null;
  onSelectTile?: (square: number) => void;
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

  // Trigger animations based on lastMove
  useEffect(() => {
    if (!lastMove) return;

    const movingPlayer = players.find((p) => p.userId === lastMove.playerId);
    const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === movingPlayer?.piece);
    const pieceEmoji = pieceInfo?.emoji ?? "🎲";
    const playerName = movingPlayer?.displayName ?? "Player";

    if (lastMove.entered) {
      setMoveBanner({
        text: `${playerName} rolled a 1 and entered the board! ${pieceEmoji}`,
        icon: "🚀",
        color: "text-emerald-300"
      });
      const timer = setTimeout(() => setMoveBanner(null), 3200);
      return () => clearTimeout(timer);
    }

    if (lastMove.ladder) {
      setActiveLadderId(lastMove.ladder.id);
      setClimbingPlayer(movingPlayer ?? null);
      setMoveBanner({
        text: `🪜 Super Climb! ${playerName} climbed ladder to square ${lastMove.to}!`,
        icon: "✨",
        color: "text-amber-300"
      });

      const timer = setTimeout(() => {
        setActiveLadderId(null);
        setClimbingPlayer(null);
        setMoveBanner(null);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (lastMove.snake) {
      setActiveSnakeId(lastMove.snake.id);
      setSwallowingPlayer(movingPlayer ?? null);
      setMoveBanner({
        text: `🐍 GULP! ${playerName} swallowed down to square ${lastMove.to}!`,
        icon: "😱",
        color: "text-rose-400"
      });

      const timer = setTimeout(() => {
        setActiveSnakeId(null);
        setSwallowingPlayer(null);
        setMoveBanner(null);
      }, 2900);
      return () => clearTimeout(timer);
    }

    if (lastMove.bounced) {
      setMoveBanner({
        text: `🎯 Bounce Back! Overshot 100, bounced back to square ${lastMove.to}!`,
        icon: "↩️",
        color: "text-purple-300"
      });
      const timer = setTimeout(() => setMoveBanner(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastMove, players]);

  // Group players by board square (only for position >= 1)
  const playersBySquare = useMemo(() => {
    const map = new Map<number, PublicSnakesAndLaddersPlayer[]>();
    for (const p of players) {
      if (p.position >= 1 && p.position <= 100) {
        // If player is currently being swallowed, hide them from head square during swallow animation
        if (activeSnakeId && swallowingPlayer?.userId === p.userId) {
          continue;
        }
        // If player is climbing, hide them during climb animation (LadderSvg renders them)
        if (activeLadderId && climbingPlayer?.userId === p.userId) {
          continue;
        }
        const list = map.get(p.position) ?? [];
        list.push(p);
        map.set(p.position, list);
      }
    }
    return map;
  }, [players, activeSnakeId, swallowingPlayer, activeLadderId, climbingPlayer]);

  // Players waiting at home base (position === 0)
  const homeBasePlayers = useMemo(() => {
    return players.filter((p) => p.position === 0);
  }, [players]);

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
    <div className="relative mx-auto flex w-full max-w-[760px] flex-col items-center select-none">
      {/* Dynamic Action Notification Banner */}
      <AnimatePresence>
        {moveBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute -top-12 z-30 flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 px-4 py-1.5 shadow-2xl backdrop-blur-md"
          >
            <span className="text-xl">{moveBanner.icon}</span>
            <span className={`text-xs font-black tracking-wide ${moveBanner.color}`}>
              {moveBanner.text}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Board Outer Container */}
      <div className="relative w-full aspect-square rounded-3xl border-4 border-amber-950/80 bg-[#1e130b] p-2.5 sm:p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_2px_8px_rgba(255,255,255,0.15)]">
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
                    fill="white"
                    fillOpacity="0.06"
                  />

                  {/* Tile Number Text */}
                  <text
                    x={isTrophySquare ? "30" : "88"}
                    y="32"
                    textAnchor={isTrophySquare ? "middle" : "end"}
                    fontSize={isTrophySquare ? "22" : "21"}
                    fontWeight="900"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                    fill={isTrophySquare ? "#78350F" : "#0F172A"}
                    opacity={isTrophySquare ? 0.95 : 0.85}
                    style={{ filter: "drop-shadow(0 1px 1px rgba(255,255,255,0.7))" }}
                  >
                    {tile.square}
                  </text>

                  {/* Special Markers: Trophy on 100, Start on 1 */}
                  {isTrophySquare ? (
                    <g transform="translate(62, 54)">
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fontSize="46"
                        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
                      >
                        🏆
                      </text>
                    </g>
                  ) : null}

                  {isStartSquare ? (
                    <text
                      x="50"
                      y="78"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="900"
                      fill="#064E3B"
                      letterSpacing="1"
                    >
                      START 🏁
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>

          {/* 2. Ladders Layer */}
          <g id="ladders-layer">
            {board.ladders.map((ladder) => {
              const isClimbing = activeLadderId === ladder.id;
              const pieceInfo = SNAKES_AND_LADDERS_PIECES.find(
                (p) => p.id === climbingPlayer?.piece
              );
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
                />
              );
            })}
          </g>

          {/* 3. Snakes Layer */}
          <g id="snakes-layer">
            {board.snakes.map((snake) => {
              const isSwallowing = activeSnakeId === snake.id;
              const pieceInfo = SNAKES_AND_LADDERS_PIECES.find(
                (p) => p.id === swallowingPlayer?.piece
              );
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
                    setActiveSnakeId(null);
                    setSwallowingPlayer(null);
                  }}
                />
              );
            })}
          </g>

          {/* 4. Player Tokens on Board Layer */}
          <g id="tokens-layer">
            {Array.from(playersBySquare.entries()).map(([square, squarePlayers]) => {
              const coords = getSquareCoordinates(square);
              const cx = coords.xPercent * 10;
              const cy = coords.yPercent * 10;
              const count = squarePlayers.length;

              return (
                <g key={square}>
                  {squarePlayers.map((player, idx) => {
                    // Offset calculations for multiple pieces on same square
                    let ox = 0;
                    let oy = 0;
                    if (count === 2) {
                      ox = idx === 0 ? -14 : 14;
                    } else if (count === 3) {
                      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
                      ox = Math.cos(angles[idx]!) * 18;
                      oy = Math.sin(angles[idx]!) * 18;
                    } else if (count >= 4) {
                      const angle = (idx / count) * 2 * Math.PI;
                      ox = Math.cos(angle) * 22;
                      oy = Math.sin(angle) * 22;
                    }

                    const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
                    const isTurn = player.userId === currentPlayerId;
                    const isMe = player.userId === currentUserId;
                    const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";

                    return (
                      <g
                        key={player.userId}
                        transform={`translate(${cx + ox}, ${cy + oy})`}
                      >
                        {/* Current turn pulsing highlight */}
                        {isTurn ? (
                          <circle
                            r="24"
                            fill={color}
                            opacity="0.35"
                            className="animate-ping"
                          />
                        ) : null}

                        {/* Player Token Base Disc */}
                        <circle
                          r="19"
                          fill="#FFFFFF"
                          stroke={color}
                          strokeWidth={isTurn || isMe ? "4" : "3"}
                          filter="drop-shadow(0 4px 7px rgba(0,0,0,0.45))"
                        />

                        {/* Token Emoji Icon */}
                        <text
                          y="6.5"
                          textAnchor="middle"
                          fontSize="21"
                          className="pointer-events-none select-none"
                        >
                          {pieceInfo?.emoji ?? "🎲"}
                        </text>

                        {/* You indicator badge */}
                        {isMe ? (
                          <g transform="translate(0, -18)">
                            <rect
                              x="-14"
                              y="-8"
                              width="28"
                              height="13"
                              rx="6"
                              fill="#0F172A"
                              stroke="#FBBF24"
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="2"
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="900"
                              fill="#FBBF24"
                            >
                              YOU
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* OFF-BOARD STARTING DOCK / HOME BASE (Players with position === 0) */}
      <div className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0c1824]/90 p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🏕️</span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              Starting Camp (Off-Board)
            </span>
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200">
              {homeBasePlayers.length} waiting
            </span>
          </div>
          <span className="text-[11px] font-semibold text-white/50">
            🎲 Bangladesh Rule: Roll a <strong>1</strong> to enter square 1!
          </span>
        </div>

        {homeBasePlayers.length === 0 ? (
          <p className="mt-2 text-center text-xs font-bold text-white/30 py-1">
            All players have launched onto the track! 🏁
          </p>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {homeBasePlayers.map((player) => {
              const pieceInfo = SNAKES_AND_LADDERS_PIECES.find((p) => p.id === player.piece);
              const isTurn = player.userId === currentPlayerId;
              const isMe = player.userId === currentUserId;
              const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#F59E0B";

              return (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all ${
                    isTurn
                      ? "border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg border-2 text-base shadow"
                    style={{ borderColor: color, backgroundColor: `${color}20` }}
                  >
                    {pieceInfo?.emoji ?? "🎲"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate max-w-[90px]">
                      {player.displayName} {isMe ? "(You)" : ""}
                    </p>
                    <p className="text-[10px] font-bold text-amber-300/80">
                      Needs 1 to enter
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
