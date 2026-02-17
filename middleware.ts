import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";

  // для страниц добавляем next
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!(isAdminPage || isAdminApi)) {
    return NextResponse.next();
  }

  // Разрешаем логин/logout без сессии
  const isPublic =
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout");

  if (isPublic) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  // token format: payload.sig
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expectedSig = sign(payload, secret);
  if (expectedSig !== sig) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  // payload format: login|exp|nonce
  const parts = payload.split("|");
  if (parts.length !== 3) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  const [login, expStr] = parts;
  const exp = Number(expStr);

  if (!login || !Number.isFinite(exp) || exp <= Date.now()) {
    return isAdminApi ? unauthorizedJson() : redirectToLogin(req);
  }

  return NextResponse.next();
}
