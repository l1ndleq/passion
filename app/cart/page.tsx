"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { sanitizeImageSrc } from "@/app/lib/xss";

export default function CartPage() {
  const { items, removeItem, setQty, total, promoCode, setPromoCode } = useCart();
  const [promoInput, setPromoInput] = useState(promoCode || "");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoInfo, setPromoInfo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalWithDiscount, setTotalWithDiscount] = useState(total);

  function localizePromoError(code: string) {
    switch (code) {
      case "PROMO_INVALID":
        return "Промокод не найден или недействителен";
      case "PROMO_INACTIVE":
        return "Промокод отключен";
      case "PROMO_EXPIRED":
        return "Срок действия промокода истек";
      case "PROMO_USAGE_LIMIT":
        return "Лимит применений промокода исчерпан";
      default:
        return "Не удалось применить промокод";
    }
  }

  const previewPromo = useCallback(async (code: string) => {
    const res = await fetch("/api/promo/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promoCode: code || null,
        subtotalPrice: total,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data } as const;
  }, [total]);

  async function applyPromo() {
    setPromoError(null);
    setPromoInfo(null);

    const code = String(promoInput || "").trim().toUpperCase();
    if (!code) {
      setPromoCode(null);
      setDiscountAmount(0);
      setTotalWithDiscount(total);
      setPromoInfo("Промокод убран");
      return;
    }

    setPromoLoading(true);
    try {
      const { res, data } = await previewPromo(code);
      if (!res.ok || !data?.ok) {
        setPromoCode(null);
        setDiscountAmount(0);
        setTotalWithDiscount(total);
        setPromoError(localizePromoError(String(data?.error || "")));
        return;
      }

      setPromoCode(code);
      setDiscountAmount(Math.max(0, Number(data?.discountAmount || 0)));
      setTotalWithDiscount(Math.max(1, Number(data?.totalPrice || total)));
      setPromoInfo(`Промокод ${code} применен`);
    } catch {
      setPromoError("Ошибка сети при проверке промокода");
    } finally {
      setPromoLoading(false);
    }
  }

  useEffect(() => {
    setPromoInput(promoCode || "");
  }, [promoCode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!promoCode) {
        setDiscountAmount(0);
        setTotalWithDiscount(total);
        return;
      }

      try {
        const { res, data } = await previewPromo(promoCode);
        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setPromoCode(null);
          setDiscountAmount(0);
          setTotalWithDiscount(total);
          setPromoError(localizePromoError(String(data?.error || "")));
          return;
        }

        setDiscountAmount(Math.max(0, Number(data?.discountAmount || 0)));
        setTotalWithDiscount(Math.max(1, Number(data?.totalPrice || total)));
      } catch {
        if (cancelled) return;
        setDiscountAmount(0);
        setTotalWithDiscount(total);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [promoCode, previewPromo, total, setPromoCode]);

  if (!items.length) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border bg-white/60 p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border bg-white flex items-center justify-center">
            <span className="text-2xl">🛍️</span>
          </div>

          <h1 className="text-2xl font-semibold">В вашей корзине пока пусто</h1>
          <p className="mt-2 text-neutral-600">
            Добавьте средства из каталога — и они появятся здесь.
          </p>

          <div className="mt-6">
         <Link
  href="/products"
  className="inline-flex rounded-2xl bg-black px-6 py-3 text-white hover:opacity-90"
>
  Перейти к товарам
</Link>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Корзина</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Оплата будет доступна после запуска продаж
          </p>
        </div>

        <Link
          href="/"
          className="rounded-2xl border px-4 py-2.5 text-sm hover:bg-neutral-50"
        >
          ← Продолжить покупки
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <section className="space-y-3">
          {items.map((i) => {
            const safeImage = sanitizeImageSrc(i.image, "/images/placeholder-product.jpg");
            return (
              <div
                key={i.id}
                className="rounded-2xl border bg-white/60 backdrop-blur p-4 shadow-sm"
              >
                <div className="flex gap-4">
                {/* Image (если появится позже) */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-neutral-50">
                  <Image
                    src={safeImage}
                    alt={(i as any).title || (i as any).name || "Товар"}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold truncate">
                        {(i as any).title || (i as any).name}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {i.price} ₽ / шт
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(i.id)}
                      className="text-sm text-neutral-600 underline hover:opacity-70"
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {/* Qty */}
                    <div className="inline-flex items-center gap-2 rounded-2xl border bg-white px-2 py-1.5">
                      <button
                        onClick={() => setQty(i.id, i.qty - 1)}
                        disabled={i.qty <= 1}
                        className="h-9 w-9 rounded-xl border hover:bg-neutral-50 disabled:opacity-40"
                      >
                        −
                      </button>

                      <div className="w-10 text-center font-medium tabular-nums">
                        {i.qty}
                      </div>

                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="h-9 w-9 rounded-xl border hover:bg-neutral-50"
                      >
                        +
                      </button>
                    </div>

                    {/* Line total */}
                    <div className="text-lg font-semibold tabular-nums">
                      {i.price * i.qty} ₽
                    </div>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl border bg-white/60 backdrop-blur p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Итого</div>
              <div className="text-sm text-neutral-500">{items.length} поз.</div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Товары</span>
                <span className="tabular-nums">{total} ₽</span>
              </div>

              <div className="flex justify-between">
                <span>Скидка</span>
                <span className="tabular-nums">{discountAmount ? `−${discountAmount} ₽` : "0 ₽"}</span>
              </div>

              <div className="flex justify-between text-neutral-500">
                <span>Доставка</span>
                <span>рассчитаем позже</span>
              </div>

              <div className="my-3 h-px bg-neutral-200" />

              <div className="flex justify-between text-base font-semibold">
                <span>К оплате</span>
                <span className="tabular-nums">{totalWithDiscount} ₽</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs text-neutral-600">Промокод</label>
              <div className="flex gap-2">
                <input
                  className="h-11 flex-1 rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none focus:border-neutral-400"
                  placeholder="Например, WELCOME10"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  disabled={promoLoading}
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={promoLoading}
                  className="h-11 rounded-xl border border-black px-4 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
                >
                  {promoLoading ? "..." : "Применить"}
                </button>
              </div>
              {promoError ? (
                <div className="mt-2 text-xs text-red-600">{promoError}</div>
              ) : null}
              {!promoError && promoInfo ? (
                <div className="mt-2 text-xs text-emerald-700">{promoInfo}</div>
              ) : null}
            </div>

            <Link
              href="/checkout"
              className="mt-5 block w-full rounded-2xl bg-black px-5 py-3 text-center text-white hover:opacity-90"
            >
              Оформить заказ
            </Link>

            <p className="mt-3 text-xs text-neutral-500">
              Оплата будет доступна после официального запуска продаж
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
