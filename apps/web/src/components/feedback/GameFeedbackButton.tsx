"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { GameFeedbackModal } from "./GameFeedbackModal";
import { cn } from "@/lib/utils/cn";
import type { FeedbackItem } from "@tabletop/shared";

export type FeedbackButtonVariant =
  | "uno"
  | "twenty-nine"
  | "snakes"
  | "casino"
  | "mafia"
  | "cyan"
  | "default"
  | "icon-only";

interface GameFeedbackButtonProps {
  gameId: string;
  gameName?: string | undefined;
  variant?: FeedbackButtonVariant | undefined;
  className?: string | undefined;
  label?: string | undefined;
  onFeedbackSubmitted?: ((feedback: FeedbackItem) => void) | undefined;
}

export function GameFeedbackButton({
  gameId,
  gameName,
  variant = "default",
  className,
  label = "Feedback",
  onFeedbackSubmitted
}: GameFeedbackButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const getVariantStyles = (): string => {
    switch (variant) {
      case "uno":
        return "border-white/12 bg-black/35 hover:bg-white/10 text-white rounded-full min-h-10 px-3";
      case "twenty-nine":
        return "border-emerald-400/30 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-500/20 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold";
      case "snakes":
        return "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/60 hover:bg-amber-400/20 rounded-lg px-2.5 py-1 text-xs font-bold";
      case "casino":
        return "border-amber-400/30 bg-black/60 text-amber-200 hover:bg-black/80 rounded-xl px-3 py-1.5 text-xs font-bold";
      case "mafia":
        return "border-white/10 bg-black/42 text-white/70 hover:bg-white/15 hover:text-white rounded-full min-h-10 px-3 text-xs font-black uppercase tracking-[0.16em]";
      case "cyan":
        return "border-cyan-400/30 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-500/20 rounded-xl px-3 py-1.5 text-xs font-bold";
      case "icon-only":
        return "grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-black/40 text-white/80 hover:bg-white/10 hover:text-white";
      case "default":
      default:
        return "min-h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-xs font-black text-white/80 hover:border-white/20 hover:bg-white/[0.09]";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md shadow-sm",
          getVariantStyles(),
          className
        )}
        title={`Give feedback on ${gameName || gameId}`}
        aria-label={`Open feedback modal for ${gameName || gameId}`}
      >
        <MessageSquarePlus className="h-3.5 w-3.5 shrink-0 opacity-80" />
        {variant !== "icon-only" ? <span>{label}</span> : null}
      </button>

      <GameFeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        gameId={gameId}
        gameName={gameName}
        onSuccess={onFeedbackSubmitted}
      />
    </>
  );
}
