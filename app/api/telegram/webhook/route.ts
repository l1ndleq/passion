import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { PRODUCTS } from "@/app/lib/products";
import { buildOrderTrackingUrl } from "@/app/lib/orderAccess";

const BOT_TOKEN =
  String(process.env.TELEGRAM_LOGIN_BOT_TOKEN || "").trim() ||
  String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const IS_PROD = process.env.NODE_ENV === "production";

const TELEGRAM_AUTH_STATE_PREFIX = "tg:auth:state:";
const TELEGRAM_AUTH_CHAT_PREFIX = "tg:auth:chat:";
const TELEGRAM_AUTH_TTL_SECONDS = 10 * 60;

const TG_CHAT_STATE_PREFIX = "tg:chat_state:";
const TG_CHAT_STATE_TTL_SECONDS = 5 * 60;

type TelegramAuthState = {
  status?: "pending" | "ready";
  next?: string;
  phone?: string;
  createdAt?: number;
};

type ChatState = {
  type: "awaiting_order_id";
};

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
    from?: { id?: number; username?: string; first_name?: string; last_name?: string };
    contact?: { phone_number?: string; user_id?: number };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number; username?: string; first_name?: string; last_name?: string };
    message?: { chat?: { id?: number | string } };
  };
};

type StoredOrder = {
  orderId?: string;
  status?: string;
  createdAt?: number;
  totalPrice?: number;
  items?: Array<{ title?: string; id?: string; qty?: number; price?: number }>;
  customer?: {
    name?: string;
    phone?: string;
    telegram?: string | null;
  };
};

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (s.startsWith("8") && s.length === 11) s = `+7${s.slice(1)}`;
  if (s.startsWith("7") && s.length === 11) s = `+7${s.slice(1)}`;
  if (s.startsWith("9") && s.length === 10) s = `+7${s}`;
  return s;
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function extractStartPayload(text: string) {
  const match = String(text || "").trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return String(match?.[1] || "").trim();
}

function readAuthState(payload: string) {
  if (!payload.startsWith("auth_")) return null;
  const state = payload.slice(5);
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(state)) return null;
  return state;
}

function normalizeOrderId(raw: string) {
  return String(raw || "").trim().replace(/\s+/g, "").toUpperCase();
}

function isOrderIdValid(orderId: string) {
  return /^[A-Z0-9_-]{3,40}$/.test(orderId);
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
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => null);
}

