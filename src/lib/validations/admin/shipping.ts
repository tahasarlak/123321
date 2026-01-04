// src/lib/validations/admin/shipping.ts
import { z } from "zod";

export const createShippingMethodSchema = z.object({
  title: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  type: z.enum(["POST", "COURIER", "TIPAX", "INTERNATIONAL", "PRESENTIAL", "FREE"]),
  cost: z.number().int().min(0).optional().nullable(),
  costPercent: z.number().min(0).max(100).optional().nullable(),
  freeAbove: z.number().int().min(0).optional().nullable(),
  estimatedDays: z.string().optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
  zoneId: z.string().optional().nullable(),
  pickupId: z.string().optional().nullable(),
});

export const updateShippingMethodSchema = createShippingMethodSchema.extend({
  // همه فیلدها اختیاری در update
  title: z.string().min(3).optional(),
  type: z.enum(["POST", "COURIER", "TIPAX", "INTERNATIONAL", "PRESENTIAL", "FREE"]).optional(),
  cost: z.number().int().min(0).optional().nullable(),
  costPercent: z.number().min(0).max(100).optional().nullable(),
  freeAbove: z.number().int().min(0).optional().nullable(),
  estimatedDays: z.string().optional().nullable(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  zoneId: z.string().optional().nullable(),
  pickupId: z.string().optional().nullable(),
});

export type CreateShippingMethodForm = z.infer<typeof createShippingMethodSchema>;
export type UpdateShippingMethodForm = z.infer<typeof updateShippingMethodSchema>;