import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

function getRedisOrThrow() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash env missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  }

  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedisOrThrow();

    // последние 50 заказов
  const idsRaw = (await redis.lrange("orders:latest", 0, 49)) as any[];

const ids = (idsRaw || [])
  .map((x) => String(x ?? "").trim())
  .filter((id) => id && id !== "undefined" && id !== "null");

const keys = ids.map((id) => `order:${id}`);
const ordersRaw = keys.length ? ((await redis.mget(...keys)) as any[]) : [];


const orders = (ordersRaw || [])
  .filter((o: any) => o && typeof o.orderId === "string" && o.orderId.trim().length > 0)
  .map((o: any) => ({
    orderId: o.orderId,
    status: o.status,
    createdAt: o.createdAt,
    totalPrice: o.totalPrice,
    customer: {
      name: o.customer?.name ?? "",
      phone: o.customer?.phone ?? "",
      telegram: o.customer?.telegram ?? null,
    },
    itemsCount: Array.isArray(o.items)
      ? o.items.reduce((s: number, it: any) => s + (Number(it.qty ?? 1) || 1), 0)
      : 0,
  }))

      // на всякий случай сортируем по дате убыв.
      .sort((a: any, b: any) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));

    return NextResponse.json({ ok: true, orders });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "ORDERS_ERROR" }, { status: 500 });
  }
}
