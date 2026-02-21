import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

const SUPPORT_CHAT_PREFIX = "support:chat:";
const SUPPORT_CHAT_TTL_SECONDS = 60 * 60 * 24 * 7; // Храним историю неделю

export type ChatMessage = {
    id: string;
    sender: "user" | "admin";
    text: string;
    timestamp: number;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
        }

        const key = `${SUPPORT_CHAT_PREFIX}${sessionId}`;
        const messages = await redis.lrange<ChatMessage>(key, 0, -1);

        return NextResponse.json({ ok: true, messages: Array.isArray(messages) ? messages : [] });
    } catch (error) {
        console.error("Error fetching support chat:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_ADMIN_BOT_TOKEN;
        const CHAT_IDS_STR = process.env.TELEGRAM_CHAT_IDS || "";

        if (!BOT_TOKEN || !CHAT_IDS_STR) {
            console.error("Missing Telegram bot credentials for support chat.");
            return NextResponse.json(
                { ok: false, error: "Telegram bot not configured" },
                { status: 500 }
            );
        }

        const chatIds = CHAT_IDS_STR.split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        const body = await req.json();
        const { sessionId, name, contact, message } = body;

        if (!sessionId || !message) {
            return NextResponse.json(
                { ok: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Сохраняем сообщение пользователя в Redis
        const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: "user",
            text: message,
            timestamp: Date.now(),
        };

        const key = `${SUPPORT_CHAT_PREFIX}${sessionId}`;
        await redis.rpush(key, newMessage);
        await redis.expire(key, SUPPORT_CHAT_TTL_SECONDS); // Продлеваем жизнь чата

        // Формируем текст для Telegram (скрываем sessionId в начале сообщения тегом)
        const textPayload = [
            `#session_${sessionId}`,
            "💬 <b>Новое сообщение в чате поддержки!</b>",
            name ? `👤 <b>Имя:</b> ${name}` : "",
            contact ? `📞 <b>Контакт:</b> ${contact}` : "",
            "",
            `📝 <b>Пользователь:</b>`,
            message,
        ]
            .filter(Boolean)
            .join("\n");

        const promises = chatIds.map((chatId) =>
            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: textPayload,
                    parse_mode: "HTML",
                }),
            })
        );

        const results = await Promise.allSettled(promises);
        const hasSuccess = results.some(
            (res) => res.status === "fulfilled" && res.value.ok
        );

        if (hasSuccess) {
            return NextResponse.json({ ok: true, message: newMessage });
        } else {
            console.error("Failed to forward support message to any admins.", results);
            return NextResponse.json(
                { ok: false, error: "Failed to send message to Telegram" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error processing support message:", error);
        return NextResponse.json(
            { ok: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
