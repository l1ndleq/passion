import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import {
  normalizePromoCode,
  promoCodeKey,
  PROMO_CODES_INDEX_KEY,
  sanitizePromoRecord,
  type PromoType,
} from "@/app/lib/promocodes";

const ADMIN_BOT_TOKEN =
  String(process.env.TELEGRAM_ADMIN_BOT_TOKEN || "").trim() ||
  String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const ADMIN_WEBHOOK_SECRET =
  String(process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET || "").trim() ||
  String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const IS_PROD = process.env.NODE_ENV === "production";

const ADMIN_ORDER_STATUS_OPTIONS = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;

type AdminOrderStatus = (typeof ADMIN_ORDER_STATUS_OPTIONS)[number];

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
  callback_query?: {
    id?: string;
    data?: string;
    message?: { chat?: { id?: number | string } };
  };
};

type StoredOrder = {
  orderId?: string;
  status?: string;
  createdAt?: number;
  totalPrice?: number;
  items?: Array<{ title?: string; id?: string; qty?: number }>;
  customer?: {
    name?: string;
    phone?: string;
  };
  statusHistory?: Array<{
    status?: string;
    at?: number;
    by?: string;
  }>;
};

type PromoRecord = NonNullable<ReturnType<typeof sanitizePromoRecord>>;

function asChatIdString(chatId: number | string) {
  return String(chatId || "").trim();
}

function getAdminChatIdSet() {
  const raw = String(process.env.TELEGRAM_CHAT_IDS || "");
  const ids = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return new Set(ids);
}

function isKnownAdminChat(chatId: number | string) {
  return getAdminChatIdSet().has(asChatIdString(chatId));
}

function normalizeOrderId(raw: string) {
  return String(raw || "").trim().replace(/\s+/g, "").toUpperCase();
}

function isOrderIdValid(orderId: string) {
  return /^[A-Z0-9_-]{3,40}$/.test(orderId);
}

function isAdminStatus(value: string): value is AdminOrderStatus {
  return (ADMIN_ORDER_STATUS_OPTIONS as readonly string[]).includes(value);
}

function formatMoney(n: number) {
  const amount = Number(n || 0);
  try {
    return amount.toLocaleString("ru-RU");
  } catch {
    return String(amount);
  }
}

function formatDate(ts: number | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("ru-RU");
  } catch {
    return String(ts);
  }
}

function statusLabel(status: string | undefined) {
  switch (String(status || "")) {
    case "paid":
      return "Оплачен";
    case "pending_payment":
      return "Ожидает оплату";
    case "processing":
      return "В обработке";
    case "shipped":
      return "Отправлен";
    case "delivered":
      return "Доставлен";
    case "completed":
      return "Завершен";
    case "cancelled":
      return "Отменен";
    case "new":
      return "Новый";
    default:
      return status || "—";
  }
}

function parsePromoType(raw: string): PromoType | null {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "percent" || value === "%") return "percent";
  if (value === "fixed" || value === "rub" || value === "rur" || value === "₽") return "fixed";
  return null;
}

function getSiteUrl(req: Request) {
  const envSite = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (envSite) return envSite.replace(/\/+$/, "");
  try {
    return new URL(req.url).origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

async function tgCall(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => null);
}

async function tgSend(chatId: number | string, text: string, extra?: Record<string, unknown>) {
  await tgCall("sendMessage", {
    chat_id: chatId,
    text,
    ...(extra || {}),
  });
}

async function tgAnswerCallback(callbackQueryId: string | undefined, text?: string) {
  if (!callbackQueryId) return;
  await tgCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

async function sendAdminMenu(chatId: number | string) {
  await tgSend(chatId, "🛠 Админка Telegram", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Последние заказы", callback_data: "ADM_ORDERS" }],
        [{ text: "🎟 Промокоды", callback_data: "ADM_PROMOS" }],
        [{ text: "🔄 Обновить", callback_data: "ADM_MENU" }],
      ],
    },
  });
}

