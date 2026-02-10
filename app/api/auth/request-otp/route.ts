import { NextResponse } from "next/server";
import { requestOtp } from "@/app/lib/otp";
import { redis } from "@/app/lib/redis";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

async function sendTelegram(chatId: number, code: string) {
  const text = `Код для входа: ${code}\nСрок действия: 5 минут.`;
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) {
    console.error("TG OTP send failed:", { status: r.status, resp: j });
  }
}

// заглушка SMS
async function sendSms(_phone: string, _code: string) {
  return;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "");

    const { phone: phoneNormalized, code, ttlSeconds } =
      await requestOtp(phoneRaw);

    const digits = phoneDigits(phoneNormalized);

    let channel: "telegram" | "sms" = "sms";

    // 🔥 КЛЮЧЕВОЕ МЕСТО
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    if (chatId && BOT_TOKEN) {
      await sendTelegram(chatId, code);
      channel = "telegram";
    } else {
      await sendSms(phoneNormalized, code);
      channel = "sms";
    }

    const devCode =
      process.env.NODE_ENV !== "production" ? { devCode: code } : {};

    return NextResponse.json({
      ok: true,
      ttlSeconds,
      channel,
      ...devCode,
    });
  } catch (e: any) {
    const msg = e?.message || "REQUEST_OTP_FAILED";
    const status =
      msg === "PHONE_INVALID"
        ? 400
        : msg === "OTP_TOO_SOON"
        ? 429
        : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
