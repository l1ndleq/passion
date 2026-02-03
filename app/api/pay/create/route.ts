// app/api/pay/create/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs"; // чтобы точно работало на Node runtime (а не edge)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ORDER_TTL_SECONDS = 60 * 60 * 24; // 24 часа

function makeOrderId() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

type CreatePayBody = {
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    comment?: string;
  };
  items?: Array<{
    id?: string;
    title?: string;
    price?: number;
    qty?: number;
    image?: string;
  }>;
  totalPrice?: number;
  // можешь добавить сюда то, что реально нужно хранить
};

export async function POST(req: Request) {
  try {
    // 1) читаем body
    const body = (await req.json()) as CreatePayBody;

    // 2) минимальная валидация
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

    // 3) создаём orderId
    const orderId = makeOrderId();

    // 4) сохраняем заказ в Redis ДО оплаты
    // Сохраняем только нужные поля, а не весь body целиком
    const order = {
      orderId,
      status: "pending_payment" as const,
      createdAt: Date.now(),
      customer: body.customer ?? {},
      items,
      totalPrice,
    };

    await redis.set(`order:${orderId}`, order, { ex: ORDER_TTL_SECONDS });

    // 5) пока заглушка paymentUrl (заменишь на реальный confirmation_url от ЮKassa)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const paymentUrl = `${siteUrl}/thank-you?orderId=${encodeURIComponent(orderId)}`;

    return NextResponse.json({ ok: true, orderId, paymentUrl });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "create pay failed (unknown error)";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// (не обязательно, но удобно) чтобы случайный GET не давал 404 и не путал
export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}