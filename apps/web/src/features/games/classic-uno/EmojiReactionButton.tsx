"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const reactions = [
  { emoji: "\u{1F602}", label: "Laugh" },
  { emoji: "\u{1F60E}", label: "Cool" },
  { emoji: "\u{1F480}", label: "Skull" },
  { emoji: "\u{1F525}", label: "Fire" },
  { emoji: "\u{1F44F}", label: "Clap" },
  { emoji: "\u{2764}\u{FE0F}", label: "Heart" },
  { emoji: "\u{1F914}", label: "Think" }
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
            className="absolute right-0 top-12 z-40 flex gap-1 rounded-full border border-white/10 bg-black/80 p-1 shadow-2xl backdrop-blur"
          >
            {reactions.map((reaction) => (
              <button
                key={reaction.label}
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full text-lg transition hover:scale-110 hover:bg-white/10"
                aria-label={`React ${reaction.label}`}
                onClick={() => {
                  onReact(reaction.emoji);
                  setOpen(false);
                }}
              >
                {reaction.emoji}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}