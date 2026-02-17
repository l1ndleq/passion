import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

// Next 16: "middleware" переименован в "proxy"
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";

  // чтобы после входа вернуть на нужную страницу
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    url.searchParams.set("next", req.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}

function unauthorizedJson() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

// Важно: экспорт должен быть либо default, либо named `proxy`
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  if (!(isAdminPage || isAdminApi)) return NextResponse.next();

  // Публичные маршруты (без сессии)
  const isPublic =
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout");

  if (isPublic) return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  // token format: payload.sig
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // payload format: login|exp|nonce
  const parts = payload.split("|");
  if (parts.length !== 3) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const [, expStr] = parts;
  const exp = Number(expStr);

  if (!Number.isFinite(exp) || exp <= Date.now()) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const expected = sign(payload, secret);
  if (expected !== sig) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  return NextResponse.next();
}
