import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  WAITLIST_INDEX_KEY,
  parseWaitlistChannel,
  parseWaitlistSource,
  normalizeWaitlistEmail,
  normalizeWaitlistTelegram,
  waitlistEntryKey,
  waitlistStatKey,
} from "@/app/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistEntry = {
  channel: "telegram" | "email";
  contact: string;
  createdAt: number;
  updatedAt: number;
  firstSource: "home" | "catalog";
  lastSource: "home" | "catalog";
};

async function incStat(field: string) {
  await redis.incr(waitlistStatKey(field));
}

function getAdminChatIds() {
  return String(process.env.TELEGRAM_CHAT_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function escapeHtml(s: string) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getClientIp(req: Request) {
  const xff = String(req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)[0];
  return xff || String(req.headers.get("x-real-ip") || "").trim() || "unknown";
}

async function sendAdminWaitlistAlert(text: string) {
  const token =
    String(process.env.TELEGRAM_ADMIN_BOT_TOKEN || "").trim() ||
    String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatIds = getAdminChatIds();
  if (!token || !chatIds.length) return;

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
      } catch {
        // Нотификация не должна ломать основной флоу.
      }
    })
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "subscribe").trim().toLowerCase();
    const source = parseWaitlistSource(body?.source);
    const now = Date.now();
    const ip = getClientIp(req);
    const ua = String(req.headers.get("user-agent") || "unknown").slice(0, 140);
    const sourceLabel = source === "catalog" ? "Каталог" : "Главная";

    if (!source) {
      return NextResponse.json({ ok: false, error: "SOURCE_INVALID" }, { status: 400 });
    }

    if (action === "click") {
      await Promise.all([incStat("clicks_total"), incStat(`clicks_${source}`)]);

      await sendAdminWaitlistAlert(
        [
          "👀 <b>Waitlist: клик по кнопке</b>",
          `Источник: ${escapeHtml(sourceLabel)}`,
          `IP: <code>${escapeHtml(ip)}</code>`,
          `UA: <code>${escapeHtml(ua)}</code>`,
          `Время: ${new Date(now).toLocaleString("ru-RU")}`,
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (action !== "subscribe") {
      return NextResponse.json({ ok: false, error: "ACTION_INVALID" }, { status: 400 });
    }

    const channel = parseWaitlistChannel(body?.channel);
    if (!channel) {
      return NextResponse.json({ ok: false, error: "CHANNEL_INVALID" }, { status: 400 });
    }

    const contact =
      channel === "email"
        ? normalizeWaitlistEmail(body?.contact)
        : normalizeWaitlistTelegram(body?.contact);

    if (!contact) {
      return NextResponse.json({ ok: false, error: "CONTACT_INVALID" }, { status: 400 });
    }

    const entryId = `${channel}:${contact}`;
    const key = waitlistEntryKey(entryId);
    const existing = await redis.get<WaitlistEntry>(key);

    const next: WaitlistEntry = {
      channel,
      contact,
      createdAt:
        existing && Number.isFinite(Number(existing.createdAt))
          ? Math.floor(Number(existing.createdAt))
          : now,
      updatedAt: now,
      firstSource: existing?.firstSource === "home" || existing?.firstSource === "catalog"
        ? existing.firstSource
        : source,
      lastSource: source,
    };

    await redis.set(key, next);
    await redis.sadd(WAITLIST_INDEX_KEY, entryId);

    const statOps = [
      incStat("submits_total"),
      incStat(`submits_${source}`),
      incStat(`submits_${channel}`),
    ];

    if (!existing) {
      statOps.push(incStat("unique_total"), incStat(`unique_${channel}`));
    }

    await Promise.all(statOps);

    const channelLabel = channel === "telegram" ? "Telegram" : "Email";
    await sendAdminWaitlistAlert(
      [
        "📥 <b>Waitlist: новая заявка</b>",
        `Статус: ${existing ? "повторная" : "новая"}`,
        `Источник: ${escapeHtml(sourceLabel)}`,
        `Канал: ${escapeHtml(channelLabel)}`,
        `Контакт: <code>${escapeHtml(contact)}</code>`,
        `IP: <code>${escapeHtml(ip)}</code>`,
        `Время: ${new Date(now).toLocaleString("ru-RU")}`,
      ].join("\n")
    );

    return NextResponse.json({ ok: true, alreadySubscribed: Boolean(existing) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "WAITLIST_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
