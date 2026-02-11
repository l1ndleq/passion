import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getSessionFromRequest } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash env missing");
  }

  return new Redis({ url, token });
}

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);

    if (!session?.phone) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const redis = getRedis();
    const digits = phoneDigits(session.phone);

    // 1️⃣ получаем список id заказов пользователя
    const ids = await redis.lrange(`user:orders:${digits}`, 0, 49);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    // 2️⃣ получаем сами заказы
    const orders = await Promise.all(
      ids.map((id) => redis.get(`order:${id}`))
    );

    const clean = orders.filter(Boolean);

    // сортировка по createdAt
    clean.sort(
      (a: any, b: any) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0)
    );

    return NextResponse.json({ ok: true, orders: clean });
  } catch (e: any) {
    console.error("ORDERS ERROR:", e?.message);
    return NextResponse.json(
      { ok: false, error: "ORDERS_FAILED" },
      { status: 500 }
    );
  }
}
