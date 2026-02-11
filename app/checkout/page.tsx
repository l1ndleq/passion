"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";

type CheckoutForm = {
  name: string;
  phone: string;
  telegram?: string;
  city?: string;
  address?: string;
  comment?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    telegram: "",
    city: "",
    address: "",
    comment: "",
  });

  const [loadingMe, setLoadingMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCartEmpty = useMemo(() => !items || items.length === 0, [items]);

  // ✅ Автозаполнение из ЛК (если /api/me отдаёт профиль)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingMe(true);
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;

        const me = (await res.json()) as Partial<CheckoutForm>;
        if (cancelled) return;

        setForm((prev) => ({
          ...prev,
          name: me.name ?? prev.name,
          phone: me.phone ?? prev.phone,
          telegram: me.telegram ?? prev.telegram,
          city: me.city ?? prev.city,
          address: me.address ?? prev.address,
        }));
      } catch {
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Введите имя";
    if (!form.phone.trim()) return "Введите телефон";

    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) return "Телефон введён некорректно";

    if (isCartEmpty) return "Корзина пуста";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);

    try {
      const payload = {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          telegram: (form.telegram || "").trim() || undefined,
          city: (form.city || "").trim() || undefined,
          address: (form.address || "").trim() || undefined,
        },
        comment: (form.comment || "").trim() || undefined,

        // ✅ Корзина (под /api/pay/create)
    items: items.map((it) => ({
  id: it.id,
  name: it.name,
  price: it.price,
  quantity: it.qty, // 👈 ВАЖНО
})),
        total,
      };

      const res = await fetch("/api/pay/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer: {
      name: form.name,
      phone: form.phone,
      telegram: form.telegram || null,
      city: form.city || "",
      address: form.address || "",
      message: form.comment || "",
    },
    items: items.map((i) => ({
      id: i.id,
      title: i.title || i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
    })),
    totalPrice: total, // ← ВОТ ЭТО КРИТИЧНО
  }),
});


      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Не удалось создать заказ");
      }

      // ✅ Очистка корзины после заказа
      clearCart();

      // ✅ Редирект
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (data?.orderId) {
        router.push(`/order/${data.orderId}`);
        return;
      }

      throw new Error("Сервер не вернул paymentUrl или orderId");
    } catch (err: any) {
      setError(err?.message || "Ошибка оформления заказа");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Оформление заказа</h1>
        <div className="text-sm text-neutral-600">
          Итого: <span className="font-medium text-neutral-900">{total} ₽</span>
        </div>
      </div>

      {isCartEmpty ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="text-sm text-neutral-700">Корзина пуста.</div>
          <button
            className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
            onClick={() => router.push("/products")}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="grid gap-3">
            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Имя *"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              autoComplete="name"
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Телефон *"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              autoComplete="tel"
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Telegram (необязательно)"
              value={form.telegram || ""}
              onChange={(e) => setField("telegram", e.target.value)}
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Город"
              value={form.city || ""}
              onChange={(e) => setField("city", e.target.value)}
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Адрес"
              value={form.address || ""}
              onChange={(e) => setField("address", e.target.value)}
              disabled={submitting}
            />

            <textarea
              className="min-h-[120px] rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="Комментарий к заказу"
              value={form.comment || ""}
              onChange={(e) => setField("comment", e.target.value)}
              disabled={submitting}
            />

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-12 rounded-full bg-black text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Переходим к оплате..." : "Перейти к оплате"}
            </button>

            <div className="text-center text-xs text-neutral-500">
              {loadingMe
                ? "Загружаем данные из личного кабинета…"
                : "После оплаты вы будете перенаправлены на страницу подтверждения"}
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
