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
    city?: string;
    address?: string;
    message?: string;
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

/** Каноничная нормализация телефона (как в OTP/боте) */
function normalizePhone(raw: string) {
  let s = String(raw ?? "").trim().replace(/[^\d+]/g, "");

  // RU -> +7
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;

  return s;
}

function phoneDigits(phone: string) {
  return String(phone ?? "").replace(/[^\d]/g, "");
}

function isValidPhone(raw: string) {
  const p = normalizePhone(raw);
  const digits = phoneDigits(p);
  return digits.length >= 10 && digits.length <= 15;
}

/** ===== Telegram helpers ===== */

function getChatIds() {
  const raw = process.env.TELEGRAM_CHAT_IDS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = getChatIds();

  // не ломаем создание заказа, если телега не настроена
  if (!token || chatIds.length === 0) {
    console.warn("Telegram env missing: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS");
    return;
  }

  const results = await Promise.all(
    chatIds.map(async (chat_id) => {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        console.error("Telegram send failed:", { chat_id, status: r.status, resp: j });
      }
      return { ok: r.ok && Boolean(j?.ok) };
    })
  );

  if (!results.some((x) => x.ok)) {
    console.error("Telegram: all sends failed");
  }
}

function formatMoney(n: number) {
  try {
    return n.toLocaleString("ru-RU");
  } catch {
    return String(n);
  }
}

function formatOrderText(order: {
  orderId: string;
  status: string;
  createdAt: number;
  customer: any;
  items: any[];
  totalPrice: number;
}) {
  const c = order.customer ?? {};
  const statusLine = order.status === "paid" ? "Оплачено ✅" : "Не оплачено ⏳";

  const name = String(c.name ?? "").trim() || "—";
  const phone = String(c.phone ?? "").trim() || "—";
  const tg = String(c.telegram ?? "").trim();
  const city = String(c.city ?? "").trim();
  const address = String(c.address ?? "").trim();
  const message = String(c.message ?? "").trim();

  const lines: string[] = [];
  lines.push(`<b>🧾 Заявка на заказ</b>`);
  lines.push(`<b>Статус:</b> ${statusLine}`);
  lines.push(`<b>Заказ:</b> <code>${order.orderId}</code>`);
  lines.push(`<b>Сумма:</b> ${formatMoney(order.totalPrice)} ₽`);
  lines.push("");

  lines.push(`<b>Имя:</b> ${name}`);
  lines.push(`<b>Телефон:</b> ${phone}`);
  lines.push(`<b>Telegram:</b> ${tg ? `@${tg.replace(/^@/, "")}` : "—"}`);

  if (city) lines.push(`<b>Город:</b> ${city}`);
  if (address) lines.push(`<b>Адрес:</b> ${address}`);
  if (message) lines.push(`<b>Комментарий:</b> ${message}`);

  lines.push("");
  lines.push(`<b>Товары:</b>`);
  for (const it of order.items || []) {
    const title = String(it.title ?? it.id ?? "Товар");
    const qty = Number(it.qty ?? 1);
    const price = Number(it.price ?? 0);
    lines.push(`• ${title} × ${qty} — ${formatMoney(price * qty)} ₽`);
  }

  return lines.join("\n");
}

/** ===== Route ===== */

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

    const telegramRaw =
      customer.telegram == null ? "" : String(customer.telegram).trim();
    const telegram = telegramRaw.replace(/^@/, "");

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "PHONE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { ok: false, error: "PHONE_INVALID" },
        { status: 400 }
      );
    }

    const orderId = makeOrderId();
    const createdAt = Date.now();

    const order = {
      orderId,
      status: "pending_payment" as const, // ⏳ сейчас заявка/не оплачено
      createdAt,
      customer: {
        ...customer,
        name,
        phone, // ✅ каноничный формат (+7...)
        telegram: telegram ? telegram : null,
      },
      items,
      totalPrice,
    };

    const redis = getRedisOrThrow();

    // 1) сохраняем заказ
    await redis.set(`order:${orderId}`, order, { ex: ORDER_TTL_SECONDS });

    // 2) ✅ индекс для админки: последние заказы
    await redis.lpush("orders:latest", orderId);
    await redis.ltrim("orders:latest", 0, 199); // последние 200

    // 3) ✅ индекс для ЛК: заказы пользователя по телефону (ZSET)
    // user:orders:<digits> => member=orderId, score=createdAt
    const userOrdersKey = `user:orders:${phoneDigits(phone)}`;
    await redis.zadd(userOrdersKey, { score: createdAt, member: orderId });

    // 4) ✅ Telegram: отправляем 1 раз на orderId (антидубль)
    const notifyKey = `order:${orderId}:tg_created`;
    const alreadyNotified = await redis.get(notifyKey);
    if (!alreadyNotified) {
      await sendTelegram(formatOrderText(order));
      await redis.set(notifyKey, 1, { ex: ORDER_TTL_SECONDS });
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");
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
          hasTgToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
          hasTgChats: Boolean(process.env.TELEGRAM_CHAT_IDS),
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
