import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";
const USER_SESSION_COOKIE = IS_PROD ? "__Host-passion_session" : "passion_session";
const ADMIN_SESSION_COOKIE = IS_PROD ? "__Host-admin_session" : "admin_session";
const USER_SESSION_COOKIE_NAMES = Array.from(new Set([USER_SESSION_COOKIE, "passion_session"]));
const ADMIN_SESSION_COOKIE_NAMES = Array.from(new Set([ADMIN_SESSION_COOKIE, "admin_session"]));
const CSRF_MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const encoder = new TextEncoder();

function isSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return atob(base64 + pad);
}

async function hmacSha256Base64Url(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64(new Uint8Array(sig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hmacSha256Hex(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToHex(new Uint8Array(sig));
}

async function hasValidUserSession(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  for (const cookieName of USER_SESSION_COOKIE_NAMES) {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) continue;

    const [body, sig] = token.split(".");
    if (!body || !sig) continue;

    const expected = await hmacSha256Base64Url(body, secret);
    if (!isSafeEqual(expected, sig)) continue;

    try {
      const json = JSON.parse(decodeBase64Url(body));
      if (!json?.phone || !json?.exp) continue;
      if (Date.now() > Number(json.exp)) continue;
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function hasValidAdminSession(req: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  for (const cookieName of ADMIN_SESSION_COOKIE_NAMES) {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) continue;

    const dot = token.lastIndexOf(".");
    if (dot <= 0) continue;

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const parts = payload.split("|");
    if (parts.length !== 3) continue;

    const exp = Number(parts[1]);
    if (!Number.isFinite(exp) || exp <= Date.now()) continue;

    const expected = await hmacSha256Hex(payload, secret);
    if (isSafeEqual(expected, sig)) return true;
  }
  return false;
}

function redirectToLogin(req: NextRequest, loginPath: "/login" | "/admin/login") {
  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  url.search = "";
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

function unauthorizedJson() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

function csrfForbiddenJson() {
  return NextResponse.json({ ok: false, error: "CSRF_FORBIDDEN" }, { status: 403 });
}

function isCsrfExemptPath(pathname: string) {
  return (
    pathname.startsWith("/api/pay/webhook") ||
    pathname.startsWith("/api/telegram/webhook") ||
    pathname.startsWith("/api/telegram/admin-webhook")
  );
}

function isTrustedInternalRequest(req: NextRequest) {
  const expected = String(process.env.ADMIN_SECRET || "");
  const got = String(req.headers.get("x-admin-secret") || "");
  return Boolean(expected) && Boolean(got) && isSafeEqual(expected, got);
}

function hasSameOrigin(req: NextRequest) {
  const ownOrigin = req.nextUrl.origin;
  const origin = req.headers.get("origin");
  if (origin) return origin === ownOrigin;

  const referer = req.headers.get("referer");
  if (!referer) return false;

  try {
    return new URL(referer).origin === ownOrigin;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");

  if (isApi && CSRF_MUTATING_METHODS.has(req.method)) {
    if (!isCsrfExemptPath(pathname) && !isTrustedInternalRequest(req) && !hasSameOrigin(req)) {
      return csrfForbiddenJson();
    }
  }

  const isUserPage = pathname.startsWith("/account") || pathname.startsWith("/my-orders");
  const isUserApi = pathname.startsWith("/api/account");
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    if (await hasValidUserSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/account";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isUserPage || isUserApi) {
    if (await hasValidUserSession(req)) {
      return NextResponse.next();
    }
    return isUserApi ? unauthorizedJson() : redirectToLogin(req, "/login");
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!(isAdminPage || isAdminApi)) {
    return NextResponse.next();
  }

  const isPublicAdmin =
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout");

  if (isPublicAdmin) {
    if (pathname === "/admin/login" && (await hasValidAdminSession(req))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/orders";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (await hasValidAdminSession(req)) {
    return NextResponse.next();
  }

  return isAdminApi ? unauthorizedJson() : redirectToLogin(req, "/admin/login");
}

export const config = {
  matcher: [
    "/api/:path*",
    "/login",
    "/account/:path*",
    "/my-orders/:path*",
    "/api/account/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
