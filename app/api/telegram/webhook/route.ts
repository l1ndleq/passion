import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

const BOT_TOKEN =
  String(process.env.TELEGRAM_LOGIN_BOT_TOKEN || "").trim() ||
  String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const IS_PROD = process.env.NODE_ENV === "production";
const TELEGRAM_AUTH_STATE_PREFIX = "tg:auth:state:";
const TELEGRAM_AUTH_CHAT_PREFIX = "tg:auth:chat:";
const TELEGRAM_AUTH_TTL_SECONDS = 10 * 60;

type TelegramAuthState = {
  status?: "pending" | "ready";
  next?: string;
  phone?: string;
  createdAt?: number;
};

function normalizePhone(raw: string) {
  return String(raw || "").trim().replace(/[^\d+]/g, "");
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function extractStartPayload(text: string) {
  const match = String(text || "").trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return String(match?.[1] || "").trim();
}

function readAuthState(payload: string) {
  if (!payload.startsWith("auth_")) return null;
  const state = payload.slice(5);
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(state)) return null;
  return state;
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
    if (IS_PROD && !WEBHOOK_SECRET) {
      console.error("TELEGRAM_WEBHOOK_SECRET is required in production");
      return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET_REQUIRED" }, { status: 500 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "LOGIN_BOT_TOKEN_MISSING" }, { status: 500 });
    }

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
      const payload = extractStartPayload(text);
      const authState = readAuthState(payload);

      if (authState) {
        const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${authState}`;
        const stateData = await redis.get<TelegramAuthState>(stateKey);

        if (!stateData) {
          await tgSend(chatId, "Ссылка для входа устарела. Вернитесь на сайт и нажмите кнопку входа через Телеграм снова.");
          return NextResponse.json({ ok: true });
        }

        await redis.set(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`, authState, {
          ex: TELEGRAM_AUTH_TTL_SECONDS,
        });

        await tgSend(chatId, "Для входа отправьте свой контакт кнопкой ниже.");
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Нажмите кнопку:",
            reply_markup: {
              keyboard: [[{ text: "Поделиться номером", request_contact: true }]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }),
        });

        return NextResponse.json({ ok: true });
      }

      await tgSend(
        chatId,
        "Чтобы привязать Телеграм для уведомлений, нажмите кнопку ниже и отправьте контакт."
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
      const fromId = msg?.from?.id;
      const contactUserId = contact?.user_id;
      if (fromId && contactUserId && Number(fromId) !== Number(contactUserId)) {
        await tgSend(chatId, "Для безопасности отправьте ваш собственный контакт через кнопку.");
        return NextResponse.json({ ok: true });
      }

      const phone = normalizePhone(contact.phone_number);
      const digits = phoneDigits(phone);

      if (!digits) {
        await tgSend(chatId, "Не удалось распознать номер. Попробуйте ещё раз.");
        return NextResponse.json({ ok: true });
      }

      // Сохраняем phone -> chatId в обоих форматах для совместимости.
      await redis.set(`tg:phone:${digits}`, Number(chatId));
      await redis.set(`tg:phone:${phone}`, Number(chatId));

      const pendingState = await redis.get<string>(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`);
      if (pendingState) {
        const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${pendingState}`;
        const stateData = await redis.get<TelegramAuthState>(stateKey);

        if (stateData) {
          await redis.set(
            stateKey,
            {
              ...stateData,
              status: "ready",
              phone,
            },
            { ex: TELEGRAM_AUTH_TTL_SECONDS }
          );
          await redis.del(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`);
          await tgSend(chatId, "Готово! Возвращайтесь на сайт: вход выполнится автоматически.");
          return NextResponse.json({ ok: true });
        }
      }

      await tgSend(chatId, `Готово! Номер ${phone} привязан. Теперь уведомления о заказах будут приходить сюда.`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
