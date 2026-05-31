"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenderableCard } from "@/lib/cards";
import { UnoCard } from "./UnoCard";
import type { CardThemeId } from "./cardThemes";

const noMercyCards: Array<{ key: string; title: string; body: string; card: RenderableCard }> = [
  { key: "seven", title: "7 Swap", body: "Choose another active player and swap hands with them.", card: { id: "sample-7", color: "red", value: "7" } },
  { key: "zero", title: "0 Pass", body: "All active players pass hands in the current direction.", card: { id: "sample-0", color: "blue", value: "0" } },
  { key: "draw-two", title: "Draw 2", body: "Adds 2 to the stack. Stack only with equal or higher draw value.", card: { id: "sample-d2", color: "green", value: "draw_two" } },
  { key: "colored-four", title: "Colored Draw 4", body: "Colored action card. Play only when that color is legal; it is not wild.", card: { id: "sample-c4", color: "yellow", value: "draw_four" } },
  { key: "skip-all", title: "Skip Everyone", body: "Skips all other players and returns play to you.", card: { id: "sample-skip-all", color: "red", value: "comeback" } },
  { key: "discard-all", title: "Discard All", body: "Discard every card of that color from your hand. Wilds stay in hand.", card: { id: "sample-discard", color: "blue", value: "discard_all" } },
  { key: "wild-four-reverse", title: "Wild Reverse Draw 4", body: "Choose color, reverse direction, and add 4 to the draw stack.", card: { id: "sample-w4r", color: "wild", value: "wild_draw_four_reverse" } },
  { key: "wild-six", title: "Wild Draw 6", body: "Choose color and add 6 to the draw stack.", card: { id: "sample-w6", color: "wild", value: "wild_draw_six" } },
  { key: "wild-ten", title: "Wild Draw 10", body: "Choose color and add 10 to the draw stack.", card: { id: "sample-w10", color: "wild", value: "wild_draw_ten" } },
  { key: "roulette", title: "Color Roulette", body: "Choose color. Next player draws until that color appears, then loses the turn.", card: { id: "sample-roulette", color: "wild", value: "roulette" } }
];

const noMercySections = [
  ["Mercy Rule", "A player with 25 or more cards is eliminated and remains at the table as an observer. Last active player wins."],
  ["Stacking", "+2 may be stacked with +2, +4, +6, or +10. +4 may be stacked with +4, +6, or +10. +6 may be stacked with +6 or +10. +10 only stacks with +10. The first player who cannot stack draws the total and loses the turn."],
  ["Special Numbers", "7 swaps hands with a chosen active player. 0 passes every active hand in the current play direction."],
  ["Colored Actions", "Skip skips the next player. Reverse reverses direction. Skip Everyone returns play to you. Discard All discards only matching colored cards from your hand. Colored Draw 4 is not wild."],
  ["Wild Actions", "Wild Reverse Draw 4 reverses direction and adds 4. Wild Draw 6 adds 6. Wild Draw 10 adds 10. Color Roulette draws until the chosen color appears."]
];

const deckSummary = [
  "Each color: 2 each of 0-9, 3 Skips, 2 Skip Everyone, 3 Reverse, 2 Draw Two, 2 Colored Draw Four, 3 Discard All.",
  "Wilds: 8 Wild Reverse Draw Four, 4 Wild Draw Six, 4 Wild Draw Ten, 8 Color Roulette.",
  "Implemented total from the provided count reference: 164 cards."
];

const classicSections = [
  ["Turns", "Match color, number, or symbol. Wild cards choose the next color."],
  ["Action Cards", "Skip, Reverse, Draw 2, Wild, and Wild Draw 4 are validated by the server."],
  ["UNO", "Call UNO when you are near one card. Your hand is private; other players only see counts."],
  ["Winning", "The server calculates the winner and score from final game state."]
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

  const isNoMercy = mode === "uno-no-mercy";
  const sections = isNoMercy ? noMercySections : classicSections;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-200/20 bg-[#07140d] text-white shadow-2xl"
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">Rulebook</p>
            <h2 className="text-xl font-black">{isNoMercy ? "UNO No Mercy" : "Classic UNO"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close rulebook" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#facc15_#082015]">
          {isNoMercy ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {noMercyCards.map((item) => (
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

              <section className="rounded-xl border border-amber-200/15 bg-amber-300/8 p-4">
                <h3 className="font-black uppercase tracking-wide text-amber-200">Deck Counts</h3>
                <div className="mt-2 grid gap-2 text-sm font-semibold leading-relaxed text-white/70 md:grid-cols-3">
                  {deckSummary.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>
            </>
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
