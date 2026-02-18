import Link from "next/link";
import { Suspense } from "react";
import ProductsGridClient from "@/components/ProductsGridClient";
import { PRODUCTS } from "@/app/lib/products";
import CartLinkClientOnly from "@/components/CartLinkClientOnly";

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / КАТАЛОГ
          </div>

          <h1 className="mt-3 text-4xl leading-tight">Продукты</h1>

          <p className="mt-3 max-w-xl text-sm opacity-70">
            Выбери продукт и добавь в корзину. Отправка в Телеграм происходит
            только при оформлении заказа.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <CartLinkClientOnly />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-10">
        <Suspense fallback={null}>
          <ProductsGridClient products={PRODUCTS} />
        </Suspense>
      </div>

      {/* Bottom info */}
      <div className="mt-12 rounded-3xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur">
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
          Доставка
        </div>

        <p className="mt-2 max-w-2xl text-sm opacity-70">
          Укажи город и адрес на странице оформления заказа — мы подтвердим
          стоимость и сроки.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full
                       bg-neutral-900 px-6 py-3
                       text-sm font-semibold tracking-wide text-white
                       transition-[background-color,transform,opacity] duration-300 ease-out
                       hover:bg-neutral-800 active:scale-[0.98]"
          >
            Перейти в корзину →
          </Link>

          <Link
            href="/checkout"
            className="inline-flex items-center justify-center rounded-full
                       border border-neutral-300 bg-white/60 backdrop-blur
                       px-6 py-3 text-sm font-semibold tracking-wide text-neutral-900
                       transition-[background-color,transform] duration-300
                       hover:bg-neutral-100 active:scale-[0.98]"
          >
            Оформление
          </Link>
        </div>
      </div>
    </div>
  );
}
