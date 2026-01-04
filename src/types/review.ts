// src/types/review.ts
export type ReviewResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export type ReactionResult = {
  reactions: { type: string; count: number }[];
  userReaction: string | null;
};
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: {
    name: string;
    image?: string | null;
  };
}
