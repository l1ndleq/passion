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

function statusText(status: string) {
  if (status === "pending_payment") return "Не оплачено ⏳";
  if (status === "paid") return "Оплачено ✅";
  if (status === "processing") return "В обработке 🧴";
  if (status === "shipped") return "Отправлено 🚚";
  if (status === "delivered") return "Доставлено 📦";
  if (status === "canceled") return "Отменено ❌";
  return status;
}

async function tgSend(token: string, chatId: number | string, text: string) {
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
  return { ok: r.ok && Boolean(j?.ok), httpStatus: r.status, body: j };
}

function getAdminChatIds() {
  const raw = process.env.TELEGRAM_CHAT_IDS || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

type Body = { orderId?: string; status?: string };

// ✅ GET debug как у тебя
export async function GET(req: Request) {
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
    return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
  }

  const redis = getRedis();
  const order: any = await redis.get(`order:${orderId}`);
  if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });

  const phone = String(order?.customer?.phone || "");
  const digits = phoneDigits(phone);
  const chatId = await redis.get<number>(`tg:phone:${digits}`);

  const loginToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
  const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || "";

  let telegramUser: any = null;
  if (send && chatId) {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const msg =
      `<b>Тест уведомления</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${statusText(status)}\n` +
      (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");

    telegramUser = loginToken
      ? await tgSend(loginToken, chatId, msg)
      : { ok: false, error: "TELEGRAM_LOGIN_BOT_TOKEN missing" };
  }

  return NextResponse.json({
    ok: true,
    debug: {
      orderId,
      phone,
      digits,
      chatId: chatId ?? null,
      hasLoginToken: Boolean(loginToken),
      hasAdminToken: Boolean(adminToken),
      sentAttempted: send,
      telegramUser,
    },
  });
}

// ✅ POST: реальная смена статуса + уведомление пользователю (LoginBot)
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

    const loginToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
    const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || "";

    // 1) ✅ Пользовательское уведомление (LoginBot)
    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    let telegramUser: any = null;
    if (chatId && loginToken) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const msg =
        `<b>Статус заказа обновлён</b>\n` +
        `<b>Заказ:</b> <code>${orderId}</code>\n` +
        `<b>Статус:</b> ${statusText(status)}\n` +
        (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");
      telegramUser = await tgSend(loginToken, chatId, msg);
    }

    // 2) ✅ Админское уведомление (OfferBot) — по желанию
    // Если хочешь включить — просто оставь как есть, оно отправит в TELEGRAM_CHAT_IDS.
    let telegramAdmin: any = null;
    const adminChatIds = getAdminChatIds();
    if (adminToken && adminChatIds.length) {
      const msg =
        `<b>Админ: статус изменён</b>\n` +
        `<b>Заказ:</b> <code>${orderId}</code>\n` +
        `<b>${prevStatus}</b> → <b>${status}</b>\n` +
        `<b>Телефон:</b> ${phone || "—"}`;
      telegramAdmin = await Promise.all(adminChatIds.map((cid) => tgSend(adminToken, cid, msg)));
    }

    return NextResponse.json({
      ok: true,
      changed: prevStatus !== status,
      debug: {
        phone,
        digits,
        chatId: chatId ?? null,
        telegramUser,
        telegramAdmin,
      },
    });
  } catch (e: any) {
    console.error("STATUS_UPDATE_FAILED:", e?.message);
    return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED" }, { status: 500 });
  }
}
