import { NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "../../../../src/lib/rateLimit";





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
    })
    .filter((u) => u.login && u.password);
}

export async function POST(req: Request) {
  const rawUsers = process.env.ADMIN_USERS || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "";

  if (!rawUsers || !secret) {
    return NextResponse.json({ ok: false, error: "ADMIN_ENV_MISSING" }, { status: 500 });
  }

  // IP для лимитов (Vercel обычно кладёт в x-forwarded-for)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Общий лимит запросов логина
  const rl = await rateLimit({
    key: `admin_login:${ip}`,
    limit: 20,
    windowSec: 300, // 5 минут
  });

  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  // Лимит на фейлы (блокировка)
  const rlFailCheck = await rateLimit({
    key: `admin_login_fail:${ip}`,
    limit: 5,
    windowSec: 600, // 10 минут
  });

  if (!rlFailCheck.allowed) {
    return NextResponse.json({ ok: false, error: "TEMP_BLOCKED" }, { status: 429 });
  }

  const users = parseUsers(rawUsers);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const login = String(body?.login ?? "").trim();
  const password = String(body?.password ?? "").trim();
  const next = typeof body?.next === "string" ? body.next : "/admin/orders";

  const matched = users.find(
    (u) => timingSafeEqual(login, u.login) && timingSafeEqual(password, u.password)
  );

  if (!matched) {
    // На неверные креды мы уже “потратили” попытку через rlFailCheck,
    // это и есть счётчик фейлов.
    return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  // Сессия (7 дней)
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${login}|${exp}|${nonce}`;
  const sig = sign(payload, secret);
  const token = `${payload}.${sig}`;

  const res = NextResponse.json({ ok: true, next });
  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
