import Link from "next/link";
import { AddToCartButton } from "../add-to-cart-button";
import { ProductCard } from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string; // например "150 ml"
  tag?: string; // например "New"
  image?: string; // опционально (если потом появятся реальные картинки)
};

const PRODUCTS: Product[] = [
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "150 ml",
    description: "Нежный крем для ежедневного ухода и восстановления.",
    tag: "Bestseller",
    // image: "/images/soft-cream.jpg",
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
    // image: "/images/body-oil.jpg",
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
    // image: "/images/scrub.jpg",
  },
];

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
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

      {/* Grid */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p, idx) => (
          <ProductCard
            key={p.id}
            href={`/products/${p.id}`}
            title={p.volume ? `${p.title} · ${p.volume}` : p.title}
            price={p.price}
            image={
              p.image ||
              (idx % 2 === 0
                ? "/images/placeholder-product.jpg"
                : "/images/placeholder-product.jpg")
            }
            badge={p.tag || undefined}
            actions={
              <AddToCartButton
                product={{ id: p.id, title: p.title, price: p.price }}
              />
            }
          />
        ))}
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
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Перейти в корзину
          </Link>

          <Link
            href="/checkout"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium hover:bg-black/[0.03]"
          >
            Оформление
          </Link>
        </div>
      </div>
    </div>
  );
}