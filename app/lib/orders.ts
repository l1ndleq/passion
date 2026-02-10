import { redis } from "@/app/lib/redis";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

/**
 * Привязать заказ к пользователю (по телефону).
 * Храним индекс как ZSET: user:orders:<digits> => (score=createdAt, member=orderId)
 */
export async function attachOrderToUser(phone: string, orderId: string, createdAt = Date.now()) {
  const key = `user:orders:${phoneDigits(phone)}`;
  await redis.zadd(key, { score: createdAt, member: orderId });
}

/** Получить список orderId пользователя (последние сверху) */
export async function getUserOrderIds(phone: string, limit = 50) {
  const key = `user:orders:${phoneDigits(phone)}`;
  return redis.zrange<string[]>(key, 0, limit - 1, { rev: true });
}

/** Получить заказы по списку id */
export async function getOrdersByIds(orderIds: string[]) {
  if (!orderIds.length) return [];
  const keys = orderIds.map((id) => `order:${id}`);
  const rows = await redis.mget<any[]>(...keys);
  return (rows || []).filter(Boolean);
}
