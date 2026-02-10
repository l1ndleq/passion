import { NextResponse } from "next/server";
import { verifyOtp } from "@/app/lib/otp";
import { createSessionToken, sessionCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || "");
    const code = String(body?.code || "").trim();

    if (!phone) {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ ok: false, error: "CODE_REQUIRED" }, { status: 400 });
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
