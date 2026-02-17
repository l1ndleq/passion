import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSec: number;
};

export async function rateLimit({ key, limit, windowSec }: RateLimitOptions) {
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
