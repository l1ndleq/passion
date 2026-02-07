import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const ORDER_TTL_SECONDS = 60 * 60 * 24; // 24 часа

function makeOrderId() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

type CreatePayBody = {
  customer?: {
    name?: string;
    phone?: string;
    telegram?: string | null;
    [k: string]: any;
  };
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

function normalizePhone(s: string) {
  return String(s ?? "").replace(/[^\d+]/g, "").trim();
}

function isValidPhone(raw: string) {
  const p = normalizePhone(raw);
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
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

    // ✅ customer validation
    const customer = body.customer ?? {};
    const name = String(customer.name ?? "").trim();
    const phoneRaw = String(customer.phone ?? "").trim();
    const phone = normalizePhone(phoneRaw);
    const telegramRaw = customer.telegram == null ? "" : String(customer.telegram).trim();
    const telegram = telegramRaw.replace(/^@/, ""); // храним без @ (удобнее)

    if (!name) {
      return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ ok: false, error: "PHONE_INVALID" }, { status: 400 });
    }

    const orderId = makeOrderId();

    const order = {
      orderId,
      status: "pending_payment" as const,
      createdAt: Date.now(),
      customer: {
        ...customer,
        name,
        phone, // ✅ нормализованный
        telegram: telegram ? telegram : null, // ✅ опционально
      },
      items,
      totalPrice,
    };

    const redis = getRedisOrThrow();

    await redis.set(`order:${orderId}`, order, { ex: ORDER_TTL_SECONDS });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
      /\/+$/,
      ""
    );
    const paymentUrl = `${siteUrl}/order/${orderId}`;

    return NextResponse.json({ ok: true, orderId, paymentUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
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
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
