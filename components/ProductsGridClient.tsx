"use client";

import { ProductCard } from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  price: number;
  image?: string;
  tag?: string;
};

export default function ProductsGridClient({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          href={`/products/${p.id}`}
          title={p.title}
          price={p.price}
          image={p.image}
          badge={p.tag}
        />
      ))}
    </div>
  );
}
