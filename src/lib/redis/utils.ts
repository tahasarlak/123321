// src/lib/redis/utils.ts
import { redis } from "@/lib/redis/redis";

export async function redisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn("[Redis] GET failed for key:", key, err);
    // Optional: ارسال به Sentry یا monitoring tool
    // Sentry.captureException(err, { tags: { redis_operation: "get", key } });
    return null;
  }
}

export async function redisSetEx(key: string, ttl: number, value: string): Promise<boolean> {
  try {
    await redis.setex(key, ttl, value);
    return true;
  } catch (err) {
    console.warn("[Redis] SETEX failed for key:", key, err);
    // Sentry.captureException(err, { tags: { redis_operation: "setex", key } });
    return false;
  }
}

export async function redisDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.warn("[Redis] DEL failed for key:", key, err);
    // Sentry...
  }
}