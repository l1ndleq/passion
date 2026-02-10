import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { Telegraf, Markup } from "telegraf";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL!;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN!; // https://xxx.onrender.com (без / в конце)
const WEBHOOK_PATH_RAW = process.env.WEBHOOK_PATH || "/telegram/webhook";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const PORT = Number(process.env.PORT || 3001);

if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");
if (!PUBLIC_SITE_URL) throw new Error("PUBLIC_SITE_URL missing");
if (!WEBHOOK_DOMAIN) throw new Error("WEBHOOK_DOMAIN missing");
if (!process.env.UPSTASH_REDIS_REST_URL) throw new Error("UPSTASH_REDIS_REST_URL missing");
if (!process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error("UPSTASH_REDIS_REST_TOKEN missing");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function normalizePhone(raw: string) {
  let s = String(raw || "").trim().replace(/[^\d+]/g, "");

  // RU нормализация к +7, чтобы сайт/бот совпадали по ключам
  if (s.startsWith("8") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("7") && s.length === 11) s = "+7" + s.slice(1);
  if (s.startsWith("9") && s.length === 10) s = "+7" + s;

  return s;
}

function phoneDigits(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

async function linkPhoneToChat(phoneRaw: string, chatId: number) {
  const phone = normalizePhone(phoneRaw);
  const digits = phoneDigits(phone);

  // пишем сразу 2 ключа: с + и без + (чтобы никогда не промахнуться)
  await redis.set(`tg:phone:${phone}`, chatId);
  await redis.set(`tg:phone:${digits}`, chatId);

  await redis.set(`tg:chat:${chatId}`, phone);
}

const bot = new Telegraf(BOT_TOKEN);

// /start и deep-link параметры
bot.start(async (ctx) => {
  const text = ctx.message?.text || "";
  const parts = text.split(" ");
  const startParam = parts[1] || ""; // /start <param>

  // 1) Если это привязка: /start bind_<token>
  if (startParam.startsWith("bind_")) {
    const token = startParam.slice("bind_".length);

    const phone = await redis.get<string>(`bind:${token}`);
    if (!phone) {
      await ctx.reply(
        "Ссылка привязки устарела. Открой /account → Привязать Telegram ещё раз."
      );
      return;
    }

    const chatId = ctx.chat.id;
    await linkPhoneToChat(phone, chatId);

    // одноразовый токен
    await redis.del(`bind:${token}`);

    await ctx.reply(
      `✅ Готово! Номер ${normalizePhone(phone)} привязан.\nТеперь коды входа будут приходить сюда.`
    );
    return;
  }

  // 2) Обычный старт: покажем кнопку "Войти"
  await ctx.reply(
    "👋 Добро пожаловать в Passion.\n\nНажми кнопку ниже, чтобы войти в личный кабинет.",
    Markup.inlineKeyboard([
      Markup.button.url("🔐 Войти на сайт", `${PUBLIC_SITE_URL}/login?from=telegram`),
      Markup.button.callback("📎 Привязать номер Telegram", "ASK_CONTACT"),
    ])
  );
});

// Кнопка: запросить контакт
bot.action("ASK_CONTACT", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Чтобы привязать номер, отправь контакт кнопкой ниже:",
    Markup.keyboard([[Markup.button.contactRequest("📱 Поделиться номером")]])
      .oneTime()
      .resize()
  );
});

// Получаем контакт
bot.on("contact", async (ctx) => {
  const contact = ctx.message.contact;
  const phone = normalizePhone(contact.phone_number);
  const chatId = ctx.chat.id;

  if (!phone || phoneDigits(phone).length < 10) {
    await ctx.reply("Не удалось прочитать номер. Попробуй ещё раз.");
    return;
  }

  await linkPhoneToChat(phone, chatId);

  // уберём клавиатуру
  await ctx.reply(
    `✅ Номер ${phone} привязан.\nТеперь коды входа будут приходить сюда.`,
    Markup.removeKeyboard()
  );

  await ctx.reply(
    "Открыть вход на сайт:",
    Markup.inlineKeyboard([
      Markup.button.url("🔐 Войти на сайт", `${PUBLIC_SITE_URL}/login?from=telegram`),
    ])
  );
});

// --------------------
// Express + Webhook
// --------------------
const app = express();
app.use(express.json());

// healthcheck
app.get("/", (_req: Request, res: Response) => res.status(200).send("OK"));

// нормализуем путь (на случай если в ENV без слэша)
const WEBHOOK_PATH = WEBHOOK_PATH_RAW.startsWith("/")
  ? WEBHOOK_PATH_RAW
  : `/${WEBHOOK_PATH_RAW}`;

// webhook handler (Telegram шлёт POST)
app.post(WEBHOOK_PATH, (req: Request, res: Response, next: NextFunction) => {
  if (WEBHOOK_SECRET) {
    const secret = req.header("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== WEBHOOK_SECRET) return res.status(401).send("Unauthorized");
  }
  return bot.webhookCallback(WEBHOOK_PATH)(req, res, next);
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
