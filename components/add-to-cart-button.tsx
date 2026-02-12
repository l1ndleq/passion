"use client";

import * as React from "react";
import { useCart } from "@/components/cart/CartProvider";

type ProductMini = {
  id: string;
  title: string;
  price: number;
  image?: string;
};

export default function AddToCartButton({
  product,
  className = "",
}: {
  product: ProductMini;
  className?: string;
}) {
  const { items, addItem, removeItem, setQty, notifyAdded } = useCart();

  const current = items.find((i) => i.id === product.id);
  const qty = current?.qty ?? 0;

  const inc = () => {
    if (qty === 0) {
      addItem(
        {
          id: product.id,
          name: product.title,
          price: product.price,
          image: product.image,
        },
        1
      );
      notifyAdded(product.id); // ✅ премиум: открываем мини-корзину
    } else {
      setQty(product.id, qty + 1);
    }
  };

  const dec = () => {
    if (qty <= 1) {
      removeItem(product.id);
      return;
    }
    setQty(product.id, qty - 1);
  };

  // нет в корзине
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={inc}
        className={[
          "inline-flex h-10 items-center justify-center rounded-2xl px-4",
          "bg-black text-white hover:opacity-90 transition",
          "text-[11px] uppercase tracking-[0.22em]",
          className,
        ].join(" ")}
      >
        В корзину
      </button>
    );
  }

  // есть в корзине -> stepper (+ микро “active”)
  return (
    <div
      className={[
        "inline-flex h-10 items-center rounded-2xl",
        "border border-black/10 bg-white/60 backdrop-blur",
        "overflow-hidden",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={dec}
        className="grid h-10 w-10 place-items-center hover:bg-black/[0.04] transition active:scale-90"
        aria-label="Уменьшить количество"
      >
        <span className="text-[18px] leading-none text-black/80">−</span>
      </button>

      <div className="min-w-[38px] px-2 text-center text-[12px] font-medium tabular-nums text-black/85">
        {qty}
      </div>

      <button
        type="button"
        onClick={inc}
        className="grid h-10 w-10 place-items-center hover:bg-black/[0.04] transition active:scale-90"
        aria-label="Увеличить количество"
      >
        <span className="text-[18px] leading-none text-black/80">+</span>
      </button>
    </div>
  );
}
