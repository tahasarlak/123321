// src/lib/redis/rate-limit/admin/user.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../../redis";

/**
 * Rate Limit عملیات ادمین بر اساس userId
 */
export const adminActionUserRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(6, "15 m"),
  prefix: "ratelimit:admin:action:user",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});