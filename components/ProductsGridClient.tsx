"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";

type Product = {
  id?: string;
  slug?: string;
  name?: string;
  subtitle?: string;
  category?: string;
  note?: string;
  badge?: string;
  image?: string;
  price?: number;
  [key: string]: any;
};

// нормализация строки (для умного поиска)
function normalize(str: string) {
  return (str || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim()
    .replace(/\s+/g, " ");
}

// проверка совпадения
function matchesProduct(product: Product, query: string) {
  const q = normalize(query);
  if (!q) return true;

  const searchableText = normalize(
    [
      product.name,
      product.subtitle,
      product.category,
      product.note,
      product.badge,
      product.slug,
      product.id,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return q.split(" ").every((word) => searchableText.includes(word));
}

export default function ProductsGridClient({
  products,
}: {
  products: Product[];
}) {
  const searchParams = useSearchParams();

  // поддержка разных названий параметра
  const query =
    searchParams.get("q") ||
    searchParams.get("search") ||
    searchParams.get("query") ||
    "";

  const filteredProducts = useMemo(() => {
    return (products || []).filter((product) =>
      matchesProduct(product, query)
    );
  }, [products, query]);

  return (
    <>
      {filteredProducts.length === 0 && query ? (
        <div className="rounded-3xl border border-black/5 bg-white/60 p-6 text-sm opacity-70">
          Ничего не найдено по запросу:{" "}
          <span className="font-medium">{query}</span>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {filteredProducts.map((product) => (
  <ProductCard
    key={product.slug || product.id || product.name}
    {...product}
  />
))}

      </div>
    </>
  );
}
