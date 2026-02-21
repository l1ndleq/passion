import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  normalizePromoCode,
  promoCodeKey,
  sanitizePromoRecord,
  validatePromoForSubtotal,
} from "@/app/lib/promocodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const subtotalPrice = Math.max(0, Math.floor(Number(body?.subtotalPrice || 0)));
    if (!Number.isFinite(subtotalPrice) || subtotalPrice <= 0) {
      return NextResponse.json({ ok: false, error: "SUBTOTAL_INVALID" }, { status: 400 });
    }

    const promoCode = normalizePromoCode(body?.promoCode);
    if (!promoCode) {
      return NextResponse.json({
        ok: true,
        promoCode: null,
        discountAmount: 0,
        totalPrice: subtotalPrice,
      });
    }

    const promo = sanitizePromoRecord(await redis.get(promoCodeKey(promoCode)));
    const promoValidation = validatePromoForSubtotal(promo, subtotalPrice);

    if (!promoValidation.ok) {
      const error =
        promoValidation.reason === "inactive"
          ? "PROMO_INACTIVE"
          : promoValidation.reason === "expired"
          ? "PROMO_EXPIRED"
          : promoValidation.reason === "usage_limit"
          ? "PROMO_USAGE_LIMIT"
          : "PROMO_INVALID";
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      promoCode,
      discountAmount: promoValidation.discountAmount,
      totalPrice: promoValidation.totalPrice,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "PROMO_PREVIEW_FAILED" }, { status: 500 });
  }
}
