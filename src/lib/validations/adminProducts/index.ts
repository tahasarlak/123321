// src/validations/adminProducts/index.ts
import { z } from "zod";
import { faAdminProductsMessages } from "./messages";

export const createProductSchema = z.object({
  title: z.string().min(1, faAdminProductsMessages.title_required),
  slug: z.string().min(1, faAdminProductsMessages.slug_required),
  categoryId: z.string().min(1, faAdminProductsMessages.category_required),
  price: z.object({ IRR: z.number().min(1, faAdminProductsMessages.price_required) }),
  // بقیه اختیاری
  description: z.string().optional(),
  brand: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  discountPercent: z.number().int().min(0).max(100).optional(),
  image: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  freeShippingAbove: z.number().int().optional(),
  shippingMethodIds: z.array(z.string()).optional(),
  paymentAccountIds: z.array(z.string()).optional(),
  honeypot: z.string().optional(),
});

export const editProductSchema = createProductSchema.partial().extend({
  id: z.string().min(1),
});