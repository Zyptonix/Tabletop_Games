"use client";

import { Hand, Megaphone, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasLegalAction } from "./unoActionUtils";

export function UnoActionBar({
  legalActions,
  onDraw,
  onPass,
  onUno
}: {
  legalActions: unknown[];
  onDraw: () => void;
  onPass: () => void;
  onUno: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/92 p-3 shadow-2xl backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
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
    </div>
  );
}