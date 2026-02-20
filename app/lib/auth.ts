import crypto from "crypto";

const LEGACY_COOKIE_NAME = "passion_session";
const HOST_COOKIE_NAME = "__Host-passion_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 дней

function isProd() {
  return process.env.NODE_ENV === "production";
}

function getPrimaryCookieName() {
  return isProd() ? HOST_COOKIE_NAME : LEGACY_COOKIE_NAME;
}

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is missing");
  return s;
}

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function hmac(data: string) {
  return base64url(crypto.createHmac("sha256", getSecret()).update(data).digest());
}

export function createSessionToken(payload: { phone: string }) {
  const data = {
    phone: payload.phone,
    iat: Date.now(),
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const body = base64url(Buffer.from(JSON.stringify(data), "utf8"));
  const sig = hmac(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): { phone: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const json = JSON.parse(
      Buffer.from(body.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8")
    );
    if (!json?.phone || !json?.exp) return null;
    if (Date.now() > Number(json.exp)) return null;
    return { phone: String(json.phone) };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return {
    name: getPrimaryCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd(),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}

export function clearSessionCookie(name = getPrimaryCookieName()) {
  return {
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd(),
    path: "/",
    maxAge: 0,
    priority: "high" as const,
  };
}

export const SESSION_COOKIE_NAME = getPrimaryCookieName();

export function sessionCookieNames() {
  return Array.from(new Set([getPrimaryCookieName(), LEGACY_COOKIE_NAME]));
}

export function getSessionFromCookieHeader(cookieHeader: string): { phone: string } | null {
  for (const name of sessionCookieNames()) {
    const token = getCookieValue(cookieHeader, name);
    const session = verifySessionToken(token);
    if (session) return session;
  }
  return null;
}

// Достаём сессию из Request (работает в Route Handlers).
// Используй в API route files внутри app/api.
export function getSessionFromRequest(req: Request): { phone: string } | null {
  const cookieHeader = req.headers.get("cookie") || "";
  return getSessionFromCookieHeader(cookieHeader);
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) {
      return decodeURIComponent(p.slice(name.length + 1));
    }
  }
  return null;
}
