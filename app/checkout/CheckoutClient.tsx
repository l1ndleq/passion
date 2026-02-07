"use client";

import { useState } from "react";

type CheckoutClientProps = {
  items: any[];
  totalPrice: number;
};

type FormState = {
  name: string;
  phone: string;
  telegram: string; // optional
};

const normalizePhone = (s: string) => s.replace(/[^\d+]/g, "").trim();

// простая проверка “похоже на номер”: 10–15 цифр (международный формат)
const isValidPhone = (raw: string) => {
  const p = normalizePhone(raw);
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

export default function CheckoutClient({ items, totalPrice }: CheckoutClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    telegram: "",
  });

  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    // убираем ошибку поля при вводе
    if (name === "name" || name === "phone") {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const phone = form.phone.trim();
    const telegram = form.telegram.trim(); // optional

    // client validation
    const nextErrors: { name?: string; phone?: string } = {};
    if (!name) nextErrors.name = "Введите имя";
    if (!phone) nextErrors.phone = "Введите номер телефона";
    else if (!isValidPhone(phone)) nextErrors.phone = "Введите корректный номер телефона";

    if (nextErrors.name || nextErrors.phone) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          totalPrice,
          customer: {
            name,
            phone: normalizePhone(phone),
            telegram: telegram || null, // опционально
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.paymentUrl) {
        // если сервер вернул код ошибки полей — показываем нормальный текст
        if (data?.error === "NAME_REQUIRED") {
          setFieldErrors((p) => ({ ...p, name: "Введите имя" }));
          return;
        }
        if (data?.error === "PHONE_REQUIRED") {
          setFieldErrors((p) => ({ ...p, phone: "Введите номер телефона" }));
          return;
        }
        if (data?.error === "PHONE_INVALID") {
          setFieldErrors((p) => ({ ...p, phone: "Введите корректный номер телефона" }));
          return;
        }

        throw new Error(data?.error || "Не удалось создать оплату");
      }

      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setError(err?.message || "Ошибка оплаты");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Имя (обязательное) */}
      <div>
        <label className="mb-1 block text-sm text-neutral-700">Имя</label>
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          required
          autoComplete="name"
          placeholder="Например, Олег"
          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        {fieldErrors.name ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
        ) : null}
      </div>

      {/* Телефон (обязательный) */}
      <div>
        <label className="mb-1 block text-sm text-neutral-700">Телефон</label>
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="+31 6 1234 5678"
          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        {fieldErrors.phone ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
        ) : null}
      </div>

      {/* Telegram (опционально) */}
      <div>
        <label className="mb-1 block text-sm text-neutral-700">Telegram (необязательно)</label>
        <input
          name="telegram"
          value={form.telegram}
          onChange={onChange}
          placeholder="@username"
          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Если хотите — укажем его для связи. Можно оставить пустым.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-black px-5 py-3 text-sm text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Загрузка..." : "Перейти к оплате"}
      </button>
    </form>
  );
}
