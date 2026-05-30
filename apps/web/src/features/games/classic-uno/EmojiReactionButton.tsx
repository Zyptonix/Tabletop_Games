"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const reactions = ["😂", "😎", "💀", "🔥", "👏", "❤️", "🤔"];

export function EmojiReactionButton({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button type="button" size="icon" variant="outline" aria-label="React" onClick={() => setOpen((value) => !value)}>
        <SmilePlus className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-12 right-0 z-30 flex gap-1 rounded-full border border-white/10 bg-black/80 p-1 shadow-2xl backdrop-blur"
          >
            {reactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full text-lg transition hover:bg-white/10"
                onClick={() => {
                  onReact(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
