import { NextResponse } from "next/server";
import { createSessionToken, sessionCookie } from "@/app/lib/auth";
import { redis } from "@/app/lib/redis";

const TELEGRAM_AUTH_STATE_PREFIX = "tg:auth:state:";

type TelegramAuthState = {
  status?: "pending" | "ready";
  next?: string;
  phone?: string;
  createdAt?: number;
};

function isValidState(state: string) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(state);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = String(body?.state || "").trim();

    if (!state || !isValidState(state)) {
      return NextResponse.json({ ok: false, error: "STATE_INVALID" }, { status: 400 });
    }

    const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${state}`;
    const data = await redis.get<TelegramAuthState>(stateKey);

    if (!data) {
      return NextResponse.json({ ok: true, status: "expired" });
    }

    if (data.status !== "ready" || !data.phone) {
      return NextResponse.json({ ok: true, status: "pending" });
    }

    const token = createSessionToken({ phone: data.phone });
    const next = data.next && data.next.startsWith("/") && !data.next.startsWith("//")
      ? data.next
      : "/account";

    await redis.del(stateKey);

    const res = NextResponse.json({ ok: true, status: "authorized", next });
    res.cookies.set(sessionCookie(token));
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "TG_AUTH_POLL_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
