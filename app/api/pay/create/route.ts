import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const ORDER_TTL_SECONDS = 60 * 60 * 24; // 24 часа

function makeOrderId() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

type CreatePayBody = {
  customer?: Record<string, any>;
  items?: Array<{
    id?: string;
    title?: string;
    price?: number;
    qty?: number;
    image?: string;
  }>;
  totalPrice?: number;
};

function getRedisOrThrow() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash env missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN"
    );
  }

  return new Redis({ url, token });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePayBody;

    const totalPrice = Number(body?.totalPrice ?? 0);
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return NextResponse.json(
        { ok: false, error: "totalPrice must be a positive number" },
        { status: 400 }
      );
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    const orderId = makeOrderId();

    const order = {
      orderId,
      status: "pending_payment" as const,
      createdAt: Date.now(),
      customer: body.customer ?? {},
      items,
      totalPrice,
    };

    const redis = getRedisOrThrow();

    // ✅ лёгкая диагностика: если Redis недоступен — тут сразу вылетит с понятной ошибкой
    await redis.set(`order:${orderId}`, order, { ex: ORDER_TTL_SECONDS });

    const siteUrl =
        (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const paymentUrl = `${siteUrl}/order/${orderId}`;

    return NextResponse.json({ ok: true, orderId, paymentUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // ВАЖНО: лог в Vercel
    console.error("PAY CREATE ERROR:", message, e);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        debug: {
          hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
          hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
          hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method Not Allowed" },
    { status: 405 }
  );
}