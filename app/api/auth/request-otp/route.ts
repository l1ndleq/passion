import { NextResponse } from "next/server";
import { requestOtp } from "@/app/lib/otp";
import { rateLimit } from "@/src/lib/rateLimit";
import {
  isTelegramGatewayConfigured,
  sendOtpViaTelegramGateway,
} from "@/app/lib/telegramGateway";
import { RawPhoneSchema } from "@/app/lib/inputValidation";

// Заглушка SMS.
async function sendSms() {
  return;
}

function getRequestIp(req: Request) {
  const xff = String(req.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();
  const xrip = String(req.headers.get("x-real-ip") || "").trim();
  const ip = xff || xrip || "unknown";
  return ip.slice(0, 128);
}

function phoneDigits(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsedPhone = RawPhoneSchema.safeParse(body?.phone ?? "");
    if (!parsedPhone.success) {
      return NextResponse.json({ ok: false, error: "PHONE_INVALID" }, { status: 400 });
    }
    const phoneRaw = parsedPhone.data;
    const ip = getRequestIp(req);
    const digits = phoneDigits(phoneRaw);

    const byIp = await rateLimit({
      key: `otp:req:ip:${ip}`,
      limit: 20,
      windowSec: 10 * 60,
    });
    if (!byIp.allowed) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const byPhone = await rateLimit({
      key: `otp:req:phone:${digits || phoneRaw}`,
      limit: 5,
      windowSec: 10 * 60,
    });
    if (!byPhone.allowed) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

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
