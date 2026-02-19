"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TelegramPollResponse = {
  ok?: boolean;
  status?: "pending" | "authorized" | "expired";
  next?: string;
  error?: string;
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tgLoading, setTgLoading] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollBusyRef = useRef(false);

  const nextPathRaw = searchParams.get("next");
  const nextPath =
    nextPathRaw && nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/account";

  function stopTelegramPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollBusyRef.current = false;
  }

  useEffect(() => {
    return () => stopTelegramPolling();
  }, []);

  async function startTelegramLogin() {
    if (tgLoading) return;

    setTgLoading(true);
    setError(null);
    setHint(null);
    stopTelegramPolling();

    try {
      const res = await fetch("/api/auth/telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: nextPath }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.state || !data?.url) {
        setError(data?.error || `HTTP ${res.status}`);
        return;
      }

      window.open(String(data.url), "_blank", "noopener,noreferrer");
      setHint("Подтвердите номер в Телеграме. Ожидаем подтверждение...");

      const state = String(data.state);

      pollTimerRef.current = setInterval(async () => {
        if (pollBusyRef.current) return;
        pollBusyRef.current = true;

        try {
          const pollRes = await fetch("/api/auth/telegram/poll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state }),
          });

          const pollData = (await pollRes.json().catch(() => ({}))) as TelegramPollResponse;

          if (!pollRes.ok || !pollData?.ok) {
            stopTelegramPolling();
            setError(pollData?.error || `HTTP ${pollRes.status}`);
            return;
          }

          if (pollData.status === "authorized") {
            stopTelegramPolling();
            router.push(
              pollData.next && pollData.next.startsWith("/") && !pollData.next.startsWith("//")
                ? pollData.next
                : nextPath
            );
            router.refresh();
            return;
          }

          if (pollData.status === "expired") {
            stopTelegramPolling();
            setHint(null);
            setError("Ссылка входа устарела. Нажмите кнопку входа через Телеграм снова.");
          }
        } catch {
          stopTelegramPolling();
          setError("Ошибка сети");
        } finally {
          pollBusyRef.current = false;
        }
      }, 2000);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка сети");
    } finally {
      setTgLoading(false);
    }
  }

  async function request() {
    setLoading(true);
    setError(null);
    setHint(null);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`);
        return;
      }

      setStage("code");

      // DEV: покажем код, чтобы тестить без SMS/TG
      if (data?.devCode) setHint(`DEV-код: ${data.devCode}`);
      if (data?.channel === "telegram") setHint((prev) => prev ?? "Код отправлен в Телеграм");
      if (data?.channel === "sms") setHint((prev) => prev ?? "Код отправлен по SMS");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div>
        <div className="text-sm text-black/60">Личный кабинет</div>
        <div className="text-2xl font-semibold">Вход по телефону</div>
      </div>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-3 rounded-xl text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {hint ? (
        <div className="border border-black/10 bg-white/50 p-3 rounded-xl text-sm text-black/70">
          {hint}
        </div>
      ) : null}

      <div className="border border-black/10 rounded-2xl bg-white/40 p-4 space-y-3">
        <label className="block">
          <div className="text-xs text-black/50 mb-1">Телефон</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 999 123-45-67"
            className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-white/60 outline-none focus:ring-2 focus:ring-black/10"
            disabled={loading || stage === "code"}
          />
        </label>

        {stage === "code" ? (
          <label className="block">
            <div className="text-xs text-black/50 mb-1">Код</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-white/60 outline-none focus:ring-2 focus:ring-black/10"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") verify();
              }}
            />
          </label>
        ) : null}

        {stage === "phone" ? (
          <>
            <button
              onClick={request}
              disabled={loading || phone.trim().length < 10}
              className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-white/70 disabled:opacity-50"
              type="button"
            >
              Получить код
            </button>

            <button
              onClick={startTelegramLogin}
              disabled={loading || tgLoading}
              className="tg-btn mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm disabled:opacity-60"
              type="button"
            >
              <span className="tg-btn__icon" aria-hidden="true">✈</span>
              {tgLoading ? "Открываем Телеграм..." : "Войти через Телеграм"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={verify}
              disabled={loading || code.trim().length < 4}
              className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-white/70 disabled:opacity-50"
              type="button"
            >
              Войти
            </button>

            <button
              onClick={() => {
                setStage("phone");
                setCode("");
                setHint(null);
              }}
              className="w-full text-xs text-black/50 hover:text-black transition"
              type="button"
            >
              Изменить номер
            </button>
          </>
        )}
      </div>
    </div>
  );
}
