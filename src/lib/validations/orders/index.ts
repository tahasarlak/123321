// src/validations/orders/index.ts
import { z } from "zod";
import { faOrdersMessages } from "./messages";

export const changeOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  newStatus: z.enum(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  honeypot: z.string().optional(),
});