async function tgSend(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>
) {
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

function mainMenuKeyboard(siteUrl: string) {
  return {
    inline_keyboard: [
      [
        { text: "🛍 Каталог", url: `${siteUrl}/products` },
        { text: "🛒 Корзина", url: `${siteUrl}/cart` },
      ],
      [
        { text: "💳 Оформить заказ", url: `${siteUrl}/checkout` },
        { text: "👤 Личный кабинет", url: `${siteUrl}/account` },
      ],
      [
        { text: "📦 Мои заказы", callback_data: "MY_ORDERS" },
        { text: "🔎 Найти заказ", callback_data: "TRACK_ORDER" },
      ],
      [
        { text: "📱 Привязать номер", callback_data: "ASK_CONTACT" },
        { text: "👤 Профиль", callback_data: "MY_PROFILE" },
      ],
    ],
  };
}

async function sendMainMenu(chatId: number | string, siteUrl: string) {
  await tgSend(
    chatId,
    "Главное меню Passion. Здесь можно открыть каталог, корзину, оформление и отслеживание заказов.",
    { reply_markup: mainMenuKeyboard(siteUrl) }
  );
}

async function requestContact(chatId: number | string, text?: string) {
  await tgSend(
    chatId,
    text || "Нажмите кнопку ниже и отправьте свой контакт.",
    {
      reply_markup: {
        keyboard: [[{ text: "Поделиться номером", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

async function savePhoneBinding(chatId: number | string, phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  const digits = phoneDigits(phone);
  if (!digits) return null;

  await redis.set(`tg:phone:${digits}`, Number(chatId));
  await redis.set(`tg:phone:${phone}`, Number(chatId));
  await redis.set(`tg:chat:${chatId}`, digits);

  return { phone, digits };
}

async function getLinkedPhoneDigits(chatId: number | string) {
  const value = await redis.get<string>(`tg:chat:${chatId}`);
  const digits = phoneDigits(String(value || ""));
  return digits || null;
}

async function sendProfile(chatId: number | string, from?: TelegramUpdate["message"]["from"]) {
  const digits = await getLinkedPhoneDigits(chatId);
  if (!digits) {
    await tgSend(chatId, "Профиль не привязан к номеру. Сначала нажмите «Привязать номер».");
    return;
  }

  const profile = await redis.get<{
    name?: string;
    phone?: string;
    city?: string;
    address?: string;
  }>(`user:profile:${digits}`);

  const username = String(from?.username || "").trim();
  const lines = [
    "👤 Профиль",
    `Телефон: ${profile?.phone || `+${digits}`}`,
    `Имя: ${profile?.name || "—"}`,
    `Город: ${profile?.city || "—"}`,
    `Адрес: ${profile?.address || "—"}`,
    `Telegram: ${username ? `@${username}` : "—"}`,
  ];
  await tgSend(chatId, lines.join("\n"));
}

async function sendCatalogPreview(chatId: number | string, siteUrl: string) {
  const lines = ["🛍 Каталог Passion", ""];
  for (const p of PRODUCTS.slice(0, 6)) {
    lines.push(`• ${p.title} — ${formatMoney(p.price)} ₽`);
  }
  lines.push("");
  lines.push("Полный каталог и оформление доступны по кнопкам ниже.");

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть каталог", url: `${siteUrl}/products` }],
        [
          { text: "Корзина", url: `${siteUrl}/cart` },
          { text: "Оформить", url: `${siteUrl}/checkout` },
        ],
      ],
    },
  });
}

async function sendOrderDetails(
  chatId: number | string,
  orderIdRaw: string,
  siteUrl: string
) {
  const orderId = normalizeOrderId(orderIdRaw);
  if (!isOrderIdValid(orderId)) {
    await tgSend(chatId, "Неверный номер заказа. Пример: P-MLGLJ641");
    return;
  }

  const linkedDigits = await getLinkedPhoneDigits(chatId);
  if (!linkedDigits) {
    await tgSend(chatId, "Чтобы открыть заказ, сначала привяжите номер телефона.");
    await requestContact(chatId);
    return;
  }

  const order = await redis.get<StoredOrder>(`order:${orderId}`);
  if (!order) {
    await tgSend(chatId, "Заказ не найден.");
    return;
  }

  const orderPhone = String(order.customer?.phone || "");
  const orderDigits = phoneDigits(orderPhone);
  if (!orderDigits || orderDigits !== linkedDigits) {
    await tgSend(chatId, "Доступ запрещен: этот заказ оформлен на другой номер.");
    return;
  }

  const lines = [
    `📦 Заказ ${orderId}`,
    `Статус: ${statusLabel(order.status)}`,
    `Сумма: ${formatMoney(Number(order.totalPrice || 0))} ₽`,
    `Создан: ${formatDate(order.createdAt)}`,
  ];

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    lines.push("");
    lines.push("Состав:");
    for (const it of items.slice(0, 8)) {
      const title = String(it.title || it.id || "Товар");
      const qty = Math.max(1, Number(it.qty || 1));
      lines.push(`• ${title} × ${qty}`);
    }
    if (items.length > 8) lines.push("• …");
  }

  const orderUrl = buildOrderTrackingUrl(siteUrl, orderId, orderPhone || linkedDigits);
  await tgSend(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть на сайте", url: orderUrl }],
        [{ text: "⬅️ Меню", callback_data: "MAIN_MENU" }],
      ],
    },
  });
}

