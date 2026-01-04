// src/validations/cart/index.ts
import { z } from "zod";
import { faCartMessages } from "./messages";

/** اضافه کردن به سبد خرید */
export const addCartSchema = z.object({
  productId: z.string().optional(),
  courseId: z.string().optional(),
  quantity: z.number().int().min(1, faCartMessages.quantity_min).default(1),
  honeypot: z.string().optional(),
}).refine((data) => data.productId || data.courseId, {
  message: faCartMessages.required_item,
  path: ["productId"],
});

export type AddToCartData = z.infer<typeof addCartSchema>;

/** بروزرسانی تعداد آیتم (شامل حذف با quantity=0) */
export const updateCartItemSchema = z.object({
  productId: z.string().optional(),
  courseId: z.string().optional(),
  quantity: z.number().int().min(0, "تعداد نمی‌تواند منفی باشد"),
  honeypot: z.string().optional(),
}).refine((data) => data.productId || data.courseId, {
  message: faCartMessages.required_item,
  path: ["productId"],
});

export type UpdateCartData = z.infer<typeof updateCartItemSchema>;