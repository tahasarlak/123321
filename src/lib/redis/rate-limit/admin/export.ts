// src/lib/redis/rate-limit/admin/export.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../../redis";

/**
 * Rate Limit اکسپورت داده‌ها (CSV, Excel و ...)
 * محدودیت سخت‌گیرانه: حداکثر ۳ بار در هر ساعت
 */
export const adminExportRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "ratelimit:admin:export",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});