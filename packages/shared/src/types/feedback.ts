export type FeedbackCategory = "bug" | "balance" | "visuals" | "suggestion" | "general";

export interface FeedbackItem {
  id: string;
  userId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorRole?: "USER" | "ADMIN" | null;
  gameId: string;
  gameName: string;
  category: FeedbackCategory;
  rating?: number | null; // 1 to 5
  title?: string | null;
  message: string;
  status: "open" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  gameId: string;
  category?: FeedbackCategory;
  rating?: number | null;
  title?: string | null;
  message: string;
  guestName?: string | null;
}
