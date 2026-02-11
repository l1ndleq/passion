import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash env missing");
  return new Redis({ url, token });
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function statusText(status: string) {
  if (status === "pending_payment") return "Не оплачено ⏳";
  if (status === "paid") return "Оплачено ✅";
  if (status === "processing") return "В обработке 🧴";
  if (status === "shipped") return "Отправлено 🚚";
  if (status === "delivered") return "Доставлено 📦";
  if (status === "canceled") return "Отменено ❌";
  return status;
}

function pickBotToken() {
  // ✅ главный — тот же, что использует OTP (PassionLoginBot)
  const t1 = process.env.TELEGRAM_BOT_TOKEN;
  // ✅ запасной — если ты добавлял отдельный env
  const t2 = process.env.PASSION_LOGIN_BOT_TOKEN;
  return {
    token: t1 || t2 || "",
    source: t1 ? "TELEGRAM_BOT_TOKEN" : t2 ? "PASSION_LOGIN_BOT_TOKEN" : "MISSING",
  };
}

async function sendTelegram(chatId: number, text: string) {
  const { token, source } = pickBotToken();

  if (!token) {
    return {
      ok: false,
      source,
      httpStatus: 0,
      body: { error: "BOT_TOKEN_MISSING" },
    };
  }

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const j = await r.json().catch(() => null);

  return {
    ok: r.ok && Boolean(j?.ok),
    source,
    httpStatus: r.status,
    body: j,
  };
}

type Body = { orderId?: string; status?: string };

export async function POST(req: Request) {
  try {
    // ✅ защита
    const adminSecret = process.env.ADMIN_SECRET || "";
    const got = req.headers.get("x-admin-secret") || "";
    if (!adminSecret || got !== adminSecret) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", debug: { hasAdminSecret: Boolean(adminSecret) } },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const orderId = String(body.orderId || "").trim();
    const status = String(body.status || "").trim();

    if (!orderId) return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    if (!status) return NextResponse.json({ ok: false, error: "STATUS_REQUIRED" }, { status: 400 });

    const redis = getRedis();
    const orderKey = `order:${orderId}`;
    const order: any = await redis.get(orderKey);

    if (!order) {
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    const prevStatus = String(order.status || "");
    const next = { ...order, status };

    // ✅ сохраняем (без TTL — чтобы заказ не исчезал)
    await redis.set(orderKey, next);

    const phone = String(order?.customer?.phone || "");
    const digits = phoneDigits(phone);

    // ⚠️ ВАЖНО: у тебя chatId хранится по digits: tg:phone:<digits>
    const chatId = await redis.get<number>(`tg:phone:${digits}`);

    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const msg =
      `<b>Статус заказа обновлён</b>\n` +
      `<b>Заказ:</b> <code>${orderId}</code>\n` +
      `<b>Статус:</b> ${statusText(status)}\n` +
      (site ? `\nОткрыть заказ: ${site}/order/${orderId}` : "");

    let tg = null as any;
    if (chatId) {
      tg = await sendTelegram(chatId, msg);
    }

    return NextResponse.json({
      ok: true,
      changed: prevStatus !== status,
      debug: {
        prevStatus,
        status,
        phone,
        digits,
        chatId: chatId ?? null,
        tokenSource: pickBotToken().source,
        telegram: tg,
      },
    });
  } catch (e: any) {
    console.error("ORDER STATUS ERROR:", e?.message);
    return NextResponse.json(
      { ok: false, error: "STATUS_UPDATE_FAILED", debug: { message: e?.message } },
      { status: 500 }
    );
  }
}
