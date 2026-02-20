import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { RawPhoneSchema } from "@/app/lib/inputValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRedisOrThrow() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash env missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  return new Redis({ url, token });
}

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;
  return s;
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawPhone = url.searchParams.get("phone") || "";
    const parsedPhone = RawPhoneSchema.safeParse(rawPhone);
    if (!parsedPhone.success) {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }
    const phone = parsedPhone.data;
    const normalized = normalizePhone(phone);
    const digits = phoneDigits(normalized);

    if (digits.length < 10) {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }

    const redis = getRedisOrThrow();
    const profile = await redis.get(`user:profile:${digits}`);

    return NextResponse.json({ ok: true, profile: profile || null });
  } catch (e: any) {
    console.error("PROFILE GET ERROR:", e?.message || e, e);
    return NextResponse.json({ ok: false, error: "PROFILE_GET_FAILED" }, { status: 500 });
  }
}
