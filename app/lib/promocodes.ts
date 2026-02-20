export type PromoType = "percent" | "fixed";

export type PromoCodeRecord = {
  code: string;
  type: PromoType;
  value: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  maxUses: number | null;
  usedCount: number;
};

export const PROMO_CODES_INDEX_KEY = "promos:codes";

const PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;

export function normalizePromoCode(raw: unknown) {
  const code = String(raw || "").trim().toUpperCase();
  if (!PROMO_CODE_RE.test(code)) return "";
  return code;
}

export function promoCodeKey(code: string) {
  return `promo:code:${code}`;
}

function asFiniteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function sanitizePromoRecord(input: unknown): PromoCodeRecord | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;

  const code = normalizePromoCode(data.code);
  const type = data.type === "percent" || data.type === "fixed" ? data.type : null;
  const value = asFiniteNumber(data.value);
  const active = Boolean(data.active);
  const createdAt = asFiniteNumber(data.createdAt) ?? Date.now();
  const updatedAt = asFiniteNumber(data.updatedAt) ?? Date.now();
  const expiresAtRaw = data.expiresAt == null || data.expiresAt === "" ? null : asFiniteNumber(data.expiresAt);
  const maxUsesRaw = data.maxUses == null || data.maxUses === "" ? null : asFiniteNumber(data.maxUses);
  const usedCountRaw = asFiniteNumber(data.usedCount);

  if (!code || !type || value == null) return null;
  if (type === "percent" && (value <= 0 || value > 95)) return null;
  if (type === "fixed" && value <= 0) return null;

  const maxUses =
    maxUsesRaw == null || maxUsesRaw <= 0 ? null : Math.floor(maxUsesRaw);
  const usedCount = Math.max(0, Math.floor(usedCountRaw ?? 0));
  const expiresAt =
    expiresAtRaw == null || expiresAtRaw <= 0 ? null : Math.floor(expiresAtRaw);

  return {
    code,
    type,
    value: Math.floor(value),
    active,
    createdAt: Math.floor(createdAt),
    updatedAt: Math.floor(updatedAt),
    expiresAt,
    maxUses,
    usedCount,
  };
}

export function computeDiscountAmount(
  subtotalPrice: number,
  promo: Pick<PromoCodeRecord, "type" | "value">
) {
  const subtotal = Math.max(0, Math.floor(Number(subtotalPrice) || 0));
  if (subtotal <= 1) return 0;

  let rawAmount = 0;
  if (promo.type === "percent") {
    rawAmount = Math.floor((subtotal * promo.value) / 100);
  } else {
    rawAmount = Math.floor(promo.value);
  }

  // Keep order payable (> 0).
  const maxAmount = subtotal - 1;
  return Math.max(0, Math.min(rawAmount, maxAmount));
}

export type PromoValidationResult =
  | { ok: true; discountAmount: number; totalPrice: number }
  | { ok: false; reason: "invalid" | "inactive" | "expired" | "usage_limit" | "no_discount" };

export function validatePromoForSubtotal(
  promo: PromoCodeRecord | null,
  subtotalPrice: number,
  now = Date.now()
): PromoValidationResult {
  if (!promo) return { ok: false, reason: "invalid" };
  if (!promo.active) return { ok: false, reason: "inactive" };
  if (promo.expiresAt && now > promo.expiresAt) return { ok: false, reason: "expired" };
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { ok: false, reason: "usage_limit" };
  }

  const discountAmount = computeDiscountAmount(subtotalPrice, promo);
  if (discountAmount <= 0) return { ok: false, reason: "no_discount" };

  return {
    ok: true,
    discountAmount,
    totalPrice: Math.max(1, Math.floor(subtotalPrice - discountAmount)),
  };
}

