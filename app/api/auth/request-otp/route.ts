import { NextResponse } from "next/server";
import { requestOtp } from "@/app/lib/otp";
import { redis } from "@/app/lib/redis";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

async function sendTelegram(chatId: number, code: string) {
  const text = `Код для входа: ${code}\nСрок действия: 5 минут.`;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// заглушка SMS — подключим провайдера позже
async function sendSms(_phone: string, _code: string) {
  return;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "");

    const { phone: phoneNormalized, code, ttlSeconds } = await requestOtp(phoneRaw);

    // ✅ пробуем TG
    let channel: "telegram" | "sms" = "sms";
    const chatId = await redis.get<number>(`tg:phone:${phoneNormalized}`);

    if (chatId && BOT_TOKEN) {
      await sendTelegram(chatId, code);
      channel = "telegram";
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
