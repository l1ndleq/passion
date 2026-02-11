import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { redis } from "@/app/lib/redis";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.phone) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const digits = phoneDigits(session.phone);
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const res = NextResponse.json({
      ok: true,
      linked: Boolean(chatId),
    });

    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "TG_STATUS_FAILED" }, { status: 500 });
  }
}
