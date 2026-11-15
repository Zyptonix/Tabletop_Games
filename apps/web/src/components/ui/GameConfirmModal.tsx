"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface GameConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GameConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel
}: GameConfirmModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d161a] p-6 text-white shadow-[0_0_50px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                  isDestructive
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                    : "border-amber-400/40 bg-amber-500/15 text-amber-300"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black tracking-tight">{title}</h3>
                <p className="mt-0.5 text-xs text-white/50">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-xl px-4 py-2 text-xs font-black shadow-lg transition ${
                  isDestructive
                    ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30"
                    : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
