"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const reactions = [
  { emoji: "\u{1F602}", label: "Laugh", asset: "reaction-laugh" },
  { emoji: "\u{1F60E}", label: "Cool", asset: "reaction-cool" },
  { emoji: "\u{1F480}", label: "Skull", asset: "reaction-skull" },
  { emoji: "\u{1F525}", label: "Fire", asset: "reaction-fire" },
  { emoji: "\u{1F44F}", label: "Clap", asset: "reaction-clap" },
  { emoji: "\u{2764}\u{FE0F}", label: "Heart", asset: "reaction-heart" },
  { emoji: "\u{1F914}", label: "Think", asset: "reaction-think" }
];

export function EmojiReactionButton({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-black/35 text-white shadow backdrop-blur transition hover:bg-white/10"
        aria-label="React"
        onClick={() => setOpen((value) => !value)}
      >
        <SmilePlus className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 top-12 z-40 flex gap-1 rounded-[1.25rem] border border-sky-100/10 bg-[#06101f]/95 p-1.5 shadow-[0_20px_55px_rgba(0,0,0,.55)] backdrop-blur-xl"
          >
            {reactions.map((reaction) => (
              <button
                key={reaction.label}
                type="button"
                className="group grid h-10 w-10 place-items-center rounded-xl border border-transparent transition hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
                aria-label={`React ${reaction.label}`}
                title={reaction.label}
                onClick={() => {
                  onReact(reaction.emoji);
                  setOpen(false);
                }}
              >
                <img
                  src={`/uno-assets/${reaction.asset}.svg`}
                  alt=""
                  width="34"
                  height="34"
                  className="h-[2.1rem] w-[2.1rem] object-contain transition duration-150 group-hover:scale-110"
                />
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
