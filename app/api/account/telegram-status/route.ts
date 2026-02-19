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
