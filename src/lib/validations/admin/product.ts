// src/lib/validations/admin/product.ts
import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  slug: z.string().min(3, "اسلاگ باید حداقل ۳ کاراکتر باشد"),
  brand: z.string().optional(),
  categoryId: z.string().min(1, "دسته‌بندی الزامی است"),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد"),
  price: z.record(z.string(), z.number().positive("قیمت باید مثبت باشد")),
  stock: z.number().int().min(0, "موجودی نمی‌تواند منفی باشد"),
  discountPercent: z.number().int().min(0).max(99).optional(),
  maxDiscountAmount: z.record(z.string(), z.number().positive()).optional(),
  tags: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial({
  title: true,
  slug: true,
  brand: true,
  categoryId: true,
  description: true,
  price: true,
  stock: true,
  discountPercent: true,
  maxDiscountAmount: true,
  tags: true,
});

export type CreateProductForm = z.infer<typeof createProductSchema>;
export type UpdateProductForm = z.infer<typeof updateProductSchema>;