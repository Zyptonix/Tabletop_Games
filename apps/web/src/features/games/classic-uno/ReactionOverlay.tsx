"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessageView } from "@tabletop/shared";

export const REACTION_PREFIX = "__reaction:";

const REACTION_POSITIONS = [
  { left: "24%", bottom: "66%", driftX: -18, rotate: -8 },
  { left: "42%", bottom: "72%", driftX: 10, rotate: 7 },
  { left: "60%", bottom: "64%", driftX: 18, rotate: -4 },
  { left: "72%", bottom: "45%", driftX: -12, rotate: 8 },
  { left: "34%", bottom: "42%", driftX: 16, rotate: -7 },
  { left: "52%", bottom: "34%", driftX: -16, rotate: 5 },
  { left: "18%", bottom: "48%", driftX: 10, rotate: 9 },
  { left: "80%", bottom: "62%", driftX: -10, rotate: -9 }
];

function getEmoji(message: ChatMessageView) {
  return message.body.startsWith(REACTION_PREFIX) ? message.body.slice(REACTION_PREFIX.length) : "";
}

function getDisplayName(message: ChatMessageView) {
  return message.displayName || "Player";
}

export function ReactionOverlay({ messages }: { messages: ChatMessageView[] }) {
  const reactions = messages
    .filter((message) => message.type === "user" && message.body.startsWith(REACTION_PREFIX))
    .slice(-8)
    .map((message, index) => ({
      id: message.id,
      emoji: getEmoji(message),
      displayName: getDisplayName(message),
      ...REACTION_POSITIONS[index % REACTION_POSITIONS.length]
    }));

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <AnimatePresence initial={false}>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{
              opacity: 0,
              y: 40,
              x: 0,
              scale: 0.58,
              rotate: reaction.rotate
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -120,
              x: reaction.driftX,
              scale: [0.58, 1.22, 1, 0.86],
              rotate: [reaction.rotate, reaction.rotate * -0.4, reaction.rotate * 0.5]
            }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 2.6, ease: "easeOut" }}
            className="absolute"
            style={{ left: reaction.left, bottom: reaction.bottom }}
          >
            <div className="relative grid h-14 min-w-14 place-items-center rounded-2xl border border-white/10 bg-black/35 px-3 text-4xl shadow-[0_18px_45px_rgb(0_0_0_/_0.35)] backdrop-blur-md">
              <span className="drop-shadow-[0_0_18px_rgb(255_255_255_/_0.25)]">{reaction.emoji}</span>

              <span className="absolute -bottom-5 left-1/2 max-w-24 -translate-x-1/2 truncate rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-white/65 backdrop-blur">
                {reaction.displayName}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}