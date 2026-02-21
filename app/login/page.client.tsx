"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Reveal } from "@/components/Reveal";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextPathRaw = searchParams.get("next");
  const nextPath =
    nextPathRaw && nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/account";

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

      if (data?.devCode) setHint(`DEV-код: ${data.devCode}`);
      if (data?.channel === "telegram_gateway") {
        setHint((prev) => prev ?? "Код отправлен в Telegram по номеру телефона");
      }
      if (data?.channel === "sms") {
        setHint((prev) => prev ?? "Код отправлен по SMS");
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Ошибка сети");
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
    } catch (verifyError: unknown) {
      setError(verifyError instanceof Error ? verifyError.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <Reveal>
        <div>
          <div className="text-sm text-black/60">Личный кабинет</div>
          <div className="text-2xl font-semibold">Вход по телефону</div>
        </div>
      </Reveal>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-3 rounded-xl text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {hint ? (
        <Reveal delay={0.1}>
          <div className="border border-black/10 bg-white/50 p-3 rounded-xl text-sm text-black/70">
            {hint}
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={0.2}>
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
            <button
              onClick={request}
              disabled={loading || phone.trim().length < 10}
              className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-white/70 disabled:opacity-50"
              type="button"
            >
              Получить код
            </button>
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
      </Reveal>
    </div>
  );
}
