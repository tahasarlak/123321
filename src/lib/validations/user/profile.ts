// src/lib/validations/user/profile.ts
import { z } from "zod";

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "نام باید حداقل ۲ کاراکتر باشد")
    .max(50, "نام نمی‌تواند بیشتر از ۵۰ کاراکتر باشد")
    .trim(),
  phone: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد")
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  city: z.string().max(50).optional().nullable().transform((val) => val?.trim() || null),
  bio: z.string().max(500, "بیوگرافی نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد").optional().nullable().transform((val) => val?.trim() || null),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  birthDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), "تاریخ تولد معتبر نیست")
    .transform((val) => (val ? new Date(val) : null)),
  imageUrl: z
    .string()
    .url("آدرس تصویر معتبر نیست")
    .optional()
    .nullable()
    .transform((val) => val || null),
});

export type ProfileFormData = z.infer<typeof profileSchema>;