async function sendMyOrders(chatId: number | string, siteUrl: string) {
  const linkedDigits = await getLinkedPhoneDigits(chatId);
  if (!linkedDigits) {
    await tgSend(chatId, "Чтобы смотреть свои заказы, сначала привяжите номер телефона.");
    await requestContact(chatId);
    return;
  }

  const idsRaw = await redis.lrange<string[]>(`user:orders:${linkedDigits}`, 0, 9);
  const ids = (Array.isArray(idsRaw) ? idsRaw : [])
    .map((x) => normalizeOrderId(String(x || "")))
    .filter(Boolean);

  if (!ids.length) {
    await tgSend(chatId, "Пока нет заказов для вашего номера.");
    return;
  }

  const ordersRaw = await redis.mget(...ids.map((id) => `order:${id}`));
  const orders = (Array.isArray(ordersRaw) ? ordersRaw : []).filter(Boolean) as StoredOrder[];

  const ownOrders = orders.filter((o) => {
    const digits = phoneDigits(String(o.customer?.phone || ""));
    return digits && digits === linkedDigits;
  });

  if (!ownOrders.length) {
    await tgSend(chatId, "Не удалось найти ваши заказы. Проверьте привязанный номер.");
    return;
  }

  const lines = ["📦 Ваши последние заказы", ""];
  for (const o of ownOrders.slice(0, 10)) {
    const orderId = normalizeOrderId(String(o.orderId || ""));
    const status = statusLabel(o.status);
    const sum = `${formatMoney(Number(o.totalPrice || 0))} ₽`;
    lines.push(`• ${orderId} — ${status} — ${sum}`);
  }
  lines.push("");
  lines.push("Чтобы открыть заказ: /order НОМЕР_ЗАКАЗА");

  const latest = ownOrders[0];
  const latestId = normalizeOrderId(String(latest.orderId || ""));
  const latestPhone = String(latest.customer?.phone || `+${linkedDigits}`);
  const latestOrderUrl = latestId
    ? buildOrderTrackingUrl(siteUrl, latestId, latestPhone)
    : `${siteUrl}/account`;

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть последний заказ", url: latestOrderUrl }],
        [{ text: "⬅️ Меню", callback_data: "MAIN_MENU" }],
      ],
    },
  });
}

async function sendHelp(chatId: number | string) {
  await tgSend(
    chatId,
    [
      "Доступные команды:",
      "/menu — главное меню",
      "/catalog — каталог",
      "/orders — мои заказы",
      "/order P-XXXX — открыть конкретный заказ",
      "/profile — профиль",
      "/help — помощь",
    ].join("\n")
  );
}

async function setChatState(chatId: number | string, state: ChatState | null) {
  const key = `${TG_CHAT_STATE_PREFIX}${chatId}`;
  if (!state) {
    await redis.del(key);
    return;
  }
  await redis.set(key, state, { ex: TG_CHAT_STATE_TTL_SECONDS });
}

async function getChatState(chatId: number | string) {
  return redis.get<ChatState>(`${TG_CHAT_STATE_PREFIX}${chatId}`);
}

