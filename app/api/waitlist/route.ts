import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
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

function getRedisOrNull() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

async function incStat(redis: Redis | null, field: string) {
  if (!redis) return;
  await redis.incr(waitlistStatKey(field));
}

function usernameFromContact(contact: string) {
  const value = String(contact || "").trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(value)) return "";
  return value;
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

async function sendLoginBotToUser(chatId: number | string, text: string) {
  const token = String(process.env.TELEGRAM_LOGIN_BOT_TOKEN || "").trim();
  if (!token) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const j = await r.json().catch(() => null);
    return Boolean(r.ok && j?.ok);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const redis = getRedisOrNull();
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
      await Promise.all([incStat(redis, "clicks_total"), incStat(redis, `clicks_${source}`)]);

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

    let existing: WaitlistEntry | null = null;
    let storageOk = true;
    try {
      if (redis) {
        const entryId = `${channel}:${contact}`;
        const key = waitlistEntryKey(entryId);
        existing = await redis.get<WaitlistEntry>(key);

        const next: WaitlistEntry = {
          channel,
          contact,
          createdAt:
            existing && Number.isFinite(Number(existing.createdAt))
              ? Math.floor(Number(existing.createdAt))
              : now,
          updatedAt: now,
          firstSource:
            existing?.firstSource === "home" || existing?.firstSource === "catalog"
              ? existing.firstSource
              : source,
          lastSource: source,
        };

        await redis.set(key, next);
        await redis.sadd(WAITLIST_INDEX_KEY, entryId);

        const statOps = [
          incStat(redis, "submits_total"),
          incStat(redis, `submits_${source}`),
          incStat(redis, `submits_${channel}`),
        ];

        if (!existing) {
          statOps.push(incStat(redis, "unique_total"), incStat(redis, `unique_${channel}`));
        }

        await Promise.all(statOps);
      } else {
        storageOk = false;
      }
    } catch {
      storageOk = false;
    }

    let userNotified = false;
    if (channel === "telegram") {
      try {
        const username = usernameFromContact(contact);
        if (username && redis) {
          const chatId = await redis.get<number | string>(`tg:username:${username}`);
          if (chatId) {
            userNotified = await sendLoginBotToUser(
              chatId,
              "✅ Вы в листе ожидания Passion. Сообщим здесь, когда стартуют продажи."
            );
          }
        }
      } catch {
        userNotified = false;
      }
    }

    const channelLabel = channel === "telegram" ? "Telegram" : "Email";
    await sendAdminWaitlistAlert(
      [
        "📥 <b>Waitlist: новая заявка</b>",
        `Статус: ${existing ? "повторная" : "новая"}`,
        `Источник: ${escapeHtml(sourceLabel)}`,
        `Канал: ${escapeHtml(channelLabel)}`,
        `Контакт: <code>${escapeHtml(contact)}</code>`,
        `Уведомлен ботом: ${userNotified ? "да" : "нет"}`,
        `Сохранено в БД: ${storageOk ? "да" : "нет"}`,
        `IP: <code>${escapeHtml(ip)}</code>`,
        `Время: ${new Date(now).toLocaleString("ru-RU")}`,
      ].join("\n")
    );

    return NextResponse.json({
      ok: true,
      alreadySubscribed: Boolean(existing),
      userNotified,
      storageOk,
    });
  } catch (error: unknown) {
    await sendAdminWaitlistAlert(
      [
        "⚠️ <b>Waitlist: server error</b>",
        `Ошибка: <code>${escapeHtml(error instanceof Error ? error.message : "WAITLIST_FAILED")}</code>`,
      ].join("\n")
    );
    return NextResponse.json({ ok: true, degraded: true, userNotified: false, storageOk: false });
  }
}
