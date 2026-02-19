import "dotenv/config";
import express, { Request, Response } from "express";
import { Telegraf, Markup } from "telegraf";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL!;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN!;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/telegram/webhook";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const PORT = Number(process.env.PORT || 3001);
const TELEGRAM_AUTH_STATE_PREFIX = "tg:auth:state:";
const TELEGRAM_AUTH_CHAT_PREFIX = "tg:auth:chat:";
const TELEGRAM_AUTH_TTL_SECONDS = 10 * 60;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");
if (!PUBLIC_SITE_URL) throw new Error("PUBLIC_SITE_URL missing");
if (!WEBHOOK_DOMAIN) throw new Error("WEBHOOK_DOMAIN missing");
if (!process.env.UPSTASH_REDIS_REST_URL) throw new Error("UPSTASH_REDIS_REST_URL missing");
if (!process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error("UPSTASH_REDIS_REST_TOKEN missing");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type TelegramAuthState = {
  status?: "pending" | "ready";
  next?: string;
  phone?: string;
  createdAt?: number;
};

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");
  // RU -> +7
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;
  return s;
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

async function linkPhoneToChat(rawPhone: string, chatId: number) {
  const phone = normalizePhone(rawPhone);
  const digits = phoneDigits(phone);
  if (digits.length < 10) throw new Error("PHONE_INVALID");

  // ✅ ЕДИНЫЙ КЛЮЧ: tg:phone:<digits> -> chatId
  await redis.set(`tg:phone:${digits}`, chatId);
  await redis.set(`tg:chat:${chatId}`, digits);

  // (опционально) продублируем старый ключ на всякий случай
  await redis.set(`tg:phone_raw:${phone}`, chatId);

  return phone;
}

function parseAuthStateFromStartPayload(payloadRaw: string) {
  const payload = String(payloadRaw || "").trim();
  if (!payload.startsWith("auth_")) return null;
  const state = payload.slice(5);
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(state)) return null;
  return state;
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  const authState = parseAuthStateFromStartPayload((ctx as any).startPayload || "");
  if (authState) {
    const stateKey = `${TELEGRAM_AUTH_STATE_PREFIX}${authState}`;
    const stateData = await redis.get<TelegramAuthState>(stateKey);

    if (!stateData) {
      await ctx.reply("Ссылка для входа устарела. Вернитесь на сайт и нажмите кнопку входа через Телеграм снова.");
      return;
    }

    await redis.set(`${TELEGRAM_AUTH_CHAT_PREFIX}${ctx.chat.id}`, authState, {
      ex: TELEGRAM_AUTH_TTL_SECONDS,
    });

    await ctx.reply(
      "Чтобы войти, отправьте ваш номер кнопкой ниже:",
      Markup.keyboard([[Markup.button.contactRequest("📱 Поделиться номером")]])
        .oneTime()
        .resize()
    );
    return;
  }

  await ctx.reply(
    "👋 Добро пожаловать в Passion.\n\nНажми кнопку ниже, чтобы войти в личный кабинет.",
    Markup.inlineKeyboard([
      Markup.button.url("🔐 Войти на сайт", `${PUBLIC_SITE_URL}/login?from=telegram`),
      Markup.button.callback("📎 Привязать номер Telegram", "ASK_CONTACT"),
    ])
  );
});

bot.action("ASK_CONTACT", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Чтобы привязать номер, отправь контакт кнопкой ниже:",
    Markup.keyboard([[Markup.button.contactRequest("📱 Поделиться номером")]])
      .oneTime()
      .resize()
  );
});

bot.on("contact", async (ctx) => {
  const contact = ctx.message.contact;
  const chatId = ctx.chat.id;

  const fromId = ctx.message.from?.id;
  const contactUserId = contact?.user_id;
  if (fromId && contactUserId && Number(fromId) !== Number(contactUserId)) {
    await ctx.reply("Для безопасности отправьте ваш собственный контакт через кнопку.");
    return;
  }

  let normalizedPhone = "";
  try {
    normalizedPhone = await linkPhoneToChat(contact.phone_number, chatId);
  } catch {
    await ctx.reply("Не удалось прочитать номер. Попробуй ещё раз.");
    return;
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
          phone: normalizedPhone,
        },
        { ex: TELEGRAM_AUTH_TTL_SECONDS }
      );
      await redis.del(`${TELEGRAM_AUTH_CHAT_PREFIX}${chatId}`);
      await ctx.reply("✅ Готово! Возвращайтесь на сайт: вход выполнится автоматически.", Markup.removeKeyboard());
      return;
    }
  }

  await ctx.reply("✅ Номер привязан. Теперь коды входа будут приходить сюда.", Markup.removeKeyboard());
  await ctx.reply(
    "Открыть вход на сайт:",
    Markup.inlineKeyboard([Markup.button.url("🔐 Войти на сайт", `${PUBLIC_SITE_URL}/login?from=telegram`)])
  );
});

// ---- Express webhook ----
const app = express();
app.use(express.json());
app.get("/", (_req: Request, res: Response) => res.status(200).send("OK"));

app.post("/telegram/webhook", (req, res) => {
  // ✅ секрет проверяем быстро, ДО ответа
  if (WEBHOOK_SECRET) {
    const secret = req.header("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).send("Unauthorized");
    }
  }

  // ✅ СРАЗУ подтверждаем Telegram
  res.status(200).send("OK");

  // ✅ обработка апдейта после ответа
  bot.handleUpdate(req.body).catch((e) => {
    console.error("handleUpdate failed", e);
  });
});


async function start() {
  const domain = WEBHOOK_DOMAIN.replace(/\/+$/, "");
  const webhookURL = `${domain}${WEBHOOK_PATH}`;

  await bot.telegram.setWebhook(webhookURL, {
    secret_token: WEBHOOK_SECRET || undefined,
  });

  app.listen(PORT, () => {
    console.log("Bot webhook listening:", webhookURL);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
