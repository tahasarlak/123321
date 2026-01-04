// src/validations/contact/index.ts
import { z } from "zod";
import { faContactMessages } from "./messages";

/** schema نهایی تماس — همه چیز یکجا برای جلوگیری از خطای refine + extend */
export const contactSchema = z.object({
  name: z.string().min(2, faContactMessages.name_min).max(100, faContactMessages.name_max),
  email: z.string().email(faContactMessages.email_invalid),
  subject: z.string().min(3, faContactMessages.subject_min).max(200, faContactMessages.subject_max),
  message: z.string().min(10, faContactMessages.message_min).max(3000, faContactMessages.message_max),
  honeypot: z.string().optional(),
});
export type ContactFormData = z.infer<typeof contactSchema>;