async function getRecentOrders(limit: number) {
  const idsRaw = (await redis.lrange("orders:latest", 0, Math.max(0, limit - 1))) as unknown[];
  const ids = (Array.isArray(idsRaw) ? idsRaw : [])
    .map((x) => normalizeOrderId(String(x || "")))
    .filter(Boolean);
  if (!ids.length) return [] as StoredOrder[];

  const rows = await redis.mget(...ids.map((id) => `order:${id}`));
  return (Array.isArray(rows) ? rows : []).filter(Boolean) as StoredOrder[];
}

async function sendAdminOrders(chatId: number | string) {
  const orders = await getRecentOrders(15);
  if (!orders.length) {
    await tgSend(chatId, "Заказов пока нет.");
    return;
  }

  const lines = ["📋 Последние заказы", ""];
  for (const o of orders.slice(0, 15)) {
    const orderId = normalizeOrderId(String(o.orderId || ""));
    if (!orderId) continue;
    const total = formatMoney(Number(o.totalPrice || 0));
    const phone = String(o.customer?.phone || "").trim();
    lines.push(`• ${orderId} — ${statusLabel(o.status)} — ${total} ₽${phone ? ` — ${phone}` : ""}`);
  }

  const keyboard = orders
    .slice(0, 10)
    .map((o) => {
      const orderId = normalizeOrderId(String(o.orderId || ""));
      return [{ text: orderId, callback_data: `ADM_OPEN:${orderId}` }];
    })
    .filter((row) => row[0].text);
  keyboard.push([{ text: "🔄 Обновить", callback_data: "ADM_ORDERS" }]);

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: { inline_keyboard: keyboard },
  });
}

function adminStatusButtons(orderId: string) {
  return [
    [
      { text: "pending_payment", callback_data: `ADM_SET:${orderId}:pending_payment` },
      { text: "paid", callback_data: `ADM_SET:${orderId}:paid` },
    ],
    [
      { text: "processing", callback_data: `ADM_SET:${orderId}:processing` },
      { text: "shipped", callback_data: `ADM_SET:${orderId}:shipped` },
    ],
    [
      { text: "delivered", callback_data: `ADM_SET:${orderId}:delivered` },
      { text: "completed", callback_data: `ADM_SET:${orderId}:completed` },
    ],
    [{ text: "cancelled", callback_data: `ADM_SET:${orderId}:cancelled` }],
    [{ text: "⬅️ К заказам", callback_data: "ADM_ORDERS" }],
  ];
}

