import { NextResponse } from "next/server";

export const runtime = "nodejs";

function esc(v: any) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function getChatIds() {
  const fromList = (process.env.TELEGRAM_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const numbered = Object.keys(process.env)
    .filter((k) => /^TELEGRAM_CHAT_ID\d+$/.test(k))
    .map((k) => (process.env[k] || "").trim())
    .filter(Boolean);

  return Array.from(new Set([...fromList, ...numbered]));
}

const chatIds = getChatIds();


export async function POST(req: Request) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_IDS = getChatIds();

    if (!BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
    }
    if (!CHAT_IDS.length) {
      return NextResponse.json({ ok: false, error: "Missing TELEGRAM_CHAT_ID(s)" }, { status: 500 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    // Мы принимаем только заказы
    if (body?.type !== "order") {
      return NextResponse.json({ ok: false, error: "Unsupported request type" }, { status: 400 });
    }

    const customer = body?.customer ?? {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const totalPrice = Number(body?.totalPrice ?? 0);

    const name = customer?.name ?? "";
    const contact = customer?.contact ?? "";
    const city = customer?.city ?? "";
    const address = customer?.address ?? "";
    const message = customer?.message ?? "";

    if (!name || !contact) {
      return NextResponse.json({ ok: false, error: "Missing customer fields: name, contact" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
    }

    const lines = items.map((it: any, idx: number) => {
      const title = esc(it?.title);
      const qty = Number(it?.qty ?? 0);
      const price = Number(it?.price ?? 0);
      const sum = qty * price;
      return `${idx + 1}) ${title} × ${qty} — ${sum} ₽`;
    });

    const text =
      `🧴 <b>Passion — новый заказ</b>\n\n` +
      `👤 <b>Имя:</b> ${esc(name)}\n` +
      `📞 <b>Контакт:</b> ${esc(contact)}\n` +
      `🏙️ <b>Город:</b> ${esc(city)}\n` +
      `📦 <b>Адрес:</b> ${esc(address)}\n\n` +
      `🛒 <b>Состав заказа:</b>\n${lines.join("\n")}\n\n` +
      `💰 <b>Итого:</b> ${totalPrice} ₽\n\n` +
      `💬 <b>Комментарий:</b> ${esc(message)}`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const results = await Promise.all(
      CHAT_IDS.map(async (chat_id) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });

        const data = await res.json().catch(() => null);

        return {
          chat_id,
          ok: res.ok && data?.ok !== false,
          status: res.status,
          data,
        };
      })
    );

    const anyOk = results.some((r) => r.ok);

    return NextResponse.json({ ok: anyOk, results }, { status: anyOk ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed. Use POST." }, { status: 405 });
}