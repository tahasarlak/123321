// src/validations/verifyEmail/index.ts
import { z } from "zod";
import { faVerifyEmailMessages } from "./messages";

export const resendVerificationSchema = z.object({
  email: z.string().email(faVerifyEmailMessages.email_required),
  honeypot: z.string().optional(),
});