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

function getAdminChatIds() {
  const raw = process.env.TELEGRAM_CHAT_IDS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
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

type Body = { orderId?: string; status?: string };

// ✅ GET: можно тестить прямо в браузере
// Пример:
// /api/account/orders/status?orderId=P-XXX&status=shipped&secret=ADMIN_SECRET&sendUser=1&sendAdmin=1
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const orderId = String(u.searchParams.get("orderId") || "").trim();
    const status = String(u.searchParams.get("status") || "shipped").trim();
    const secret = String(u.searchParams.get("secret") || "").trim();
    const sendUser = u.searchParams.get("sendUser") === "1";
    const sendAdmin = u.searchParams.get("sendAdmin") === "1";

    const adminSecret = process.env.ADMIN_SECRET || "";
    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const order: any = await redis.get(`order:${orderId}`);
    if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });

    const loginToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
    const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || "";
    const adminChatIds = getAdminChatIds();

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const userMsg =
      `<b>Тест уведомления (user)</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${statusText(status)}\n` +
      (site ? `\nОткрыть: ${site}/order/${orderId}` : "");

    const adminMsg =
      `<b>Тест уведомления (admin)</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${statusText(status)}\n` +
      `<b>Телефон:</b> ${phone || "—"}`;

    let telegramUser: any = null;
    if (sendUser) {
      if (!loginToken) telegramUser = { ok: false, error: "TELEGRAM_LOGIN_BOT_TOKEN missing" };
      else if (!chatId) telegramUser = { ok: false, error: "chatId not found for phone digits", digits };
      else telegramUser = await tgSend(loginToken, chatId, userMsg);
    }

    let telegramAdmin: any = null;
    if (sendAdmin) {
      if (!adminToken) telegramAdmin = { ok: false, error: "TELEGRAM_ADMIN_BOT_TOKEN missing" };
      else if (adminChatIds.length === 0) telegramAdmin = { ok: false, error: "TELEGRAM_CHAT_IDS empty" };
      else telegramAdmin = await Promise.all(adminChatIds.map((cid) => tgSend(adminToken, cid, adminMsg)));
    }

    return NextResponse.json({
      ok: true,
      debug: {
        orderId,
        status,
        phone,
        digits,
        chatId: chatId ?? null,
        env: {
          hasLoginToken: Boolean(loginToken),
          hasAdminToken: Boolean(adminToken),
          adminChatIds,
        },
        sendUser,
        sendAdmin,
        telegramUser,
        telegramAdmin,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "DEBUG_FAILED", message: e?.message },
      { status: 500 }
    );
  }
}

// ✅ POST: реальная смена статуса + уведомления (если всё настроено)
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
    const adminChatIds = getAdminChatIds();

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const userMsg =
      `<b>Статус заказа обновлён</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${statusText(status)}\n` +
      (site ? `\nОткрыть: ${site}/order/${orderId}` : "");

    const adminMsg =
      `<b>Админ: статус изменён</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>${prevStatus}</b> → <b>${status}</b>\n` +
      `<b>Телефон:</b> ${phone || "—"}`;

    let telegramUser: any = null;
    if (chatId && loginToken) {
      telegramUser = await tgSend(loginToken, chatId, userMsg);
    }

    let telegramAdmin: any = null;
    if (adminToken && adminChatIds.length) {
      telegramAdmin = await Promise.all(adminChatIds.map((cid) => tgSend(adminToken, cid, adminMsg)));
    }

    return NextResponse.json({
      ok: true,
      changed: prevStatus !== status,
      debug: {
        phone,
        digits,
        chatId: chatId ?? null,
        env: {
          hasLoginToken: Boolean(loginToken),
          hasAdminToken: Boolean(adminToken),
          adminChatIds,
        },
        telegramUser,
        telegramAdmin,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED", message: e?.message }, { status: 500 });
  }
}
