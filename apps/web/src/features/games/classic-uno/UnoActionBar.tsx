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
    <div className="fixed inset-x-0 bottom-24 z-50 border-0 bg-transparent p-3 shadow-none backdrop-blur-none md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      {resolvingRoulette ? (
        <div className="relative z-50 mx-auto max-w-md rounded-[1.35rem] border-2 border-fuchsia-400/80 bg-zinc-950/95 p-3.5 shadow-[0_0_40px_rgba(217,70,239,0.5),0_16px_36px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <div className="mb-2.5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <Sparkles className="h-4 w-4 text-fuchsia-400 animate-pulse" />
            Choose roulette color
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {rouletteActions.map((action) => (
              <Button
                key={action.chosenColor}
                type="button"
                className={cn(
                  "min-h-10 rounded-xl px-3 text-xs sm:text-sm font-black uppercase tracking-[0.14em] text-white shadow-xl transition-all duration-200 hover:scale-105 active:scale-95",
                  ROULETTE_COLOR_CLASS[action.chosenColor]
                )}
                onClick={() => onResolveRoulette?.(action.chosenColor)}
              >
                {action.chosenColor}
              </Button>
            ))}
          </div>
        </div>
      ) : mode === "uno-no-mercy" ? null : (
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
