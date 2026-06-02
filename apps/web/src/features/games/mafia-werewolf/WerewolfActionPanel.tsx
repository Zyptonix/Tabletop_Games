"use client";

import { Eye, HeartPulse, Moon, Shield, Skull, Target, Vote, Wand2 } from "lucide-react";
import type { PublicWerewolfState, WerewolfAction } from "@tabletop/game-core";
import { cn } from "@/lib/utils/cn";

type ActionRecord = WerewolfAction & { targetPlayerId?: string };

function actionsOfType(legalActions: unknown[], type: WerewolfAction["type"]): ActionRecord[] {
  return legalActions.filter((item): item is ActionRecord => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === type);
}

function hasAction(legalActions: unknown[], type: WerewolfAction["type"]): boolean {
  return legalActions.some((item) => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === type);
}

function targetName(state: PublicWerewolfState, targetPlayerId?: string) {
  return state.players.find((player) => player.userId === targetPlayerId)?.displayName ?? "Player";
}

export function WerewolfActionPanel({ state, legalActions, onAction }: { state: PublicWerewolfState; legalActions: unknown[]; onAction: (type: string, payload?: Record<string, unknown>) => void }) {
  const myRole = state.myRole;
  const werewolfActions = actionsOfType(legalActions, "night_werewolf_target");
  const doctorActions = actionsOfType(legalActions, "night_doctor_save");
  const seerActions = actionsOfType(legalActions, "night_seer_check");
  const bodyguardActions = actionsOfType(legalActions, "night_bodyguard_protect");
  const vigilanteActions = actionsOfType(legalActions, "night_vigilante_shoot");
  const serialKillerActions = actionsOfType(legalActions, "night_serial_killer_target");
  const witchHealActions = actionsOfType(legalActions, "night_witch_heal");
  const witchPoisonActions = actionsOfType(legalActions, "night_witch_poison");
  const voteActions = actionsOfType(legalActions, "cast_vote");

  const clearVote = hasAction(legalActions, "clear_vote");
  const passVote = hasAction(legalActions, "pass_vote");
  const selectedTargetId = state.phase === "voting" ? state.myVoteTargetId : state.myNightTargetId;
  const advancePhase = hasAction(legalActions, "advance_phase");
  const skipVigilante = hasAction(legalActions, "night_vigilante_skip");
  const skipWitch = hasAction(legalActions, "night_witch_skip");

  let title = "Wait for the village";
  let body = "The computer moderator will guide the next phase.";
  let actions: ActionRecord[] = [];
  let actionType: string | null = null;
  let icon = <Moon className="h-4 w-4" />;
  let tone = "border-white/10 bg-white/[0.05]";

  if (state.phase === "night") {
    if (myRole === "werewolf") {
      title = "Choose a victim";
      body = "Pick one alive non-Werewolf player. The pack's choices decide who is attacked.";
      actions = werewolfActions;
      actionType = "night_werewolf_target";
      icon = <Moon className="h-4 w-4" />;
      tone = "border-red-300/20 bg-red-500/10";
    } else if (myRole === "doctor") {
      title = "Choose someone to protect";
      body = "If the Werewolves attack this player tonight, they survive.";
      actions = doctorActions;
      actionType = "night_doctor_save";
      icon = <HeartPulse className="h-4 w-4" />;
      tone = "border-emerald-300/20 bg-emerald-500/10";
    } else if (myRole === "seer") {
      title = "Choose someone to inspect";
      body = "You will privately learn whether this player is a Werewolf or not.";
      actions = seerActions;
      actionType = "night_seer_check";
      icon = <Eye className="h-4 w-4" />;
      tone = "border-blue-300/20 bg-blue-500/10";
    } else if (myRole === "bodyguard") {
      title = "Choose someone to guard";
      body = "If this player is attacked, you sacrifice yourself and they live.";
      actions = bodyguardActions;
      actionType = "night_bodyguard_protect";
      icon = <Shield className="h-4 w-4" />;
      tone = "border-cyan-300/20 bg-cyan-500/10";
    } else if (myRole === "vigilante") {
      title = "Shoot or hold fire";
      body = "You only get one shot. Choose carefully, or skip tonight.";
      actions = vigilanteActions;
      actionType = "night_vigilante_shoot";
      icon = <Target className="h-4 w-4" />;
      tone = "border-orange-300/20 bg-orange-500/10";
    } else if (myRole === "serial_killer") {
      title = "Choose a victim";
      body = "You work alone. Kill quietly and survive until the end.";
      actions = serialKillerActions;
      actionType = "night_serial_killer_target";
      icon = <Skull className="h-4 w-4" />;
      tone = "border-fuchsia-300/20 bg-fuchsia-500/10";
    } else if (myRole === "witch") {
      title = "Use your potions";
      body = "Heal once or poison once. Each potion can only be used once per game.";
      icon = <Wand2 className="h-4 w-4" />;
      tone = "border-purple-300/20 bg-purple-500/10";
    } else {
      title = "Sleep until morning";
      body = "You have no night action. Watch the timer and wait for dawn.";
    }
  } else if (state.phase === "day_discussion") {
    title = "Discuss with the village";
    body = "Talk, accuse, lie, defend, and decide who seems suspicious before voting starts.";
  } else if (state.phase === "voting") {
    title = "Cast your vote";
    body = "Vote for one alive player, or pass. A clear top vote eliminates that player; tied votes eliminate nobody.";
    actions = voteActions;
    actionType = "cast_vote";
    icon = <Vote className="h-4 w-4" />;
    tone = "border-amber-300/20 bg-amber-500/10";
  } else if (state.phase === "role_reveal") {
    title = "Memorize your role";
    body = "Keep your identity secret. The village will soon fall asleep.";
  } else if (state.phase === "night_result") {
    title = "Morning comes";
    body = state.lastNightDeathPlayerIds.length > 0 ? "The night claimed blood." : "No one died last night.";
  } else if (state.phase === "vote_result") {
    title = "Judgment is complete";
    body = state.lastVotedOutPlayerId ? "The village has eliminated a player." : state.lastVotePassed ? "The village chose not to eliminate anyone." : "The vote tied. Nobody was eliminated.";
  }

  return (
    <div className={cn("h-full min-h-0 overflow-hidden rounded-[1.35rem] border p-3 text-white shadow-[0_18px_56px_rgba(0,0,0,0.32)] backdrop-blur-xl", tone)}>
      <div className="flex items-start gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80">{icon}</div>        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/45">Action</p>
          <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-white/58">{body}</p>
        </div>
      </div>

      {actions.length > 0 && actionType ? (
        <div className="mt-4 grid max-h-[11rem] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 [scrollbar-color:rgba(148,163,184,0.55)_rgba(255,255,255,0.06)] [scrollbar-width:thin]">
          {actions.map((action) => {
            const selected = selectedTargetId === action.targetPlayerId;
            return (
              <button
                key={`${actionType}-${action.targetPlayerId}`}
                type="button"
                className={cn(
                  "rounded-2xl border px-3 py-2.5 text-left text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10",
                  selected ? "border-blue-200/50 bg-blue-400/16 shadow-[0_0_24px_rgba(96,165,250,0.26)]" : "border-white/10 bg-black/35"
                )}
                onClick={() => onAction(actionType, { targetPlayerId: action.targetPlayerId })}
              >
                {targetName(state, action.targetPlayerId)}
                <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/38">
                  {selected ? "Selected" : actionType === "cast_vote" ? `${state.players.find((player) => player.userId === action.targetPlayerId)?.voteCount ?? 0} votes` : "Target"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {myRole === "witch" && state.phase === "night" ? (
        <div className="mt-4 grid max-h-[11rem] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 [scrollbar-width:thin]">
          {witchHealActions.map((action) => (
            <button key={`heal-${action.targetPlayerId}`} type="button" className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2.5 text-left text-sm font-black text-emerald-50 hover:bg-emerald-500/18" onClick={() => onAction("night_witch_heal", { targetPlayerId: action.targetPlayerId })}>Heal {targetName(state, action.targetPlayerId)}</button>
          ))}
          {witchPoisonActions.map((action) => (
            <button key={`poison-${action.targetPlayerId}`} type="button" className="rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2.5 text-left text-sm font-black text-red-50 hover:bg-red-500/18" onClick={() => onAction("night_witch_poison", { targetPlayerId: action.targetPlayerId })}>Poison {targetName(state, action.targetPlayerId)}</button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {passVote ? <button type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/70 hover:bg-white/10" onClick={() => onAction("pass_vote")}>Pass vote</button> : null}
        {clearVote ? <button type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/70 hover:bg-white/10" onClick={() => onAction("clear_vote")}>Clear vote</button> : null}
        {skipVigilante ? <button type="button" className="rounded-full border border-orange-300/20 bg-orange-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-100 hover:bg-orange-500/18" onClick={() => onAction("night_vigilante_skip")}>Hold fire</button> : null}
        {skipWitch ? <button type="button" className="rounded-full border border-purple-300/20 bg-purple-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-purple-100 hover:bg-purple-500/18" onClick={() => onAction("night_witch_skip")}>Save potions</button> : null}
        {advancePhase ? <button type="button" className="rounded-full border border-purple-300/20 bg-purple-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-purple-100 hover:bg-purple-500/18" onClick={() => onAction("advance_phase")}>{state.phase === "day_discussion" ? "Skip discussion" : "Host next phase"}</button> : null}
      </div>
    </div>
  );
}
