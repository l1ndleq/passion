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

const TG_CART_PREFIX = "tg:cart:";
const TG_CART_TTL_SECONDS = 60 * 60 * 24 * 30;

type TelegramAuthState = {
  status?: "pending" | "ready";
  next?: string;
  phone?: string;
  createdAt?: number;
};

type ChatState = {
  type: "awaiting_order_id" | "awaiting_promo_code";
};

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
    from?: TelegramUser;
    contact?: { phone_number?: string; user_id?: number };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramUser;
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

type BotCart = {
  items: Array<{ id: string; qty: number }>;
  promoCode?: string | null;
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

function normalizePromoCode(raw: string) {
  const code = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return "";
  return code;
}

function extractStartPayload(text: string) {
  const match = String(text || "")
    .trim()
    .match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
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

function getProductById(id: string) {
  const needle = String(id || "").trim();
  return PRODUCTS.find((p) => p.id === needle) || null;
}

function menuReplyMarkup() {
  return {
    keyboard: [
      [{ text: "🛍 Каталог" }, { text: "🛒 Корзина" }],
      [{ text: "📦 Мои заказы" }, { text: "🔎 Найти заказ" }],
      [{ text: "👤 Профиль" }, { text: "🎟 Промокод" }],
      [{ text: "📱 Привязать номер" }],
      [{ text: "❓ Помощь" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
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

async function sendMainMenu(chatId: number | string) {
  await tgSend(
    chatId,
    "Главное меню Passion. Покупки в Telegram временно недоступны: можно смотреть каталог, корзину, профиль и заказы.",
    { reply_markup: menuReplyMarkup() }
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

function cartKey(chatId: number | string) {
  return `${TG_CART_PREFIX}${chatId}`;
}

async function readCart(chatId: number | string): Promise<BotCart> {
  const raw = await redis.get<BotCart>(cartKey(chatId));
  const items = Array.isArray(raw?.items)
    ? raw.items
      .map((x) => ({ id: String(x?.id || ""), qty: Number(x?.qty || 0) }))
      .filter((x) => x.id && Number.isFinite(x.qty) && x.qty > 0)
      .map((x) => ({ id: x.id, qty: Math.min(99, Math.floor(x.qty)) }))
    : [];
  const promoCode = normalizePromoCode(String(raw?.promoCode || ""));
  return { items, promoCode: promoCode || null };
}

async function writeCart(chatId: number | string, cart: BotCart) {
  await redis.set(cartKey(chatId), cart, { ex: TG_CART_TTL_SECONDS });
}

async function clearCart(chatId: number | string) {
  await redis.del(cartKey(chatId));
}

async function addToCart(chatId: number | string, productId: string, delta = 1) {
  const cart = await readCart(chatId);
  const id = String(productId || "").trim();
  if (!getProductById(id)) return cart;

  const idx = cart.items.findIndex((x) => x.id === id);
  if (idx === -1) {
    cart.items.push({ id, qty: Math.max(1, Math.floor(delta || 1)) });
  } else {
    cart.items[idx].qty = Math.min(99, Math.max(1, cart.items[idx].qty + delta));
  }

  await writeCart(chatId, cart);
  return cart;
}

async function setCartPromoCode(chatId: number | string, promoCode: string | null) {
  const cart = await readCart(chatId);
  const nextCode = normalizePromoCode(String(promoCode || ""));
  cart.promoCode = nextCode || null;
  await writeCart(chatId, cart);
  return cart;
}

function hydrateCart(cart: BotCart) {
  const items = cart.items
    .map((it) => {
      const p = getProductById(it.id);
      if (!p) return null;
      const qty = Math.max(1, Math.floor(Number(it.qty || 1)));
      return {
        id: p.id,
        title: p.title,
        price: Number(p.price || 0),
        qty,
        sum: Number(p.price || 0) * qty,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      title: string;
      price: number;
      qty: number;
      sum: number;
    }>;

  const total = items.reduce((acc, it) => acc + it.sum, 0);
  return { items, total };
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

async function sendProfile(chatId: number | string, from?: TelegramUser) {
  const digits = await getLinkedPhoneDigits(chatId);
  if (!digits) {
    await tgSend(chatId, "Профиль не привязан к номеру. Нажмите «📱 Привязать номер».");
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
  await tgSend(chatId, lines.join("\n"), { reply_markup: menuReplyMarkup() });
}

async function sendCatalog(chatId: number | string) {
  if (!PRODUCTS.length) {
    await tgSend(
      chatId,
      "🛍 Каталог скоро откроется. Продажи пока не начались.",
      { reply_markup: menuReplyMarkup() }
    );
    return;
  }

  const lines = ["🛍 Каталог", ""];
  for (const p of PRODUCTS) {
    lines.push(`• ${p.title} — ${formatMoney(p.price)} ₽`);
  }
  lines.push("");
  lines.push("Нажмите кнопку товара ниже, чтобы добавить в корзину.");

  const inlineKeyboard = PRODUCTS.map((p) => [
    {
      text: `➕ ${p.title} (${formatMoney(p.price)} ₽)`,
      callback_data: `CART_ADD:${p.id}`,
    },
  ]);
  inlineKeyboard.push([{ text: "🛒 Показать корзину", callback_data: "CART_SHOW" }]);

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

async function sendCart(chatId: number | string) {
  const cart = await readCart(chatId);
  const hydrated = hydrateCart(cart);

  if (!hydrated.items.length) {
    await tgSend(chatId, "🛒 Корзина пока пустая.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🛍 Открыть каталог", callback_data: "CATALOG" }]],
      },
    });
    return;
  }

  const lines = ["🛒 Ваша корзина", ""];
  for (const it of hydrated.items) {
    lines.push(`• ${it.title} × ${it.qty} — ${formatMoney(it.sum)} ₽`);
  }
  lines.push("");
  lines.push(`Итого: ${formatMoney(hydrated.total)} ₽`);
  lines.push(`Промокод: ${cart.promoCode ? cart.promoCode : "не задан"}`);

  const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = [
    [{ text: "➕ Добавить товары", callback_data: "CATALOG" }],
    [{ text: "🎟 Ввести промокод", callback_data: "PROMO_SET" }],
    [{ text: "🧹 Очистить корзину", callback_data: "CART_CLEAR" }],
  ];
  if (cart.promoCode) {
    inlineKeyboard.splice(2, 0, [{ text: "✖️ Убрать промокод", callback_data: "PROMO_CLEAR" }]);
  }

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
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
        [{ text: "Открыть на сайте (опц.)", url: orderUrl }],
        [{ text: "⬅️ К заказам", callback_data: "MY_ORDERS" }],
      ],
    },
  });
}

async function sendMyOrders(chatId: number | string) {
  const linkedDigits = await getLinkedPhoneDigits(chatId);
  if (!linkedDigits) {
    await tgSend(chatId, "Чтобы смотреть свои заказы, сначала привяжите номер телефона.");
    await requestContact(chatId);
    return;
  }

  const idsRaw = (await redis.lrange(`user:orders:${linkedDigits}`, 0, 9)) as unknown[];
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

  const inlineKeyboard = ownOrders.slice(0, 6).map((o) => {
    const id = normalizeOrderId(String(o.orderId || ""));
    return [{ text: `Открыть ${id}`, callback_data: `ORDER:${id}` }];
  });
  inlineKeyboard.push([{ text: "🔎 Найти по номеру", callback_data: "TRACK_ORDER" }]);

  await tgSend(chatId, lines.join("\n"), {
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

async function checkoutFromBot(chatId: number | string, siteUrl: string, user?: TelegramUser) {
  void siteUrl;
  void user;
  await tgSend(
    chatId,
    "Покупки через Telegram сейчас отключены. Заказы временно не оформляются в боте."
  );
}

async function sendHelp(chatId: number | string) {
  await tgSend(
    chatId,
    [
      "Управление ботом:",
      "• Кнопки снизу — основной способ.",
      "• Каталог — скоро откроется.",
      "• Корзина — проверить состав и промокод.",
      "• Промокод — добавить/заменить код скидки для корзины.",
      "• Мои заказы — список последних заказов.",
      "• Найти заказ — ввод номера заказа.",
      "",
      "Резервные команды:",
      "/menu /catalog /cart /promo CODE /orders /order P-XXXX /profile /help",
    ].join("\n"),
    { reply_markup: menuReplyMarkup() }
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

function textLooksLike(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword.toLowerCase());
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

      if (data === "CATALOG") {
        await sendCatalog(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("CART_ADD:")) {
        if (!PRODUCTS.length) {
          await tgAnswerCallback(callback.id, "Продажи пока не открыты");
          await tgSend(chatId, "Каталог пока закрыт. Мы сообщим о старте отдельно.");
          return NextResponse.json({ ok: true });
        }
        const productId = String(data.split(":")[1] || "").trim();
        const p = getProductById(productId);
        if (!p) {
          await tgAnswerCallback(callback.id, "Товар не найден");
          return NextResponse.json({ ok: true });
        }
        await addToCart(chatId, productId, 1);
        await tgAnswerCallback(callback.id, `Добавлено: ${p.title}`);
        return NextResponse.json({ ok: true });
      }

      if (data === "CART_SHOW") {
        await sendCart(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "CART_CLEAR") {
        await clearCart(chatId);
        await tgSend(chatId, "🧹 Корзина очищена.", { reply_markup: menuReplyMarkup() });
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "PROMO_SET") {
        await setChatState(chatId, { type: "awaiting_promo_code" });
        await tgSend(chatId, "Отправьте промокод одним сообщением. Например: WELCOME10", {
          reply_markup: menuReplyMarkup(),
        });
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "PROMO_CLEAR") {
        await setCartPromoCode(chatId, null);
        await tgSend(chatId, "Промокод удален из корзины.");
        await sendCart(chatId);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "CHECKOUT") {
        await checkoutFromBot(chatId, siteUrl, callback.from);
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data === "MY_ORDERS") {
        await sendMyOrders(chatId);
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
        await tgSend(chatId, "Отправьте номер заказа (пример: P-MLGLJ641).", {
          reply_markup: menuReplyMarkup(),
        });
        await tgAnswerCallback(callback.id);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ORDER:")) {
        const orderId = String(data.slice("ORDER:".length) || "");
        await sendOrderDetails(chatId, orderId, siteUrl);
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
        await requestContact(chatId, "Чтобы привязать Telegram к аккаунту, отправьте контакт.");
        return NextResponse.json({ ok: true });
      }

      await tgSend(
        chatId,
        "Добро пожаловать в Passion. В этом чате доступны каталог, корзина, профиль и заказы. Покупки в Telegram пока отключены.",
        { reply_markup: menuReplyMarkup() }
      );
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
          await tgSend(chatId, "✅ Готово! Возвращайтесь на сайт: вход выполнится автоматически.");
          await sendMainMenu(chatId);
          return NextResponse.json({ ok: true });
        }
      }

      await tgSend(chatId, `✅ Номер ${binding.phone} привязан.`, {
        reply_markup: menuReplyMarkup(),
      });
      await sendMainMenu(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/menu(?:@\w+)?$/i.test(text) || textLooksLike(text, "меню")) {
      await sendMainMenu(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/help(?:@\w+)?$/i.test(text) || textLooksLike(text, "помощ")) {
      await sendHelp(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/catalog(?:@\w+)?$/i.test(text) || textLooksLike(text, "каталог")) {
      await sendCatalog(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/cart(?:@\w+)?$/i.test(text) || textLooksLike(text, "корзин")) {
      await sendCart(chatId);
      return NextResponse.json({ ok: true });
    }

    const promoMatch = text.match(/^\/promo(?:@\w+)?(?:\s+(.+))?$/i);
    if (promoMatch) {
      const rawPromo = String(promoMatch[1] || "").trim();
      if (!rawPromo) {
        await setChatState(chatId, { type: "awaiting_promo_code" });
        await tgSend(chatId, "Отправьте промокод одним сообщением. Например: WELCOME10");
        return NextResponse.json({ ok: true });
      }
      if (/^(none|off|clear|нет|удалить)$/i.test(rawPromo)) {
        await setCartPromoCode(chatId, null);
        await tgSend(chatId, "Промокод удален.");
        await sendCart(chatId);
        return NextResponse.json({ ok: true });
      }
      const code = normalizePromoCode(rawPromo);
      if (!code) {
        await tgSend(chatId, "Некорректный формат промокода. Разрешены A-Z, 0-9, _ и -.");
        return NextResponse.json({ ok: true });
      }
      await setCartPromoCode(chatId, code);
      await tgSend(chatId, `Промокод ${code} сохранен. Применим его при оформлении.`);
      await sendCart(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/checkout(?:@\w+)?$/i.test(text) || textLooksLike(text, "оформ")) {
      await checkoutFromBot(chatId, siteUrl, msg?.from);
      return NextResponse.json({ ok: true });
    }

    if (/^\/orders(?:@\w+)?$/i.test(text) || textLooksLike(text, "мои заказы")) {
      await sendMyOrders(chatId);
      return NextResponse.json({ ok: true });
    }

    if (/^\/profile(?:@\w+)?$/i.test(text) || textLooksLike(text, "профил")) {
      await sendProfile(chatId, msg?.from);
      return NextResponse.json({ ok: true });
    }

    if (textLooksLike(text, "привязать") || textLooksLike(text, "номер")) {
      await requestContact(chatId, "Отправьте контакт кнопкой ниже.");
      return NextResponse.json({ ok: true });
    }

    if (textLooksLike(text, "промокод") || textLooksLike(text, "промо")) {
      await setChatState(chatId, { type: "awaiting_promo_code" });
      await tgSend(chatId, "Отправьте промокод одним сообщением. Например: WELCOME10");
      return NextResponse.json({ ok: true });
    }

    if (textLooksLike(text, "найти заказ")) {
      await setChatState(chatId, { type: "awaiting_order_id" });
      await tgSend(chatId, "Отправьте номер заказа (пример: P-MLGLJ641).", {
        reply_markup: menuReplyMarkup(),
      });
      return NextResponse.json({ ok: true });
    }

    const orderMatch = text.match(/^\/order(?:@\w+)?\s+(.+)$/i);
    if (orderMatch?.[1]) {
      await sendOrderDetails(chatId, orderMatch[1], siteUrl);
      return NextResponse.json({ ok: true });
    }

    const chatState = await getChatState(chatId);
    if (chatState?.type === "awaiting_promo_code") {
      await setChatState(chatId, null);
      const code = normalizePromoCode(text);
      if (!code) {
        await tgSend(chatId, "Некорректный формат промокода. Разрешены A-Z, 0-9, _ и -.");
        return NextResponse.json({ ok: true });
      }
      await setCartPromoCode(chatId, code);
      await tgSend(chatId, `Промокод ${code} сохранен. Применим его при оформлении.`);
      await sendCart(chatId);
      return NextResponse.json({ ok: true });
    }

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

    await tgSend(chatId, "Не понял запрос. Используйте кнопки снизу или отправьте /menu.", {
      reply_markup: menuReplyMarkup(),
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("TELEGRAM_WEBHOOK_ERROR:", error);
    return NextResponse.json({ ok: true });
  }
}
