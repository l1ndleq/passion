import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/app/add-to-cart-button";

// Временно: тот же список, что и в products.
// Позже вынесем в общий файл (например, lib/products.ts)
type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
};

const PRODUCTS: Product[] = [
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "150 ml",
    description: "Нежный крем для ежедневного ухода и восстановления.",
    tag: "Bestseller",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
    image: "/images/placeholder-product.jpg",
  },
];

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find((p) => p.id === params.slug);
  if (!product) return notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
        PASSION / PRODUCT
      </div>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* Image */}
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          {/* без fill, чтобы ничего не растягивалось */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image || "/images/placeholder-product.jpg"}
            alt={product.title}
            className="h-[420px] w-full object-cover"
          />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-light tracking-[-0.02em]">
                {product.title}
              </h1>
              {product.volume ? (
                <div className="mt-2 text-sm opacity-70">{product.volume}</div>
              ) : null}
            </div>

            {product.tag ? (
              <div className="text-[10px] tracking-[0.18em] uppercase px-3 py-1 rounded-full border border-black/15 opacity-70">
                {product.tag}
              </div>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-5 text-base leading-relaxed opacity-75">
              {product.description}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="text-lg font-semibold">
              {product.price.toLocaleString("ru-RU")} ₽
            </div>

            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                price: product.price,
              }}
            />
          </div>

          <div className="mt-8 flex gap-4 text-sm">
            <Link href="/products" className="underline underline-offset-4">
              ← В каталог
            </Link>
            <Link href="/cart" className="underline underline-offset-4">
              Корзина →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}