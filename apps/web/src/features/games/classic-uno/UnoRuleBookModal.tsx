"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

const sampleCards: Array<{ key: string; title: string; body: string; card: RenderableCard }> = [
  { key: "seven", title: "7 Swap", body: "Playing a 7 swaps your hand with a chosen active player.", card: { id: "sample-7", color: "red", value: "7" } },
  { key: "zero", title: "0 Pass", body: "Playing a 0 passes all active hands in the current direction.", card: { id: "sample-0", color: "blue", value: "0" } },
  { key: "draw-two", title: "Draw 2", body: "Adds 2 to the pending stack. Stack with legal draw cards.", card: { id: "sample-d2", color: "green", value: "draw_two" } },
  { key: "colored-four", title: "Colored +4", body: "Only playable when its color matches. It is not wild.", card: { id: "sample-c4", color: "yellow", value: "draw_four", assetKey: "yellow-draw-four" } },
  { key: "wild-four-reverse", title: "Wild +4 Reverse", body: "Choose color, add 4, and reverse direction.", card: { id: "sample-w4r", color: "wild", value: "wild_draw_four_reverse", assetKey: "wild-draw-four-reverse" } },
  { key: "roulette", title: "Roulette", body: "Choose color; next player draws until that color appears.", card: { id: "sample-roulette", color: "wild", value: "roulette", assetKey: "wild-roulette" } }
];

const sections = [
  ["Special Rules", "7's Swap makes you choose another active player and swap hands. 0's Pass moves every active hand in the current direction."],
  ["Wild Cards", "Wild, Wild Draw 4, Wild Draw 4 Reverse, Wild Draw 6, Wild Draw 10, and Roulette all choose the next color when played."],
  ["Action Cards", "Skip, Reverse, Draw 2, Colored Draw 4, Comeback / Skip All, and Discard All are validated by the server."],
  ["Elimination", "At 25 cards, a player is eliminated and stays at the table as an observer. Last active player wins."]
];

export function UnoRuleBookModal({
  open,
  mode,
  theme,
  onClose
}: {
  open: boolean;
  mode: "classic-uno" | "uno-no-mercy";
  theme: CardThemeId;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-amber-200/20 bg-[#07140d] text-white shadow-2xl"
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">Rulebook</p>
            <h2 className="text-xl font-black">{mode === "uno-no-mercy" ? "UNO No Mercy" : "Classic UNO"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close rulebook" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#facc15_#082015]">
          {mode === "uno-no-mercy" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sampleCards.map((item) => (
                <article key={item.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <UnoCard card={item.card} compact theme={theme} />
                    <div>
                      <h3 className="font-black text-amber-100">{item.title}</h3>
                      <p className="text-xs font-semibold leading-relaxed text-white/65">{item.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {sections.map(([title, body]) => (
              <section key={title} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <h3 className="font-black uppercase tracking-wide text-amber-200">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/68">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
