"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type Product = {
  id: string; // у тебя в PRODUCTS обычно id = slug
  name: string;
  subtitle?: string;
  category?: string;
  note?: string;
  badge?: string;
  image?: string;
  price?: number;
};

function normalize(str: string) {
  return (str || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim()
    .replace(/\s+/g, " ");
}

function matchesProduct(product: Product, query: string) {
  const q = normalize(query);
  if (!q) return true;

  const hay = normalize(
    [product.name, product.subtitle, product.category, product.note, product.badge, product.id]
      .filter(Boolean)
      .join(" ")
  );

  return q.split(" ").every((w) => hay.includes(w));
}

export default function ProductsGridClient({ products }: { products: Product[] }) {
  const sp = useSearchParams();
  const q = sp.get("q") || sp.get("search") || sp.get("query") || "";

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => matchesProduct(p, q));
  }, [products, q]);

  return (
    <>
      {filteredProducts.length === 0 && q ? (
        <div className="rounded-3xl border border-black/5 bg-white/60 p-6 text-sm opacity-70">
          Ничего не найдено по запросу: <span className="font-medium">{q}</span>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group block"
          >
            <div className="relative overflow-hidden rounded-3xl bg-black/[0.04]">
              {p.badge ? (
                <div className="absolute left-4 top-4 z-10 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
                  {p.badge}
                </div>
              ) : null}

              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={p.image || "/products/placeholder.jpg"}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  priority={false}
                />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-neutral-900">{p.name}</div>
              {typeof p.price === "number" ? (
                <div className="mt-1 text-sm font-semibold">{p.price.toLocaleString("ru-RU")} ₽</div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
