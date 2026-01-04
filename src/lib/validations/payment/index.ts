// src/validations/payment/index.ts
import { z } from "zod";
import { faPaymentMessages } from "./messages";

export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["ONLINE", "OFFLINE"]),
  honeypot: z.string().optional(),
});