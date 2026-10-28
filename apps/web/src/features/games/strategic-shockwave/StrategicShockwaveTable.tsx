/* TABLETOP GAME ENGINE CONTINUATION V3 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GameEvent, PublicStrategicShockwaveState, ShockwaveTile } from "@tabletop/game-core";
import type { RoomStateView } from "@tabletop/shared";

type Point = { x: number; y: number };
const TILE = 40;
const PLAYER_COLORS = [
  "#38bdf8", // Cyan
  "#fb7185", // Rose
  "#facc15", // Amber
  "#a78bfa", // Purple
  "#4ade80", // Emerald
  "#fb923c", // Orange
  "#f472b6", // Pink
  "#2dd4bf", // Teal
  "#c084fc", // Violet
  "#e2e8f0"  // Slate
];

function shortName(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value;
}

// -------------------------------------------------------------
// PUMMEL PARTY "STRATEGIC SHOCKWAVE" 2.5D / 3D CANVAS RENDERER
// -------------------------------------------------------------

function drawCobblestoneFloor(ctx: CanvasRenderingContext2D, px: number, py: number, col: number, row: number) {
  // Base dark damp mossy earth
  ctx.fillStyle = (col + row) % 2 === 0 ? "#12251e" : "#0e1f19";
  ctx.fillRect(px, py, TILE, TILE);

  // Cobblestone paver tiles with depth
  const inset = 2;
  ctx.fillStyle = (col + row) % 2 === 0 ? "#183329" : "#142c23";
  ctx.fillRect(px + inset, py + inset, TILE - inset * 2, TILE - inset * 2);

  // Paver top-left highlight bevel
  ctx.fillStyle = "rgba(110, 231, 183, 0.08)";
  ctx.fillRect(px + inset, py + inset, TILE - inset * 2, 2);
  ctx.fillRect(px + inset, py + inset, 2, TILE - inset * 2);

  // Paver bottom-right shadow bevel
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(px + inset, py + TILE - inset - 2, TILE - inset * 2, 2);
  ctx.fillRect(px + TILE - inset - 2, py + inset, 2, TILE - inset * 2);

  // Subtle moss patches and cracks
  if ((col * 7 + row * 13) % 5 === 0) {
    ctx.fillStyle = "rgba(52, 211, 153, 0.15)";
    ctx.beginPath();
    ctx.arc(px + 12, py + 14, 4, 0, Math.PI * 2);
    ctx.arc(px + 15, py + 13, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if ((col * 11 + row * 3) % 4 === 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(px + 22, py + 18, 5, 1);
    ctx.fillRect(px + 24, py + 19, 3, 1);
  }
}

function drawStoneWall(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // Cast shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(px + 4, py + TILE - 4, TILE - 4, 6);

  // Wall Base / Front Face (Dark Chiseled Stone)
  ctx.fillStyle = "#152a22";
  ctx.fillRect(px, py + 6, TILE, TILE - 6);

  // Chiseled front vertical grooves
  ctx.fillStyle = "#0c1b15";
  ctx.fillRect(px + 12, py + 8, 2, TILE - 9);
  ctx.fillRect(px + 26, py + 8, 2, TILE - 9);

  // Wall Top Face (3D Elevated Stone Cap)
  ctx.fillStyle = "#26483c";
  ctx.fillRect(px, py, TILE, 8);

  // Top Face Highlight
  ctx.fillStyle = "#3d6d5c";
  ctx.fillRect(px + 1, py + 1, TILE - 2, 2);

  // Moss on the stone pillar top
  ctx.fillStyle = "#4ade80";
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(px + 10, py + 4, 3.5, 0, Math.PI * 2);
  ctx.arc(px + 28, py + 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Outer border outline
  ctx.strokeStyle = "#08130e";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 0.75, py + 0.75, TILE - 1.5, TILE - 1.5);
}

function drawHazardBlock(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // Cast Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(px + 3, py + TILE - 3, TILE - 3, 5);

  // Black block foundation
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);

  // High-contrast Yellow and Black Diagonal Hazard Stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.clip();

  // Solid Caution Yellow base
  ctx.fillStyle = "#facc15";
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);

  // Jet Black 45-degree diagonal stripes
  ctx.fillStyle = "#09090b";
  const stripeWidth = 9;
  for (let x = -TILE * 2; x < TILE * 3; x += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(px + x, py);
    ctx.lineTo(px + x + stripeWidth, py);
    ctx.lineTo(px + x + stripeWidth + TILE, py + TILE);
    ctx.lineTo(px + x + TILE, py + TILE);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Top highlight bevel & bottom shadow bevel
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(px + 2, py + 2, TILE - 4, 2.5);
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(px + 2, py + TILE - 4.5, TILE - 4, 2.5);

  // Caution Yellow Inner Frame Border
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);

  // Deep Black Outer Edge
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 0.75, py + 0.75, TILE - 1.5, TILE - 1.5);
}

function drawWoodCrate(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // Cast Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(px + 3, py + TILE - 3, TILE - 3, 5);

  // Wood base foundation
  ctx.fillStyle = "#5c3317";
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);

  // 3 Horizontal Planks
  const plankH = (TILE - 4) / 3;
  for (let i = 0; i < 3; i++) {
    const plankY = py + 2 + i * plankH;
    ctx.fillStyle = i % 2 === 0 ? "#854d0e" : "#78350f";
    ctx.fillRect(px + 2, plankY, TILE - 4, plankH - 1);

    // Plank top highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(px + 2, plankY, TILE - 4, 1.2);

    // Plank bottom shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(px + 2, plankY + plankH - 2, TILE - 4, 1);
  }

  // Cross Diagonal Braces (Wood X)
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 4);
  ctx.lineTo(px + TILE - 4, py + TILE - 4);
  ctx.moveTo(px + TILE - 4, py + 4);
  ctx.lineTo(px + 4, py + TILE - 4);
  ctx.stroke();

  // Iron Corner Reinforcements
  const bracket = 7;
  ctx.fillStyle = "#334155"; // Dark iron
  ctx.fillRect(px + 1, py + 1, bracket, 2.5);
  ctx.fillRect(px + 1, py + 1, 2.5, bracket);
  ctx.fillRect(px + TILE - bracket - 1, py + 1, bracket, 2.5);
  ctx.fillRect(px + TILE - 3.5, py + 1, 2.5, bracket);
  ctx.fillRect(px + 1, py + TILE - 3.5, bracket, 2.5);
  ctx.fillRect(px + 1, py + TILE - bracket - 1, 2.5, bracket);
  ctx.fillRect(px + TILE - bracket - 1, py + TILE - 3.5, bracket, 2.5);
  ctx.fillRect(px + TILE - 3.5, py + TILE - bracket - 1, 2.5, bracket);

  // Silver Rivets
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(px + 3, py + 3, 1.5, 1.5);
  ctx.fillRect(px + TILE - 4.5, py + 3, 1.5, 1.5);
  ctx.fillRect(px + 3, py + TILE - 4.5, 1.5, 1.5);
  ctx.fillRect(px + TILE - 4.5, py + TILE - 4.5, 1.5, 1.5);

  // Outer border
  ctx.strokeStyle = "#271202";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
}

function drawTile(ctx: CanvasRenderingContext2D, tile: ShockwaveTile, col: number, row: number) {
  const px = col * TILE;
  const py = row * TILE;

  // Floor is always drawn underneath
  drawCobblestoneFloor(ctx, px, py, col, row);

  if (tile === "wall") {
    // SOLID INDESTRUCTIBLE WALLS: Black and Yellow Hazard Blocks!
    drawHazardBlock(ctx, px, py);
  } else if (tile === "block") {
    // BREAKABLE BLOCKS: Destructible Wooden Crates!
    drawWoodCrate(ctx, px, py);
  }
}

function drawGame(ctx: CanvasRenderingContext2D, state: PublicStrategicShockwaveState, now: number) {
  const width = state.width * TILE;
  const height = state.height * TILE;
  ctx.clearRect(0, 0, width, height);

  // Deep dark ambient vignette border
  ctx.fillStyle = "#08130f";
  ctx.fillRect(0, 0, width, height);

  // 1. Draw Map Tiles
  state.board.forEach((row, y) => row.forEach((tile, x) => drawTile(ctx, tile, x, y)));

  // 2. High-visibility Danger Square Light Indicators (Vivid Red Blast Cross & Floor Danger Laser)
  for (const bomb of state.bombs) {
    const fuseMs = bomb.explodeAt - now;
    const isCritical = fuseMs < 750;
    const pulseSpeed = isCritical ? 45 : 100;
    const pulse = 0.5 + Math.sin(now / pulseSpeed) * 0.4;

    const threatCells: Array<{ x: number; y: number; isOrigin: boolean }> = [{ x: bomb.x, y: bomb.y, isOrigin: true }];
    for (const direction of [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ]) {
      for (let distance = 1; distance <= bomb.blastRange; distance += 1) {
        const x = bomb.x + direction.x * distance;
        const y = bomb.y + direction.y * distance;
        const tile = state.board[y]?.[x];
        if (tile === undefined || tile === "wall") break;
        threatCells.push({ x, y, isOrigin: false });
        if (tile === "block") break;
      }
    }

    for (const cell of threatCells) {
      const px = cell.x * TILE;
      const py = cell.y * TILE;
      const cx = px + TILE / 2;
      const cy = py + TILE / 2;

      ctx.save();
      // 1. Vivid Glowing Danger Light Beam
      ctx.fillStyle = isCritical ? `rgba(239, 68, 68, ${0.48 + pulse * 0.3})` : `rgba(220, 38, 38, ${0.28 + pulse * 0.25})`;
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);

      // 2. High-contrast Neon Red Hazard Border
      ctx.strokeStyle = isCritical ? "rgba(254, 226, 226, 0.95)" : `rgba(248, 113, 113, ${0.75 + pulse * 0.25})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 10;
      ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);

      // 3. Central Laser Shockwave Beam
      ctx.strokeStyle = `rgba(254, 202, 202, ${0.5 + pulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 4, cy);
      ctx.lineTo(px + TILE - 4, cy);
      ctx.moveTo(cx, py + 4);
      ctx.lineTo(cx, py + TILE - 4);
      ctx.stroke();

      // 4. Danger Skull Beacon Icon (on path cells)
      if (!cell.isOrigin) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 13px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        ctx.fillText("☠", cx, cy + 0.5);
      }
      ctx.restore();
    }
  }

  // 3. Power-Ups (Floating 3D Crystals & Gems)
  for (const powerUp of state.powerUps) {
    const cx = (powerUp.x + 0.5) * TILE;
    const cy = (powerUp.y + 0.5) * TILE;
    const bob = Math.sin(now / 200 + powerUp.x) * 3;

    // Power-up ground aura
    const color = powerUp.kind === "bomb" ? "#38bdf8" : powerUp.kind === "flame" ? "#fb923c" : "#4ade80";
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25 + Math.sin(now / 150) * 0.1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating gem body
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - 12, cy - 12 + bob, 24, 24, 7);
    ctx.fill();

    // Inner Specular Glint
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.roundRect(cx - 10, cy - 10 + bob, 20, 6, 3);
    ctx.fill();

    // Icon Glyph
    ctx.fillStyle = "#0a1813";
    ctx.font = "900 13px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyph = powerUp.kind === "bomb" ? "💣" : powerUp.kind === "flame" ? "🔥" : "⚡";
    ctx.fillText(glyph, cx, cy + 1 + bob);
    ctx.restore();
  }

  // 4. Bombs (3D Gunmetal Spheres with Sizzling Fuse)
  for (const bomb of state.bombs) {
    const cx = (bomb.x + 0.5) * TILE;
    const cy = (bomb.y + 0.5) * TILE;
    const fuseMs = bomb.explodeAt - now;
    const fuseRatio = Math.max(0, Math.min(1, fuseMs / 2000));
    const isCritical = fuseMs < 750;
    const criticalBlink = isCritical && Math.floor(now / 80) % 2 === 0;

    ctx.save();
    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 11, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Danger Aura Ring when close to detonating
    if (isCritical) {
      ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 18 + Math.sin(now / 40) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3D Shaded Gunmetal Sphere
    const sphereGrad = ctx.createRadialGradient(cx - 4, cy - 3, 2, cx, cy + 2, 14);
    if (criticalBlink) {
      sphereGrad.addColorStop(0, "#fecdd3");
      sphereGrad.addColorStop(0.3, "#e11d48");
      sphereGrad.addColorStop(1, "#4c0519");
    } else {
      sphereGrad.addColorStop(0, "#94a3b8");
      sphereGrad.addColorStop(0.35, "#334155");
      sphereGrad.addColorStop(1, "#090d16");
    }

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 13.5, 0, Math.PI * 2);
    ctx.fill();

    // Brass Fuse Collar
    ctx.fillStyle = "#d97706";
    ctx.fillRect(cx - 3, cy - 13, 6, 4);

    // Fuse Arc
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuseRatio);
    ctx.stroke();

    // Sizzling Spark Particles
    const sparkX = cx + 8 * Math.cos(now / 50);
    const sparkY = cy - 15 + Math.sin(now / 50) * 2;
    ctx.fillStyle = criticalBlink ? "#ffffff" : "#f59e0b";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Explosions (Fiery Shockwave Plasm & Smoke)
  for (const explosion of state.explosions) {
    const remaining = Math.max(0, Math.min(1, (explosion.expiresAt - now) / 650));
    ctx.save();

    for (const cell of explosion.cells) {
      const cx = (cell.x + 0.5) * TILE;
      const cy = (cell.y + 0.5) * TILE;

      // Fiery Blast Plasma Core
      const blastRadius = (TILE / 2) * (0.85 + (1 - remaining) * 0.35);
      const fireGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, blastRadius);
      fireGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      fireGrad.addColorStop(0.3, "rgba(253, 224, 71, 0.9)");
      fireGrad.addColorStop(0.7, "rgba(249, 115, 22, 0.85)");
      fireGrad.addColorStop(1, "rgba(239, 68, 68, 0)");

      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, blastRadius, 0, Math.PI * 2);
      ctx.fill();

      // Shockwave ring
      ctx.strokeStyle = `rgba(254, 240, 138, ${remaining * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, (TILE / 2) * (1 - remaining + 0.5), 0, Math.PI * 2);
      ctx.stroke();

      // Flying sparks
      for (let s = 0; s < 3; s++) {
        const angle = (now / 40 + s * 2.1) % (Math.PI * 2);
        const dist = 12 * (1 - remaining);
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 6. Pummel Party Style Characters
  for (const player of state.players) {
    if (!player.alive) continue;
    const cx = player.x * TILE;
    const cy = player.y * TILE;
    const color = PLAYER_COLORS[player.seat % PLAYER_COLORS.length] ?? "#ffffff";
    const invulnerable = player.invulnerableUntil > now;

    // Subtle idle/running bounce
    const bounce = Math.abs(Math.sin(now / 110 + player.seat)) * 2;

    ctx.save();

    // Oval Drop Shadow on ground
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invulnerability Shield Halo
    if (invulnerable) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(now / 70) * 0.35})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy + 2 - bounce, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 3D Shaded Cute Character Body (Pummel Party Chibi)
    const bodyGrad = ctx.createRadialGradient(cx - 3, cy - 2 - bounce, 2, cx, cy + 2 - bounce, 13);
    bodyGrad.addColorStop(0, "#ffffff");
    bodyGrad.addColorStop(0.25, color);
    bodyGrad.addColorStop(1, "#0f172a");

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 2 - bounce, 12.5, 0, Math.PI * 2);
    ctx.fill();

    // Body Outline
    ctx.strokeStyle = invulnerable ? "#ffffff" : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing Expressive Visor / Eyes
    const lookX = cx;
    const lookY = cy - 1 - bounce;

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    // Left eye
    ctx.beginPath();
    ctx.ellipse(lookX - 3.5, lookY, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.ellipse(lookX + 3.5, lookY, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head Crown / Badge for Bots or Player
    if (player.isBot) {
      ctx.fillStyle = "#10b981";
      ctx.font = "900 8px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AI", cx, cy - 11 - bounce);
    }

    // Nameplate Pill
    const label = shortName(player.displayName);
    ctx.font = "800 10px ui-sans-serif, system-ui";
    const labelWidth = ctx.measureText(label).width + 12;

    ctx.fillStyle = "rgba(4, 15, 12, 0.88)";
    ctx.beginPath();
    ctx.roundRect(cx - labelWidth / 2, cy - 28 - bounce, labelWidth, 15, 6);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy - 20 - bounce);

    ctx.restore();
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

export function StrategicShockwaveTable({
  room,
  state,
  currentUserId,
  gameEvents = [],
  onAction,
  onChat,
  onPause,
  onResume,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicStrategicShockwaveState;
  currentUserId: string;
  gameEvents?: GameEvent[];
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onPause?: ((roomId: string) => void) | undefined;
  onResume?: ((roomId: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const actionRef = useRef(onAction);
  const keysRef = useRef(new Set<string>());
  const lastInputRef = useRef("0,0");
  const canPlayRef = useRef(
    room.status === "in_game" &&
      state.phase === "playing" &&
      Boolean(state.players.find((player) => player.userId === currentUserId)?.alive)
  );
  const [chatDraft, setChatDraft] = useState("");
  const [localNow, setLocalNow] = useState(() => Date.now());
  const mobileActionRef = useRef(onAction);
  const mobileInputIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    mobileActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => () => {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    mobileActionRef.current("set_input", { x: 0, y: 0 });
  }, []);

  function startMobileMove(x: number, y: number) {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    const send = () => mobileActionRef.current("set_input", { x, y });
    send();
    mobileInputIntervalRef.current = window.setInterval(send, 60);
  }

  function stopMobileMove() {
    if (mobileInputIntervalRef.current !== null) window.clearInterval(mobileInputIntervalRef.current);
    mobileInputIntervalRef.current = null;
    mobileActionRef.current("set_input", { x: 0, y: 0 });
  }

  const me = state.players.find((player) => player.userId === currentUserId);
  const isHost = room.effectiveHostUserId === currentUserId;
  const alivePlayers = state.players.filter((player) => player.alive);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    actionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    canPlayRef.current =
      room.status === "in_game" &&
      state.phase === "playing" &&
      Boolean(state.players.find((player) => player.userId === currentUserId)?.alive);
  }, [room.status, state.phase, state.players, currentUserId]);

  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = state.width * TILE;
    canvas.height = state.height * TILE;
    const render = () => {
      const current = stateRef.current;
      drawGame(ctx, current, Date.now());
      frame = window.requestAnimationFrame(render);
    };
    render();
    return () => window.cancelAnimationFrame(frame);
  }, [state.width, state.height]);

  useEffect(() => {
    const sendCurrentInput = (force = false) => {
      if (!canPlayRef.current) return;
      const keys = keysRef.current;
      const x = Number(keys.has("right")) - Number(keys.has("left"));
      const y = Number(keys.has("down")) - Number(keys.has("up"));
      const key = `${x},${y}`;
      if (!force && key === lastInputRef.current) return;
      lastInputRef.current = key;
      actionRef.current("set_input", { x, y });
    };

    const mapKey = (event: KeyboardEvent): string | null => {
      const directionByCode: Record<string, string> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        KeyW: "up",
        KeyS: "down",
        KeyA: "left",
        KeyD: "right"
      };
      const directionByKey: Record<string, string> = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
      };
      const byCode = directionByCode[event.code];
      if (byCode) return byCode;
      return directionByKey[event.key.toLowerCase()] ?? null;
    };

    const down = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (canPlayRef.current && !event.repeat) actionRef.current("place_bomb", {});
        return;
      }
      const direction = mapKey(event);
      if (!direction) return;
      event.preventDefault();
      const wasPressed = keysRef.current.has(direction);
      keysRef.current.add(direction);
      if (!wasPressed) sendCurrentInput(true);
    };

    const up = (event: KeyboardEvent) => {
      const direction = mapKey(event);
      if (!direction) return;
      event.preventDefault();
      if (keysRef.current.delete(direction)) sendCurrentInput(true);
    };

    const clear = () => {
      keysRef.current.clear();
      sendCurrentInput(true);
    };

    const onVisibilityChange = () => {
      if (document.hidden) clear();
    };

    const heartbeat = window.setInterval(() => {
      const keys = keysRef.current;
      if (canPlayRef.current && keys.size > 0) sendCurrentInput(true);
    }, 60);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setLocalNow(Date.now()), 150);
    return () => window.clearInterval(interval);
  }, []);

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message || !onChat) return;
    onChat(room.id, message);
    setChatDraft("");
  }

  const remainingMs = state.deadlineAt - localNow;
  const winner = state.players.find((player) => player.userId === state.winnerUserId);
  const newestEvents = gameEvents.slice(-4).reverse();

  return (
    <div className="tt-game-viewport strategic-shockwave-screen h-dvh bg-[#07120f] overflow-hidden px-3 py-2 text-white sm:px-4 lg:px-5">
      <div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-2 space-y-0">
        {/* TOP STATUS BAR */}
        <header className="flex flex-col gap-3 rounded-2xl border border-emerald-900/80 bg-[#10231c] p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
              Pummel Party Mode / Room {room.code}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              STRATEGIC <span className="text-amber-400">SHOCKWAVE</span>
            </h1>
            <p className="mt-0.5 text-xs text-emerald-100/70">
              Blast crates, evade shockwaves, and eliminate your rivals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">Time left</p>
              <p className={`font-mono text-2xl font-black ${remainingMs < 15_000 ? "text-rose-300 animate-pulse" : "text-white"}`}>
                {formatTime(remainingMs)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">Still alive</p>
              <p className="text-2xl font-black">
                {alivePlayers.length}
                <span className="text-sm text-white/50">/{state.players.length}</span>
              </p>
            </div>
            {room.status === "in_game" && isHost ? (
              <button
                type="button"
                onClick={() => onPause?.(room.id)}
                className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold hover:bg-white/10"
              >
                Pause
              </button>
            ) : null}
            {room.status === "paused" && isHost ? (
              <button
                type="button"
                onClick={() => onResume?.(room.id)}
                className="min-h-11 rounded-xl bg-emerald-500 px-3 text-sm font-black text-emerald-950 hover:bg-emerald-400"
              >
                Resume
              </button>
            ) : null}
            {isHost && room.status !== "finished" ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("End this match for everyone?")) onEndMatch?.(room.id);
                }}
                className="min-h-11 rounded-xl border border-rose-400/40 px-3 text-sm font-bold text-rose-200 hover:bg-rose-950/60"
              >
                End match
              </button>
            ) : null}
          </div>
        </header>

        {/* MAIN ARENA & SIDEBAR */}
        <div className="grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_310px]">
          {/* 3D ARENA VIEWPORT */}
          <section className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-emerald-900/80 bg-[#0d1d17] p-2 shadow-2xl sm:p-4">
            <div className="relative mx-auto max-w-[780px] overflow-hidden rounded-2xl border-2 border-emerald-400/25 bg-[#091511] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(16,185,129,0.08)]">
              <canvas
                ref={canvasRef}
                aria-label="Strategic Shockwave 3D bomb arena"
                className="block h-auto max-h-[calc(100dvh-230px)] w-full object-contain"
              />
            </div>

            {/* ACTION FOOTER */}
            <div className="mx-auto mt-2 flex w-full max-w-[780px] flex-wrap items-center justify-between gap-3 text-xs text-emerald-100/70">
              <p>
                <span className="font-black text-white">MOVE</span> WASD / Arrow keys
                <span className="ml-3 font-black text-white">BOMB</span> Spacebar
              </p>
              <button
                type="button"
                disabled={!me?.alive || state.phase !== "playing" || room.status !== "in_game"}
                onClick={() => onAction("place_bomb", {})}
                className="min-h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 font-black text-amber-950 shadow-xl shadow-amber-950/30 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                💣 Plant Bomb (Space)
              </button>
            </div>

            {/* TOUCH CONTROLS */}
            <div className="mx-auto mt-2 grid w-full max-w-[13rem] grid-cols-3 gap-2 sm:hidden" aria-label="Touch movement controls">
              <span />
              <button
                type="button"
                className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black"
                aria-label="Move up"
                onPointerDown={(event) => {
                  event.preventDefault();
                  startMobileMove(0, -1);
                }}
                onPointerUp={stopMobileMove}
                onPointerCancel={stopMobileMove}
                onPointerLeave={stopMobileMove}
              >
                ↑
              </button>
              <span />
              <button
                type="button"
                className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black"
                aria-label="Move left"
                onPointerDown={(event) => {
                  event.preventDefault();
                  startMobileMove(-1, 0);
                }}
                onPointerUp={stopMobileMove}
                onPointerCancel={stopMobileMove}
                onPointerLeave={stopMobileMove}
              >
                ←
              </button>
              <button
                type="button"
                className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black"
                aria-label="Move down"
                onPointerDown={(event) => {
                  event.preventDefault();
                  startMobileMove(0, 1);
                }}
                onPointerUp={stopMobileMove}
                onPointerCancel={stopMobileMove}
                onPointerLeave={stopMobileMove}
              >
                ↓
              </button>
              <button
                type="button"
                className="min-h-12 rounded-xl border border-emerald-200/15 bg-white/10 text-xl font-black"
                aria-label="Move right"
                onPointerDown={(event) => {
                  event.preventDefault();
                  startMobileMove(1, 0);
                }}
                onPointerUp={stopMobileMove}
                onPointerCancel={stopMobileMove}
                onPointerLeave={stopMobileMove}
              >
                →
              </button>
            </div>
          </section>

          {/* SIDEBAR: PUMMEL PARTY MATCH HUD */}
          <aside className="space-y-3">
            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4 shadow-xl">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">
                Pummel Party Scoreboard
              </h2>
              <div className="mt-3 space-y-2">
                {[...state.players]
                  .sort((a, b) => Number(b.alive) - Number(a.alive) || b.kills - a.kills || a.seat - b.seat)
                  .map((player) => (
                    <div
                      key={player.userId}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                        player.userId === currentUserId
                          ? "border-emerald-400/50 bg-emerald-400/10 shadow-lg shadow-emerald-950/40"
                          : "border-white/5 bg-black/20"
                      } ${player.alive ? "" : "opacity-40 grayscale"}`}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/30 shadow-md"
                        style={{ backgroundColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {player.displayName}
                          {player.userId === currentUserId ? " (You)" : ""}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          {player.alive ? (player.isBot ? "🤖 Bot" : "🎮 Player") : "💀 Knocked Out"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-amber-300">
                          {player.kills} <span className="text-[10px] font-bold text-white/40">KOs</span>
                        </p>
                        <p className="text-[10px] text-white/50">
                          💣 {player.bombsAvailable} · 🔥 {player.blastRange}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4 shadow-xl">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">
                Arena Broadcast
              </h2>
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {newestEvents.length ? (
                  newestEvents.map((item) => (
                    <p
                      key={item.id}
                      className="rounded-lg bg-black/30 px-3 py-1.5 text-xs font-medium leading-relaxed text-white/80"
                    >
                      {item.message ?? item.type.replaceAll("_", " ")}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-white/40">Destruction and bomb placements will broadcast here.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#10231c] p-4 shadow-xl">
              <h2 className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">
                Match Chat
              </h2>
              <div className="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                {room.chat.slice(-10).map((message) => (
                  <p key={message.id} className="text-xs leading-relaxed">
                    <span className="font-black text-emerald-300">{message.displayName}: </span>
                    <span className="text-white/80">{message.body}</span>
                  </p>
                ))}
              </div>
              <form onSubmit={submitChat} className="mt-2.5 flex gap-2">
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  maxLength={280}
                  placeholder="Send match message…"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={!chatDraft.trim()}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            </section>
          </aside>
        </div>

        {/* MODALS */}
        {room.status === "paused" ? (
          <div className="fixed inset-0 z-30 grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
            <div className="rounded-2xl border border-emerald-300/25 bg-[#10231c] p-8 text-center shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Time out</p>
              <h2 className="mt-2 text-3xl font-black">Game paused</h2>
              <p className="mt-2 text-sm text-white/60">The host will resume the chaos shortly.</p>
            </div>
          </div>
        ) : null}

        {state.phase === "finished" ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-amber-300/25 bg-[#10231c] p-8 text-center shadow-2xl">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-300 text-3xl">
                {winner ? "🏆" : "💥"}
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-amber-300">Match Complete</p>
              <h2 className="mt-2 text-3xl font-black">{winner ? `${winner.displayName} wins!` : "It's a draw!"}</h2>
              <p className="mt-3 text-sm text-white/60">
                {winner ? "Sole survivor of the strategic shockwave." : "Nobody made it out alive."}
              </p>
              <div className="mt-6 space-y-2 text-left">
                {[...state.players]
                  .sort((a, b) => Number(b.alive) - Number(a.alive) || b.kills - a.kills)
                  .slice(0, 5)
                  .map((player, index) => (
                    <div key={player.userId} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
                      <span className="w-5 font-mono text-sm font-black text-white/40">{index + 1}</span>
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: PLAYER_COLORS[player.seat % PLAYER_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm font-bold">{player.displayName}</span>
                      <span className="text-xs font-black text-amber-200">{player.kills} KO</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
