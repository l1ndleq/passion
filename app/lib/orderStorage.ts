import { redis } from "./redis";

export type OrderData = {
  orderId: string;
  paymentId: string;
  items: any[];
  total: number;
  email?: string;
  createdAt: number;
};

const ORDER_TTL = 60 * 60 * 24; // 24 часа

// сохранить заказ
export async function saveOrder(order: OrderData) {
  const key = `order:${order.orderId}`;

  await redis.set(key, order, {
    ex: ORDER_TTL,
  });
}

// получить заказ
export async function getOrder(orderId: string): Promise<OrderData | null> {
  const key = `order:${orderId}`;
  return await redis.get(key);
}

// антидубль по paymentId
export async function isPaymentProcessed(paymentId: string): Promise<boolean> {
  const key = `payment:${paymentId}`;
  const exists = await redis.get(key);
  return Boolean(exists);
}

// отметить paymentId как обработанный
export async function markPaymentProcessed(paymentId: string) {
  const key = `payment:${paymentId}`;

  await redis.set(key, true, {
    ex: ORDER_TTL,
  });
}