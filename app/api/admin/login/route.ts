import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };

  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_COOKIE_SECRET;

  if (!adminPassword || !secret) {
    return NextResponse.json(
      { ok: false, error: "Admin env missing (ADMIN_PASSWORD / ADMIN_COOKIE_SECRET)" },
      { status: 500 }
    );
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "INVALID_PASSWORD" }, { status: 401 });
  }

  const ts = String(Date.now());
  const sig = sign(ts, secret);
  const value = `${ts}.${sig}`;

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_session", value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 дней
  });

  return res;
}
