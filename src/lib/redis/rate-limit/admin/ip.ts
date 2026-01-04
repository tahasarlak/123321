// src/lib/redis/rate-limit/admin/ip.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "../../redis";

/**
 * Rate Limit عملیات ادمین بر اساس IP
 */
export const adminActionIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(6, "15 m"),
  prefix: "ratelimit:admin:action:ip",
  analytics: true,
  timeout: 5000,
  ephemeralCache: new Map(),
});