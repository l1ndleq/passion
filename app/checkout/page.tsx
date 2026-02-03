"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../cart-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clear } = useCart();

  // чтобы избежать ситуации "корзина пустая" до гидрации localStorage
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const orderPreview = useMemo(() => {
    return items.map((i) => ({
      id: i.id,
      title: i.title,
      qty: i.qty,
      price: i.price,
      sum: i.qty * i.price,
    }));
  }, [items]);

  async function submit() {
    setStatus(null);

    if (!hydrated) return;

    if (!items.length) {
      setStatus("Корзина пустая. Добавь товары и вернись сюда.");
      return;
    }
    if (!name.trim() || !contact.trim()) {
      setStatus("Заполни имя и контакт.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order",
          customer: {
            name: name.trim(),
            contact: contact.trim(),
            city: city.trim(),
            address: address.trim(),
            message: message.trim(),
          },
          items, // {id,title,price,qty}
          totalPrice,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.results?.[0]?.data?.description || "Не удалось оформить заказ");
      }

      clear();
      router.push("/thank-you");
    } catch (e: any) {
      setStatus(e?.message || "Ошибка оформления");
    } finally {
      setLoading(false);
    }
  }

  // если не гидратировано — показываем лёгкий скелет
  if (!hydrated) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-sm opacity-70">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / CHECKOUT
          </div>
          <h1 className="mt-3 text-3xl leading-tight">Оформление</h1>
          <p className="mt-2 text-sm opacity-70">
            Telegram-уведомление отправится только после подтверждения заказа.
          </p>
        </div>

        <Link href="/cart" className="text-sm underline underline-offset-4">
          Назад в корзину
        </Link>
      </div>

      {/* заказ */}
      <div className="mt-6 rounded-2xl border p-5 bg-white/40">
        <div className="font-medium">Ваш заказ</div>

        {!items.length ? (
          <div className="mt-3 text-sm opacity-70">
            Корзина пустая. Перейди в{" "}
            <Link href="/products" className="underline underline-offset-4">
              продукты
            </Link>
            .
          </div>
        ) : (
          <div className="mt-3 text-sm opacity-80 space-y-1">
            {orderPreview.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4">
                <div>
                  {i.title} × {i.qty}
                </div>
                <div className="font-medium">{i.sum} ₽</div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t flex items-center justify-between">
              <div className="font-medium">Итого</div>
              <div className="font-semibold">{totalPrice} ₽</div>
            </div>
          </div>
        )}
      </div>

      {/* форма */}
      <div className="mt-6 grid gap-3">
        <input
          className="border rounded-xl p-3 bg-transparent"
          placeholder="Имя *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border rounded-xl p-3 bg-transparent"
          placeholder="Контакт (тел/telegram) *"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <input
          className="border rounded-xl p-3 bg-transparent"
          placeholder="Город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="border rounded-xl p-3 bg-transparent"
          placeholder="Адрес доставки"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <textarea
          className="border rounded-xl p-3 bg-transparent min-h-[120px]"
          placeholder="Комментарий к заказу"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {status && <div className="mt-4 p-3 border rounded-xl">{status}</div>}

      <button
        onClick={submit}
        disabled={loading || !items.length}
        className="mt-6 px-4 py-3 rounded-full bg-black text-white text-sm disabled:opacity-50"
      >
        {loading ? "Отправка..." : "Подтвердить заказ"}
      </button>

      <div className="mt-4 text-xs opacity-60">
        Нажимая «Подтвердить заказ», ты отправляешь заявку в Telegram менеджеру.
      </div>
    </div>
  );
}