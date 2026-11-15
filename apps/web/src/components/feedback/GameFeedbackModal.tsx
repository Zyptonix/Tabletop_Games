"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MessageSquare,
  Palette,
  Scale,
  Send,
  Sparkles,
  Star,
  X
} from "lucide-react";
import {
  GAME_IDS,
  GAME_LABELS,
  type CreateFeedbackInput,
  type FeedbackCategory,
  type FeedbackItem,
  type GameId
} from "@tabletop/shared";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils/cn";

interface GameFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  gameId?: string | undefined;
  gameName?: string | undefined;
  onSuccess?: ((feedback: FeedbackItem) => void) | undefined;
}

const CATEGORIES: Array<{
  id: FeedbackCategory;
  label: string;
  icon: typeof MessageSquare;
  description: string;
}> = [
  { id: "suggestion", label: "Idea / Suggestion", icon: Sparkles, description: "New features or mechanics" },
  { id: "bug", label: "Bug Report", icon: Bug, description: "Something is broken or wrong" },
  { id: "balance", label: "Game Balance", icon: Scale, description: "Rules, pacing, or fairness" },
  { id: "visuals", label: "UI & Visuals", icon: Palette, description: "Layouts, cards, animations" },
  { id: "general", label: "General Feedback", icon: HelpCircle, description: "Thoughts and impressions" }
];

interface ThemeConfig {
  accentGlow: string;
  borderColor: string;
  headerGradient: string;
  badgeStyle: string;
  buttonGradient: string;
  starColor: string;
  containerBg: string;
}

function getTheme(gameId?: string): ThemeConfig {
  const normalized = (gameId ?? "").toLowerCase();

  if (normalized.includes("uno")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(239,68,68,0.28)]",
      borderColor: "border-red-500/50",
      headerGradient: "from-red-600/30 via-rose-500/15 to-transparent",
      badgeStyle: "border-red-400/40 bg-red-500/15 text-red-300",
      buttonGradient: "from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]",
      starColor: "text-amber-400 fill-amber-400",
      containerBg: "bg-[linear-gradient(145deg,rgba(16,10,12,0.98),rgba(24,12,16,0.97))]"
    };
  }

  if (normalized.includes("twenty-nine")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(16,185,129,0.25)]",
      borderColor: "border-emerald-500/40",
      headerGradient: "from-emerald-600/30 via-amber-500/15 to-transparent",
      badgeStyle: "border-amber-400/40 bg-amber-500/15 text-amber-200",
      buttonGradient: "from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      starColor: "text-amber-300 fill-amber-300",
      containerBg: "bg-[linear-gradient(145deg,rgba(8,19,15,0.98),rgba(11,26,20,0.97))]"
    };
  }

  if (normalized.includes("snakes") || normalized.includes("ludo")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(245,158,11,0.25)]",
      borderColor: "border-amber-400/40",
      headerGradient: "from-amber-600/30 via-yellow-500/15 to-transparent",
      badgeStyle: "border-amber-400/40 bg-amber-500/15 text-amber-300",
      buttonGradient: "from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.3)]",
      starColor: "text-amber-300 fill-amber-300",
      containerBg: "bg-[linear-gradient(145deg,rgba(16,15,10,0.98),rgba(24,20,13,0.97))]"
    };
  }

  if (normalized.includes("poker") || normalized.includes("blackjack") || normalized.includes("casino")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(16,185,129,0.25)]",
      borderColor: "border-amber-400/40",
      headerGradient: "from-emerald-700/30 via-amber-600/20 to-transparent",
      badgeStyle: "border-amber-400/50 bg-amber-500/15 text-amber-300",
      buttonGradient: "from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white font-black shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      starColor: "text-amber-400 fill-amber-400",
      containerBg: "bg-[linear-gradient(145deg,rgba(6,18,13,0.98),rgba(10,28,21,0.97))]"
    };
  }

  if (normalized.includes("mafia") || normalized.includes("werewolf")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(168,85,247,0.25)]",
      borderColor: "border-violet-500/40",
      headerGradient: "from-purple-800/30 via-rose-700/20 to-transparent",
      badgeStyle: "border-violet-400/40 bg-violet-500/15 text-violet-300",
      buttonGradient: "from-violet-700 via-purple-600 to-rose-600 hover:from-violet-600 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]",
      starColor: "text-amber-300 fill-amber-300",
      containerBg: "bg-[linear-gradient(145deg,rgba(16,10,24,0.98),rgba(20,12,30,0.97))]"
    };
  }

  if (normalized.includes("strategic") || normalized.includes("shockwave") || normalized.includes("chess") || normalized.includes("connect-four")) {
    return {
      accentGlow: "shadow-[0_0_60px_rgba(6,182,212,0.25)]",
      borderColor: "border-cyan-400/40",
      headerGradient: "from-cyan-600/30 via-sky-500/15 to-transparent",
      badgeStyle: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
      buttonGradient: "from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.35)]",
      starColor: "text-amber-300 fill-amber-300",
      containerBg: "bg-[linear-gradient(145deg,rgba(8,18,24,0.98),rgba(10,24,32,0.97))]"
    };
  }

  // Default theme
  return {
    accentGlow: "shadow-[0_0_60px_rgba(16,185,129,0.2)]",
    borderColor: "border-emerald-500/35",
    headerGradient: "from-emerald-600/25 via-teal-500/10 to-transparent",
    badgeStyle: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
    buttonGradient: "from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    starColor: "text-amber-300 fill-amber-300",
    containerBg: "bg-[linear-gradient(145deg,rgba(11,18,16,0.98),rgba(14,24,20,0.97))]"
  };
}

