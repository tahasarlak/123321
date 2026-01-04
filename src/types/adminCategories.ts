// src/types/adminCategories.ts
export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  courseCount: number;
};

export type CategoryResult =
  | { success: true; message?: string; category?: CategoryItem; categories?: CategoryItem[] }
  | { success: false; error: string };