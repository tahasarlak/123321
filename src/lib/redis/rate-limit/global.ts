// src/lib/redis/rate-limit/global.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../redis";

/**
 * Rate Limit عمومی بر اساس IP
 * مناسب برای: فرم تماس، جستجو، APIهای عمومی
 */
export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(6, "15 m"),
  prefix: "ratelimit:global:ip",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});