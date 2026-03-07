"use client";

import { useMemo, useState } from "react";

type WaitlistSource = "home" | "catalog";
type WaitlistChannel = "telegram" | "email";

type Props = {
  source: WaitlistSource;
  className?: string;
};

function normalizeTelegramClient(raw: string) {
  let value = String(raw || "").trim();
  value = value.replace(/^https?:\/\/t\.me\//i, "");
  value = value.replace(/^@+/, "");
  value = value.split(/[/?#]/, 1)[0] || "";
  return value ? `@${value}` : "";
}

export default function WaitlistLaunchButton({ source, className }: Props) {
  const [open, setOpen] = useState(false);
  const [trackedClick, setTrackedClick] = useState(false);
  const [channel, setChannel] = useState<WaitlistChannel>("telegram");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const placeholder = useMemo(
    () =>
      channel === "telegram"
        ? "@username или https://t.me/username"
        : "you@example.com",
    [channel]
  );

  async function trackClickOnce() {
    if (trackedClick) return;
    setTrackedClick(true);
    await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "click", source }),
    }).catch(() => null);
  }

  async function openModal() {
    await trackClickOnce();
    setOpen(true);
  }

  async function submit() {
    const raw = String(contact || "").trim();
    if (!raw) {
      setError("Введите Telegram username или email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setOkMessage(null);
    try {
      const payloadContact = channel === "telegram" ? normalizeTelegramClient(raw) : raw;
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          source,
          channel,
          contact: payloadContact,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        alreadySubscribed?: boolean;
        userNotified?: boolean;
      };

      if (!res.ok || !data?.ok) {
        if (data?.error === "CONTACT_INVALID") {
          setError(
            channel === "telegram"
              ? "Некорректный Telegram username. Пример: @my_username"
              : "Некорректный email."
          );
        } else if (data?.error === "CSRF_FORBIDDEN") {
          setError("Запрос заблокирован защитой браузера. Обновите страницу и попробуйте снова.");
        } else if (data?.error === "SOURCE_INVALID" || data?.error === "CHANNEL_INVALID") {
          setError("Внутренняя ошибка формы. Перезагрузите страницу.");
        } else if (data?.error === "WAITLIST_FAILED") {
          setError("Сервис ожидания временно недоступен. Попробуйте чуть позже.");
        } else {
          const code = String(data?.error || "").trim();
          setError(
            code
              ? `Не удалось сохранить заявку (${code}). Попробуйте еще раз.`
              : `Не удалось сохранить заявку (HTTP ${res.status}). Попробуйте еще раз.`
          );
        }
        return;
      }

      const baseMessage = data.alreadySubscribed
        ? "Вы уже в списке. Мы напомним о старте продаж."
        : "Готово. Мы сообщим, когда продажи откроются.";
      if (channel === "telegram" && !data.userNotified) {
        setOkMessage(
          `${baseMessage} Если бот еще не написал вам, отправьте login-боту /start или любое сообщение.`
        );
      } else {
        setOkMessage(baseMessage);
      }
      setContact("");
    } catch {
      setError("Не удалось сохранить заявку. Попробуйте еще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ||
          "rounded-full border border-black/20 px-6 py-3 text-sm tracking-wide uppercase hover:border-black/35 transition"
        }
      >
        Жду начала продаж
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-black/10 bg-[#fbf7f3] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/50">
                  PASSION / WAITLIST
                </div>
                <h3 className="mt-2 text-xl font-medium text-black/90">Жду начала продаж</h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/60 hover:border-black/30 hover:text-black"
              >
                Закрыть
              </button>
            </div>

            <p className="mt-3 text-sm text-black/65">
              Оставьте Telegram или email, и мы отправим уведомление в день старта.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/70 p-1">
              <button
                type="button"
                onClick={() => setChannel("telegram")}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  channel === "telegram" ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
                }`}
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  channel === "email" ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
                }`}
              >
                Email
              </button>
            </div>

            <input
              className="mt-3 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-black/35"
              placeholder={placeholder}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={submitting}
            />

            {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
            {okMessage ? <div className="mt-2 text-xs text-emerald-700">{okMessage}</div> : null}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-4 h-11 w-full rounded-xl bg-black text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Отправляем..." : "Получить уведомление"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
