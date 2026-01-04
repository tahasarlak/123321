// src/types/adminProducts.ts
export type ProductResult =
  | { success: true; message?: string }
  | { success: false; error: string };