// src/validations/adminDiscounts/index.ts
import { z } from "zod";
import { faAdminDiscountsMessages } from "./messages";

export const createDiscountSchema = z.object({
  title: z.string().min(1, faAdminDiscountsMessages.required_fields),
  code: z.string().min(1, faAdminDiscountsMessages.required_fields).toUpperCase(),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().min(1, faAdminDiscountsMessages.required_fields),
  minimumAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  honeypot: z.string().optional(),
});