import crypto from "crypto";

export const ORDER_ACCESS_QUERY_PARAM = "t";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getOrderAccessSecret() {
  return process.env.ORDER_TRACK_SECRET || process.env.AUTH_SECRET || "";
}

function buildPayload(orderId: string, phone: string) {
  return `${String(orderId || "").trim()}|${phoneDigits(phone)}`;
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createOrderAccessToken(orderId: string, phone: string) {
  const secret = getOrderAccessSecret();
  if (!secret) return null;

  const payload = buildPayload(orderId, phone);
  return base64url(
    crypto.createHmac("sha256", secret).update(payload, "utf8").digest()
  );
}

export function verifyOrderAccessToken(params: {
  orderId: string;
  phone: string;
  token: string | null | undefined;
}) {
  const token = String(params.token || "").trim();
  if (!token) return false;

  const expected = createOrderAccessToken(params.orderId, params.phone);
  if (!expected) return false;

  return timingSafeEqual(expected, token);
}

export function buildOrderTrackingUrl(baseUrl: string, orderId: string, phone: string) {
  const site = String(baseUrl || "").replace(/\/+$/, "");
  const token = createOrderAccessToken(orderId, phone);
  const path = `/order/${encodeURIComponent(orderId)}`;

  if (!site) return token ? `${path}#${ORDER_ACCESS_QUERY_PARAM}=${token}` : path;
  return token
    ? `${site}${path}#${ORDER_ACCESS_QUERY_PARAM}=${token}`
    : `${site}${path}`;
}
