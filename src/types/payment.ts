// src/types/payment.ts
export type PaymentResult =
  | { success: true; url?: string; message?: string }
  | { success: false; error: string };