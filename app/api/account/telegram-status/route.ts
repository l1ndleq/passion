import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function phoneKeyCandidates(rawPhone: string) {
  const normalized = String(rawPhone || "").trim().replace(/[^\d+]/g, "");
  const digits = phoneDigits(rawPhone);
  const keys = new Set<string>();

  if (normalized) keys.add(`tg:phone:${normalized}`);
  if (digits) keys.add(`tg:phone:${digits}`);

  if (digits.length === 10) {
    keys.add(`tg:phone:+7${digits}`);
    keys.add(`tg:phone:7${digits}`);
    keys.add(`tg:phone:8${digits}`);
  }

  if (digits.length === 11 && digits.startsWith("7")) {
    const tail = digits.slice(1);
    keys.add(`tg:phone:+7${tail}`);
    keys.add(`tg:phone:8${tail}`);
  }

  if (digits.length === 11 && digits.startsWith("8")) {
    const tail = digits.slice(1);
    keys.add(`tg:phone:+7${tail}`);
    keys.add(`tg:phone:7${tail}`);
  }

  return Array.from(keys);
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash env missing");
  }

  return new Redis({ url, token });
}

type TelegramGetChatResponse = {
  ok?: boolean;
  result?: {
    username?: unknown;
    first_name?: unknown;
    last_name?: unknown;
  };
};

function getTelegramBotToken() {
  return (
    String(process.env.TELEGRAM_BOT_TOKEN || "").trim() ||
    String(process.env.TELEGRAM_LOGIN_BOT_TOKEN || "").trim()
  );
}

function normalizeTelegramUsername(raw: unknown) {
  const value = String(raw || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(value)) return null;
  return value;
}

async function readTelegramIdentity(chatId: number | string) {
  const token = getTelegramBotToken();
  if (!token) return { username: null as string | null, displayName: null as string | null };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = (await res.json().catch(() => ({}))) as TelegramGetChatResponse;
    if (!res.ok || !data?.ok || !data?.result) {
      return { username: null as string | null, displayName: null as string | null };
    }

    const username = normalizeTelegramUsername(data.result.username);
    const firstName = String(data.result.first_name || "").trim();
    const lastName = String(data.result.last_name || "").trim();
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

    return { username, displayName };
  } catch {
    return { username: null as string | null, displayName: null as string | null };
  }
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
    const chatId = await redis.get<number | string>(`tg:phone:${digits}`);
    const linked = Boolean(chatId);
    const identity = linked ? await readTelegramIdentity(chatId as number | string) : null;

    const res = NextResponse.json({
      ok: true,
      linked,
      username: identity?.username || null,
      displayName: identity?.displayName || null,
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

export async function DELETE(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session?.phone) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const redis = getRedis();
    const keys = phoneKeyCandidates(session.phone);

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis.del(key)));
    }

    const res = NextResponse.json({ ok: true, linked: false });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    console.error("TG UNLINK ERROR:", e?.message);
    return NextResponse.json(
      { ok: false, error: "TG_UNLINK_FAILED" },
      { status: 500 }
    );
  }
}
