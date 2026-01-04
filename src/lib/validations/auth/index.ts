// src/lib/validations/auth/index.ts

import { z } from "zod";
import { getAuthMessage } from "./getMessage";

// === تایپ‌ها از روی schemaها infer می‌شن (بهترین روش) ===
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotForm = z.infer<typeof forgotSchema>;
export type ResetForm = z.infer<typeof resetSchema>;

// === Factory برای schemaهای ترجمه‌شده (سرور) ===
export async function createAuthSchemas() {
  const messages = {
    email_invalid: await getAuthMessage("email_invalid"),
    password_min: await getAuthMessage("password_min"),
    name_min: await getAuthMessage("name_min"),
    name_max: await getAuthMessage("name_max"),
    phone_invalid: await getAuthMessage("phone_invalid"),
    password_confirm: await getAuthMessage("password_confirm"),
    gender_invalid: await getAuthMessage("gender_invalid"),
  };

  const loginSchema = z.object({
    email: z.string().email(messages.email_invalid),
    password: z.string().min(8, messages.password_min),
    honeypot: z.string().optional(),
  });

  const registerSchema = z.object({
    name: z.string().min(2, messages.name_min).max(100, messages.name_max),
    email: z.string().email(messages.email_invalid),
    phone: z.string().regex(/^09\d{9}$/, messages.phone_invalid),
    password: z.string().min(8, messages.password_min),
    passwordConfirm: z.string(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    honeypot: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: messages.password_confirm,
    path: ["passwordConfirm"],
  })
  .refine((data) => ["MALE", "FEMALE", "OTHER"].includes(data.gender), {
    message: messages.gender_invalid,
    path: ["gender"],
  });

  const forgotSchema = z.object({
    email: z.string().email(messages.email_invalid),
    honeypot: z.string().optional(),
  });

  const resetSchema = z.object({
    password: z.string().min(8, messages.password_min),
    passwordConfirm: z.string(),
    honeypot: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: messages.password_confirm,
    path: ["passwordConfirm"],
  });

  return {
    loginSchema,
    registerSchema,
    forgotSchema,
    resetSchema,
  };
}

// === schemaهای sync با پیام پیش‌فرض (برای Client Components) ===
export const loginSchema = z.object({
  email: z.string().email("ایمیل نامعتبر است"),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
  honeypot: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100, "نام خیلی طولانی است"),
  email: z.string().email("ایمیل نامعتبر است"),
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است"),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
  passwordConfirm: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  honeypot: z.string().optional(),
})
.refine((data) => data.password === data.passwordConfirm, {
  message: "رمزهای عبور مطابقت ندارند",
  path: ["passwordConfirm"],
})
.refine((data) => ["MALE", "FEMALE", "OTHER"].includes(data.gender), {
  message: "جنسیت نامعتبر است",
  path: ["gender"],
});

export const forgotSchema = z.object({
  email: z.string().email("ایمیل نامعتبر است"),
  honeypot: z.string().optional(),
});

export const resetSchema = z.object({
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
  passwordConfirm: z.string(),
  honeypot: z.string().optional(),
})
.refine((data) => data.password === data.passwordConfirm, {
  message: "رمزهای عبور مطابقت ندارند",
  path: ["passwordConfirm"],
});