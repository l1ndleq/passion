import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toHex(sig);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginRoute = pathname === "/admin/login" || pathname === "/api/admin/login";

  if (!(isAdminPage || isAdminApi) || isLoginRoute) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // cookie format: "ts.signature"
  const [ts, sig] = cookie.split(".");
  if (!ts || !sig) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const expected = await sign(ts, secret);
  if (expected !== sig) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // TTL 7 дней
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - tsNum > maxAgeMs) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
