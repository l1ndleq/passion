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

function parseUsers(raw: string) {
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .map((pair) => {
      const [login, password] = pair.split(":");
      return { login, password };
    });
}

export async function POST(req: Request) {
  const rawUsers = process.env.ADMIN_USERS || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "";

  if (!rawUsers || !secret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_ENV_MISSING" },
      { status: 500 }
    );
  }

  const users = parseUsers(rawUsers);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const login = String(body?.login ?? "");
  const password = String(body?.password ?? "");
  const next = typeof body?.next === "string" ? body.next : "/admin/orders";

  const matched = users.find(
    (u) =>
      timingSafeEqual(login, u.login) &&
      timingSafeEqual(password, u.password)
  );

  if (!matched) {
    return NextResponse.json(
      { ok: false, error: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  // Сессия
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${login}|${exp}|${nonce}`;
  const sig = sign(payload, secret);
  const token = `${payload}.${sig}`;

  const res = NextResponse.json({ ok: true, next });

  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(exp),
  });

  return res;
}
