import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash env missing");
  }

  return new Redis({ url, token });
}

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.phone) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const redis = getRedis();

    const digits = phoneDigits(session.phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const res = NextResponse.json({
      ok: true,
      linked: Boolean(chatId),
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("TG STATUS ERROR:", e?.message);
    return NextResponse.json(
      { ok: false, error: "TG_STATUS_FAILED" },
      { status: 500 }
    );
  }
}
