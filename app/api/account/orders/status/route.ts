import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash env missing");
  return new Redis({ url, token });
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function pickBotToken() {
  const t1 = process.env.TELEGRAM_BOT_TOKEN; // если хочешь слать в PassionLoginBot — поставь тут его токен
  const t2 = process.env.PASSION_LOGIN_BOT_TOKEN;
  return {
    token: t1 || t2 || "",
    source: t1 ? "TELEGRAM_BOT_TOKEN" : t2 ? "PASSION_LOGIN_BOT_TOKEN" : "MISSING",
  };
}

async function sendTelegram(chatId: number, text: string) {
  const { token, source } = pickBotToken();
  if (!token) return { ok: false, source, httpStatus: 0, body: { error: "BOT_TOKEN_MISSING" } };

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const j = await r.json().catch(() => null);
  return { ok: r.ok && Boolean(j?.ok), source, httpStatus: r.status, body: j };
}

function statusText(status: string) {
  if (status === "pending_payment") return "Не оплачено ⏳";
  if (status === "paid") return "Оплачено ✅";
  if (status === "processing") return "В обработке 🧴";
  if (status === "shipped") return "Отправлено 🚚";
  if (status === "delivered") return "Доставлено 📦";
  if (status === "canceled") return "Отменено ❌";
  return status;
}

type Body = { orderId?: string; status?: string };

// ✅ GET: браузерная проверка
// Пример:
// /api/account/orders/status?orderId=P-XXX&status=shipped&secret=ADMIN_SECRET&send=1
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = String(url.searchParams.get("orderId") || "").trim();
    const status = String(url.searchParams.get("status") || "shipped").trim();
    const send = url.searchParams.get("send") === "1";
    const secret = String(url.searchParams.get("secret") || "");

    const adminSecret = process.env.ADMIN_SECRET || "";
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED", hint: "add ?orderId=P-XXXX" },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const order: any = await redis.get(`order:${orderId}`);

    if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    let telegram = null as any;
    if (send && chatId) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const msg =
        `<b>Тест уведомления</b>\n` +
        `<b>Заказ:</b> <code>${orderId}</code>\n` +
        `<b>Статус:</b> ${statusText(status)}\n` +
        (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");
      telegram = await sendTelegram(chatId, msg);
    }

    return NextResponse.json({
      ok: true,
      debug: {
        orderId,
        phone,
        digits,
        chatId: chatId ?? null,
        tokenSource: pickBotToken().source,
        sendAttempted: send,
        telegram,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "DEBUG_FAILED", message: e?.message }, { status: 500 });
  }
}

// ✅ POST: реальное обновление статуса (как раньше)
export async function POST(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_SECRET || "";
    const got = req.headers.get("x-admin-secret") || "";
    if (!adminSecret || got !== adminSecret) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const orderId = String(body.orderId || "").trim();
    const status = String(body.status || "").trim();
    if (!orderId) return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    if (!status) return NextResponse.json({ ok: false, error: "STATUS_REQUIRED" }, { status: 400 });

    const redis = getRedis();
    const key = `order:${orderId}`;
    const order: any = await redis.get(key);
    if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });

    const prevStatus = String(order.status || "");
    const next = { ...order, status };
    await redis.set(key, next);

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    let telegram = null as any;
    if (chatId) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const msg =
        `<b>Статус заказа обновлён</b>\n` +
        `<b>Заказ:</b> <code>${orderId}</code>\n` +
        `<b>Статус:</b> ${statusText(status)}\n` +
        (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");
      telegram = await sendTelegram(chatId, msg);
    }

    return NextResponse.json({
      ok: true,
      changed: prevStatus !== status,
      debug: { phone, digits, chatId: chatId ?? null, tokenSource: pickBotToken().source, telegram },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED", message: e?.message }, { status: 500 });
  }
}
