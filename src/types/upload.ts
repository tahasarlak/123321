// src/types/upload.ts
export type UploadResult =
  | { success: true; url: string }
  | { success: false; error: string };