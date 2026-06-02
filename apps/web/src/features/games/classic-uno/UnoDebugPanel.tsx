"use client";

import { useMemo, useState } from "react";
import { Bug, Zap } from "lucide-react";
import type { RoomPlayerView, UserRole } from "@tabletop/shared";
import { Button } from "@/components/ui/button";

const debugEnabled = process.env.NEXT_PUBLIC_ENABLE_UNO_DEBUG_PANEL === "true";

const sharedScenarios = [
  ["give_me_playable", "Playable"],
  ["give_me_no_playable", "No playable"],
  ["force_draw_until_playable", "Draw test"],
  ["reverse", "Reverse"],
  ["low_draw_pile_refill", "Low pile"]
] as const;

const classicScenarios = [
  ["classic_plus2_stack", "+2 stack"],
  ["classic_plus4_stack", "+4 stack"]
] as const;

const noMercyScenarios = [
  ["no_mercy_plus10_stack", "+10 stack"],
  ["no_mercy_plus20_stack", "+20 stack"],
  ["roulette_against_me", "Roulette"],
  ["zero_pass", "0 pass"],
  ["seven_swap", "7 swap"],
  ["skip_everyone", "Skip all"],
  ["mercy_elimination", "Mercy out"]
] as const;

export function UnoDebugPanel({
  gameId,
  roomPlayers,
  currentUserId,
  currentUserRole,
  effectiveHostUserId,
  onScenario
}: {
  gameId: "classic-uno" | "uno-no-mercy";
  roomPlayers: RoomPlayerView[];
  currentUserId: string | null;
  currentUserRole?: UserRole | null | undefined;
  effectiveHostUserId: string | null;
  onScenario?: ((scenario: string, targetPlayerId?: string) => void) | undefined;
}) {
  const [targetPlayerId, setTargetPlayerId] = useState(currentUserId ?? roomPlayers[0]?.userId ?? "");
  const canUse = Boolean(debugEnabled && onScenario && currentUserId && (currentUserRole === "ADMIN" || effectiveHostUserId === currentUserId));

  const scenarios = useMemo(
    () => [...sharedScenarios, ...(gameId === "classic-uno" ? classicScenarios : noMercyScenarios), ["reset_match", "Clear"] as const],
    [gameId]
  );

  if (!canUse) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-fuchsia-300/15 bg-black/35 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-fuchsia-100">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-fuchsia-200/15 bg-fuchsia-400/10">
            <Bug className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-black">Debug Scenarios</p>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/38">Host/admin only</p>
          </div>
        </div>
      </div>

      <label className="mt-3 block space-y-1.5">
        <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/45">Target</span>
        <select
          value={targetPlayerId}
          onChange={(event) => setTargetPlayerId(event.target.value)}
          className="min-h-10 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none"
        >
          {roomPlayers.map((player) => (
            <option key={player.userId} value={player.userId}>
              {player.displayName}{player.isBot ? " (bot)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {scenarios.map(([scenario, label]) => (
          <Button
            key={scenario}
            type="button"
            size="sm"
            variant="outline"
            className="min-h-9 border-white/10 bg-white/[0.055] px-2 text-[0.7rem] text-white hover:bg-white/10"
            onClick={() => onScenario?.(scenario, targetPlayerId || undefined)}
          >
            <Zap className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}