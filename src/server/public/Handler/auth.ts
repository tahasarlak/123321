"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { addHours, addMinutes } from "date-fns";
import { sendWithTemplate } from "@/lib/email/sendWithTemplate";
import { createAuthSchemas } from "@/lib/validations/auth";
import type { AuthResult } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

type AuthHandlerResult = AuthResult & { i18nKey?: string };

// تابع کمکی برای delay تصادفی (جلوگیری از timing attack)
const fakeDelay = () =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 300) + 200)); // 200-500ms

/** ثبت‌نام */
export async function handleRegister(data: unknown): Promise<AuthHandlerResult> {
  const { registerSchema } = await createAuthSchemas();
  const parsed = registerSchema.safeParse(data);

  if (!parsed.success) {
    await fakeDelay();
    return { success: true, i18nKey: "register_success" };
  }

  const { name, email: rawEmail, phone, password, gender, honeypot } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  if (honeypot && honeypot.length > 0) {
    await fakeDelay();
    return { success: true, i18nKey: "register_success" };
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      gender,
      isEmailVerified: false,
      preferredLocale: "fa",
      jwtVersion: 0,
    },
  });

  await prisma.userRole.create({
    data: { userId: user.id, role: "USER" },
  });

  const token = uuidv4();

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: addHours(new Date(), 24),
    },
  });

  const verifyLink = `${BASE_URL}/${user.preferredLocale || "fa"}/auth/verify-email?token=${token}`;

  await sendWithTemplate(email, "verification", "fa", {
    name: user.name || "کاربر",
    verifyLink,
  });

  return { success: true, i18nKey: "register_success" };
}

/** فراموشی رمز عبور */
export async function handleForgot(data: unknown): Promise<AuthHandlerResult> {
  const { forgotSchema } = await createAuthSchemas();
  const parsed = forgotSchema.safeParse(data);

  if (!parsed.success) {
    await fakeDelay();
    return { success: true, i18nKey: "recovery_sent" };
  }

  const { email: rawEmail, honeypot } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  if (honeypot && honeypot.length > 0) {
    await fakeDelay();
    return { success: true, i18nKey: "recovery_sent" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, preferredLocale: true },
  });

  if (!user) {
    await fakeDelay();
    return { success: true, i18nKey: "recovery_sent" };
  }

  const token = uuidv4();

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: addMinutes(new Date(), 60),
    },
  });

  const resetLink = `${BASE_URL}/${user.preferredLocale || "fa"}/auth/reset?token=${token}`;

  await sendWithTemplate(email, "forgot", user.preferredLocale || "fa", {
    name: user.name || "کاربر",
    resetLink,
  });

  return { success: true, i18nKey: "recovery_sent" };
}

/** ریست رمز عبور - نسخه نهایی و امن */
/** ریست رمز عبور - نسخه نهایی با لاگ‌های دیباگ */
export async function handleReset(data: { token: string; password: string }): Promise<AuthHandlerResult> {
  console.log("[HANDLE RESET] شروع اجرای handleReset");
  console.log("[HANDLE RESET] ورودی data:", { token: data.token ? "موجود" : "خالی", hasPassword: !!data.password, passwordLength: data.password?.length });

  const { token, password } = data;

  // چک ساده
  if (!token || !password || password.length < 8) {
    console.log("[HANDLE RESET] ولیدیشن اولیه فیل شد — رمز کوتاه یا خالی");
    await fakeDelay();
    return { success: true, i18nKey: "password_changed" };
  }

  console.log("[HANDLE RESET] ولیدیشن اولیه اوکی — جستجوی توکن در دیتابیس");

  const resetTokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, name: true, email: true, preferredLocale: true, jwtVersion: true },
      },
    },
  });

  if (!resetTokenRecord) {
    console.log("[HANDLE RESET] توکن در دیتابیس پیدا نشد");
    await fakeDelay();
    return { success: true, i18nKey: "password_changed" };
  }

  if (resetTokenRecord.expiresAt < new Date()) {
    console.log("[HANDLE RESET] توکن منقضی شده است");
    await fakeDelay();
    return { success: true, i18nKey: "password_changed" };
  }

  console.log("[HANDLE RESET] توکن معتبر است — کاربر:", resetTokenRecord.user.email);
  console.log("[HANDLE RESET] شروع تغییر رمز عبور و افزایش jwtVersion");

  const hashed = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          password: hashed,
          jwtVersion: { increment: 1 },
        },
      });

      await tx.passwordResetToken.delete({ where: { token } });
    });

    console.log("[HANDLE RESET] تغییر رمز و حذف توکن با موفقیت انجام شد");

    // ارسال ایمیل موفقیت
    const loginLink = `${BASE_URL}/${resetTokenRecord.user.preferredLocale || "fa"}/auth`;

    console.log("[HANDLE RESET] شروع ارسال ایمیل موفقیت به:", resetTokenRecord.user.email);

    await sendWithTemplate(
      resetTokenRecord.user.email,
      "reset-success",
      resetTokenRecord.user.preferredLocale || "fa",
      {
        name: resetTokenRecord.user.name || "کاربر",
        loginLink,
      }
    );

    console.log("[HANDLE RESET] ایمیل موفقیت با موفقیت ارسال شد");

  } catch (error) {
    console.error("[HANDLE RESET] خطا در تراکنش یا ارسال ایمیل:", error);
    // حتی اگر ایمیل فیل بشه، رمز تغییر کرده — اما حداقل لاگ بزن
  }

  return { success: true, i18nKey: "password_changed" };
}