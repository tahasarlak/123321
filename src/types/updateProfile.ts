// src/types/updateProfile.ts
export type ProfileResult =
  | { success: true; message?: string; user?: any }
  | { success: false; error: string };