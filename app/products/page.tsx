import Link from "next/link";
import { AddToCartButton } from "../add-to-cart-button";

type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string; // например "150 ml"
  tag?: string; // например "New"
};

const PRODUCTS: Product[] = [
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "150 ml",
    description: "Нежный крем для ежедневного ухода и восстановления.",
    tag: "Bestseller",
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
  },
];

export default function ProductsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Верхняя часть (как у тебя “PASSION / …”) */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / PRODUCTS
          </div>
          <h1 className="mt-3 text-4xl leading-tight">Продукты</h1>
          <p className="mt-3 max-w-xl text-sm opacity-70">
            Выбери продукт и добавь в корзину. Отправка в Telegram происходит
            только при оформлении заказа.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="text-sm underline underline-offset-4">
            Корзина
          </Link>
        </div>
      </div>

      {/* Сетка товаров */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border bg-white/40 p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-medium">{p.title}</div>
                {p.volume && (
                  <div className="mt-1 text-xs opacity-60">{p.volume}</div>
                )}
              </div>

              {p.tag && (
                <div className="text-[10px] tracking-[0.18em] uppercase px-3 py-1 rounded-full border opacity-70">
                  {p.tag}
                </div>
              )}
            </div>

            {p.description && (
              <div className="mt-3 text-sm opacity-70">{p.description}</div>
            )}

            <div className="mt-auto pt-6 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">{p.price} ₽</div>

              <AddToCartButton
                product={{ id: p.id, title: p.title, price: p.price }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Нижняя подсказка */}
      <div className="mt-12 rounded-2xl border p-5 bg-white/30">
        <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
          Доставка
        </div>
        <p className="mt-2 text-sm opacity-70">
          Укажи город и адрес на странице оформления заказа — мы подтвердим
          стоимость и сроки.
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href="/cart"
            className="px-4 py-2 rounded-full bg-black text-white text-sm"
          >
            Перейти в корзину
          </Link>
          <Link
            href="/checkout"
            className="px-4 py-2 rounded-full border text-sm"
          >
            Оформление
          </Link>
        </div>
      </div>
    </div>
  );
}