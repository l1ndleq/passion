"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/app/cart-context";

type Product = { id: string; title: string; price: number };

export default function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { add } = useCart() as any;
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1000);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        add(product);
        setAdded(true);
      }}
      className={[
        "inline-flex items-center justify-center rounded-full px-6 py-2.5",
        "text-sm font-semibold tracking-wide transition-[background-color,transform,opacity] duration-300",
        added
          ? "bg-emerald-600 text-white"
          : "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]",
        className,
      ].join(" ")}
    >
      {added ? "Добавлено ✓" : "Добавить в корзину"}
    </button>
  );
}
