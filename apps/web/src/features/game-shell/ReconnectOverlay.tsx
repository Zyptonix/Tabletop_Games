"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export function ReconnectOverlay({ connected }: { connected: boolean }) {
  return (
    <AnimatePresence>
      {!connected ? (
        <motion.div
          className="fixed inset-x-0 top-16 z-40 mx-auto w-full max-w-md px-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow-lg">
            <WifiOff className="h-5 w-5" />
            <p className="text-sm font-semibold">Reconnecting to the room</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
