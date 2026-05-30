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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/92 p-3 shadow-2xl backdrop-blur md:static md:rounded-xl md:border md:bg-black/45">
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
        <Button type="button" className="bg-sky-600 hover:bg-sky-700" disabled={!hasLegalAction(legalActions, "draw_card")} onClick={onDraw}>
          <Hand className="h-4 w-4" />
          Draw
        </Button>
        <Button type="button" variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15" disabled={!hasLegalAction(legalActions, "pass_turn")} onClick={onPass}>
          <SkipForward className="h-4 w-4" />
          Pass
        </Button>
        <Button type="button" variant="danger" className="bg-red-600 hover:bg-red-700" disabled={!hasLegalAction(legalActions, "call_uno")} onClick={onUno}>
          <Megaphone className="h-4 w-4" />
          UNO
        </Button>
      </div>
    </div>
  );
}
