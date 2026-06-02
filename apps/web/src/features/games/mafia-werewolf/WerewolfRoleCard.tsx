"use client";

import { Eye, HeartPulse, Moon, Users } from "lucide-react";
import type { PublicWerewolfState } from "@tabletop/game-core";
import { WEREWOLF_ROLE_THEME } from "./werewolfTheme";

export function WerewolfRoleCard({ state }: { state: PublicWerewolfState }) {
  const info = state.myRoleInfo;
  if (!info || !state.myRole) return null;

  const theme = WEREWOLF_ROLE_THEME[state.myRole];
  const icon = state.myRole === "werewolf" ? <Moon className="h-5 w-5" /> : state.myRole === "seer" ? <Eye className="h-5 w-5" /> : state.myRole === "doctor" ? <HeartPulse className="h-5 w-5" /> : <Users className="h-5 w-5" />;

  return (
    <div
      className="relative overflow-hidden rounded-[1.6rem] border bg-black/52 p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={{ borderColor: theme.accent, boxShadow: `0 0 42px ${theme.glow}, 0 22px 70px rgba(0,0,0,0.45)` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 15% 20%, ${theme.glow}, transparent 36%)` }} />
      <div className="relative z-10 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-black/50" style={{ color: theme.accent }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.26em] text-white/45">Your role</p>
          <h2 className="mt-1 text-2xl font-black" style={{ color: theme.accent }}>{info.name}</h2>
          <p className="mt-1 text-sm font-bold text-white/72">{info.shortDescription}</p>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/56">{info.detailedDescription}</p>
          {state.werewolfTeamIds.length > 0 ? (
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-red-200/80">
              Werewolf team: {state.players.filter((player) => state.werewolfTeamIds.includes(player.userId)).map((player) => player.displayName).join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
