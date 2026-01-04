// src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { handleReset } from "@/server/public/Handler/auth";
import { ipRateLimit, resetTokenRateLimit } from "@/lib/redis/rate-limit";
import { redis } from "@/lib/redis/redis";
import { createAuthSchemas } from "@/lib/validations/auth";

const SUCCESS_MESSAGE = "اگر توکن معتبر باشد، رمز عبور شما با موفقیت تغییر کرد.";
const USED_MESSAGE = "این لینک قبلاً استفاده شده یا نامعتبر است.";

const getTokenCacheKey = (token: string) => `cache:reset:token:${token}`;

const fakeDelay = () =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 300) + 200)
  );

const uniformResponse = async (message: string = SUCCESS_MESSAGE) => {
  await fakeDelay();
  return NextResponse.json({ message }, { status: 200 });
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: ipSuccess } = await ipRateLimit.limit(ip);
    if (!ipSuccess) return await uniformResponse();

    const body = await req.json();
    const { token, honeypot } = body;

    if (honeypot && honeypot.length > 0) return await uniformResponse();

    if (!token || typeof token !== "string" || token.length < 10) {
      return await uniformResponse(USED_MESSAGE);
    }

    const { success: tokenSuccess } = await resetTokenRateLimit.limit(token);
    if (!tokenSuccess) return await uniformResponse();

    const { resetSchema } = await createAuthSchemas();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) return await uniformResponse(USED_MESSAGE);

    const cacheKey = getTokenCacheKey(token);
    const cached = await redis.get(cacheKey);

    // اگر قبلاً استفاده شده بود → پیام لینک نامعتبر
    if (cached === "used") {
      return await uniformResponse(USED_MESSAGE);
    }

    // اگر قبلاً موفق یا ناموفق بوده، اما هنوز "used" نیست → اجرا کن
    const result = await handleReset({
      token,
      password: parsed.data.password,
    });

    // همیشه بعد از اجرای واقعی، کش رو روی "used" بگذار تا دیگر قابل استفاده نباشه
    await redis.set(cacheKey, "used", { ex: 86400 }); // ۲۴ ساعت

    // اگر موفق بود، پیام موفقیت، وگرنه پیام نامعتبر (uniform)
    return await uniformResponse(result.success ? SUCCESS_MESSAGE : USED_MESSAGE);

  } catch (error) {
    console.error("[API RESET-PASSWORD] خطای غیرمنتظره:", error);
    return await uniformResponse(USED_MESSAGE);
  }
}