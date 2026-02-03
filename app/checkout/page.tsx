"use client";

import { useState } from "react";
import { useCart } from "../cart-context";

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ чтобы видеть, что реально вернул /api/pay/create
  const [debug, setDebug] = useState<string>("");

  async function submit() {
    if (!items.length) {
      setError("Корзина пуста");
      return;
    }

    if (!name || !contact) {
      setError("Укажите имя и контакт");
      return;
    }

    setLoading(true);
    setError(null);
    setDebug("");

    try {
      const res = await fetch(`${window.location.origin}/api/pay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, contact, city, address, message },
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            qty: i.qty,
          })),
          totalPrice,
        }),
      });

      const data = await res.json().catch(() => null);

      // ✅ показываем на странице, даже если консоль очищается
      setDebug(JSON.stringify({ status: res.status, data }, null, 2));

      if (!res.ok || !data?.ok) {
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

      <div className="mt-2 text-xs opacity-60">BUILD: checkout-v4</div>

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
            <div className="text-sm font-semibold">
              {item.qty * item.price} ₽
            </div>
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
          placeholder="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
        />

        <input
          placeholder="Телефон / Telegram"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
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

      {debug && (
        <pre className="mt-4 text-xs whitespace-pre-wrap border rounded-xl p-3 opacity-80">
          {debug}
        </pre>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="mt-8 w-full rounded-full bg-black text-white py-3 text-sm disabled:opacity-50"
      >
        {loading ? "Переход к оплате..." : "Перейти к оплате"}
      </button>

      <p className="mt-4 text-xs opacity-60 text-center">
        После оплаты вы будете перенаправлены на страницу подтверждения
      </p>
    </div>
  );
}