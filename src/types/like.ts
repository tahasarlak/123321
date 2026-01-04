// src/types/like.ts
export type LikeResult =
  | { success: true; message?: string }
  | { success: false; error: string };