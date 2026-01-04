// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { handleRegister } from "@/server/public/Handler/auth";
import { ipRateLimit, emailRateLimit, phoneRateLimit } from "@/lib/redis/rate-limit";
import { redis } from "@/lib/redis/redis";
import { prisma } from "@/lib/db/prisma";

const SUCCESS_MESSAGE = "اگر اطلاعات وارد شده معتبر باشد، حساب شما ایجاد شده و ایمیل تأیید ارسال گردید.";

const getEmailExistsCacheKey = (email: string) => `cache:register:email:${email.toLowerCase()}`;
const getPhoneExistsCacheKey = (phone: string) => `cache:register:phone:${phone}`;

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));

const successResponse = async () => {
  await fakeDelay();
  return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, phone: rawPhone, honeypot } = body;

    // === Honeypot چک ===
    if (honeypot && honeypot.length > 0) {
      return await successResponse();
    }

    // === Rate Limit بر اساس IP ===
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: ipSuccess } = await ipRateLimit.limit(ip);
    if (!ipSuccess) {
      return await successResponse();
    }

    const email = rawEmail ? rawEmail.toLowerCase().trim() : "";
    const phone = rawPhone ? rawPhone.trim() : "";

    // === Rate Limit بر اساس ایمیل ===
    if (email) {
      const { success: emailSuccess } = await emailRateLimit.limit(email);
      if (!emailSuccess) {
        return await successResponse();
      }
    }

    // === Rate Limit بر اساس تلفن (اصلاح‌شده و کامل) ===
    if (phone) {
      const { success: phoneSuccess } = await phoneRateLimit.limit(phone);
      if (!phoneSuccess) {
        return await successResponse();
      }
    }

    let emailExists = false;
    let phoneExists = false;

    // === چک ایمیل از کش یا دیتابیس ===
    if (email) {
      const emailCacheKey = getEmailExistsCacheKey(email);
      const cachedEmail = await redis.get(emailCacheKey);
      if (cachedEmail !== null) {
        emailExists = cachedEmail === "1";
      } else {
        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        emailExists = !!existingUser;
        await redis.set(emailCacheKey, emailExists ? "1" : "0", { ex: 600 });
      }
    }

    // === چک تلفن از کش یا دیتابیس ===
    if (phone) {
      const phoneCacheKey = getPhoneExistsCacheKey(phone);
      const cachedPhone = await redis.get(phoneCacheKey);
      if (cachedPhone !== null) {
        phoneExists = cachedPhone === "1";
      } else {
        const existingUser = await prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        });
        phoneExists = !!existingUser;
        await redis.set(phoneCacheKey, phoneExists ? "1" : "0", { ex: 600 });
      }
    }

    // === اگر تکراری بود، عملیات واقعی انجام نشود ===
    if (emailExists || phoneExists) {
      return await successResponse();
    }

    // === ثبت‌نام واقعی ===
    await handleRegister(body);

    await fakeDelay();
    return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("[API REGISTER] خطای غیرمنتظره:", error);
    return await successResponse();
  }
}