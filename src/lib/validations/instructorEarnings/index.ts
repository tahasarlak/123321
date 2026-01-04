// src/validations/instructorEarnings/index.ts
import { z } from "zod";

export const requestWithdrawalSchema = z.object({
  amount: z.number().min(10000),
  method: z.enum(["BANK_TRANSFER", "CRYPTO", "CARD_TO_CARD"]),
  details: z.string().min(1),
  honeypot: z.string().optional(),
});