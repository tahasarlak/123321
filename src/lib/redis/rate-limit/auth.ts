// src/lib/redis/rate-limit/auth.ts

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../redis";

/**
 * Rate Limit بر اساس ایمیل
 * استفاده: ثبت‌نام، فراموشی رمز، تأیید ایمیل، ارسال مجدد تأیید
 * محدودیت: حداکثر ۴ تلاش در هر ۱۵ دقیقه برای هر ایمیل
 */
export const emailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(4, "15 m"),
  prefix: "ratelimit:auth:email",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});

/**
 * Rate Limit بر اساس توکن ریست پسورد
 * استفاده: API تغییر رمز عبور با توکن (/api/auth/reset-password)
 * محدودیت: حداکثر ۶ تلاش در هر ۱ ساعت برای هر توکن
 * دلیل: جلوگیری از brute-force روی یک توکن خاص (حتی اگر IP تغییر کنه)
 */
export const resetTokenRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(6, "1 h"),
  prefix: "ratelimit:auth:reset_token",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});


export const phoneRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(4, "15 m"),
  prefix: "ratelimit:auth:phone",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});
/**
 * Rate Limit بر اساس توکن تأیید ایمیل (اختیاری — اگر بخوای جدا کنی)
 * فعلاً لازم نیست چون verify-email/confirm فقط IP rate limit داره و caching قوی داره
 * ولی اگر بعداً بخوای سخت‌گیرتر باشی، می‌تونی اضافه کنی.
 */
// export const verifyTokenRateLimit = new Ratelimit({ ... });