import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function sendTelegram(text: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
  const raw = process.env.TELEGRAM_CHAT_ID || "";
  const chatIds = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      return { chatId, status: r.status, data: await r.json().catch(() => null) };
    })
  );

  return results;
}

export async function POST(req: Request) {
  try {
    /**
     * В реальной интеграции тут будет проверка подписи webhook!
     * (Stripe signature / ЮKassa signature / CloudPayments HMAC и т.д.)
     */

    const payload = await req.json();

    // Пример: считаем что провайдер прислал orderId и статус
    const orderId = payload?.orderId;
    const status = payload?.status; // "paid" например

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "missing orderId" }, { status: 400 });
    }

    const order = await redis.get<any>(`order:${orderId}`);
    if (!order) return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });

    if (order.status === "paid") {
      // идемпотентность: webhook может прийти повторно
      return NextResponse.json({ ok: true, already: true });
    }

    if (status !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // помечаем как оплачено
    await redis.set(`order:${orderId}`, { ...order, status: "paid", paidAt: Date.now() });

    // формируем текст для Telegram
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
    return NextResponse.json({ ok: false, error: e?.message || "webhook failed" }, { status: 500 });
  }
}