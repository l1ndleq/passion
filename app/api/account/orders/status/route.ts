import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { buildOrderTrackingUrl } from "@/app/lib/orderAccess";
import { OrderIdSchema, OrderStatusSchema } from "@/app/lib/inputValidation";

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

function statusMeta(status: string) {
  switch (status) {
    case "pending_payment":
      return { label: "Не оплачено", emoji: "⏳" };
    case "paid":
      return { label: "Оплачено", emoji: "✅" };
    case "processing":
      return { label: "В обработке", emoji: "🧴" };
    case "shipped":
      return { label: "Отправлено", emoji: "🚚" };
    case "delivered":
      return { label: "Доставлено", emoji: "📦" };
    case "canceled":
      return { label: "Отменено", emoji: "❌" };
    default:
      return { label: status, emoji: "ℹ️" };
  }
}

function getAdminChatIds() {
  const raw = process.env.TELEGRAM_CHAT_IDS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function tgSend(token: string, chatId: number | string, text: string, keyboard?: any) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: keyboard } : {}),
    }),
  });

  const j = await r.json().catch(() => null);
  return { ok: r.ok && Boolean(j?.ok), httpStatus: r.status, body: j };
}

type Body = { orderId?: string; status?: string };

export async function POST(req: Request) {
  try {
    // защита
    const adminSecret = process.env.ADMIN_SECRET || "";
    const got = req.headers.get("x-admin-secret") || "";
    if (!adminSecret || got !== adminSecret) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const parsedOrderId = OrderIdSchema.safeParse(body.orderId ?? "");
    const parsedStatus = OrderStatusSchema.safeParse(body.status ?? "");

    if (!parsedOrderId.success) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }
    if (!parsedStatus.success) {
      return NextResponse.json({ ok: false, error: "STATUS_REQUIRED" }, { status: 400 });
    }
    const orderId = parsedOrderId.data;
    const status = parsedStatus.data;

    const redis = getRedis();
    const order: any = await redis.get(`order:${orderId}`);
    if (!order) return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);

    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const loginToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "";
    const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || "";
    const adminChatIds = getAdminChatIds();

    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const orderUrl = site ? buildOrderTrackingUrl(site, orderId, phone) : "";

    const sm = statusMeta(status);

    // ✅ красивое сообщение пользователю
    const userText =
      `📦 <b>Ваш заказ обновлён</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${sm.emoji} ${sm.label}\n`;

    const userKeyboard = orderUrl
      ? {
          inline_keyboard: [[{ text: "Открыть заказ", url: orderUrl }]],
        }
      : undefined;

    // ✅ сообщение админам
    const customerName = String(order?.customer?.name || "").trim();
    const adminText =
      `🛠 <b>Админ: статус изменён</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${sm.emoji} ${sm.label}\n` +
      (customerName ? `<b>Клиент:</b> ${escapeHtml(customerName)}\n` : "") +
      (phone ? `<b>Телефон:</b> ${escapeHtml(phone)}\n` : "") +
      (orderUrl ? `\n${orderUrl}` : "");

    const adminKeyboard = orderUrl
      ? {
          inline_keyboard: [[{ text: "Открыть заказ", url: orderUrl }]],
        }
      : undefined;

    let telegramUser: any = null;
    if (chatId && loginToken) {
      telegramUser = await tgSend(loginToken, chatId, userText, userKeyboard);
    }

    let telegramAdmin: any = null;
    if (adminToken && adminChatIds.length) {
      telegramAdmin = await Promise.all(
        adminChatIds.map((cid) => tgSend(adminToken, cid, adminText, adminKeyboard))
      );
    }

    return NextResponse.json({
      ok: true,
      debug: {
        digits,
        chatId: chatId ?? null,
        telegramUser,
        telegramAdmin,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED", message: e?.message }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
