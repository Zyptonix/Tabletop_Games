"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, EyeOff, LogOut, PanelRightClose, PanelRightOpen, Settings, Skull, Trophy, Volume2, VolumeX } from "lucide-react";
import type { GameEvent, PublicWerewolfState, WerewolfAction, WerewolfRoleId } from "@tabletop/game-core";
import type { RoomPlayerView, RoomStateView, UserRole } from "@tabletop/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RoomChat } from "@/features/game-shell/RoomChat";
import { cn } from "@/lib/utils/cn";
import { getModeratorLine } from "./moderatorLines";
import { useModeratorVoice } from "./useModeratorVoice";
import { WerewolfActionPanel } from "./WerewolfActionPanel";
import { WerewolfPhaseBanner } from "./WerewolfPhaseBanner";
import { WerewolfPlayerSeat } from "./WerewolfPlayerSeat";
import { WerewolfRoleCard } from "./WerewolfRoleCard";
import { getWerewolfRoleTheme } from "./werewolfTheme";

function actionTarget(legalActions: unknown[], type: WerewolfAction["type"], targetPlayerId: string): boolean {
  return legalActions.some((item) => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as { type?: unknown; targetPlayerId?: unknown };
    return record.type === type && record.targetPlayerId === targetPlayerId;
  });
}

function hasAction(legalActions: unknown[], type: WerewolfAction["type"]): boolean {
  return legalActions.some((item) => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === type);
}

function phaseTone(phase: PublicWerewolfState["phase"]) {
  if (phase === "night") return "from-[#010207] via-[#050b15] to-[#020308]";
  if (phase === "voting" || phase === "vote_result") return "from-[#050202] via-[#130505] to-[#020203]";
  if (phase === "day_discussion" || phase === "night_result") return "from-[#020408] via-[#0b0d0c] to-[#020305]";
  return "from-[#010207] via-[#050b15] to-[#020308]";
}

const ROLE_ORDER: WerewolfRoleId[] = [
  "werewolf",
  "seer",
  "doctor",
  "villager",
  "jester",
  "vigilante",
  "serial_killer",
  "bodyguard",
  "mayor",
  "witch"
];

