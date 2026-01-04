// src/validations/upload/index.ts
import { z } from "zod";
import { faUploadMessages } from "./messages";

const MAX_SIZE = 10 * 1024 * 1024; // ۱۰ مگابایت
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const uploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size > 0, faUploadMessages.file_required)
    .refine((file) => file.size <= MAX_SIZE, faUploadMessages.file_size)
    .refine((file) => ACCEPTED_TYPES.includes(file.type), faUploadMessages.file_type),
  honeypot: z.string().optional(),
});

export type UploadFormData = z.infer<typeof uploadSchema>;