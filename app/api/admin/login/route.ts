import { NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(req: Request) {
  const adminLogin = process.env.ADMIN_LOGIN || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "";

  if (!adminPassword || !secret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_ENV_MISSING" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const login = String(body?.login ?? "");
  const password = String(body?.password ?? "");
  const next = typeof body?.next === "string" ? body.next : "/admin/orders";

  // сравнение без утечек по времени
  const okLogin = timingSafeEqual(login, adminLogin);
  const okPass = timingSafeEqual(password, adminPassword);

  if (!okLogin || !okPass) {
    return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  // Сессия: payload = login|exp|nonce, signature = HMAC(secret)
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 дней
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${adminLogin}|${exp}|${nonce}`;
  const sig = sign(payload, secret);
  const token = `${payload}.${sig}`;

  const res = NextResponse.json({ ok: true, next });

  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true, // Vercel https
    path: "/",
    expires: new Date(exp),
  });

  return res;
}
