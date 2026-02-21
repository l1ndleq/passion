import { NextResponse } from "next/server";
import { verifyOtp } from "@/app/lib/otp";
import { createSessionToken, sessionCookie } from "@/app/lib/auth";
import { OtpCodeSchema, RawPhoneSchema } from "@/app/lib/inputValidation";
import { rateLimit } from "@/src/lib/rateLimit";

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
    const parsedCode = OtpCodeSchema.safeParse(body?.code ?? "");

    if (!parsedPhone.success) {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }
    if (!parsedCode.success) {
      return NextResponse.json({ ok: false, error: "CODE_REQUIRED" }, { status: 400 });
    }
    const phone = parsedPhone.data;
    const code = parsedCode.data;
    const ip = getRequestIp(req);
    const digits = phoneDigits(phone);

    const byIp = await rateLimit({
      key: `otp:verify:ip:${ip}`,
      limit: 40,
      windowSec: 10 * 60,
    });
    if (!byIp.allowed) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const byPhone = await rateLimit({
      key: `otp:verify:phone:${digits || phone}`,
      limit: 12,
      windowSec: 10 * 60,
    });
    if (!byPhone.allowed) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    // verifyOtp уже делает нормализацию и ищет по двум ключам (+7 и digits)
    const { phone: normalized } = await verifyOtp(phone, code);

    const token = createSessionToken({ phone: normalized });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (e: any) {
    const msg = e?.message || "VERIFY_OTP_FAILED";
    const status =
      msg === "PHONE_REQUIRED" ? 400 :
      msg === "CODE_REQUIRED" ? 400 :
      msg === "OTP_INVALID" ? 400 :
      msg === "OTP_EXPIRED" ? 400 :
      msg === "OTP_ATTEMPTS_EXCEEDED" ? 429 :
      500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
