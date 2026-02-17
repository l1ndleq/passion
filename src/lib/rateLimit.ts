import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type RateLimitOpts = {
  key: string;         // например ip:1.2.3.4 или phone:7999...
  limit: number;       // максимум попыток
  windowSec: number;   // окно в секундах
};

export async function rateLimit({ key, limit, windowSec }: RateLimitOpts) {
  const redisKey = `rl:${key}:${windowSec}`;

  const n = await redis.incr(redisKey);
  if (n === 1) {
    await redis.expire(redisKey, windowSec);
  }

  const allowed = n <= limit;
  const remaining = Math.max(0, limit - n);

  return { allowed, remaining, used: n, limit, windowSec };
}
