// src/types/cart.ts
export type CartItem = {
  id: string;
  productId: string | null;
  courseId: string | null;
  quantity: number;
  product?: { title: string; image: string; price: number; stock: number } | null;
  course?: { title: string; image: string; price: number } | null;
};

export type CartResponse = {
  count: number;
  items: CartItem[];
};

export type CartResult =
  | { success: true; message?: string }
  | { success: false; error: string };