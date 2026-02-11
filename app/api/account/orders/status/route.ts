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

async function sendTelegramToChat(chatId: number, text: string) {
  // ✅ СЛАЕМ ИМЕННО В PassionLoginBot
  const token = process.env.PASSION_LOGIN_BOT_TOKEN;
  if (!token) {
    console.error("PASSION_LOGIN_BOT_TOKEN missing on Vercel");
    return;
  }

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
  if (!r.ok || !j?.ok) {
    console.error("TG notify failed:", { chatId, status: r.status, resp: j });
  }
}

type Body = { orderId?: string; status?: string };

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
    if (prevStatus === status) return NextResponse.json({ ok: true, changed: false });

    const next = { ...order, status };
    await redis.set(key, next); // без TTL, чтобы не исчезало

    // ✅ найти chatId по телефону заказа
    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    if (chatId) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
      const msg =
        `<b>Статус заказа обновлён</b>\n` +
        `<b>Заказ:</b> <code>${orderId}</code>\n` +
        `<b>Статус:</b> ${statusText(status)}\n` +
        (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");

      await sendTelegramToChat(chatId, msg);
    } else {
      console.warn("No chatId for phone digits:", digits);
    }

    return NextResponse.json({ ok: true, changed: true });
  } catch (e: any) {
    console.error("ORDER STATUS ERROR:", e?.message);
    return NextResponse.json({ ok: false, error: "STATUS_UPDATE_FAILED" }, { status: 500 });
  }
}
