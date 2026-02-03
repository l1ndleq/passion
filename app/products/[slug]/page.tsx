import { notFound } from "next/navigation";
import Link from "next/link";
import { AddToCartButton } from "../../add-to-cart-button";

type Product = {
  id: string;
  slug: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
};

const PRODUCTS: Product[] = [
  {
    id: "soft-cream",
    slug: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "150 ml",
    description: "Нежный крем для ежедневного ухода и восстановления.",
    tag: "Bestseller",
  },
  {
    id: "body-oil",
    slug: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
  },
  {
    id: "scrub",
    slug: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
  },
];

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCTS.find((p) => p.slug === params.slug);

  if (!product) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase opacity-60">
            PASSION / PRODUCTS / {product.slug.toUpperCase()}
          </div>
          <h1 className="mt-3 text-4xl leading-tight">{product.title}</h1>

          <div className="mt-2 flex items-center gap-3">
            {product.volume && (
              <div className="text-xs opacity-60">{product.volume}</div>
            )}
            {product.tag && (
              <div className="text-[10px] tracking-[0.18em] uppercase px-3 py-1 rounded-full border opacity-70">
                {product.tag}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/products" className="text-sm underline underline-offset-4">
            Назад
          </Link>
          <Link href="/cart" className="text-sm underline underline-offset-4">
            Корзина
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-white/40 p-6">
        {product.description && (
          <p className="text-sm opacity-70">{product.description}</p>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">{product.price} ₽</div>

          <AddToCartButton
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
            }}
          />
        </div>
      </div>

      <div className="mt-10 text-sm opacity-70">
        <Link href="/checkout" className="underline underline-offset-4">
          Перейти к оформлению
        </Link>
      </div>
    </div>
  );
}