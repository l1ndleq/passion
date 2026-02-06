"use client";

import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  price: number;
  image?: string;
  tag?: string;
};

export default function ProductsGridClient({
  products,
}: {
  products: Product[];
}) {
  const [query, setQuery] = useState("");

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
   // <>
    //  {/* search */}
    //  <input
    //    value={query}
    //    onChange={(e) => setQuery(e.target.value)}
   //     placeholder="Поиск..."
     //   className="mb-6 w-full rounded-xl border px-4 py-3"
//      /> 

 //     {/* grid */}
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((p) => (
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
