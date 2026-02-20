import { NextResponse } from "next/server";
import { verifyOtp } from "@/app/lib/otp";
import { createSessionToken, sessionCookie } from "@/app/lib/auth";
import { OtpCodeSchema, RawPhoneSchema } from "@/app/lib/inputValidation";

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