export function GameFeedbackModal({
  open,
  onClose,
  gameId: initialGameId,
  gameName: initialGameName,
  onSuccess
}: GameFeedbackModalProps) {
  const { user } = useAuth();
  const selectId = useId();

  const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId || "classic-uno");
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync initialGameId if provided
  const activeGameId = initialGameId || selectedGameId;
  const theme = getTheme(activeGameId);

  const displayGameName =
    initialGameName ||
    GAME_LABELS[activeGameId as GameId] ||
    activeGameId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your feedback or suggestion.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateFeedbackInput = {
        gameId: activeGameId,
        category,
        rating: rating ?? null,
        title: title.trim() || null,
        message: message.trim(),
        guestName: !user ? guestName.trim() || null : null
      };

      const res = await api.createFeedback(payload);
      setSuccess(true);
      onSuccess?.(res.feedback);

      // Auto close after 1.6s
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      setError(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCategory("suggestion");
    setRating(null);
    setTitle("");
    setMessage("");
    setGuestName("");
    setError(null);
    setSuccess(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleModalClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${selectId}-title`}
            className={cn(
              "relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border text-white shadow-2xl backdrop-blur-2xl transition-all",
              theme.borderColor,
              theme.accentGlow,
              theme.containerBg
            )}
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 14 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
          >
            {/* Top Glowing Header Strip */}
            <div className={cn("relative border-b px-5 py-4 bg-gradient-to-r", theme.headerGradient, theme.borderColor)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-inner">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id={`${selectId}-title`} className="text-base sm:text-lg font-black tracking-tight text-white">
                        Game Feedback
                      </h2>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", theme.badgeStyle)}>
                        {displayGameName}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">Help us polish and balance the tabletop experience</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleModalClose}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white transition"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-white">Feedback Received!</h3>
                  <p className="mt-1.5 max-w-sm text-sm text-white/70">
                    Thank you for helping make Tabletop Arena better. Our team regularly reviews player suggestions and bug reports.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Game Select (Only if initialGameId was NOT passed) */}
                  {!initialGameId ? (
                    <div>
                      <label htmlFor={`${selectId}-game`} className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1.5">
                        Select Game
                      </label>
                      <select
                        id={`${selectId}-game`}
                        value={selectedGameId}
                        onChange={(e) => setSelectedGameId(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-400 transition"
                      >
                        {GAME_IDS.map((id) => (
                          <option key={id} value={id} className="bg-zinc-900 text-white">
                            {GAME_LABELS[id] ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Feedback Category Pills */}
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1.5">
                      Category
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-all",
                              isSelected
                                ? cn(theme.badgeStyle, "shadow-sm")
                                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Star Rating (Optional) */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-2.5 sm:px-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-white/80">Rate Experience</p>
                      <p className="text-[10px] text-white/50">
                        {rating ? (
                          rating === 5 ? "⭐⭐⭐⭐⭐ Amazing!" :
                          rating === 4 ? "⭐⭐⭐⭐ Great" :
                          rating === 3 ? "⭐⭐⭐ Good" :
                          rating === 2 ? "⭐⭐ Fair" : "⭐ Needs Work"
                        ) : "Optional rating"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = (hoverRating ?? rating ?? 0) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => setRating(rating === star ? null : star)}
                            className="p-1 transition hover:scale-110 active:scale-95"
                            aria-label={`${star} star`}
                          >
                            <Star
                              className={cn(
                                "h-5 w-5 transition-colors",
                                filled ? theme.starColor : "text-white/20 fill-transparent"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title (Optional) */}
                  <div>
                    <label htmlFor={`${selectId}-title-input`} className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                      Short Summary <span className="text-white/40 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      id={`${selectId}-title-input`}
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Card animation speed, Draw 4 rule ambiguity..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition"
                    />
                  </div>

                  {/* Message (Required) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={`${selectId}-message`} className="text-xs font-black uppercase tracking-wider text-white/70">
                        Detailed Feedback <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-white/40 tabular-nums">
                        {message.length}/2500
                      </span>
                    </div>
                    <textarea
                      id={`${selectId}-message`}
                      rows={4}
                      maxLength={2500}
                      required
                      placeholder={`What can we improve about ${displayGameName}? Be as detailed as you like!`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-none rounded-xl border border-white/15 bg-black/50 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition"
                    />
                  </div>

                  {/* Guest Name if not authenticated */}
                  {!user ? (
                    <div>
                      <label htmlFor={`${selectId}-guest`} className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                        Your Name / Nickname <span className="text-white/40 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        id={`${selectId}-guest`}
                        type="text"
                        maxLength={50}
                        placeholder="Anonymous Player"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 transition"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>Submitting as:</span>
                      <strong className="text-white/80">{user.displayName}</strong>
                      {user.role === "ADMIN" ? (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Error Banner */}
                  {error ? (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs font-medium text-rose-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !message.trim()}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed",
                        theme.buttonGradient
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
