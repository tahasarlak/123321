// src/app/api/auth/forgot/route.ts (نسخه آپدیت‌شده)

import { NextRequest, NextResponse } from "next/server";
import { handleForgot } from "@/server/public/Handler/auth";
import { ipRateLimit, emailRateLimit } from "@/lib/redis/rate-limit";
import { redis } from "@/lib/redis/redis";
import { prisma } from "@/lib/db/prisma";
import { createAuthSchemas } from "@/lib/validations/auth"; 

const SUCCESS_MESSAGE = "اگر ایمیل شما ثبت شده باشد، لینک بازیابی ارسال خواهد شد.";

const getUserExistsCacheKey = (email: string) => `cache:user:exists:${email.toLowerCase()}`;

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200)); // 200-500ms

const uniformSuccessResponse = async () => {
  await fakeDelay();
  return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, honeypot } = body;

    // Honeypot چک اولیه
    if (honeypot && honeypot.length > 0) {
      return await uniformSuccessResponse();
    }

    // Rate limit بر اساس IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: ipSuccess } = await ipRateLimit.limit(ip);
    if (!ipSuccess) {
      return await uniformSuccessResponse();
    }

    // لود schemaها با پیام‌های ترجمه‌شده (بر اساس locale کاربر)
    const { forgotSchema } = await createAuthSchemas();

    // ولیدیشن کامل با Zod و پیام ترجمه‌شده
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      // حتی در صورت خطای ولیدیشن، اطلاعات لیک نمی‌کنیم
      return await uniformSuccessResponse();
    }

    const { email } = parsed.data;
    // Rate limit بر اساس ایمیل
    const { success: emailSuccess } = await emailRateLimit.limit(email);
    if (!emailSuccess) {
      return await uniformSuccessResponse();
    }

    // کش وجود کاربر
    const cacheKey = getUserExistsCacheKey(email);
    const cachedExists = await redis.get(cacheKey);
    let userExists = false;

    if (cachedExists !== null) {
      userExists = cachedExists === "1";
    } else {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      userExists = !!user;
      await redis.set(cacheKey, userExists ? "1" : "0", { ex: 600 });
    }

    if (!userExists) {
      return await uniformSuccessResponse();
    }

    // فقط وقتی کاربر وجود داره، ایمیل ارسال می‌شه
    await handleForgot({ email });

    await fakeDelay();
    return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("[API FORGOT] خطای غیرمنتظره:", error);
    return await uniformSuccessResponse();
  }
}