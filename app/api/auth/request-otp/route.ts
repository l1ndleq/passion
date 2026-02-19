import { NextResponse } from "next/server";
import { requestOtp } from "@/app/lib/otp";
import {
  isTelegramGatewayConfigured,
  sendOtpViaTelegramGateway,
} from "@/app/lib/telegramGateway";

// Заглушка SMS.
async function sendSms() {
  return;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "");

    const { phone: phoneNormalized, code, ttlSeconds } = await requestOtp(phoneRaw);

    let channel: "telegram_gateway" | "sms" = "sms";

    if (isTelegramGatewayConfigured()) {
      const gatewayResult = await sendOtpViaTelegramGateway({
        phone: phoneNormalized,
        code,
      });

      if (gatewayResult.sent) {
        channel = "telegram_gateway";
      } else {
        console.warn("TG Gateway OTP send failed:", gatewayResult);
      }
    }

    if (channel !== "telegram_gateway") {
      await sendSms();
      channel = "sms";
    }

    const devCode = process.env.NODE_ENV !== "production" ? { devCode: code } : {};

    return NextResponse.json({
      ok: true,
      ttlSeconds,
      channel,
      ...devCode,
    });
  } catch (e: any) {
    const msg = e?.message || "REQUEST_OTP_FAILED";
    const status = msg === "PHONE_INVALID" ? 400 : msg === "OTP_TOO_SOON" ? 429 : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
