"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="max-h-[88dvh] w-full max-w-md overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,10,14,0.98),rgba(18,20,26,0.96))] text-white shadow-[0_28px_100px_rgba(0,0,0,0.75)]"
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-base font-black text-white">{title}</h2>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(88dvh-4.5rem)] overflow-y-auto p-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
