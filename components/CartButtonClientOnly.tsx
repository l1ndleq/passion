"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/cart-context";

type ProductLite = { id: string; title: string; price: number };

export default function CartButtonClientOnly({ product }: { product: ProductLite }) {
  const [mounted, setMounted] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => setMounted(true), []);

  const cart: any = useCart?.();
  const addFn = useMemo(() => {
    return cart?.add || cart?.addItem || cart?.addToCart || cart?.addProduct;
  }, [cart]);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof addFn !== "function") {
          console.warn("[CartButtonClientOnly] add() не найден в cart-context");
          return;
        }

        addFn(product);

        setAdded(true);
        window.setTimeout(() => setAdded(false), 700); // ✅ 0.7s как ты хочешь
      }}
      className={[
        "inline-flex items-center justify-center rounded-full px-6 py-2.5",
        "text-sm font-semibold tracking-wide text-white",
        "transition-[background-color,transform,opacity] duration-300 ease-out",
        "active:scale-[0.98]",
        added ? "bg-emerald-600 hover:bg-emerald-600" : "bg-neutral-900 hover:bg-neutral-800",
      ].join(" ")}
    >
      {added ? "Добавлено ✓" : "В корзину"}
    </button>
  );
}
