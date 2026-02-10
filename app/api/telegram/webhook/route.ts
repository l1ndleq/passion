import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

function normalizePhone(raw: string) {
  return String(raw || "").trim().replace(/[^\d+]/g, "");
}

async function tgSend(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: Request) {
  try {
    // (опционально) защита секретом
    if (WEBHOOK_SECRET) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const update = await req.json().catch(() => ({}));

    const msg = update?.message;
    const chatId = msg?.chat?.id;

    if (!chatId) return NextResponse.json({ ok: true });

    // 1) /start
    const text = String(msg?.text || "");
    if (text.startsWith("/start")) {
      await tgSend(
        chatId,
        "Чтобы привязать номер для входа, нажми кнопку ниже и отправь контакт."
      );

      // Кнопка "Поделиться контактом"
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Нажми кнопку:",
          reply_markup: {
            keyboard: [[{ text: "Поделиться номером", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }),
      });

      return NextResponse.json({ ok: true });
    }

    // 2) контакт
    const contact = msg?.contact;
    if (contact?.phone_number) {
      const phone = normalizePhone(contact.phone_number);

      // сохраняем phone -> chatId
      await redis.set(`tg:phone:${phone}`, Number(chatId));

      await tgSend(chatId, `Готово! Номер ${phone} привязан. Теперь коды будут приходить сюда.`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
