import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { Redis } from "@upstash/redis";

export async function POST() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const raw = process.env.TELEGRAM_CHAT_IDS || "";

    const CHAT_IDS = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" },
        { status: 500 }
      );
    }

    if (!CHAT_IDS.length) {
      return NextResponse.json(
        { ok: false, error: "Missing TELEGRAM_CHAT_IDS (comma-separated)" },
        { status: 500 }
      );
    }

    const text = `✅ Telegram test ${new Date().toISOString()}`;

    const results = await Promise.all(
      CHAT_IDS.map(async (chat_id) => {
        try {
          const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id,
              text,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          });

          const bodyText = await r.text();
          return { chat_id, status: r.status, body: bodyText };
        } catch (e: any) {
          return { chat_id, status: "FETCH_FAILED", error: String(e?.message || e) };
        }
      })
    );

    return NextResponse.json({ ok: true, chatCount: CHAT_IDS.length, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "ROUTE_CRASH", details: String(e?.stack || e) },
      { status: 500 }
    );
  }
}
