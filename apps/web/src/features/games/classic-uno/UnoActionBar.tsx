"use client";

import { Hand, Megaphone, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getResolveRouletteActions, hasLegalAction } from "./unoActionUtils";

const ROULETTE_COLOR_CLASS: Record<string, string> = {
  red: "bg-red-500 hover:bg-red-400",
  yellow: "bg-yellow-300 text-zinc-950 hover:bg-yellow-200",
  green: "bg-emerald-500 hover:bg-emerald-400",
  blue: "bg-sky-500 hover:bg-sky-400"
};

export function UnoActionBar({
  legalActions,
  mode = "classic-uno",
  onDraw,
  onPass,
  onUno,
  onResolveRoulette
}: {
  legalActions: unknown[];
  mode?: "classic-uno" | "uno-no-mercy";
  onDraw: () => void;
  onPass: () => void;
  onUno: () => void;
  onResolveRoulette?: (color: "red" | "yellow" | "green" | "blue") => void;
}) {
  const rouletteActions = getResolveRouletteActions(legalActions);
  const resolvingRoulette = rouletteActions.length > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/92 p-3 shadow-2xl backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      {resolvingRoulette ? (
        <div className="mx-auto max-w-lg rounded-[1.15rem] border border-fuchsia-200/15 bg-black/45 p-2 shadow-[0_0_32px_rgba(217,70,239,0.16)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-fuchsia-100/75">
            <Sparkles className="h-3.5 w-3.5" />
            Choose roulette color
          </div>
          <div className="grid grid-cols-4 gap-2">
            {rouletteActions.map((action) => (
              <Button
                key={action.chosenColor}
                type="button"
                className={cn(
                  "min-h-9 rounded-full px-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg",
                  ROULETTE_COLOR_CLASS[action.chosenColor]
                )}
                onClick={() => onResolveRoulette?.(action.chosenColor)}
              >
                {action.chosenColor}
              </Button>
            ))}
          </div>
        </div>
      ) : mode === "uno-no-mercy" ? (
        <div className="mx-auto grid max-w-xs grid-cols-1 gap-2">
          <Button
            type="button"
            className="min-h-9 rounded-full bg-sky-500/85 px-4 text-xs font-black text-white hover:bg-sky-400"
            disabled={!hasLegalAction(legalActions, "draw_card")}
            onClick={onDraw}
          >
            <Hand className="h-4 w-4" />
            Draw
          </Button>
        </div>
      ) : (
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          <Button
            type="button"
            className="min-h-9 rounded-full bg-sky-500/85 px-3 text-xs font-black text-white hover:bg-sky-400"
            disabled={!hasLegalAction(legalActions, "draw_card")}
            onClick={onDraw}
          >
            <Hand className="h-4 w-4" />
            Draw
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-9 rounded-full border-white/12 bg-black/35 px-3 text-xs font-black text-white hover:bg-white/10"
            disabled={!hasLegalAction(legalActions, "pass_turn")}
            onClick={onPass}
          >
            <SkipForward className="h-4 w-4" />
            Pass
          </Button>
          <Button
            type="button"
            variant="danger"
            className="min-h-9 rounded-full bg-red-600/90 px-3 text-xs font-black hover:bg-red-500"
            disabled={!hasLegalAction(legalActions, "call_uno")}
            onClick={onUno}
          >
            <Megaphone className="h-4 w-4" />
            UNO
          </Button>
        </div>
      )}
    </div>
  );
}
