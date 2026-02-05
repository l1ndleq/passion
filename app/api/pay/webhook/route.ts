export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function sendTelegram(text: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const raw = process.env.TELEGRAM_CHAT_IDS || "";

  const CHAT_IDS = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  if (!CHAT_IDS.length) throw new Error("Missing TELEGRAM_CHAT_IDS (comma-separated)");

  const results = await Promise.all(
    CHAT_IDS.map(async (chatId) => {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      const bodyText = await r.text();
      return { chatId, status: r.status, body: bodyText };
    })
  );

  return results;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Под твой тест (ты шлёшь {orderId, status})
    const orderId = payload?.orderId;
    const status = payload?.status;

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "missing orderId" }, { status: 400 });
    }

    const key = `order:${orderId}`;
    const order = await redis.get<any>(key);

    if (!order) {
      return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });
    }

    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already: true });
    }

    if (status !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    await redis.set(key, { ...order, status: "paid", paidAt: Date.now() });

    const itemsText = (order.items || [])
      .map((i: any) => `• ${i.title} × ${i.qty} = ${i.qty * i.price} ₽`)
      .join("\n");

    const text =
      `🧴 <b>Passion — оплаченный заказ</b>\n\n` +
      `🧾 <b>Заказ:</b> <code>${orderId}</code>\n` +
      `👤 <b>Имя:</b> ${order.customer?.name || "-"}\n` +
      `📞 <b>Контакт:</b> ${order.customer?.contact || "-"}\n` +
      `🏙️ <b>Город:</b> ${order.customer?.city || "-"}\n` +
      `📦 <b>Адрес:</b> ${order.customer?.address || "-"}\n` +
      `💬 <b>Комментарий:</b> ${order.customer?.message || "-"}\n\n` +
      `🛍️ <b>Состав заказа:</b>\n${itemsText || "-"}\n\n` +
      `💰 <b>Итого:</b> ${order.totalPrice || 0} ₽`;

    const results = await sendTelegram(text);

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "webhook failed" },
      { status: 500 }
    );
  }
}
