import { Redis } from "@upstash/redis";

const redisUrl = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
const redisToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
const hasRedisConfig = Boolean(redisUrl) && Boolean(redisToken);

const redis = new Redis({
  url: hasRedisConfig ? redisUrl : "https://example.com",
  token: hasRedisConfig ? redisToken : "placeholder",
});

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSec: number;
};

export async function rateLimit({ key, limit, windowSec }: RateLimitOptions) {
  if (!hasRedisConfig) {
    // Если Redis не сконфигурирован, не ломаем критичные флоу логина.
    return {
      allowed: true,
      remaining: limit,
      used: 0,
      limit,
      windowSec,
    };
  }

  const redisKey = `rl:${key}:${windowSec}`;

  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }

  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    used: count,
    limit,
    windowSec,
  };
}
