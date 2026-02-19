import crypto from "crypto";
import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

export const runtime = "nodejs";

const TELEGRAM_AUTH_TTL_SECONDS = 10 * 60;
const TELEGRAM_AUTH_STATE_PREFIX = "tg:auth:state:";

type TelegramAuthState = {
  status: "pending" | "ready";
  next: string;
  createdAt: number;
  phone?: string;
};

function sanitizeNextPath(raw: unknown) {
  const value = String(raw || "");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/account";
}

function getTelegramBotUsername() {
  const publicName = String(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "")
    .trim()
    .replace(/^@/, "");
  const privateName = String(process.env.TELEGRAM_BOT_USERNAME || "")
    .trim()
    .replace(/^@/, "");

  return publicName || privateName || "PassionLoginBot";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const next = sanitizeNextPath(body?.next);

    const state = crypto.randomBytes(24).toString("base64url");
    const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${state}`;

    const value: TelegramAuthState = {
      status: "pending",
      next,
      createdAt: Date.now(),
    };

    await redis.set(stateKey, value, { ex: TELEGRAM_AUTH_TTL_SECONDS });

    const botUsername = getTelegramBotUsername();
    const url = `https://t.me/${botUsername}?start=auth_${state}`;

    return NextResponse.json({
      ok: true,
      state,
      url,
      ttlSeconds: TELEGRAM_AUTH_TTL_SECONDS,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "TG_AUTH_START_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
