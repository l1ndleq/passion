import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  normalizePromoCode,
  promoCodeKey,
  PROMO_CODES_INDEX_KEY,
  sanitizePromoRecord,
} from "@/app/lib/promocodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readCodeFromUrl(req: Request) {
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return normalizePromoCode(parts[parts.length - 1] || "");
}

export async function PATCH(req: Request) {
  try {
    const code = readCodeFromUrl(req);
    if (!code) {
      return NextResponse.json({ ok: false, error: "PROMOCODE_INVALID" }, { status: 400 });
    }

    const key = promoCodeKey(code);
    const current = sanitizePromoRecord(await redis.get(key));
    if (!current) {
      return NextResponse.json({ ok: false, error: "PROMOCODE_NOT_FOUND" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body?.active !== "boolean") {
      return NextResponse.json({ ok: false, error: "ACTIVE_REQUIRED" }, { status: 400 });
    }

    const next = {
      ...current,
      active: body.active,
      updatedAt: Date.now(),
    };

    await redis.set(key, next);
    await redis.sadd(PROMO_CODES_INDEX_KEY, code);

    return NextResponse.json({ ok: true, promocode: next });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROMOCODE_PATCH_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const code = readCodeFromUrl(req);
    if (!code) {
      return NextResponse.json({ ok: false, error: "PROMOCODE_INVALID" }, { status: 400 });
    }

    const key = promoCodeKey(code);
    await redis.del(key);
    await redis.srem(PROMO_CODES_INDEX_KEY, code);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROMOCODE_DELETE_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

