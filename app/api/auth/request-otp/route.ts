import { NextResponse } from "next/server";
import { requestOtp } from "@/app/lib/otp";
import { redis } from "@/app/lib/redis";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");

  // RU нормализация к +7 (чтобы ключи всегда совпадали)
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;

  // если нет "+", но это похоже на международный — можно оставить как есть
  return s;
}

async function sendTelegram(chatId: number | string, phone: string, code: string) {
  const text =
    `Код для входа: <b>${code}</b>\n` +
    `Срок действия: 5 минут.\n\n` +
    `<i>Номер: ${phone}</i>`;

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const json = await resp.json().catch(() => null);

  if (!resp.ok || !json?.ok) {
    throw new Error(
      `TELEGRAM_SEND_FAILED: ${JSON.stringify(
        { http: resp.status, body: json },
        null,
        0
      )}`
    );
  }
}

// заглушка SMS — подключим провайдера позже
async function sendSms(_phone: string, _code: string) {
  return;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "");

    // нормализуем единообразно
    const phoneNormalized = normalizePhone(phoneRaw);

    // генерируем OTP
    const otp = await requestOtp(phoneNormalized);
    const code = otp.code;
    const ttlSeconds = otp.ttlSeconds;

    // ✅ пробуем TG по ПРИВЯЗАННОМУ телефону
    let channel: "telegram" | "sms" = "sms";

    const chatId = await redis.get<number | string>(`tg:phone:${phoneNormalized}`);

    if (chatId && BOT_TOKEN) {
      try {
        await sendTelegram(chatId, phoneNormalized, code);
        channel = "telegram";
      } catch {
        // если TG упал — не теряем пользователя
        await sendSms(phoneNormalized, code);
        channel = "sms";
      }
    } else {
      await sendSms(phoneNormalized, code);
      channel = "sms";
    }

    // DEV: чтобы тестить без SMS/ТГ
    const devCode = process.env.NODE_ENV !== "production" ? { devCode: code } : {};

    return NextResponse.json({ ok: true, ttlSeconds, channel, ...devCode });
  } catch (e: any) {
    const msg = e?.message || "REQUEST_OTP_FAILED";
    const status =
      msg === "PHONE_INVALID" ? 400 :
      msg === "OTP_TOO_SOON" ? 429 :
      500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
