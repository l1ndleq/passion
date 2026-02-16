"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { getUserProfile, mergeUserProfile } from "@/app/lib/userProfile";

type CheckoutForm = {
  name: string;
  phone: string;
  telegram?: string;
  city?: string;
  address?: string;
  comment?: string;

  // ✅ MVP ПВЗ
  pvzCity?: string;
  pvzAddress?: string;
  pvzCode?: string;
};

type Delivery = {
  provider: "cdek";
  type: "pvz";
  pvz: {
    city?: string;
    address?: string;
    code?: string;
  };
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
    pvzCity: "",
    pvzAddress: "",
    pvzCode: "",
  });

  // ✅ согласие на обработку ПД
  const [agree, setAgree] = useState(false);

  const lastLoadedDigitsRef = useRef<string>("");

  useEffect(() => {
    const raw = form.phone || "";
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 10) return;

    const t = setTimeout(async () => {
      if (lastLoadedDigitsRef.current === digits) return;

      try {
        const r = await fetch(`/api/profile?phone=${encodeURIComponent(form.phone)}`);
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok || !j?.profile) return;

        lastLoadedDigitsRef.current = digits;

        const p = j.profile as {
          name?: string;
          telegram?: string | null;
          city?: string;
          address?: string;
        };

        setForm((prev) => ({
          ...prev,
          name: prev.name || p.name || "",
          telegram: prev.telegram || (p.telegram || "") || "",
          city: prev.city || p.city || "",
          address: prev.address || p.address || "",
          pvzCity: prev.pvzCity || p.city || "",
        }));
      } catch (e) {
        console.warn("profile autofill failed", e);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [form.phone]);

  useEffect(() => {
    const p = getUserProfile();
    if (!p) return;

    setForm((prev) => ({
      ...prev,
      name: prev.name || p.name || "",
      phone: prev.phone || p.phone || "",
      telegram: prev.telegram || p.telegram || "",
      city: prev.city || p.city || "",
      address: prev.address || p.address || "",
      pvzCity: prev.pvzCity || p.city || "",
    }));
  }, []);

  const [loadingMe, setLoadingMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCartEmpty = useMemo(() => !items || items.length === 0, [items]);

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
          pvzCity: me.city ?? prev.pvzCity,
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

    // ✅ ПВЗ обязателен
    if (!String(form.pvzCity || "").trim()) return "Укажите город для ПВЗ";
    if (!String(form.pvzAddress || "").trim()) return "Укажите адрес/название ПВЗ";

    // ✅ согласие на ПД
    if (!agree) return "Необходимо согласие на обработку персональных данных";

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);

    const delivery: Delivery = {
      provider: "cdek",
      type: "pvz",
      pvz: {
        city: String(form.pvzCity || "").trim(),
        address: String(form.pvzAddress || "").trim(),
        code: String(form.pvzCode || "").trim() || undefined,
      },
    };

    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            telegram: (form.telegram || "").trim() || null,
            city: (form.city || "").trim(),
            address: (form.address || "").trim(),
            message: (form.comment || "").trim(),
          },
          items: items.map((i) => ({
            id: i.id,
            title: i.name,
            price: i.price,
            qty: i.qty,
            image: i.image,
          })),
          totalPrice: total,
          delivery,
          // можно логировать факт согласия:
          consent: { personalData: true, at: Date.now() },
        }),
      });

      mergeUserProfile({
        name: form.name,
        phone: form.phone,
        telegram: form.telegram,
        city: form.city,
        address: form.address,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Не удалось создать заказ");

      clearCart();

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
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Телефон *"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              disabled={submitting}
            />

            <input
              className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Telegram (необязательно)"
              value={form.telegram || ""}
              onChange={(e) => setField("telegram", e.target.value)}
              disabled={submitting}
            />

            {/* ✅ Блок ПВЗ */}
            <div className="mt-2 rounded-2xl border border-neutral-200 p-4">
              <div className="text-sm font-medium">Доставка: СДЭК (ПВЗ)</div>
              <div className="mt-1 text-xs text-neutral-500">
                Пока без автоматического API: укажи ПВЗ, мы оформим отправку вручную.
              </div>

              <div className="mt-3 grid gap-3">
                <input
                  className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
                  placeholder="Город ПВЗ *"
                  value={form.pvzCity || ""}
                  onChange={(e) => setField("pvzCity", e.target.value)}
                  disabled={submitting}
                />
                <input
                  className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
                  placeholder="Адрес/название ПВЗ *"
                  value={form.pvzAddress || ""}
                  onChange={(e) => setField("pvzAddress", e.target.value)}
                  disabled={submitting}
                />
                <input
                  className="h-12 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-400"
                  placeholder="Код ПВЗ (если есть)"
                  value={form.pvzCode || ""}
                  onChange={(e) => setField("pvzCode", e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <textarea
              className="min-h-[120px] rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="Комментарий к заказу"
              value={form.comment || ""}
              onChange={(e) => setField("comment", e.target.value)}
              disabled={submitting}
            />

            {/* ✅ Согласие на обработку ПД */}
            <label className="mt-2 flex items-start gap-3 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 accent-black"
                disabled={submitting}
              />
              <span>
                Я даю согласие на обработку персональных данных в соответствии с{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:opacity-70"
                >
                  Политикой конфиденциальности
                </a>
                .
              </span>
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !agree}
              className="mt-2 h-12 rounded-full bg-black text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Оформляем..." : "Перейти к оплате"}
            </button>

            <div className="text-center text-xs text-neutral-500">
              {loadingMe ? "Загружаем данные…" : "После оплаты вы будете перенаправлены на страницу подтверждения"}
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
