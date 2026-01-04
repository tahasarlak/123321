// src/app/api/auth/verify-email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleSendVerificationEmail } from "@/server/public/Handler/verifyEmail"; // تغییر به handleSendVerificationEmail
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { redis } from "@/lib/redis/redis";

const SUCCESS_MESSAGE = "لینک تأیید ایمیل مجدداً برای شما ارسال شد.";

const getResendCacheKey = (email: string) => `cache:verify:resend:${email.toLowerCase()}`;

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));

const uniformSuccessResponse = async () => {
  await fakeDelay();
  return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
};

export async function POST(req: NextRequest) {
  try {
    console.log("[API RESEND VERIFICATION] درخواست جدید دریافت شد");

    const body = await req.json();
    const { email: rawEmail, honeypot } = body;

    if (!rawEmail || typeof rawEmail !== "string") {
      console.log("[API RESEND VERIFICATION] ایمیل وارد نشده");
      return await uniformSuccessResponse();
    }

    const email = rawEmail.toLowerCase().trim();

    console.log("[API RESEND VERIFICATION] ایمیل وارد شده:", email);

    if (honeypot && honeypot.length > 0) {
      console.log("[API RESEND VERIFICATION] Honeypot پر شده");
      return await uniformSuccessResponse();
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: ipSuccess } = await ipRateLimit.limit(ip);
    if (!ipSuccess) {
      console.log("[API RESEND VERIFICATION] Rate limit IP");
      return await uniformSuccessResponse();
    }

    const cacheKey = getResendCacheKey(email);
    const cached = await redis.get(cacheKey);
    if (cached === "sent") {
      console.log("[API RESEND VERIFICATION] کش Redis: ارسال در ۵ دقیقه اخیر");
      return await uniformSuccessResponse();
    }

    // استفاده از تابع اصلی ارسال (که anti-enumeration داره)
    const result = await handleSendVerificationEmail(email);

    console.log("[API RESEND VERIFICATION] نتیجه ارسال:", result);

    if (result.success) {
      await redis.set(cacheKey, "sent", { ex: 300 });
      console.log("[API RESEND VERIFICATION] ایمیل ارسال شد و کش ست شد");
    }

    await fakeDelay();
    return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("[API RESEND VERIFICATION] خطا:", error);
    return await uniformSuccessResponse();
  }
}