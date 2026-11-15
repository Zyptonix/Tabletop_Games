"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bug,
  CheckCircle,
  Clock,
  Filter,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Palette,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  X
} from "lucide-react";
import {
  GAME_IDS,
  GAME_LABELS,
  type FeedbackCategory,
  type FeedbackItem,
  type GameId
} from "@tabletop/shared";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { GameFeedbackModal } from "./GameFeedbackModal";
import { cn } from "@/lib/utils/cn";

const CATEGORY_MAP: Record<FeedbackCategory, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "border-rose-500/40 bg-rose-500/15 text-rose-300" },
  balance: { label: "Balance", icon: Scale, color: "border-amber-500/40 bg-amber-500/15 text-amber-300" },
  visuals: { label: "Visuals", icon: Palette, color: "border-purple-500/40 bg-purple-500/15 text-purple-300" },
  suggestion: { label: "Idea", icon: Sparkles, color: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  general: { label: "General", icon: HelpCircle, color: "border-sky-500/40 bg-sky-500/15 text-sky-300" }
};

const STATUS_MAP: Record<"open" | "in_progress" | "done", { label: string; badge: string }> = {
  open: { label: "Open", badge: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  in_progress: { label: "In Progress", badge: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  done: { label: "Resolved", badge: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" }
};

export function DashboardFeedbackTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalInitialGameId, setModalInitialGameId] = useState<string | undefined>(undefined);

  // Deleting item state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFeedbacks();
      setFeedbacks(res.feedbacks);
    } catch (err: any) {
      console.error("Failed to load feedbacks:", err);
      setError(err?.message || "Failed to load feedback entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeedbacks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) {
      return;
    }

    setDeletingId(id);
    try {
      await api.deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete feedback.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "open" | "in_progress" | "done") => {
    setUpdatingStatusId(id);
    try {
      const res = await api.updateFeedbackStatus(id, newStatus);
      setFeedbacks((prev) => prev.map((item) => (item.id === id ? res.feedback : item)));
    } catch (err: any) {
      alert(err?.message || "Failed to update feedback status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      if (selectedGame !== "all" && item.gameId !== selectedGame) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== "all" && item.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesMessage = item.message.toLowerCase().includes(query);
        const matchesGame = item.gameName.toLowerCase().includes(query);
        const matchesAuthor = item.authorName.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage && !matchesGame && !matchesAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [feedbacks, selectedGame, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_65%),linear-gradient(145deg,#091414,#060e0f)] p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">
              Community & Balance Hub
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">Game Feedback & Reports</h2>
          <p className="mt-1 text-sm text-slate-400 max-w-xl">
            Player reviews, bug reports, and suggestions across all tabletop titles. Admins can manage and resolve feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
            title="Refresh feedback list"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalInitialGameId(undefined);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:from-emerald-400 hover:to-teal-500 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Feedback</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#091214] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Game Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Game:</span>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-emerald-400 transition"
            >
              <option value="all" className="bg-zinc-900">All Games ({feedbacks.length})</option>
              {GAME_IDS.map((id) => {
                const count = feedbacks.filter((f) => f.gameId === id).length;
                return (
                  <option key={id} value={id} className="bg-zinc-900">
                    {GAME_LABELS[id] ?? id} {count > 0 ? `(${count})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-emerald-400 transition"
            >
              <option value="all" className="bg-zinc-900">All Types</option>
              <option value="suggestion" className="bg-zinc-900">💡 Suggestions</option>
              <option value="bug" className="bg-zinc-900">🐛 Bug Reports</option>
              <option value="balance" className="bg-zinc-900">⚖️ Game Balance</option>
              <option value="visuals" className="bg-zinc-900">🎨 UI & Visuals</option>
              <option value="general" className="bg-zinc-900">💬 General</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-emerald-400 transition"
            >
              <option value="all" className="bg-zinc-900">All Statuses</option>
              <option value="open" className="bg-zinc-900">Open</option>
              <option value="in_progress" className="bg-zinc-900">In Progress</option>
              <option value="done" className="bg-zinc-900">Resolved</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[14rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search feedback content or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Content Section */}
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-slate-400 font-medium">Loading feedback submissions…</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">No feedback found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            {feedbacks.length === 0
              ? "No feedback has been submitted yet. Be the first to share your thoughts!"
              : "No feedback matching the selected filters. Try clearing your filters or search."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedGame("all");
              setSelectedCategory("all");
              setSelectedStatus("all");
              setSearchQuery("");
            }}
            className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredFeedbacks.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.general;
            const CatIcon = cat.icon;
            const statusConfig = STATUS_MAP[item.status] || STATUS_MAP.open;
            const canDelete = isAdmin || (user?.id && item.userId === user.id);
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#091214]/95 p-5 shadow-lg transition-all hover:border-emerald-500/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Game Badge */}
                      <span className="rounded-lg border border-emerald-400/30 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-black text-emerald-300">
                        {item.gameName}
                      </span>

                      {/* Category Badge */}
                      <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase", cat.color)}>
                        <CatIcon className="h-3 w-3" />
                        <span>{cat.label}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", statusConfig.badge)}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Rating Stars (if present) */}
                  {item.rating ? (
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3.5 w-3.5",
                            s <= item.rating! ? "text-amber-400 fill-amber-400" : "text-white/15 fill-transparent"
                          )}
                        />
                      ))}
                      <span className="text-[10px] text-white/50 ml-1 font-semibold">{item.rating}/5</span>
                    </div>
                  ) : null}

                  {/* Title (if present) */}
                  {item.title ? (
                    <h3 className="text-sm font-black text-white tracking-tight mb-1.5">
                      {item.title}
                    </h3>
                  ) : null}

                  {/* Message */}
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {item.message}
                  </p>
                </div>

                {/* Footer Row */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-white text-[9px] font-bold">
                      {item.authorName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-semibold text-slate-300">
                      {item.authorName}
                    </span>
                    {item.authorRole === "ADMIN" ? (
                      <span className="rounded border border-amber-400/40 bg-amber-400/15 px-1 text-[8px] font-black text-amber-300">
                        ADMIN
                      </span>
                    ) : null}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 whitespace-nowrap">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Admin Status Switcher */}
                    {isAdmin ? (
                      <select
                        value={item.status}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                        className="rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white outline-none cursor-pointer hover:border-emerald-400/40"
                        title="Change status"
                      >
                        <option value="open" className="bg-zinc-900">Open</option>
                        <option value="in_progress" className="bg-zinc-900">In Progress</option>
                        <option value="done" className="bg-zinc-900">Resolved</option>
                      </select>
                    ) : null}

                    {/* Delete Button (Admin or Author) */}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/20 transition active:scale-95"
                        title="Delete feedback"
                        aria-label="Delete feedback"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Submit Feedback Modal */}
      <GameFeedbackModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        gameId={modalInitialGameId}
        onSuccess={(newItem) => {
          setFeedbacks((prev) => [newItem, ...prev]);
        }}
      />
    </div>
  );
}
