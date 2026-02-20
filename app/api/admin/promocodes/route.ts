import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  normalizePromoCode,
  promoCodeKey,
  PROMO_CODES_INDEX_KEY,
  sanitizePromoRecord,
  type PromoType,
} from "@/app/lib/promocodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePromoType(raw: unknown): PromoType | null {
  return raw === "percent" || raw === "fixed" ? raw : null;
}

function parsePositiveIntOrNull(raw: unknown) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseTimestampOrNull(raw: unknown) {
  if (raw == null || raw === "") return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);

  const asString = String(raw || "").trim();
  if (!asString) return null;
  const ts = Date.parse(asString);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return Math.floor(ts);
}

export async function GET() {
  try {
    const codesRaw = await redis.smembers<string[]>(PROMO_CODES_INDEX_KEY);
    const codes = (Array.isArray(codesRaw) ? codesRaw : [])
      .map((x) => normalizePromoCode(x))
      .filter(Boolean);

    if (!codes.length) {
      return NextResponse.json({ ok: true, promocodes: [] });
    }

    const items = await redis.mget(...codes.map((c) => promoCodeKey(c)));
    const promocodes = (Array.isArray(items) ? items : [])
      .map((item) => sanitizePromoRecord(item))
      .filter(Boolean)
      .sort((a, b) => (b!.updatedAt ?? 0) - (a!.updatedAt ?? 0));

    return NextResponse.json({ ok: true, promocodes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROMOCODES_GET_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizePromoCode(body?.code);
    const type = parsePromoType(body?.type);
    const value = parsePositiveIntOrNull(body?.value);
    const maxUses = parsePositiveIntOrNull(body?.maxUses);
    const expiresAt = parseTimestampOrNull(body?.expiresAt);
    const active = body?.active === false ? false : true;

    if (!code || !type || value == null) {
      return NextResponse.json({ ok: false, error: "PROMOCODE_INVALID" }, { status: 400 });
    }

    const key = promoCodeKey(code);
    const now = Date.now();
    const existing = sanitizePromoRecord(await redis.get(key));

    const promocode = sanitizePromoRecord({
      code,
      type,
      value,
      active,
      maxUses,
      expiresAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      usedCount: existing?.usedCount ?? 0,
    });

    if (!promocode) {
      return NextResponse.json({ ok: false, error: "PROMOCODE_INVALID" }, { status: 400 });
    }

    await redis.set(key, promocode);
    await redis.sadd(PROMO_CODES_INDEX_KEY, code);

    return NextResponse.json({ ok: true, promocode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROMOCODE_SAVE_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

