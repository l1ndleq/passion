"use client";

import { useState } from "react";
import { useCart } from "../cart-context";

const normalizePhone = (s: string) => String(s ?? "").replace(/[^\d+]/g, "").trim();

// простая проверка: 10–15 цифр
const isValidPhone = (raw: string) => {
  const p = normalizePhone(raw);
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // ✅ обязательный
  const [telegram, setTelegram] = useState(""); // ✅ опциональный

  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!items.length) {
      setError("Корзина пуста");
      return;
    }

    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    const telegramTrim = telegram.trim().replace(/^@/, "");

    if (!nameTrim) {
      setError("Укажите имя");
      return;
    }

    if (!phoneTrim) {
      setError("Укажите номер телефона");
      return;
    }

    if (!isValidPhone(phoneTrim)) {
      setError("Введите корректный номер телефона");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${window.location.origin}/api/pay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: nameTrim,
            phone: normalizePhone(phoneTrim), // ✅ нормализованный
            telegram: telegramTrim || null, // ✅ опционально
            city: city.trim(),
            address: address.trim(),
            message: message.trim(),
          },
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            qty: i.qty,
            image: i.image, // если есть
          })),
          totalPrice,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        // поддержка кодов ошибок из API
        if (data?.error === "NAME_REQUIRED") throw new Error("Укажите имя");
        if (data?.error === "PHONE_REQUIRED") throw new Error("Укажите номер телефона");
        if (data?.error === "PHONE_INVALID") throw new Error("Введите корректный номер телефона");

        throw new Error(data?.error || "Не удалось создать оплату");
      }

      if (!data?.paymentUrl || typeof data.paymentUrl !== "string") {
        throw new Error("paymentUrl не пришёл с сервера");
      }

      const url = data.paymentUrl.startsWith("http")
        ? data.paymentUrl
        : `${window.location.origin}${data.paymentUrl}`;

      window.location.assign(url);
    } catch (e: any) {
      setError(e?.message || "Ошибка оформления заказа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
        PASSION / CHECKOUT
      </div>

      <h1 className="mt-3 text-3xl leading-tight">Оформление заказа</h1>
      <div className="mt-2 text-xs opacity-60">BUILD: checkout-v5</div>

      {/* Корзина */}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border rounded-xl p-3"
          >
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs opacity-60">
                {item.qty} × {item.price} ₽
              </div>
            </div>
            <div className="text-sm font-semibold">{item.qty * item.price} ₽</div>
          </div>
        ))}

        <div className="flex justify-between pt-4 text-sm font-semibold">
          <div>Итого</div>
          <div>{totalPrice} ₽</div>
        </div>
      </div>

      {/* Форма */}
      <div className="mt-8 space-y-4">
        <input
          placeholder="Имя *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
          required
          autoComplete="name"
        />

        <input
          placeholder="Телефон *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
          required
          inputMode="tel"
          autoComplete="tel"
        />

        <input
          placeholder="Telegram (необязательно)"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
        />

        <input
          placeholder="Город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
        />

        <input
          placeholder="Адрес"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
        />

        <textarea
          placeholder="Комментарий к заказу"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
          rows={3}
        />
      </div>

      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-black text-white py-3 text-sm disabled:opacity-50"
      >
        {loading ? "Переход к оплате..." : "Перейти к оплате"}
      </button>

      <p className="mt-4 text-xs opacity-60 text-center">
        После оплаты вы будете перенаправлены на страницу подтверждения
      </p>
    </div>
  );
}