async function sendAdminOrderDetails(chatId: number | string, orderIdRaw: string, siteUrl: string) {
  const orderId = normalizeOrderId(orderIdRaw);
  if (!orderId || !isOrderIdValid(orderId)) {
    await tgSend(chatId, "Некорректный номер заказа.");
    return;
  }

  const order = await redis.get<StoredOrder>(`order:${orderId}`);
  if (!order) {
    await tgSend(chatId, `Заказ ${orderId} не найден.`);
    return;
  }

  const name = String(order.customer?.name || "").trim();
  const phone = String(order.customer?.phone || "").trim();
  const lines = [
    `🧾 Заказ ${orderId}`,
    `Статус: ${statusLabel(order.status)}`,
    `Сумма: ${formatMoney(Number(order.totalPrice || 0))} ₽`,
    `Создан: ${formatDate(order.createdAt)}`,
    `Клиент: ${name || "—"}`,
    `Телефон: ${phone || "—"}`,
  ];

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    lines.push("");
    lines.push("Состав:");
    for (const it of items.slice(0, 8)) {
      const title = String(it?.title || it?.id || "Товар");
      const qty = Math.max(1, Number(it?.qty || 1));
      lines.push(`• ${title} × ${qty}`);
    }
    if (items.length > 8) lines.push("• …");
  }

  const adminUrl = siteUrl ? `${siteUrl}/admin/orders/${encodeURIComponent(orderId)}` : "";
  const keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> =
    adminStatusButtons(orderId);
  if (adminUrl) keyboard.unshift([{ text: "Открыть в админке сайта", url: adminUrl }]);

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function updateOrderStatusFromTelegram(
  chatId: number | string,
  orderIdRaw: string,
  statusRaw: string,
  siteUrl: string
) {
  const orderId = normalizeOrderId(orderIdRaw);
  const status = String(statusRaw || "").trim();
  if (!orderId || !isOrderIdValid(orderId) || !isAdminStatus(status)) {
    await tgSend(chatId, "Не удалось обновить статус: неверные данные.");
    return;
  }

  const key = `order:${orderId}`;
  const order = await redis.get<Record<string, unknown>>(key);
  if (!order) {
    await tgSend(chatId, `Заказ ${orderId} не найден.`);
    return;
  }

  const prev = String(order.status || "");
  if (prev === status) {
    await tgSend(chatId, `Статус заказа ${orderId} уже: ${statusLabel(status)}.`);
    await sendAdminOrderDetails(chatId, orderId, siteUrl);
    return;
  }

  const history = Array.isArray(order.statusHistory)
    ? (order.statusHistory as Array<Record<string, unknown>>)
    : [];
  const now = Date.now();
  const updated = {
    ...order,
    status,
    updatedAt: now,
    statusHistory: [
      ...history,
      {
        status,
        at: now,
        by: "admin",
      },
    ],
  };
  await redis.set(key, updated);

  const adminSecret = String(process.env.ADMIN_SECRET || "").trim();
  if (siteUrl && adminSecret) {
    await fetch(`${siteUrl}/api/account/orders/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": adminSecret,
        Origin: siteUrl,
      },
      body: JSON.stringify({ orderId, status }),
    }).catch(() => { });
  }

  await tgSend(chatId, `✅ ${orderId}: статус изменен на ${statusLabel(status)}.`);
  await sendAdminOrderDetails(chatId, orderId, siteUrl);
}

function promoTypeLabel(type: PromoType) {
  return type === "percent" ? "%" : "₽";
}

function promoValueLabel(promo: PromoRecord) {
  return promo.type === "percent"
    ? `${Math.floor(Number(promo.value || 0))}%`
    : `${formatMoney(Math.floor(Number(promo.value || 0)))} ₽`;
}

function promoStateLabel(promo: PromoRecord) {
  if (!promo.active) return "выключен";
  if (promo.expiresAt && Date.now() > promo.expiresAt) return "истек";
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return "лимит исчерпан";
  return "активен";
}

async function getPromos(limit = 20) {
  const codesRaw = await redis.smembers<string[]>(PROMO_CODES_INDEX_KEY);
  const codes = (Array.isArray(codesRaw) ? codesRaw : [])
    .map((x) => normalizePromoCode(x))
    .filter(Boolean);
  if (!codes.length) return [] as PromoRecord[];

  const rows = await redis.mget(...codes.map((code) => promoCodeKey(code)));
  const promos = (Array.isArray(rows) ? rows : [])
    .map((row) => sanitizePromoRecord(row))
    .filter(Boolean) as PromoRecord[];

  return promos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, limit);
}

async function sendAdminPromos(chatId: number | string) {
  const promos = await getPromos(20);
  if (!promos.length) {
    await tgSend(
      chatId,
      [
        "🎟 Промокоды",
        "Список пуст.",
        "",
        "Создать: /promo CODE percent|fixed VALUE",
        "Пример: /promo WELCOME10 percent 10",
      ].join("\n")
    );
    return;
  }

  const lines = ["🎟 Промокоды", ""];
  for (const promo of promos) {
    lines.push(
      `• ${promo.code} — ${promoValueLabel(promo)} — ${promoStateLabel(promo)} (${promo.usedCount}/${promo.maxUses || "∞"})`
    );
  }

  const keyboard = promos
    .slice(0, 10)
    .map((promo) => [{ text: promo.code, callback_data: `ADM_PROMO_OPEN:${promo.code}` }]);
  keyboard.push([{ text: "🔄 Обновить", callback_data: "ADM_PROMOS" }]);
  keyboard.push([{ text: "⬅️ Админка", callback_data: "ADM_MENU" }]);

  await tgSend(chatId, lines.join("\n"), { reply_markup: { inline_keyboard: keyboard } });
}

async function sendAdminPromoDetails(chatId: number | string, codeRaw: string) {
  const code = normalizePromoCode(codeRaw);
  if (!code) {
    await tgSend(chatId, "Некорректный код промокода.");
    return;
  }

  const promo = sanitizePromoRecord(await redis.get(promoCodeKey(code)));
  if (!promo) {
    await tgSend(chatId, `Промокод ${code} не найден.`);
    return;
  }

  const lines = [
    `🎟 ${promo.code}`,
    `Скидка: ${promoValueLabel(promo)}`,
    `Тип: ${promoTypeLabel(promo.type)}`,
    `Статус: ${promoStateLabel(promo)}`,
    `Использовано: ${promo.usedCount}${promo.maxUses ? ` / ${promo.maxUses}` : " / ∞"}`,
    `Истекает: ${promo.expiresAt ? formatDate(promo.expiresAt) : "бессрочно"}`,
    `Обновлен: ${formatDate(promo.updatedAt)}`,
  ];

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: promo.active ? "⏸ Выключить" : "▶️ Включить",
            callback_data: `ADM_PROMO_TOGGLE:${promo.code}:${promo.active ? "0" : "1"}`,
          },
        ],
        [{ text: "🗑 Удалить", callback_data: `ADM_PROMO_DEL:${promo.code}` }],
        [{ text: "⬅️ К промокодам", callback_data: "ADM_PROMOS" }],
      ],
    },
  });
}

async function upsertPromoFromText(
  chatId: number | string,
  codeRaw: string,
  typeRaw: string,
  valueRaw: string
) {
  const code = normalizePromoCode(codeRaw);
  const type = parsePromoType(typeRaw);
  const value = Math.floor(Number(valueRaw));
  if (!code || !type || !Number.isFinite(value) || value <= 0 || (type === "percent" && value > 95)) {
    await tgSend(
      chatId,
      "Формат: /promo CODE percent|fixed VALUE\nПример: /promo WELCOME10 percent 10"
    );
    return;
  }

  const key = promoCodeKey(code);
  const existing = sanitizePromoRecord(await redis.get(key));
  const now = Date.now();

  const promo = sanitizePromoRecord({
    code,
    type,
    value,
    active: existing?.active ?? true,
    maxUses: existing?.maxUses ?? null,
    expiresAt: existing?.expiresAt ?? null,
    usedCount: existing?.usedCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  if (!promo) {
    await tgSend(chatId, "Не удалось сохранить промокод: проверьте параметры.");
    return;
  }

  await redis.set(key, promo);
  await redis.sadd(PROMO_CODES_INDEX_KEY, promo.code);
  await tgSend(chatId, `✅ Промокод ${promo.code} сохранен.`);
  await sendAdminPromoDetails(chatId, promo.code);
}

async function setPromoActiveFromText(chatId: number | string, codeRaw: string, active: boolean) {
  const code = normalizePromoCode(codeRaw);
  if (!code) {
    await tgSend(chatId, "Укажите корректный код промокода.");
    return;
  }

  const key = promoCodeKey(code);
  const current = sanitizePromoRecord(await redis.get(key));
  if (!current) {
    await tgSend(chatId, `Промокод ${code} не найден.`);
    return;
  }

  const next = sanitizePromoRecord({
    ...current,
    active,
    updatedAt: Date.now(),
  });
  if (!next) {
    await tgSend(chatId, "Не удалось обновить промокод.");
    return;
  }

  await redis.set(key, next);
  await redis.sadd(PROMO_CODES_INDEX_KEY, code);
  await tgSend(chatId, `✅ ${code}: ${active ? "включен" : "выключен"}.`);
  await sendAdminPromoDetails(chatId, code);
}

async function deletePromoFromText(chatId: number | string, codeRaw: string) {
  const code = normalizePromoCode(codeRaw);
  if (!code) {
    await tgSend(chatId, "Укажите корректный код промокода.");
    return;
  }

  await redis.del(promoCodeKey(code));
  await redis.srem(PROMO_CODES_INDEX_KEY, code);
  await tgSend(chatId, `🗑 Промокод ${code} удален.`);
  await sendAdminPromos(chatId);
}

function denyText(chatId: number | string) {
  return `Доступ к админке запрещен.\nВаш chat_id: ${asChatIdString(chatId)}\nДобавьте его в TELEGRAM_CHAT_IDS.`;
}

export async function POST(req: Request) {
  try {
    if (IS_PROD && !ADMIN_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "ADMIN_WEBHOOK_SECRET_REQUIRED" }, { status: 500 });
    }
    if (!ADMIN_BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "ADMIN_BOT_TOKEN_MISSING" }, { status: 500 });
    }

    if (ADMIN_WEBHOOK_SECRET) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== ADMIN_WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const siteUrl = getSiteUrl(req);
    const update = (await req.json().catch(() => ({}))) as TelegramUpdate;

    const callback = update.callback_query;
    if (callback?.message?.chat?.id) {
      const chatId = callback.message.chat.id;
      const data = String(callback.data || "").trim();

      if (!isKnownAdminChat(chatId)) {
        await tgAnswerCallback(callback.id, "Нет доступа");
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }

      if (data === "ADM_MENU") {
        await sendAdminMenu(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "ADM_ORDERS") {
        await sendAdminOrders(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "ADM_PROMOS") {
        await sendAdminPromos(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ADM_OPEN:")) {
        const orderId = String(data.slice("ADM_OPEN:".length) || "");
        await sendAdminOrderDetails(chatId, orderId, siteUrl);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ADM_SET:")) {
        const parts = data.split(":");
        const orderId = String(parts[1] || "");
        const status = String(parts[2] || "");
        await updateOrderStatusFromTelegram(chatId, orderId, status, siteUrl);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ADM_PROMO_OPEN:")) {
        const code = String(data.slice("ADM_PROMO_OPEN:".length) || "");
        await sendAdminPromoDetails(chatId, code);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ADM_PROMO_TOGGLE:")) {
        const parts = data.split(":");
        const code = String(parts[1] || "");
        const nextRaw = String(parts[2] || "");
        await setPromoActiveFromText(chatId, code, nextRaw === "1");
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ADM_PROMO_DEL:")) {
        const code = String(data.slice("ADM_PROMO_DEL:".length) || "");
        await deletePromoFromText(chatId, code);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      await tgAnswerCallback(callback.id);
      return NextResponse.json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg?.chat?.id;
    if (!chatId) return NextResponse.json({ ok: true });
    const text = String(msg?.text || "").trim();

    // ----------------------------------------------------------------------
    // SUPPORT CHAT: Intercept admin replies
    // ----------------------------------------------------------------------
    const replyToMsg = (msg as any)?.reply_to_message;

    // DEBUG: Если это реплай, но мы его не поймали, можно отправить админу структуру, 
    // чтобы понять в чем дело. Уберем после тестирования.
    if (replyToMsg) {
      const replyText = replyToMsg.text || replyToMsg.caption || "";
      const match = replyText.match(/#session_([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        const sessionId = match[1];
        try {
          // Push admin's reply to Redis
          const SUPPORT_CHAT_PREFIX = "support:chat:";
          const key = `${SUPPORT_CHAT_PREFIX}${sessionId}`;
          await redis.rpush(key, {
            id: crypto.randomUUID(),
            sender: "admin",
            text: text,
            timestamp: Date.now(),
          });

          await tgSend(chatId, "✅ Ответ отправлен пользователю.");
        } catch (e) {
          console.error("Error saving admin reply:", e);
          await tgSend(chatId, "❌ Ошибка при отправке ответа.");
        }
        return NextResponse.json({ ok: true });
      } else {
        // DEBUG
        await tgSend(chatId, "⚠️ Реплай получен, но #session_ ID не найден в тексте:\n" + String(replyText).slice(0, 100));
      }
    }
    // ----------------------------------------------------------------------

    if (/^\/myid(?:@\w+)?$/i.test(text)) {
      await tgSend(
        chatId,
        `chat_id: ${asChatIdString(chatId)}\nadmin_access: ${isKnownAdminChat(chatId) ? "yes" : "no"}`
      );
      return NextResponse.json({ ok: true });
    }

    if (/^\/start(?:@\w+)?$/i.test(text) || /^\/admin(?:@\w+)?$/i.test(text)) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await sendAdminMenu(chatId);
      return NextResponse.json({ ok: true });
    }

    const orderMatch = text.match(/^\/order(?:@\w+)?\s+(.+)$/i);
    if (orderMatch?.[1]) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await sendAdminOrderDetails(chatId, orderMatch[1], siteUrl);
      return NextResponse.json({ ok: true });
    }

    const promoCreateMatch = text.match(/^\/promo(?:@\w+)?\s+([A-Z0-9_-]{3,32})\s+([a-zA-Z%₽]+)\s+(\d{1,6})$/i);
    if (promoCreateMatch) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await upsertPromoFromText(chatId, promoCreateMatch[1], promoCreateMatch[2], promoCreateMatch[3]);
      return NextResponse.json({ ok: true });
    }

    const promosListMatch = text.match(/^\/promos(?:@\w+)?$/i);
    if (promosListMatch) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await sendAdminPromos(chatId);
      return NextResponse.json({ ok: true });
    }

    const promoOnMatch = text.match(/^\/promo_on(?:@\w+)?\s+([A-Z0-9_-]{3,32})$/i);
    if (promoOnMatch) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await setPromoActiveFromText(chatId, promoOnMatch[1], true);
      return NextResponse.json({ ok: true });
    }

    const promoOffMatch = text.match(/^\/promo_off(?:@\w+)?\s+([A-Z0-9_-]{3,32})$/i);
    if (promoOffMatch) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await setPromoActiveFromText(chatId, promoOffMatch[1], false);
      return NextResponse.json({ ok: true });
    }

    const promoDeleteMatch = text.match(/^\/promo_del(?:@\w+)?\s+([A-Z0-9_-]{3,32})$/i);
    if (promoDeleteMatch) {
      if (!isKnownAdminChat(chatId)) {
        await tgSend(chatId, denyText(chatId));
        return NextResponse.json({ ok: true });
      }
      await deletePromoFromText(chatId, promoDeleteMatch[1]);
      return NextResponse.json({ ok: true });
    }

    if (!isKnownAdminChat(chatId)) {
      await tgSend(chatId, denyText(chatId));
      return NextResponse.json({ ok: true });
    }

    await tgSend(
      chatId,
      [
        "Используйте:",
        "/admin",
        "/myid",
        "/promos",
        "/promo CODE percent|fixed VALUE",
        "/promo_on CODE",
        "/promo_off CODE",
        "/promo_del CODE",
        "",
        "DEBUG INFO PAYLOAD:",
        JSON.stringify(update).slice(0, 2000),
      ].join("\n")
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("TELEGRAM_ADMIN_WEBHOOK_ERROR:", error);
    return NextResponse.json({ ok: true });
  }
}
