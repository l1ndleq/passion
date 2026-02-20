import { NextResponse } from "next/server";

function adminCookieNames() {
  const primary = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";
  return Array.from(new Set([primary, "admin_session"]));
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";
  for (const name of adminCookieNames()) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      expires: new Date(0),
      priority: "high",
    });
  }
  return res;
}