function RoleCompositionStrip({ state }: { state: PublicWerewolfState }) {
  const entries = ROLE_ORDER.map((role) => ({ role, count: state.roleCountsInPlay[role] ?? 0 })).filter((entry) => entry.count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-3 z-30 w-[min(54rem,72vw)] -translate-x-1/2 rounded-[1.35rem] border border-white/10 bg-black/48 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/42">Roles in play</span>
        {entries.map(({ role, count }) => {
          const theme = getWerewolfRoleTheme(role);
          return (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 rounded-full border bg-white/[0.055] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em]"
              style={{ borderColor: `${theme.accent}55`, color: theme.accent, boxShadow: `0 0 18px ${theme.glow}` }}
              title={`${count} ${theme.label}${count === 1 ? "" : "s"} in this match`}
            >
              <span className="text-white/70">{count}×</span>
              {theme.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type ActionRecord = WerewolfAction & { targetPlayerId?: string };

function actionsOfType(legalActions: unknown[], type: WerewolfAction["type"]): ActionRecord[] {
  return legalActions.filter(
    (item): item is ActionRecord =>
      typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === type
  );
}

function WerewolfVotingDialog({
  state,
  legalActions,
  onAction
}: {
  state: PublicWerewolfState;
  legalActions: unknown[];
  onAction: (type: string, payload?: Record<string, unknown>) => void;
}) {
  if (state.phase !== "voting") return null;

  const voteActions = actionsOfType(legalActions, "cast_vote");
  const passVote = hasAction(legalActions, "pass_vote");
  const clearVote = hasAction(legalActions, "clear_vote");
  const selectedTargetId = state.myVoteTargetId;

  const alivePlayers = state.players.filter((player) => player.alive);
  const voteRows = alivePlayers
    .map((player) => ({ ...player, count: player.voteCount ?? 0 }))
    .sort((left, right) => right.count - left.count || left.displayName.localeCompare(right.displayName));

  const totalVotesCast = voteRows.reduce((sum, player) => sum + player.count, 0) + state.passVoteCount;
  const neededForMajority = Math.floor(alivePlayers.length / 2) + 1;

  return (
    <motion.div
      className="absolute inset-0 z-[75] grid place-items-center bg-black/28 px-5 py-8 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Village vote"
        className="w-[min(92vw,54rem)] overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(12,8,5,0.96),rgba(21,12,7,0.94)_48%,rgba(2,2,4,0.98))] text-white shadow-[0_32px_120px_rgba(0,0,0,0.82),0_0_54px_rgba(245,158,11,0.14)] backdrop-blur-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
      >
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-amber-200/62">Village Vote</p>
          <h2 className="mt-1 text-2xl font-black text-white">Choose who faces judgment</h2>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-white/56">
            Vote for one alive player, or pass if the village has no certainty. A clear majority ends the vote early; tied votes eliminate nobody.
          </p>
        </div>

        <div className="grid max-h-[min(72dvh,34rem)] min-h-0 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
          <div className="min-h-0 overflow-hidden rounded-[1.45rem] border border-white/10 bg-black/35 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/38">Cast your vote</p>
                <p className="mt-1 text-xs font-bold text-white/45">
                  {totalVotesCast} of {alivePlayers.length} choices submitted • majority needs {neededForMajority}
                </p>
              </div>
              {selectedTargetId ? (
                <span className="rounded-full border border-blue-200/25 bg-blue-400/12 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-blue-100">
                  Vote locked
                </span>
              ) : null}
            </div>

            <div className="grid max-h-[18rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 [scrollbar-color:rgba(245,158,11,0.52)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
              {voteActions.map((action) => {
                const player = state.players.find((item) => item.userId === action.targetPlayerId);
                const selected = selectedTargetId === action.targetPlayerId;

                return (
                  <button
                    key={`vote-${action.targetPlayerId}`}
                    type="button"
                    className={cn(
                      "group rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-200/45",
                      selected
                        ? "border-blue-200/55 bg-blue-400/18 shadow-[0_0_28px_rgba(96,165,250,0.25)]"
                        : "border-white/10 bg-white/[0.055] hover:border-amber-200/35 hover:bg-amber-300/12"
                    )}
                    onClick={() => onAction("cast_vote", { targetPlayerId: action.targetPlayerId })}
                  >
                    <span className="block truncate text-sm font-black text-white group-hover:text-amber-100">
                      {player?.displayName ?? "Player"}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/40">
                      <span>{selected ? "Selected" : "Vote target"}</span>
                      <span className="rounded-full border border-white/10 bg-black/42 px-2 py-0.5 text-white/70">
                        {player?.voteCount ?? 0} vote{(player?.voteCount ?? 0) === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {passVote ? (
                <button
                  type="button"
                  className="rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/76 transition hover:bg-white/12"
                  onClick={() => onAction("pass_vote")}
                >
                  Pass vote
                </button>
              ) : null}

              {clearVote ? (
                <button
                  type="button"
                  className="rounded-full border border-red-200/18 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-500/16"
                  onClick={() => onAction("clear_vote")}
                >
                  Clear vote
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[1.45rem] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(0,0,0,0.32))] p-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-amber-200/62">Live tally</p>

            <div className="mt-3 max-h-[18rem] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(245,158,11,0.52)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
              {voteRows.map((player) => {
                const highest = player.count > 0 && player.count === Math.max(...voteRows.map((item) => item.count), state.passVoteCount);
                return (
                  <div
                    key={`tally-${player.userId}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                      highest ? "border-amber-200/28 bg-amber-300/12" : "border-white/10 bg-black/25"
                    )}
                  >
                    <span className="min-w-0 truncate text-sm font-black text-white/86">{player.displayName}</span>
                    <span className="rounded-full border border-white/10 bg-black/42 px-2.5 py-1 text-xs font-black text-amber-100">
                      {player.count}
                    </span>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
                <span className="text-sm font-black text-white/72">Pass</span>
                <span className="rounded-full border border-white/10 bg-black/42 px-2.5 py-1 text-xs font-black text-white/76">
                  {state.passVoteCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


function NightActionDialog({
  state,
  legalActions,
  onAction
}: {
  state: PublicWerewolfState;
  legalActions: unknown[];
  onAction: (type: string, payload?: Record<string, unknown>) => void;
}) {
  if (state.phase !== "night") return null;

  const selectedTargetId = state.myNightTargetId;

  const actionGroups: Array<{
    key: string;
    eyebrow: string;
    title: string;
    body: string;
    actionType: WerewolfAction["type"];
    actions: ActionRecord[];
    accent: string;
  }> = [];

  const werewolfActions = actionsOfType(legalActions, "night_werewolf_target");
  const doctorActions = actionsOfType(legalActions, "night_doctor_save");
  const seerActions = actionsOfType(legalActions, "night_seer_check");
  const bodyguardActions = actionsOfType(legalActions, "night_bodyguard_protect");
  const vigilanteActions = actionsOfType(legalActions, "night_vigilante_shoot");
  const serialKillerActions = actionsOfType(legalActions, "night_serial_killer_target");
  const witchHealActions = actionsOfType(legalActions, "night_witch_heal");
  const witchPoisonActions = actionsOfType(legalActions, "night_witch_poison");

  if (werewolfActions.length > 0) {
    actionGroups.push({
      key: "werewolf",
      eyebrow: "Werewolf hunt",
      title: "Choose a victim",
      body: "Pick one alive non-Werewolf player. The clear top pack choice is attacked; tied pack choices kill nobody.",
      actionType: "night_werewolf_target",
      actions: werewolfActions,
      accent: "rgb(248 113 113)"
    });
  }

  if (doctorActions.length > 0) {
    actionGroups.push({
      key: "doctor",
      eyebrow: "Doctor's choice",
      title: "Choose someone to protect",
      body: "If the Werewolves attack this player tonight, they survive.",
      actionType: "night_doctor_save",
      actions: doctorActions,
      accent: "rgb(74 222 128)"
    });
  }

  if (seerActions.length > 0) {
    actionGroups.push({
      key: "seer",
      eyebrow: "Seer's vision",
      title: "Choose someone to inspect",
      body: "You will privately learn whether this player is a Werewolf or not.",
      actionType: "night_seer_check",
      actions: seerActions,
      accent: "rgb(96 165 250)"
    });
  }

  if (bodyguardActions.length > 0) {
    actionGroups.push({
      key: "bodyguard",
      eyebrow: "Bodyguard watch",
      title: "Choose someone to guard",
      body: "If this player is attacked, you sacrifice yourself and they live.",
      actionType: "night_bodyguard_protect",
      actions: bodyguardActions,
      accent: "rgb(45 212 191)"
    });
  }

  if (vigilanteActions.length > 0) {
    actionGroups.push({
      key: "vigilante",
      eyebrow: "Vigilante shot",
      title: "Shoot or hold fire",
      body: "You only get one shot. Choose carefully, or hold fire tonight.",
      actionType: "night_vigilante_shoot",
      actions: vigilanteActions,
      accent: "rgb(251 146 60)"
    });
  }

  if (serialKillerActions.length > 0) {
    actionGroups.push({
      key: "serial-killer",
      eyebrow: "Silent killer",
      title: "Choose your victim",
      body: "You work alone. Kill quietly and survive until the end.",
      actionType: "night_serial_killer_target",
      actions: serialKillerActions,
      accent: "rgb(220 38 38)"
    });
  }

  if (witchHealActions.length > 0) {
    actionGroups.push({
      key: "witch-heal",
      eyebrow: "Witch potion",
      title: "Use your healing potion",
      body: "Choose someone to heal. This potion can only be used once.",
      actionType: "night_witch_heal",
      actions: witchHealActions,
      accent: "rgb(168 85 247)"
    });
  }

  if (witchPoisonActions.length > 0) {
    actionGroups.push({
      key: "witch-poison",
      eyebrow: "Witch poison",
      title: "Use your poison potion",
      body: "Choose someone to poison. This potion can only be used once.",
      actionType: "night_witch_poison",
      actions: witchPoisonActions,
      accent: "rgb(248 113 113)"
    });
  }

  const skipVigilante = hasAction(legalActions, "night_vigilante_skip");
  const skipWitch = hasAction(legalActions, "night_witch_skip");

  if (actionGroups.length === 0 && !skipVigilante && !skipWitch) return null;

  const primary = actionGroups[0];

  return (
    <motion.div
      className="absolute inset-0 z-[74] grid place-items-center bg-black/30 px-5 py-8 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Night action"
        className="w-[min(92vw,50rem)] overflow-hidden rounded-[2rem] border border-blue-200/18 bg-[linear-gradient(135deg,rgba(3,7,18,0.96),rgba(8,13,24,0.94)_48%,rgba(0,0,0,0.98))] text-white shadow-[0_32px_120px_rgba(0,0,0,0.82),0_0_54px_rgba(96,165,250,0.12)] backdrop-blur-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 360, damping: 34 }}
      >
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-blue-200/58">
            {primary?.eyebrow ?? "Night action"}
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">{primary?.title ?? "Choose your action"}</h2>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-white/56">
            {primary?.body ?? "The night is active. Make your choice before morning comes."}
          </p>
        </div>

        <div className="max-h-[min(70dvh,34rem)] min-h-0 overflow-y-auto p-4 [scrollbar-color:rgba(96,165,250,0.52)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
          <div className="space-y-4">
            {actionGroups.map((group) => (
              <div key={group.key} className="rounded-[1.45rem] border border-white/10 bg-black/35 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.22em]" style={{ color: group.accent }}>
                      {group.eyebrow}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/45">{group.actions.length} available target{group.actions.length === 1 ? "" : "s"}</p>
                  </div>
                  {selectedTargetId ? (
                    <span className="rounded-full border border-blue-200/25 bg-blue-400/12 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-blue-100">
                      Choice locked
                    </span>
                  ) : null}
                </div>

                {group.key === "werewolf" && state.werewolfTargetVotes.length > 0 ? (
                  <div className="mb-3 rounded-2xl border border-red-300/15 bg-red-500/10 p-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-red-100/60">Pack target votes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.werewolfTargetVotes.map((vote) => {
                        const target = state.players.find((player) => player.userId === vote.targetPlayerId);
                        return (
                          <span
                            key={`pack-vote-${vote.targetPlayerId}`}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-black",
                              vote.clearTarget
                                ? "border-red-200/35 bg-red-400/18 text-red-50"
                                : "border-white/10 bg-black/35 text-white/72"
                            )}
                          >
                            {target?.displayName ?? "Player"} — {vote.count} wolf{vote.count === 1 ? "" : "ves"}
                            {vote.clearTarget ? " • Clear target" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="grid max-h-[17rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 [scrollbar-color:rgba(96,165,250,0.52)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
                  {group.actions.map((action) => {
                    const player = state.players.find((item) => item.userId === action.targetPlayerId);
                    const selected = selectedTargetId === action.targetPlayerId;

                    return (
                      <button
                        key={`${group.actionType}-${action.targetPlayerId}`}
                        type="button"
                        className={cn(
                          "group rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200/45",
                          selected
                            ? "border-blue-200/55 bg-blue-400/18 shadow-[0_0_28px_rgba(96,165,250,0.25)]"
                            : "border-white/10 bg-white/[0.055] hover:border-blue-200/35 hover:bg-blue-300/12"
                        )}
                        onClick={() => onAction(group.actionType, { targetPlayerId: action.targetPlayerId })}
                      >
                        <span className="block truncate text-sm font-black text-white group-hover:text-blue-100">
                          {player?.displayName ?? "Player"}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/40">
                          <span>{selected ? "Selected" : "Target"}</span>
                          {player?.role ? (
                            <span className="rounded-full border border-white/10 bg-black/42 px-2 py-0.5 text-white/70">
                              {getWerewolfRoleTheme(player.role).label}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {(skipVigilante || skipWitch) ? (
            <div className="mt-3 flex flex-wrap gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-3">
              {skipVigilante ? (
                <button
                  type="button"
                  className="rounded-full border border-orange-300/20 bg-orange-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-100 hover:bg-orange-500/18"
                  onClick={() => onAction("night_vigilante_skip")}
                >
                  Hold fire
                </button>
              ) : null}

              {skipWitch ? (
                <button
                  type="button"
                  className="rounded-full border border-purple-300/20 bg-purple-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-purple-100 hover:bg-purple-500/18"
                  onClick={() => onAction("night_witch_skip")}
                >
                  Save potions
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

function getResultPresentation(state: PublicWerewolfState) {
  const winningIds = new Set(state.results?.placements.filter((placement) => placement.result === "WIN").map((placement) => placement.userId) ?? []);
  const winners = state.players.filter((player) => winningIds.has(player.userId));
  const soloWinner = winners.find((player) => player.team === "solo" || player.role === "jester" || player.role === "serial_killer");

  if (soloWinner?.role === "jester") {
    return {
      eyebrow: "Solo victory",
      title: "The Jester Won",
      body: `${soloWinner.displayName} tricked the village into voting them out.`,
      accent: getWerewolfRoleTheme("jester").accent,
      glow: getWerewolfRoleTheme("jester").glow
    };
  }

  if (soloWinner?.role === "serial_killer") {
    return {
      eyebrow: "Solo victory",
      title: "The Serial Killer Won",
      body: `${soloWinner.displayName} survived long enough to stand alone.`,
      accent: getWerewolfRoleTheme("serial_killer").accent,
      glow: getWerewolfRoleTheme("serial_killer").glow
    };
  }

  if (winners.some((player) => player.team === "werewolf")) {
    return {
      eyebrow: "The moon belongs to the pack",
      title: "The Werewolves Won",
      body: "The Werewolves equaled or outnumbered the village and took control of the night.",
      accent: getWerewolfRoleTheme("werewolf").accent,
      glow: getWerewolfRoleTheme("werewolf").glow
    };
  }

  return {
    eyebrow: "The village survives",
    title: "The Villagers Won",
    body: "Every Werewolf was eliminated before the village fell.",
    accent: getWerewolfRoleTheme("villager").accent,
    glow: getWerewolfRoleTheme("villager").glow
  };
}

export function MafiaWerewolfTable({
  room,
  state,
  legalActions,
  gameEvents = [],
  currentUserId,
  currentUserRole,
  onAction,
  onChat,
  onEndMatch
}: {
  room: RoomStateView;
  state: PublicWerewolfState;
  legalActions: unknown[];
  gameEvents?: GameEvent[];
  currentUserId: string | null;
  currentUserRole?: UserRole | null | undefined;
  onAction: (type: string, payload?: Record<string, unknown>) => void;
  onChat?: ((roomId: string, body: string) => void) | undefined;
  onEndMatch?: ((roomId: string) => void) | undefined;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(() => (typeof window === "undefined" ? true : localStorage.getItem("tabletop.sidePanelHidden") !== "true"));
  const [resultStep, setResultStep] = useState(0);
  const { voiceEnabled, setVoiceEnabled, speak } = useModeratorVoice();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  function setPanelOpen(next: boolean) {
    setSidePanelOpen(next);
    localStorage.setItem("tabletop.sidePanelHidden", next ? "false" : "true");
  }

  const roomPlayerById = useMemo(() => new Map<string, RoomPlayerView>(room.players.map((player) => [player.userId, player])), [room.players]);

  const lastKilledName = state.lastNightKilledPlayerId ? state.players.find((player) => player.userId === state.lastNightKilledPlayerId)?.displayName ?? null : null;
  const lastVotedOutName = state.lastVotedOutPlayerId ? state.players.find((player) => player.userId === state.lastVotedOutPlayerId)?.displayName ?? null : null;
  const moderatorLine = getModeratorLine({ state, lastKilledName, lastVotedOutName });

  useEffect(() => {
    speak(moderatorLine);
  }, [moderatorLine, speak, state.phase, state.round]);

  const aliveCount = state.players.filter((player) => player.alive).length;
  const isHost = currentUserRole === "ADMIN" || room.effectiveHostUserId === currentUserId;
  const canEndMatch = Boolean(onEndMatch && (room.status === "in_game" || room.status === "paused") && isHost);
  const canAdvance = hasAction(legalActions, "advance_phase");

  const slots = useMemo(() => {
    const players = state.players.slice().sort((left, right) => left.seat - right.seat);
    const count = players.length;
    return players.map((player, index) => {
      const angle = -90 + (360 * index) / Math.max(1, count);
      const rad = (angle * Math.PI) / 180;
      return {
        player,
        left: 50 + Math.cos(rad) * 40,
        top: 43 + Math.sin(rad) * 25
      };
    });
  }, [state.players]);

  function actionKindFor(playerId: string): "kill" | "save" | "inspect" | "guard" | "shoot" | "poison" | undefined {
    if (actionTarget(legalActions, "night_werewolf_target", playerId) || actionTarget(legalActions, "night_serial_killer_target", playerId)) return "kill";
    if (actionTarget(legalActions, "night_doctor_save", playerId) || actionTarget(legalActions, "night_witch_heal", playerId)) return "save";
    if (actionTarget(legalActions, "night_seer_check", playerId)) return "inspect";
    if (actionTarget(legalActions, "night_bodyguard_protect", playerId)) return "guard";
    if (actionTarget(legalActions, "night_vigilante_shoot", playerId)) return "shoot";
    if (actionTarget(legalActions, "night_witch_poison", playerId)) return "poison";
    return undefined;
  }

  function clickSeat(playerId: string) {
    if (actionTarget(legalActions, "night_werewolf_target", playerId)) onAction("night_werewolf_target", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_serial_killer_target", playerId)) onAction("night_serial_killer_target", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_doctor_save", playerId)) onAction("night_doctor_save", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_witch_heal", playerId)) onAction("night_witch_heal", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_seer_check", playerId)) onAction("night_seer_check", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_bodyguard_protect", playerId)) onAction("night_bodyguard_protect", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_vigilante_shoot", playerId)) onAction("night_vigilante_shoot", { targetPlayerId: playerId });
    else if (actionTarget(legalActions, "night_witch_poison", playerId)) onAction("night_witch_poison", { targetPlayerId: playerId });
  }

  return (
    <div className={cn("relative min-h-[100dvh] overflow-hidden bg-gradient-to-b text-white", phaseTone(state.phase))}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(180,200,255,0.14),transparent_11%),radial-gradient(circle_at_50%_48%,rgba(40,50,80,0.46),transparent_44%),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.020)_1px,transparent_1px)] bg-[length:auto,auto,32px_32px,32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(circle_at_25%_70%,rgba(148,163,184,0.10),transparent_34%),radial-gradient(circle_at_78%_62%,rgba(120,130,150,0.10),transparent_38%)] blur-xl" />
      <div className="pointer-events-none absolute left-1/2 top-[6%] h-24 w-24 -translate-x-1/2 rounded-full bg-slate-200/20 blur-sm shadow-[0_0_90px_rgba(191,219,254,0.30)]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col p-3">
        <header className="flex h-[4.35rem] shrink-0 items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="inline-flex min-h-[3rem] w-[12rem] items-center justify-between rounded-[1.1rem] border border-white/10 bg-black/42 px-4 text-left text-sm font-black text-white shadow-xl backdrop-blur-md">
              Mafia/Werewolf
              <Skull className="h-4 w-4 text-red-200/70" />
            </button>
            <button type="button" className="grid h-[3rem] w-[3rem] place-items-center rounded-[1.1rem] border border-white/10 bg-black/42 text-white/78 shadow-xl backdrop-blur-md" onClick={() => navigator.clipboard.writeText(room.code)}>
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" className="grid h-[3rem] w-[3rem] place-items-center rounded-[1.1rem] border border-white/10 bg-black/42 text-white/78 shadow-xl backdrop-blur-md" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-full border border-white/10 bg-black/42 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/70 shadow-xl backdrop-blur-md">
              {aliveCount} alive / {state.players.length}
            </div>
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/42 px-4 text-xs font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-md" onClick={() => setVoiceEnabled(!voiceEnabled)}>
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Voice {voiceEnabled ? "On" : "Off"}
            </button>
            <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/42 px-3 text-xs font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-md" onClick={() => setPanelOpen(!sidePanelOpen)}>
              {sidePanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {sidePanelOpen ? "Hide panel" : "Show panel"}
            </button>
          </div>
        </header>

        <div className={cn("grid min-h-0 flex-1 grid-cols-1 gap-3", sidePanelOpen && "xl:grid-cols-[minmax(0,1fr)_330px]")}> 
          <main className="relative min-h-0 overflow-hidden rounded-[2rem] border border-white/5 bg-black/10">
            <div className="absolute inset-0">
              {slots.map(({ player, left, top }) => {
                const selectedTargetId = state.myNightTargetId;
                const selected = state.phase === "night" && selectedTargetId === player.userId;
                const kind = selected ? actionKindFor(player.userId) : undefined;
                return (
                  <div key={player.userId} className="absolute z-20 w-[min(17.5rem,22vw)] -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
                    <WerewolfPlayerSeat
                      player={player}
                      roomPlayer={roomPlayerById.get(player.userId)}
                      actionKind={kind}
                      selected={selected}
                    />
                  </div>
                );
              })}
            </div>

            <RoleCompositionStrip state={state} />

            <div className="absolute left-1/2 top-[43%] z-10 w-[min(46rem,54vw)] -translate-x-1/2 -translate-y-1/2">
              <WerewolfPhaseBanner state={state} moderatorLine={moderatorLine} now={now} />
              <AnimatePresence mode="popLayout">
                {state.seerResults.length > 0 && state.myRole === "seer" ? (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="mt-3 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-3 text-sm font-bold text-blue-100 backdrop-blur-xl">
                    Latest vision: {state.players.find((player) => player.userId === state.seerResults.at(-1)?.targetPlayerId)?.displayName ?? "A player"} is {state.seerResults.at(-1)?.result === "werewolf" ? "a Werewolf" : "not a Werewolf"}.
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div
              className={cn(
                "absolute bottom-3 left-3 right-3 z-30 grid gap-3",
                state.phase === "voting" || state.phase === "night"
                  ? "lg:grid-cols-[minmax(0,1fr)]"
                  : "lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
              )}
            >
              <WerewolfRoleCard state={state} />
              {state.phase !== "voting" && state.phase !== "night" ? (
                <WerewolfActionPanel state={state} legalActions={legalActions} onAction={onAction} />
              ) : null}
            </div>

            <AnimatePresence>
              {state.phase === "night" ? (
                <NightActionDialog state={state} legalActions={legalActions} onAction={onAction} />
              ) : null}
              {state.phase === "voting" ? (
                <WerewolfVotingDialog state={state} legalActions={legalActions} onAction={onAction} />
              ) : null}
            </AnimatePresence>
          </main>

          {sidePanelOpen ? (
            <aside className="relative z-20 hidden min-h-0 overflow-visible xl:flex xl:flex-col xl:gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-black text-red-300 transition hover:bg-white/5 hover:text-red-200" onClick={() => globalThis.location.assign("/dashboard")}>
                    <LogOut className="h-4 w-4" />
                    Leave
                  </button>
                  {canEndMatch ? <button type="button" className="flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-500/10 px-3 py-2 text-left text-sm font-black text-red-200 transition hover:bg-red-500/18" onClick={() => setConfirmEndOpen(true)}>End Match</button> : null}
                </div>
                <div className="mt-2 border-t border-white/10 pt-2">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/35">Match ID</p>
                  <p className="truncate text-xs font-bold text-white/62">{room.code}</p>
                </div>
              </div>

              {isHost ? (
                <div className="rounded-2xl border border-purple-300/15 bg-purple-500/10 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-purple-100/60">Host debug</p>
                  <p className="mt-1 text-xs font-bold text-white/45">Temporary testing controls.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={!canAdvance} className="rounded-full border border-purple-200/20 bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-purple-100 disabled:opacity-40" onClick={() => onAction("advance_phase")}>{state.phase === "day_discussion" ? "Skip discussion" : "End phase"}</button>
                    <button type="button" className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/65" onClick={() => setPanelOpen(false)}><EyeOff className="mr-1 inline h-3 w-3" /> Hide sidebar</button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-black/35 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/35">Game log</p>
                <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1 text-xs font-semibold text-white/56 [scrollbar-width:thin]">
                  {gameEvents.slice(-8).reverse().map((event) => <p key={event.id} className="rounded-lg bg-white/[0.04] px-2 py-1.5">{event.message ?? event.type}</p>)}
                </div>
              </div>

              <div className="min-h-0 flex-1">{onChat ? <RoomChat roomId={room.id} messages={room.chat} onSend={onChat} onlineCount={room.players.filter((player) => player.connected).length} /> : null}</div>
            </aside>
          ) : null}
        </div>
      </div>

      {canEndMatch ? (
        <Dialog open={confirmEndOpen} title="End match" onClose={() => setConfirmEndOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm font-semibold leading-relaxed text-zinc-700">End this match for everyone?</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmEndOpen(false)}>Cancel</Button>
              <Button type="button" className="bg-red-700 hover:bg-red-800" onClick={() => { onEndMatch?.(room.id); setConfirmEndOpen(false); }}>End Match</Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {state.phase === "finished" ? (
        <Dialog open title={resultStep === 0 ? "The truth is revealed" : "Werewolf Results"} onClose={() => globalThis.location.assign("/dashboard")}>
          <div className="space-y-4 text-white">
            {resultStep === 0 ? (
              <div className="space-y-3 rounded-2xl bg-zinc-950 p-4">
                <p className="text-sm font-bold text-white/60">Every player's role is now revealed.</p>
                <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 [scrollbar-width:thin]">
                  {state.players.map((player) => {
                    const role = player.role ?? player.revealedRole;
                    const theme = getWerewolfRoleTheme(role ?? "villager");
                    return (
                      <div key={player.userId} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                        <p className="text-sm font-black text-white">{player.displayName}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em]" style={{ color: theme.accent }}>{role ?? "Hidden"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              (() => {
                const result = getResultPresentation(state);
                return (
                  <div
                    className="overflow-hidden rounded-[1.7rem] border p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
                    style={{
                      borderColor: `${result.accent}55`,
                      background: `radial-gradient(circle at 18% 30%, ${result.glow}, transparent 38%), linear-gradient(135deg, rgba(8,8,12,0.98), rgba(0,0,0,0.94))`,
                      boxShadow: `0 24px 90px rgba(0,0,0,0.55), 0 0 70px ${result.glow}`
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-black/55" style={{ color: result.accent }}>
                        <Trophy className="h-7 w-7" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.26em]" style={{ color: result.accent }}>
                          {result.eyebrow}
                        </p>
                        <p className="mt-1 text-3xl font-black text-white">{result.title}</p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-white/64">{result.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
            {resultStep === 0 ? <Button type="button" className="w-full" onClick={() => setResultStep(1)}>Continue</Button> : <Button type="button" className="w-full" onClick={() => globalThis.location.assign("/dashboard")}>Leave</Button>}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
