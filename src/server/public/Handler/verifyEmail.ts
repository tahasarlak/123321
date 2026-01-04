"use server";

import { prisma } from "@/lib/db/prisma";
import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";
import { sendWithTemplate } from "@/lib/email/sendWithTemplate";
import type { VerifyResult } from "@/types/verifyEmail";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;
const VERIFICATION_EXPIRES_HOURS = 24;

type VerifyHandlerResult = VerifyResult & { i18nKey?: string };

/** ارسال ایمیل تأیید — استفاده مشترک برای ثبت‌نام و ارسال مجدد */
export async function handleSendVerificationEmail(
  email: string,
  name?: string,
  locale?: string
): Promise<VerifyHandlerResult> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log("[HANDLE SEND VERIFICATION] درخواست ارسال برای ایمیل:", normalizedEmail);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      isEmailVerified: true,
      preferredLocale: true,
    },
  });

  // Anti-Enumeration
  if (!user) {
    console.log("[HANDLE SEND VERIFICATION] کاربر وجود ندارد — پاسخ موفقیت بدون ارسال");
    return { success: true, i18nKey: "verification_sent" };
  }

  const userLocale = locale || user.preferredLocale || "fa";

  let verifyLink: string;

  if (user.isEmailVerified) {
    console.log("[HANDLE SEND VERIFICATION] ایمیل قبلاً تأیید شده — ارسال پیام اطلاع‌رسانی");
    verifyLink = `${BASE_URL}/${userLocale}/auth`; // لینک مستقیم به ورود
  } else {
    // لینک تأیید جدید
    const token = uuidv4();
    const expiresAt = addHours(new Date(), VERIFICATION_EXPIRES_HOURS);

    await prisma.verificationToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    verifyLink = `${BASE_URL}/${userLocale}/auth/verify-email?token=${token}`;
    console.log("[HANDLE SEND VERIFICATION] لینک تأیید جدید تولید شد");
  }

  // همیشه از تمپلیت verification استفاده کن — variables دقیقاً مطابق overload
  await sendWithTemplate(normalizedEmail, "verification", userLocale, {
    name: name || user.name || "کاربر",
    verifyLink, // فقط این دو فیلد — کاملاً مجاز
  });

  // کلید toast یکسان یا متفاوت (اختیاری)
  return { 
    success: true, 
    i18nKey: user.isEmailVerified ? "already_verified_email_sent" : "verification_sent" 
  };
}

/** تأیید توکن — استفاده در صفحه verify-email */
export async function handleVerifyToken(token: string): Promise<VerifyHandlerResult> {
  if (!token || typeof token !== "string" || token.length < 10) {
    return { success: false, i18nKey: "token_invalid" };
  }

  const verification = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: { select: { isEmailVerified: true } } },
  });

  if (!verification) {
    return { success: false, i18nKey: "token_invalid" };
  }

  if (verification.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { success: false, i18nKey: "token_expired" };
  }

  if (verification.user.isEmailVerified) {
    return { success: false, i18nKey: "already_verified" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return { success: true, i18nKey: "email_verified" };
}

/** ارسال مجدد لینک تأیید — استفاده در API resend (ایمیل از body میاد) */
export async function handleResendVerification(data: unknown): Promise<VerifyHandlerResult> {
  console.log("[HANDLE RESEND VERIFICATION] درخواست دریافت شد", data);

  const emailRaw = typeof data === "object" && data !== null && "email" in data ? (data as any).email : "";
  const honeypot = typeof data === "object" && data !== null && "honeypot" in data ? (data as any).honeypot : "";

  if (honeypot && honeypot.length > 0) {
    console.log("[HANDLE RESEND VERIFICATION] Honeypot پر شده");
    return { success: true, i18nKey: "verification_sent" };
  }

  if (typeof emailRaw !== "string" || !emailRaw.includes("@") || emailRaw.length < 5) {
    console.log("[HANDLE RESEND VERIFICATION] ایمیل نامعتبر");
    return { success: true, i18nKey: "verification_sent" };
  }

  const email = emailRaw.toLowerCase().trim();

  // استفاده از همون تابع اصلی — همه چیز یکپارچه و امن
  return await handleSendVerificationEmail(email);
}