export async function POST(req: Request) {
  try {
    if (IS_PROD && !WEBHOOK_SECRET) {
      console.error("TELEGRAM_WEBHOOK_SECRET is required in production");
      return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET_REQUIRED" }, { status: 500 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "LOGIN_BOT_TOKEN_MISSING" }, { status: 500 });
    }

    if (WEBHOOK_SECRET) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const siteUrl = getSiteUrl(req);
    const update = (await req.json().catch(() => ({}))) as TelegramUpdate;

    const callback = update.callback_query;
    if (callback?.message?.chat?.id) {
      const chatId = callback.message.chat.id;
      const data = String(callback.data || "").trim();

      if (data === "ASK_CONTACT") {
        await requestContact(chatId, "Чтобы пользоваться всеми функциями, привяжите номер телефона.");
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "MY_ORDERS") {
        await sendMyOrders(chatId, siteUrl);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "MY_PROFILE") {
        await sendProfile(chatId, callback.from);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "TRACK_ORDER") {
        await setChatState(chatId, { type: "awaiting_order_id" });
        await tgSend(chatId, "Отправьте номер заказа (пример: P-MLGLJ641).");
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "MAIN_MENU") {
        await sendMainMenu(chatId, siteUrl);
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

    if (text.startsWith("/start")) {
      const payload = extractStartPayload(text);
      const authState = readAuthState(payload);

      if (authState) {
        const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${authState}`;
        const stateData = await redis.get<TelegramAuthState>(stateKey);

        if (!stateData) {
          await tgSend(
            chatId,
            "Ссылка для входа устарела. Вернитесь на сайт и нажмите вход через Telegram снова."
          );
          return NextResponse.json({ ok: true });
        }

        await redis.set(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`, authState, {
          ex: TELEGRAM_AUTH_TTL_SECONDS,
        });
        await requestContact(chatId, "Для входа отправьте ваш номер кнопкой ниже.");
        return NextResponse.json({ ok: true });
      }

      if (payload === "bind_account") {
        await requestContact(chatId, "Чтобы привязать Telegram к вашему аккаунту, отправьте контакт.");
        return NextResponse.json({ ok: true });
      }

      await tgSend(
        chatId,
        "Добро пожаловать в Passion. Через этого бота можно смотреть заказы, профиль и открывать каталог/корзину/оформление.",
        { reply_markup: mainMenuKeyboard(siteUrl) }
      );
      await tgSend(chatId, "Для полного доступа привяжите номер: нажмите «📱 Привязать номер».");
      return NextResponse.json({ ok: true });
    }

    const contact = msg?.contact;
    if (contact?.phone_number) {
      const fromId = msg?.from?.id;
      const contactUserId = contact?.user_id;
      if (fromId && contactUserId && Number(fromId) !== Number(contactUserId)) {
        await tgSend(chatId, "Для безопасности отправьте свой собственный контакт через кнопку.");
        return NextResponse.json({ ok: true });
      }

      const binding = await savePhoneBinding(chatId, contact.phone_number);
      if (!binding) {
        await tgSend(chatId, "Не удалось распознать номер. Попробуйте еще раз.");
        return NextResponse.json({ ok: true });
      }

      const pendingState = await redis.get<string>(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`);
      if (pendingState) {
        const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${pendingState}`;
        const stateData = await redis.get<TelegramAuthState>(stateKey);

        if (stateData) {
          await redis.set(
            stateKey,
            {
              ...stateData,
              status: "ready",
              phone: binding.phone,
            },
            { ex: TELEGRAM_AUTH_TTL_SECONDS }
          );
          await redis.del(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`);
          await tgSend(chatId, "Готово! Возвращайтесь на сайт: вход выполнится автоматически.");
          await tgSend(chatId, "Клавиатура очищена.", { reply_markup: { remove_keyboard: true } });
          return NextResponse.json({ ok: true });
        }
      }

      await tgSend(chatId, `Готово! Номер ${binding.phone} привязан.`);
      await tgSend(chatId, "Теперь вам доступны профиль и заказы в боте.", {
        reply_markup: { remove_keyboard: true },
      });
      await sendMainMenu(chatId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    const orderMatch = text.match(/^\/order(?:@\w+)?\s+(.+)$/i);
    if (orderMatch?.[1]) {
      await sendOrderDetails(chatId, orderMatch[1], siteUrl);
      return NextResponse.json({ ok: true });
    }

    if (/^\/orders(?:@\w+)?$/i.test(text) || /^мои\s+заказы$/i.test(text)) {
      await sendMyOrders(chatId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    if (/^\/profile(?:@\w+)?$/i.test(text) || /^профиль$/i.test(text)) {
      await sendProfile(chatId, msg?.from);
      return NextResponse.json({ ok: true });
    }

    if (/^\/catalog(?:@\w+)?$/i.test(text) || /^каталог$/i.test(text)) {
      await sendCatalogPreview(chatId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    if (/^\/menu(?:@\w+)?$/i.test(text) || /^меню$/i.test(text)) {
      await sendMainMenu(chatId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    if (/^\/help(?:@\w+)?$/i.test(text) || /^помощь$/i.test(text)) {
      await sendHelp(chatId);
      return NextResponse.json({ ok: true });
    }

    const chatState = await getChatState(chatId);
    if (chatState?.type === "awaiting_order_id") {
      await setChatState(chatId, null);
      await sendOrderDetails(chatId, text, siteUrl);
      return NextResponse.json({ ok: true });
    }

    const maybeOrderId = normalizeOrderId(text);
    if (maybeOrderId.startsWith("P-") && isOrderIdValid(maybeOrderId)) {
      await sendOrderDetails(chatId, maybeOrderId, siteUrl);
      return NextResponse.json({ ok: true });
    }

    await tgSend(chatId, "Не понял команду. Отправьте /menu или /help.");
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("TELEGRAM_WEBHOOK_ERROR:", error);
    return NextResponse.json({ ok: true });
  }
}
