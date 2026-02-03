import Link from "next/link";
import { ProductCard } from "../product-card";

const PRODUCTS = [
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    description: "Нежный крем для ежедневного ухода.",
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    description: "Масло для тела — питание и сияние.",
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    description: "Скраб для гладкости и мягкости кожи.",
  },
];

export default function ProductsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest opacity-60">PASSION / PRODUCTS</div>
          <h1 className="mt-2 text-3xl">Продукты</h1>
        </div>

        <Link href="/cart" className="underline">
          Корзина
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}