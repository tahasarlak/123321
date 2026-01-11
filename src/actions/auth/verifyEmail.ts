// lib/actions/verification.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession, update as updateSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { sendWithTemplate } from "@/lib/email/sendWithTemplate";
import { addHours } from "date-fns";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;
const VERIFICATION_EXPIRES_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 90; // کمی بیشتر برای امنیت

type VerifyResult =
  | { success: true; i18nKey: "verification_sent" | "already_verified_email_sent" | "email_verified" }
  | { success: false; i18nKey: "token_invalid" | "token_expired" | "already_verified" | "invalid_request" | "rate_limit" };

// ── Helper: ارسال ایمیل تأیید ────────────────────────────────────
async function sendVerificationEmail(
  email: string,
  name?: string,
  locale: string = "fa"
): Promise<VerifyResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      emailVerified: true,
      preferredLocale: true,
    },
  });

  // Anti-enumeration: همیشه موفقیت برگردان (حتی اگر کاربر وجود نداشته باشد)
  if (!user) {
    return { success: true, i18nKey: "verification_sent" };
  }

  const userLocale = locale || user.preferredLocale || "fa";

  // Rate limiting: جلوگیری از ارسال اسپم
  const recent = await prisma.verificationToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (
    recent &&
    Date.now() - new Date(recent.createdAt).getTime() < RESEND_COOLDOWN_SECONDS * 1000
  ) {
    return { success: false, i18nKey: "rate_limit" };
  }

  // کاربر قبلاً تأیید کرده → ایمیل خوش‌آمدگویی/ورود
  if (user.emailVerified) {
    const loginLink = `${BASE_URL}/${userLocale}/auth/signin`;
    await sendWithTemplate(normalizedEmail, "reset-success", userLocale, {
      name: name || user.name || "کاربر گرامی",
      loginLink,
    });
    return { success: true, i18nKey: "already_verified_email_sent" };
  }

  // ایجاد توکن جدید
  const token = crypto.randomUUID(); // امن‌تر از uuid v4
  const expiresAt = addHours(new Date(), VERIFICATION_EXPIRES_HOURS);

  await prisma.$transaction(async (tx) => {
    // حذف توکن‌های قدیمی منقضی‌شده برای کاربر
    await tx.verificationToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    // ایجاد یا بروزرسانی توکن
    await tx.verificationToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt, createdAt: new Date() },
      create: { userId: user.id, token, expiresAt },
    });
  });

  const verifyLink = `${BASE_URL}/${userLocale}/auth/verify-email?token=${token}`;

  await sendWithTemplate(normalizedEmail, "verification", userLocale, {
    name: name || user.name || "کاربر گرامی",
    verifyLink,
  });

  return { success: true, i18nKey: "verification_sent" };
}

// ── ۱. بررسی و تأیید توکن ────────────────────────────────────────
export async function verifyEmailTokenAction(token: string): Promise<VerifyResult> {
  if (!token || typeof token !== "string" || token.length < 20) {
    return { success: false, i18nKey: "token_invalid" };
  }

  const verification = await prisma.verificationToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          emailVerified: true,
          email: true,
          name: true,
          preferredLocale: true,
        },
      },
    },
  });

  if (!verification) {
    return { success: false, i18nKey: "token_invalid" };
  }

  if (verification.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { success: false, i18nKey: "token_expired" };
  }

  if (verification.user.emailVerified) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { success: false, i18nKey: "already_verified" };
  }

  // تأیید ایمیل و حذف توکن
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: verification.userId },
      data: { emailVerified: new Date() },
    });
    await tx.verificationToken.delete({ where: { token } });
  });

  // به‌روزرسانی session (اگر کاربر لاگین باشد)
  const session = await getServerSession(authOptions);
  if (session?.user?.id === verification.userId) {
    await updateSession({
      ...session,
      user: {
        ...session.user,
        emailVerified: new Date(),
      },
    });
  }

  // ارسال نوتیفیکیشن خوش‌آمدگویی
  await prisma.notification.create({
    data: {
      userId: verification.userId,
      title: "ایمیل شما تأیید شد ✅",
      message:
        "عالیه! حالا حساب شما کاملاً فعال شد. می‌توانید دوره‌ها را خریداری کنید، گواهینامه بگیرید و در بحث‌ها شرکت کنید 🚀",
      type: "SUCCESS",
      link: "/courses",
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { success: true, i18nKey: "email_verified" };
}

// ── ۲. ارسال مجدد ایمیل تأیید ───────────────────────────────────
export async function resendVerificationAction(formData?: FormData) {
  const session = await getServerSession(authOptions);

  let email: string | undefined;

  if (formData) {
    const raw = Object.fromEntries(formData);
    email = (raw.email as string)?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, i18nKey: "invalid_request" };
    }
  } else if (session?.user?.email) {
    email = session.user.email as string;
  }

  if (!email) {
    return { success: false, i18nKey: "invalid_request" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, preferredLocale: true },
  });

  return await sendVerificationEmail(email, user?.name, user?.preferredLocale || "fa");
}

// ── ۳. ارسال ایمیل تأیید هنگام ثبت‌نام ───────────────────────────
export async function sendVerificationOnSignup(
  email: string,
  name?: string,
  locale: string = "fa"
) {
  return await sendVerificationEmail(email, name, locale);
}