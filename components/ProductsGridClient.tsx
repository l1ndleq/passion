"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import AddToCartButton from "@/components/add-to-cart-button";

type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
};

export default function ProductsGridClient({ products }: { products: Product[] }) {
  const sp = useSearchParams();
  const q = (sp.get("q") || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.title} ${p.description ?? ""} ${p.tag ?? ""} ${p.volume ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, q]);

  if (!filtered.length) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white/60 p-8 text-center shadow-sm backdrop-blur">
        <div className="text-lg font-semibold">Ничего не найдено</div>
        <div className="mt-2 text-sm opacity-70">Попробуй другой запрос.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((p, idx) => (
        <ProductCard
          key={p.id}
          href={`/product/${p.id}`}
          title={p.volume ? `${p.title} · ${p.volume}` : p.title}
          price={p.price}
          image={
            p.image ||
            (idx % 2 === 0 ? "/images/placeholder-product.jpg" : "/images/placeholder-product.jpg")
          }
          badge={p.tag || undefined}
          actions={<AddToCartButton product={{ id: p.id, title: p.title, price: p.price }} />}
        />
      ))}
    </div>
  );
}
