import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function fromHex(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function verifyHmac(payload: string, secret: string, sigHex: string) {
  const sig = fromHex(sigHex);
  if (!sig) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify("HMAC", key, sig, enc.encode(payload));
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";

  // сохраняем куда хотели попасть (только для страниц)
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    url.searchParams.set("next", req.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}

function unauthorizedJson() {
  return NextResponse.json(
    { ok: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Защищаем только /admin/* и /api/admin/*
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if (!(isAdminPage || isAdminApi)) return NextResponse.next();

  // Разрешаем без сессии:
  // - страница логина
  // - API логина
  // - (опционально) logout
  const isPublic =
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout";
  if (isPublic) return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  const expectedLogin = process.env.ADMIN_LOGIN || "admin";

  if (!secret) {
    // если секрет не задан — считаем, что вход запрещён
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  // token = payload.sig
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const payload = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);

  // payload = login|exp|nonce
  const parts = payload.split("|");
  if (parts.length !== 3) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const [login, expStr] = parts;
  const exp = Number(expStr);

  if (!login || login !== expectedLogin) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  if (!Number.isFinite(exp) || exp <= Date.now()) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const ok = await verifyHmac(payload, secret, sigHex);
  if (!ok) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
