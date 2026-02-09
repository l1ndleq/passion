import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

export async function POST(req: Request) {
  try {
    // ✅ надёжно получаем orderId из URL
    const pathname = new URL(req.url).pathname; // /api/admin/orders/P-MLFI29FC/status
    const parts = pathname.split("/").filter(Boolean);
    const orderId = (parts[parts.length - 2] || "").trim(); // <- предпоследний сегмент

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "").trim();

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "STATUS_REQUIRED" },
        { status: 400 }
      );
    }

    const key = `order:${orderId}`;
    const order = await redis.get<any>(key);

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = {
      ...order,
      status,
      updatedAt: Date.now(),
    };

    await redis.set(key, updated);
    // ✅ уведомление в TG после успешного сохранения
await notifyTelegramStatusChange({
  orderId,
  status,
  totalPrice: updated.totalPrice,
  customerName: updated.customer?.name,
});
async function notifyTelegramStatusChange({
  orderId,
  status,
  totalPrice,
  customerName,
}: {
  orderId: string;
  status: string;
  totalPrice?: number;
  customerName?: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatIdsRaw) {
    // если нет переменных — просто молча выходим (не ломаем админку)
    return;
  }

  const chatIds = chatIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const text =
    `📦 <b>Статус заказа изменён</b>\n` +
    `Заказ: <code>${orderId}</code>\n` +
    `Новый статус: <b>${status}</b>\n` +
    (customerName ? `Клиент: ${escapeHtml(customerName)}\n` : "") +
    (typeof totalPrice === "number" ? `Сумма: ${totalPrice} ₽\n` : "");

  // отправляем во все чаты
  await Promise.all(
    chatIds.map(async (chatId) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      // если телега вернула ошибку — логируем в консоль сервера (Vercel/локально)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("TG sendMessage failed", { chatId, status: res.status, data });
      }
    })
  );
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}


    return NextResponse.json({ ok: true, order: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "STATUS_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
