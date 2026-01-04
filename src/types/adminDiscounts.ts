// src/types/adminDiscounts.ts
export type DiscountItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minimumAmount: number | null;
  maxDiscountAmount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  usedCount: number;
};

export type DiscountResult =
  | { success: true; message?: string; discount?: DiscountItem; discounts?: DiscountItem[]; stats?: any }
  | { success: false; error: string };